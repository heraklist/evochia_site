import assert from 'node:assert/strict';
import test from 'node:test';
import {
  measurePageQueryRows,
  runDailyImport,
  runRangeImport,
  type JobDependencies,
} from '../../../seo/apps-script/src/Jobs.ts';
import type { SeoConfig } from '../../../seo/apps-script/src/Config.ts';
import type { GscImportResult } from '../../../seo/apps-script/src/GscImporter.ts';
import type { Ga4PersistenceResult } from '../../../seo/apps-script/src/Ga4Importer.ts';
import type { RowRecord, WriteSummary } from '../../../seo/apps-script/src/SheetWriter.ts';

const config: SeoConfig = {
  gscProperty: 'https://www.evochia.gr/',
  ga4AccountId: '388030118',
  ga4PropertyId: '528945896',
  ga4PropertyTimeZone: 'Europe/Athens',
  productionHostname: 'www.evochia.gr',
  gtmPublicContainerId: 'UNVERIFIED',
  gtmAccountId: 'UNVERIFIED',
  gtmContainerId: 'UNVERIFIED',
  sheetId: 'sheet-id',
  driveFolderId: 'UNVERIFIED',
  ownerEmail: 'heraklis@evochia.gr',
  verificationStatus: 'verified',
};

const zeroWrite: WriteSummary = { inserted: 0, updated: 0, unchanged: 0, total: 0 };

function gscResult(dataAsOf = '2026-08-24'): GscImportResult {
  return {
    dataAsOf,
    collectedAt: '2026-08-27T12:00:00.000Z',
    reports: {
      daily: { fetched: 1, write: { inserted: 1, updated: 0, unchanged: 0, total: 1 } },
      pages: { fetched: 2, write: { inserted: 2, updated: 0, unchanged: 0, total: 2 } },
      queries: { fetched: 3, write: { inserted: 3, updated: 0, unchanged: 0, total: 3 } },
      pageQueries: { fetched: 4, write: { inserted: 4, updated: 0, unchanged: 0, total: 4 } },
    },
  };
}

function ga4Result(dataAsOf = '2026-08-25'): Ga4PersistenceResult {
  return {
    bundle: {
      dataAsOf,
      collectedAt: '2026-08-27T12:00:00.000Z',
      daily: [], acquisition: [], landingPages: [], events: [], pages: [], urlQuality: [],
    },
    writes: {
      daily: zeroWrite,
      acquisition: zeroWrite,
      landingPages: zeroWrite,
      events: zeroWrite,
      pages: zeroWrite,
      urlQuality: zeroWrite,
    },
  };
}

function dependencies(options: { gscFails?: boolean; ga4Fails?: boolean } = {}) {
  let tokenCalls = 0;
  const runLogRows: RowRecord[] = [];
  const freshnessCalls: unknown[] = [];
  const capabilityCalls: string[][] = [];

  const deps: JobDependencies = {
    now: () => new Date('2026-08-27T12:00:00.000Z'),
    createRunId: () => 'run-1',
    getOAuthToken: () => {
      tokenCalls += 1;
      return 'token-1';
    },
    getConfig: (capabilities) => {
      capabilityCalls.push([...capabilities]);
      return config;
    },
    importGscDay: () => {
      if (options.gscFails) throw new Error('gsc failed');
      return gscResult();
    },
    importGa4: () => {
      if (options.ga4Fails) throw new Error('ga4 failed');
      return ga4Result();
    },
    writeRows: (_sheetName, _keyColumns, rows) => {
      runLogRows.push(...rows);
      return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
    },
    updateFreshness: (input) => {
      freshnessCalls.push(input);
    },
  };

  return {
    deps,
    state: {
      get tokenCalls() { return tokenCalls; },
      runLogRows,
      freshnessCalls,
      capabilityCalls,
    },
  };
}

test('daily job reports SUCCESS and obtains one OAuth token for both sources', () => {
  const { deps, state } = dependencies();
  const result = runDailyImport(deps);

  assert.equal(result.status, 'SUCCESS');
  assert.equal(state.tokenCalls, 1);
  assert.deepEqual(state.capabilityCalls, [['gsc'], ['ga4']]);
  assert.equal(state.runLogRows.length, 2);
  assert.deepEqual(state.runLogRows.map((row) => row.source), ['GSC', 'GA4']);
  assert.equal(state.runLogRows.every((row) => row.runId === 'run-1'), true);
  assert.equal(state.runLogRows.every((row) => row.overallStatus === 'SUCCESS'), true);
  assert.equal(state.freshnessCalls.length, 1);
});

test('daily job verifies the bound workbook before OAuth or any source/write activity', () => {
  const order: string[] = [];
  let oauthCalls = 0;
  let sourceCalls = 0;
  let writerCalls = 0;
  let freshnessCalls = 0;

  const deps = {
    now: () => new Date('2026-08-27T12:00:00.000Z'),
    createRunId: () => 'run-workbook-fail',
    getVerifiedActiveWorkbook: () => {
      order.push('workbook');
      throw new Error('workbook mismatch');
    },
    getOAuthToken: () => {
      order.push('oauth');
      oauthCalls += 1;
      return 'token';
    },
    getConfig: () => config,
    importGscDay: () => {
      sourceCalls += 1;
      return gscResult();
    },
    importGa4: () => {
      sourceCalls += 1;
      return ga4Result();
    },
    writeRows: () => {
      writerCalls += 1;
      return zeroWrite;
    },
    updateFreshness: () => {
      freshnessCalls += 1;
    },
  } as JobDependencies & { getVerifiedActiveWorkbook: () => unknown };

  assert.throws(() => runDailyImport(deps), /workbook mismatch/);
  assert.deepEqual(order, ['workbook']);
  assert.equal(oauthCalls, 0);
  assert.equal(sourceCalls, 0);
  assert.equal(writerCalls, 0);
  assert.equal(freshnessCalls, 0);
});

test('daily job isolates a GSC failure and reports PARTIAL', () => {
  const { deps, state } = dependencies({ gscFails: true });
  const result = runDailyImport(deps);

  assert.equal(result.status, 'PARTIAL');
  assert.equal(state.runLogRows.length, 2);
  assert.deepEqual(state.runLogRows.map((row) => row.sourceStatus), ['FAILED', 'SUCCESS']);
  assert.equal(state.runLogRows.every((row) => row.overallStatus === 'PARTIAL'), true);
});

test('daily job isolates a GA4 failure and reports PARTIAL', () => {
  const { deps, state } = dependencies({ ga4Fails: true });
  const result = runDailyImport(deps);

  assert.equal(result.status, 'PARTIAL');
  assert.deepEqual(state.runLogRows.map((row) => row.sourceStatus), ['SUCCESS', 'FAILED']);
});

test('daily job reports FAILED when both sources fail', () => {
  const { deps, state } = dependencies({ gscFails: true, ga4Fails: true });
  const result = runDailyImport(deps);

  assert.equal(result.status, 'FAILED');
  assert.deepEqual(state.runLogRows.map((row) => row.sourceStatus), ['FAILED', 'FAILED']);
});

test('range import is GSC-only and returns the page-query fetched count', () => {
  let tokenCalls = 0;
  let ga4Calls = 0;
  const result = runRangeImport('2026-07-01', '2026-07-31', {
    getOAuthToken: () => { tokenCalls += 1; return 'token'; },
    getConfig: () => config,
    importGscRange: () => gscResult('2026-07-31'),
    importGa4: () => { ga4Calls += 1; return ga4Result(); },
  });

  assert.equal(result.reports.pageQueries.fetched, 4);
  assert.equal(tokenCalls, 1);
  assert.equal(ga4Calls, 0);
});

test('measurePageQueryRows fetches only date+page+query and never calls a writer', () => {
  const payloads: unknown[] = [];
  let writerCalls = 0;
  const count = measurePageQueryRows('2026-08-24', '2026-08-24', {
    getOAuthToken: () => 'token',
    getConfig: () => config,
    searchAnalytics: (request) => {
      payloads.push(request);
      return [
        {
          date: '2026-08-24',
          page: 'https://www.evochia.gr/en/private-chef/',
          query: 'private chef greece',
          country: '',
          device: '',
          searchAppearance: '',
          clicks: 1,
          impressions: 5,
          ctr: 0.2,
          position: 4,
        },
        {
          date: '2026-08-24',
          page: 'https://www.evochia.gr/en/catering/',
          query: 'catering athens',
          country: '',
          device: '',
          searchAppearance: '',
          clicks: 0,
          impressions: 3,
          ctr: 0,
          position: 8,
        },
      ];
    },
    writeRows: () => { writerCalls += 1; return zeroWrite; },
  });

  assert.equal(count, 2);
  assert.equal(payloads.length, 1);
  const request = payloads[0] as { dimensions: string[]; aggregationType: string; startDate: string; endDate: string };
  assert.deepEqual(request.dimensions, ['date', 'page', 'query']);
  assert.equal(request.aggregationType, 'auto');
  assert.equal(request.startDate, '2026-08-24');
  assert.equal(request.endDate, '2026-08-24');
  assert.equal(writerCalls, 0);
});
