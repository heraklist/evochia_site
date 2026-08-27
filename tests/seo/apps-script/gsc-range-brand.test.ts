import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BRAND_ALIASES,
  BRAND_SEEDS,
  isBrandedQuery,
  normalizeBrandText,
} from '../../../seo/apps-script/src/BrandedQuery.ts';
import type {
  FetchOptionsLike,
  HttpResponseLike,
  HttpTransport,
} from '../../../seo/apps-script/src/GscClient.ts';
import {
  GSC_REPORT_SPECS,
  importSearchAnalyticsRange,
} from '../../../seo/apps-script/src/GscImporter.ts';
import { REQUIRED_SHEET_NAMES } from '../../../seo/apps-script/src/Setup.ts';
import type { RowRecord } from '../../../seo/apps-script/src/SheetWriter.ts';

function response(body: unknown, status = 200): HttpResponseLike {
  return {
    getResponseCode: () => status,
    getContentText: () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

const config = {
  siteUrl: 'https://www.evochia.gr/',
  monitoredUrls: [],
};

test('adds the fourth page-query GSC grain with the exact canonical contract', () => {
  assert.equal(REQUIRED_SHEET_NAMES.includes('GSC Page Queries' as never), true);
  assert.deepEqual(
    GSC_REPORT_SPECS.map(({ id, dimensions, aggregationType, sheetName, keyColumns }) => ({
      id,
      dimensions: [...dimensions],
      aggregationType,
      sheetName,
      keyColumns: [...keyColumns],
    })),
    [
      { id: 'daily', dimensions: ['date'], aggregationType: 'byProperty', sheetName: 'GSC Daily', keyColumns: ['date'] },
      { id: 'pages', dimensions: ['date', 'page'], aggregationType: 'auto', sheetName: 'GSC Pages', keyColumns: ['date', 'page'] },
      { id: 'queries', dimensions: ['date', 'query'], aggregationType: 'byProperty', sheetName: 'GSC Queries', keyColumns: ['date', 'query'] },
      { id: 'pageQueries', dimensions: ['date', 'page', 'query'], aggregationType: 'auto', sheetName: 'GSC Page Queries', keyColumns: ['date', 'page', 'query'] },
    ],
  );
});

test('range import passes the exact supplied dates to all four Search Analytics requests', () => {
  const requests: Array<{ startDate: string; endDate: string; dimensions: string[]; aggregationType: string }> = [];
  const writes: Array<{ sheetName: string; keyColumns: string[]; rows: RowRecord[] }> = [];
  const transport: HttpTransport = (_url, options: FetchOptionsLike) => {
    const body = JSON.parse(options.payload) as {
      startDate: string;
      endDate: string;
      dimensions: string[];
      aggregationType: string;
    };
    requests.push({
      startDate: body.startDate,
      endDate: body.endDate,
      dimensions: body.dimensions,
      aggregationType: body.aggregationType,
    });
    return response({ rows: [] });
  };

  const result = importSearchAnalyticsRange(config, '2026-07-01', '2026-07-31', {
    accessToken: 'test-token',
    collectedAt: '2026-08-05T00:00:00.000Z',
    transport,
    writeRows: (sheetName, keyColumns, rows) => {
      writes.push({ sheetName, keyColumns, rows });
      return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
    },
  });

  assert.equal(requests.length, 4);
  assert.equal(requests.every(({ startDate }) => startDate === '2026-07-01'), true);
  assert.equal(requests.every(({ endDate }) => endDate === '2026-07-31'), true);
  assert.deepEqual(requests[3], {
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    dimensions: ['date', 'page', 'query'],
    aggregationType: 'auto',
  });
  assert.equal(writes.length, 4);
  assert.equal(result.dataAsOf, '2026-07-31');
  assert.equal(result.reports.pageQueries.fetched, 0);
});

test('range import writes nothing if the fourth fetch fails', () => {
  let calls = 0;
  let writes = 0;
  const transport: HttpTransport = () => {
    calls += 1;
    return calls === 4
      ? response('{"error":"quota"}', 429)
      : response({ rows: [] });
  };

  assert.throws(
    () => importSearchAnalyticsRange(config, '2026-07-01', '2026-07-31', {
      accessToken: 'test-token',
      transport,
      writeRows: () => {
        writes += 1;
        return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
      },
    }),
    /HTTP 429/,
  );
  assert.equal(calls, 4);
  assert.equal(writes, 0);
});

test('range import rejects malformed and reversed dates before any transport call', () => {
  let calls = 0;
  const dependencies = {
    transport: (() => {
      calls += 1;
      return response({ rows: [] });
    }) as HttpTransport,
  };

  assert.throws(() => importSearchAnalyticsRange(config, '2026-7-01', '2026-07-31', dependencies), /YYYY-MM-DD/);
  assert.throws(() => importSearchAnalyticsRange(config, '2026-08-01', '2026-07-31', dependencies), /startDate/);
  assert.equal(calls, 0);
});

test('brand normalization uses only locked seeds until observed aliases are approved', () => {
  assert.deepEqual(BRAND_SEEDS, ['evochia', 'ευωχια']);
  assert.deepEqual(BRAND_ALIASES, []);
  assert.equal(normalizeBrandText('ΕΥΩΧΊΑ'), 'ευωχια');
  assert.equal(isBrandedQuery('Evochia private chef'), true);
  assert.equal(isBrandedQuery('Ευωχία private chef'), true);
  assert.equal(isBrandedQuery('ευωχια'), true);
  assert.equal(isBrandedQuery('evo-chia'), true);
  assert.equal(isBrandedQuery('euphoria'), false);
  assert.equal(isBrandedQuery('Heraklis Xekalos'), false);
  assert.equal(isBrandedQuery('evohia'), false);
  assert.equal(isBrandedQuery('evohia', ['evohia']), true);
});
