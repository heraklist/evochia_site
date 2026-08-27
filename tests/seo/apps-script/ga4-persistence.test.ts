import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GA4_REPORT_SPECS,
  importGa4Reports,
} from '../../../seo/apps-script/src/Ga4Importer.ts';
import type {
  FetchOptionsLike,
  HttpResponseLike,
  HttpTransport,
} from '../../../seo/apps-script/src/GscClient.ts';
import {
  mergeRowRecords,
  type RowRecord,
} from '../../../seo/apps-script/src/SheetWriter.ts';

function response(body: unknown, status = 200): HttpResponseLike {
  return {
    getResponseCode: () => status,
    getContentText: () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

const verifiedRange = {
  propertyResource: 'properties/528945896',
  verificationStatus: 'verified' as const,
  ga4PropertyTimeZone: 'Europe/Athens',
  productionHostname: 'www.evochia.gr',
  startDate: '2026-08-05',
  endDate: '2026-08-05',
};

test('declares the six canonical GA4 sheet/key mappings exactly', () => {
  assert.deepEqual(
    GA4_REPORT_SPECS.map(({ id, sheetName, keyColumns }) => ({ id, sheetName, keyColumns: [...keyColumns] })),
    [
      { id: 'daily', sheetName: 'GA4 Daily', keyColumns: ['date', 'deviceCategory'] },
      {
        id: 'acquisition',
        sheetName: 'GA4 Acquisition',
        keyColumns: ['date', 'sessionSourceMedium', 'sessionDefaultChannelGroup'],
      },
      {
        id: 'landingPages',
        sheetName: 'GA4 Landing Pages',
        keyColumns: ['date', 'landingPagePlusQueryString', 'sessionDefaultChannelGroup', 'deviceCategory'],
      },
      { id: 'events', sheetName: 'GA4 Events', keyColumns: ['date', 'eventName'] },
      { id: 'pages', sheetName: 'GA4 Pages', keyColumns: ['date', 'hostName', 'pagePath'] },
      {
        id: 'urlQuality',
        sheetName: 'GA4 URL Quality',
        keyColumns: ['date', 'hostName', 'pagePathPlusQueryString'],
      },
    ],
  );
});

test('does not write any GA4 sheet when the final fetch in the bundle fails', () => {
  let requestCount = 0;
  let writerCalls = 0;
  const transport: HttpTransport = (_url, options: FetchOptionsLike) => {
    requestCount += 1;
    if (requestCount === 7) {
      return response('{"error":"synthetic final fetch failure"}', 503);
    }

    const body = JSON.parse(options.payload) as {
      dimensions: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
    };
    return response({
      dimensionHeaders: body.dimensions,
      metricHeaders: body.metrics,
      rows: [],
      rowCount: 0,
    });
  };

  assert.throws(
    () => importGa4Reports(verifiedRange, {
      accessToken: 'test-token',
      transport,
      writeRows: () => {
        writerCalls += 1;
        return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
      },
    }),
    /HTTP 503/,
  );

  assert.equal(requestCount, 7);
  assert.equal(writerCalls, 0);
});

test('writes all six bundle families only after the complete fetch succeeds', () => {
  const writes: Array<{ sheetName: string; keyColumns: string[]; rows: RowRecord[] }> = [];
  const transport: HttpTransport = (_url, options: FetchOptionsLike) => {
    const body = JSON.parse(options.payload) as {
      dimensions: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
    };
    return response({
      dimensionHeaders: body.dimensions,
      metricHeaders: body.metrics,
      rows: [],
      rowCount: 0,
    });
  };

  const result = importGa4Reports(verifiedRange, {
    accessToken: 'test-token',
    transport,
    collectedAt: '2026-08-07T00:00:00.000Z',
    writeRows: (sheetName, keyColumns, rows) => {
      writes.push({ sheetName, keyColumns, rows });
      return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
    },
  });

  assert.deepEqual(
    writes.map(({ sheetName, keyColumns }) => ({ sheetName, keyColumns })),
    GA4_REPORT_SPECS.map(({ sheetName, keyColumns }) => ({ sheetName, keyColumns: [...keyColumns] })),
  );
  assert.equal(Object.keys(result.writes).length, 6);
});

test('every GA4 composite key is idempotent under the canonical merge semantics', () => {
  const sampleRows: Record<string, RowRecord> = {
    daily: { date: '20260805', deviceCategory: 'mobile', sessions: 3 },
    acquisition: {
      date: '20260805',
      sessionSourceMedium: 'google / organic',
      sessionDefaultChannelGroup: 'Organic Search',
      sessions: 3,
    },
    landingPages: {
      date: '20260805',
      landingPagePlusQueryString: '/en/private-chef/',
      sessionDefaultChannelGroup: 'Organic Search',
      deviceCategory: 'desktop',
      sessions: 3,
    },
    events: { date: '20260805', eventName: 'generate_lead', eventCount: 1 },
    pages: {
      date: '20260805',
      hostName: 'www.evochia.gr',
      pagePath: '/en/private-chef/',
      sessions: 3,
    },
    urlQuality: {
      date: '20260805',
      hostName: 'www.evochia.gr',
      pagePathPlusQueryString: '/en/private-chef/?utm_source=test',
      screenPageViews: 1,
    },
  };

  for (const spec of GA4_REPORT_SPECS) {
    const row = sampleRows[spec.id];
    const headers = Object.keys(row);
    const first = mergeRowRecords(headers, [], [...spec.keyColumns], [row]);
    const second = mergeRowRecords(headers, first.rows, [...spec.keyColumns], [row]);
    assert.deepEqual(second.summary, {
      inserted: 0,
      updated: 0,
      unchanged: 1,
      total: 1,
    }, spec.id);
  }
});
