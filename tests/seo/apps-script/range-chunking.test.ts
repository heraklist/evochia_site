import assert from 'node:assert/strict';
import test from 'node:test';
import { runRangeImport, type JobDependencies } from '../../../seo/apps-script/src/Jobs.ts';
import type { SeoConfig } from '../../../seo/apps-script/src/Config.ts';
import type { GscImportResult } from '../../../seo/apps-script/src/GscImporter.ts';

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

function gscResult(dataAsOf: string): GscImportResult {
  const write = { inserted: 0, updated: 0, unchanged: 0, total: 0 };
  return {
    dataAsOf,
    collectedAt: '2026-08-28T06:00:00.000Z',
    reports: {
      daily: { fetched: 0, write },
      pages: { fetched: 0, write },
      queries: { fetched: 0, write },
      pageQueries: { fetched: 0, write },
    },
  };
}

test('range import automatically splits a multi-month request into bounded calendar-month chunks', () => {
  const calls: Array<{ startDate: string; endDate: string }> = [];
  let tokenCalls = 0;
  let configCalls = 0;

  const deps: JobDependencies = {
    now: () => new Date('2026-08-28T06:00:00.000Z'),
    getOAuthToken: () => {
      tokenCalls += 1;
      return 'token-1';
    },
    getConfig: () => {
      configCalls += 1;
      return config;
    },
    importGscRange: (_importConfig, startDate, endDate) => {
      calls.push({ startDate, endDate });
      return gscResult(endDate);
    },
  };

  const result = runRangeImport('2025-07-26', '2025-09-03', deps);

  assert.deepEqual(calls, [
    { startDate: '2025-07-26', endDate: '2025-07-31' },
    { startDate: '2025-08-01', endDate: '2025-08-31' },
    { startDate: '2025-09-01', endDate: '2025-09-03' },
  ]);
  assert.equal(tokenCalls, 1);
  assert.equal(configCalls, 1);
  assert.equal(result.dataAsOf, '2025-09-03');
});

test('range import stops immediately when a calendar-month chunk fails', () => {
  const calls: Array<{ startDate: string; endDate: string }> = [];

  const deps: JobDependencies = {
    now: () => new Date('2026-08-28T06:00:00.000Z'),
    getOAuthToken: () => 'token-1',
    getConfig: () => config,
    importGscRange: (_importConfig, startDate, endDate) => {
      calls.push({ startDate, endDate });
      if (startDate === '2025-08-01') throw new Error('august failed');
      return gscResult(endDate);
    },
  };

  assert.throws(
    () => runRangeImport('2025-07-26', '2025-09-03', deps),
    /august failed/,
  );
  assert.deepEqual(calls, [
    { startDate: '2025-07-26', endDate: '2025-07-31' },
    { startDate: '2025-08-01', endDate: '2025-08-31' },
  ]);
});
