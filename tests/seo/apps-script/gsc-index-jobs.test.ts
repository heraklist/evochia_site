import assert from 'node:assert/strict';
import test from 'node:test';

import type { SeoConfig } from '../../../seo/apps-script/src/Config.ts';
import { expectedMonitoredUrls } from '../../../seo/apps-script/src/GscIndexConfig.ts';
import {
  isUsableGscIndexRun,
  runDailyImport,
  type JobDependencies,
} from '../../../seo/apps-script/src/Jobs.ts';
import type {
  InspectionBatchDependencies,
  InspectionBatchResult,
} from '../../../seo/apps-script/src/GscImporter.ts';
import type { Ga4PersistenceResult } from '../../../seo/apps-script/src/Ga4Importer.ts';
import type { GscImportResult } from '../../../seo/apps-script/src/GscImporter.ts';
import type { RowRecord, WriteSummary } from '../../../seo/apps-script/src/SheetWriter.ts';

const zeroWrite: WriteSummary = { inserted: 0, updated: 0, unchanged: 0, total: 0 };
const HOST = 'www.evochia.gr';
const MONITORED_URLS = expectedMonitoredUrls(HOST);

const config: SeoConfig = {
  gscProperty: 'https://www.evochia.gr/',
  monitoredUrls: MONITORED_URLS,
  ga4AccountId: '388030118',
  ga4PropertyId: '528945896',
  ga4PropertyTimeZone: 'Europe/Athens',
  productionHostname: HOST,
  gtmPublicContainerId: 'UNVERIFIED',
  gtmAccountId: 'UNVERIFIED',
  gtmContainerId: 'UNVERIFIED',
  sheetId: 'sheet-id',
  driveFolderId: 'UNVERIFIED',
  ownerEmail: 'heraklis@evochia.gr',
  verificationStatus: 'verified',
};

function gscResult(): GscImportResult {
  return {
    dataAsOf: '2026-08-30',
    collectedAt: '2026-09-02T15:00:00.000Z',
    reports: {
      daily: { fetched: 1, write: zeroWrite },
      pages: { fetched: 1, write: zeroWrite },
      queries: { fetched: 1, write: zeroWrite },
      pageQueries: { fetched: 1, write: zeroWrite },
    },
  };
}

function ga4Result(): Ga4PersistenceResult {
  return {
    bundle: {
      dataAsOf: '2026-09-01',
      collectedAt: '2026-09-02T15:00:00.000Z',
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

function successfulBatch(
  batchConfig: { runId: string; checkedAt: string; monitoredUrls: string[] },
  dependencies: InspectionBatchDependencies = {},
): InspectionBatchResult {
  const rows: RowRecord[] = batchConfig.monitoredUrls.map((url) => ({
    'Checked At': batchConfig.checkedAt,
    'Run Id': batchConfig.runId,
    URL: url,
    Outcome: 'INSPECTED',
  }));
  const write = dependencies.writeRows
    ? dependencies.writeRows('GSC Indexing', ['Run Id', 'URL'], rows)
    : { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
  return {
    snapshots: [],
    inspectedCount: batchConfig.monitoredUrls.length,
    failedCount: 0,
    write,
  };
}

function baseDependencies(overrides: Partial<JobDependencies> = {}): JobDependencies {
  return {
    now: () => new Date('2026-09-02T15:00:00.000Z'),
    nowMs: (() => {
      const values = [10_000, 10_250];
      return () => values.shift() ?? 10_250;
    })(),
    createRunId: () => 'run-index-1',
    getVerifiedActiveWorkbook: () => ({
      getSheetByName: () => ({ getLastRow: () => 1, getRange: () => ({ getValues: () => [[]], setValues: () => {} }) }),
    }),
    getOAuthToken: () => 'token',
    getConfig: () => config,
    importGscDay: () => gscResult(),
    importGa4: () => ga4Result(),
    validateGscIndexingPreflight: () => {},
    collectGscIndexSnapshots: successfulBatch,
    writeRows: (_sheetName, _keyColumns, rows) => ({
      inserted: rows.length,
      updated: 0,
      unchanged: 0,
      total: rows.length,
    }),
    updateFreshness: () => {},
    ...overrides,
  };
}

test('malformed gscIndex configuration fails only GSC_INDEX after canonical checkpoint', () => {
  const runLogRows: RowRecord[] = [];
  const capabilityCalls: string[][] = [];
  let collectorCalls = 0;
  let freshnessCalls = 0;

  const result = runDailyImport(baseDependencies({
    getConfig: (capabilities) => {
      capabilityCalls.push([...capabilities]);
      if (capabilities.includes('gscIndex')) {
        throw new Error('monitoredUrls is required');
      }
      return { ...config, monitoredUrls: undefined } as SeoConfig;
    },
    collectGscIndexSnapshots: (...args) => {
      collectorCalls += 1;
      return successfulBatch(args[0], args[1]);
    },
    writeRows: (sheetName, _keyColumns, rows) => {
      if (sheetName === 'Run Log') runLogRows.push(...rows);
      return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
    },
    updateFreshness: () => { freshnessCalls += 1; },
  }));

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.sources.gsc.success, true);
  assert.equal(result.sources.ga4.success, true);
  assert.equal(result.sources.gscIndex.success, false);
  assert.deepEqual(capabilityCalls, [['gsc'], ['ga4'], ['gscIndex']]);
  assert.equal(collectorCalls, 0);
  assert.equal(freshnessCalls, 1);

  const gscIndexRows = runLogRows.filter((row) => row.source === 'GSC_INDEX');
  assert.equal(gscIndexRows.length, 1);
  assert.equal(gscIndexRows[0].sourceStatus, 'FAILED');
  assert.equal(gscIndexRows[0].overallStatus, 'SUCCESS');
  assert.equal(gscIndexRows[0].fetchedRows, 0);
  assert.equal(gscIndexRows[0].stageDurationMs, 250);
});

test('daily orchestration checkpoints canonical sources before GSC_INDEX and finalizes placeholder', () => {
  const events: string[] = [];
  const runLogRows: RowRecord[] = [];

  runDailyImport(baseDependencies({
    getConfig: (capabilities) => {
      if (capabilities.includes('gscIndex')) events.push('gscIndex-config');
      return config;
    },
    importGscDay: () => { events.push('gsc'); return gscResult(); },
    importGa4: () => { events.push('ga4'); return ga4Result(); },
    validateGscIndexingPreflight: () => { events.push('schema-preflight'); },
    collectGscIndexSnapshots: (batchConfig, dependencies) => {
      events.push('inspection');
      return successfulBatch(batchConfig, {
        ...dependencies,
        writeRows: (sheetName, keyColumns, rows) => {
          events.push('index-persistence');
          return dependencies.writeRows!(sheetName, keyColumns, rows);
        },
      });
    },
    writeRows: (sheetName, _keyColumns, rows) => {
      if (sheetName === 'Run Log') {
        runLogRows.push(...rows);
        if (rows.length === 2) events.push('canonical-run-log');
        else if (rows[0]?.errorClass === 'InspectionStageIncomplete') events.push('index-placeholder');
        else if (rows[0]?.source === 'GSC_INDEX') events.push('index-final');
      }
      return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
    },
    updateFreshness: () => { events.push('freshness'); },
  }));

  assert.deepEqual(events, [
    'gsc',
    'ga4',
    'canonical-run-log',
    'freshness',
    'gscIndex-config',
    'schema-preflight',
    'index-placeholder',
    'inspection',
    'index-persistence',
    'index-final',
  ]);

  const indexRows = runLogRows.filter((row) => row.source === 'GSC_INDEX');
  assert.equal(indexRows.length, 2);
  assert.equal(indexRows[0].sourceStatus, 'FAILED');
  assert.equal(indexRows[0].errorClass, 'InspectionStageIncomplete');
  assert.equal(indexRows[0].stageDurationMs, '');
  assert.equal(indexRows[1].sourceStatus, 'SUCCESS');
  assert.equal(indexRows[1].stageDurationMs, 250);
});

test('one failed URL makes GSC_INDEX FAILED without changing canonical overallStatus', () => {
  const runLogRows: RowRecord[] = [];
  const result = runDailyImport(baseDependencies({
    collectGscIndexSnapshots: (_batchConfig, dependencies) => {
      const rows = Array.from({ length: MONITORED_URLS.length }, (_, index) => ({
        'Run Id': 'run-index-1',
        URL: MONITORED_URLS[index],
        Outcome: index === 6 ? 'REQUEST_FAILED' : 'INSPECTED',
      }));
      const write = dependencies.writeRows!('GSC Indexing', ['Run Id', 'URL'], rows);
      return {
        snapshots: [],
        inspectedCount: MONITORED_URLS.length - 1,
        failedCount: 1,
        write,
      };
    },
    writeRows: (sheetName, _keyColumns, rows) => {
      if (sheetName === 'Run Log') runLogRows.push(...rows);
      return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
    },
  }));

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.sources.gscIndex.success, false);
  assert.equal(result.sources.gscIndex.fetchedRows, MONITORED_URLS.length - 1);
  const finalIndexRow = runLogRows.filter((row) => row.source === 'GSC_INDEX').at(-1)!;
  assert.equal(finalIndexRow.sourceStatus, 'FAILED');
  assert.equal(finalIndexRow.overallStatus, 'SUCCESS');
  assert.equal(finalIndexRow.errorClass, 'InspectionBatchFailure');
  assert.match(String(finalIndexRow.errorMessage), /1 of 16/);
});

test('historical GSC_INDEX completeness is determined only by historical sourceStatus', () => {
  const historicalSuccess = {
    source: 'GSC_INDEX',
    sourceStatus: 'SUCCESS',
  } as const;
  const historicalFailure = {
    source: 'GSC_INDEX',
    sourceStatus: 'FAILED',
  } as const;

  assert.equal(isUsableGscIndexRun(historicalSuccess), true);
  assert.equal(isUsableGscIndexRun(historicalFailure), false);
});
