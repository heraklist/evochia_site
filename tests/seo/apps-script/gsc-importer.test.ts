import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchSearchAnalytics,
  PipelineError,
  type FetchOptionsLike,
  type HttpResponseLike,
  type HttpTransport,
} from '../../../seo/apps-script/src/GscClient.ts';
import {
  deduplicateGscRows,
  getAvailableGscDate,
  inspectMonitoredUrls,
} from '../../../seo/apps-script/src/GscImporter.ts';
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

const ALL_GSC_DIMENSIONS = [
  'date',
  'query',
  'page',
  'country',
  'device',
  'searchAppearance',
] as const;

const rowA = {
  keys: ['2026-08-01', 'private chef greece', 'https://www.evochia.gr/en/private-chef/', 'grc', 'MOBILE', 'WEB_RESULT'],
  clicks: 1,
  impressions: 10,
  ctr: 0.1,
  position: 12.5,
};

const rowB = {
  keys: ['2026-08-01', 'catering athens', 'https://www.evochia.gr/en/catering/', 'grc', 'DESKTOP', 'WEB_RESULT'],
  clicks: 2,
  impressions: 20,
  ctr: 0.1,
  position: 6.5,
};

const rowC = {
  keys: ['2026-08-01', 'private chef athens', 'https://www.evochia.gr/en/athens-private-chef/', 'grc', 'MOBILE', 'WEB_RESULT'],
  clicks: 0,
  impressions: 8,
  ctr: 0,
  position: 18,
};

test('sends explicit dimensions and aggregation type on every Search Analytics request', () => {
  const payloads: Array<{
    dimensions: string[];
    aggregationType: string;
    startRow: number;
    dataState: string;
  }> = [];

  const transport: HttpTransport = (_url, options) => {
    payloads.push(JSON.parse(options.payload));
    return response({ rows: [] });
  };

  fetchSearchAnalytics({
    siteUrl: 'https://www.evochia.gr/',
    startDate: '2026-08-02',
    endDate: '2026-08-02',
    dimensions: ['date'],
    aggregationType: 'byProperty',
    accessToken: 'test-token',
    transport,
  });

  assert.equal(payloads.length, 1);
  assert.deepEqual(payloads[0].dimensions, ['date']);
  assert.equal(payloads[0].aggregationType, 'byProperty');
  assert.equal(payloads[0].startRow, 0);
  assert.equal(payloads[0].dataState, 'final');
});

test('paginates Search Analytics until a short page is returned', () => {
  const starts: number[] = [];
  const transport: HttpTransport = (_url, options: FetchOptionsLike) => {
    const payload = JSON.parse(options.payload) as { startRow: number };
    starts.push(payload.startRow);
    const pages: Record<number, unknown[]> = {
      0: [rowA, rowB],
      2: [rowA, rowC],
      4: [],
    };
    return response({ rows: pages[payload.startRow] ?? [] });
  };

  const rows = fetchSearchAnalytics({
    siteUrl: 'https://www.evochia.gr/',
    startDate: '2026-08-01',
    endDate: '2026-08-01',
    dimensions: [...ALL_GSC_DIMENSIONS],
    aggregationType: 'auto',
    rowLimit: 2,
    accessToken: 'test-token',
    transport,
  });

  assert.deepEqual(starts, [0, 2, 4]);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].query, 'private chef greece');
  assert.equal(rows[3].page, 'https://www.evochia.gr/en/athens-private-chef/');
  assert.equal(deduplicateGscRows(rows).length, 3);
});

test('repeated row merge is idempotent for the composite GSC key', () => {
  const headers = [
    'date',
    'query',
    'page',
    'country',
    'device',
    'searchAppearance',
    'clicks',
    'impressions',
    'ctr',
    'position',
  ];
  const keyColumns = headers.slice(0, 6);
  const incoming: RowRecord = {
    date: '2026-08-01',
    query: 'private chef greece',
    page: 'https://www.evochia.gr/en/private-chef/',
    country: 'grc',
    device: 'MOBILE',
    searchAppearance: 'WEB_RESULT',
    clicks: 1,
    impressions: 10,
    ctr: 0.1,
    position: 12.5,
  };

  const first = mergeRowRecords(headers, [], keyColumns, [incoming]);
  assert.deepEqual(first.summary, { inserted: 1, updated: 0, unchanged: 0, total: 1 });

  const second = mergeRowRecords(headers, first.rows, keyColumns, [incoming]);
  assert.deepEqual(second.summary, { inserted: 0, updated: 0, unchanged: 1, total: 1 });

  const changed = mergeRowRecords(headers, second.rows, keyColumns, [{ ...incoming, clicks: 3 }]);
  assert.deepEqual(changed.summary, { inserted: 0, updated: 1, unchanged: 0, total: 1 });
  assert.equal(changed.rows[0].clicks, 3);
});

test('treats a Sheet Date key as the same date as an incoming YYYY-MM-DD string', () => {
  const headers = ['date', 'page', 'clicks'];
  const keyColumns = ['date', 'page'];
  const existing: RowRecord = {
    date: new Date('2026-08-01T00:00:00.000Z'),
    page: 'https://www.evochia.gr/en/private-chef/',
    clicks: 3,
  };
  const incoming: RowRecord = {
    date: '2026-08-01',
    page: 'https://www.evochia.gr/en/private-chef/',
    clicks: 3,
  };

  const merged = mergeRowRecords(headers, [existing], keyColumns, [incoming]);

  assert.deepEqual(merged.summary, {
    inserted: 0,
    updated: 0,
    unchanged: 1,
    total: 1,
  });
});

test('uses the Los Angeles calendar before local midnight', () => {
  assert.equal(
    getAvailableGscDate(new Date('2026-08-06T05:00:00Z')),
    '2026-08-02',
  );
});

test('uses the Los Angeles calendar after local midnight', () => {
  assert.equal(
    getAvailableGscDate(new Date('2026-08-06T08:00:00Z')),
    '2026-08-03',
  );
});

test('rejects invalid GSC availability delays', () => {
  assert.throws(
    () => getAvailableGscDate(new Date('2026-08-06T08:00:00Z'), -1),
    /non-negative integer/,
  );
  assert.throws(
    () => getAvailableGscDate(new Date('2026-08-06T08:00:00Z'), 1.5),
    /non-negative integer/,
  );
});

test('uses the named timezone across the daylight-saving boundary', () => {
  assert.equal(
    getAvailableGscDate(new Date('2026-11-02T07:30:00Z'), 0),
    '2026-11-01',
  );
});

test('URL Inspection is limited to the monitored allowlist and stores canonicals', () => {
  const monitoredUrl = 'https://www.evochia.gr/en/private-chef/';
  const transport: HttpTransport = () => response({
    inspectionResult: {
      indexStatusResult: {
        verdict: 'PASS',
        coverageState: 'Submitted and indexed',
        indexingState: 'INDEXING_ALLOWED',
        pageFetchState: 'SUCCESSFUL',
        userCanonical: monitoredUrl,
        googleCanonical: monitoredUrl,
        lastCrawlTime: '2026-08-04T08:30:00Z',
      },
    },
  });

  const result = inspectMonitoredUrls(
    { siteUrl: 'https://www.evochia.gr/', monitoredUrls: [monitoredUrl] },
    [monitoredUrl],
    { accessToken: 'test-token', inspectedAt: '2026-08-06T05:00:00Z', transport },
  );

  assert.equal(result[0].userCanonical, monitoredUrl);
  assert.equal(result[0].googleCanonical, monitoredUrl);
  assert.equal(result[0].inspectedAt, '2026-08-06T05:00:00Z');

  assert.throws(
    () => inspectMonitoredUrls(
      { siteUrl: 'https://www.evochia.gr/', monitoredUrls: [monitoredUrl] },
      ['https://www.evochia.gr/en/not-allowlisted/'],
      { accessToken: 'test-token', transport },
    ),
    /outside the monitored allowlist/,
  );
});

test('non-2xx Search Console responses throw a typed pipeline error', () => {
  assert.throws(
    () => fetchSearchAnalytics({
      siteUrl: 'https://www.evochia.gr/',
      startDate: '2026-08-01',
      endDate: '2026-08-01',
      dimensions: ['date'],
      aggregationType: 'byProperty',
      accessToken: 'test-token',
      transport: () => response('{"error":"quota"}', 429),
    }),
    (error: unknown) => error instanceof PipelineError
      && error.status === 429
      && error.source === 'gsc-search-analytics',
  );
});
