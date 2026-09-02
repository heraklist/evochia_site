import assert from 'node:assert/strict';
import test from 'node:test';

import { APPROVED_MONITORED_PATHS } from '../../../seo/apps-script/src/GscIndexConfig.ts';
import {
  collectAndPersistInspectionSnapshots,
  type InspectionBatchResult,
} from '../../../seo/apps-script/src/GscImporter.ts';
import {
  mergeRowRecords,
  type RowRecord,
} from '../../../seo/apps-script/src/SheetWriter.ts';
import type { HttpResponseLike, HttpTransport } from '../../../seo/apps-script/src/GscClient.ts';

function response(body: unknown, status = 200): HttpResponseLike {
  return {
    getResponseCode: () => status,
    getContentText: () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

const HOST = 'www.evochia.gr';
const SITE_URL = 'https://www.evochia.gr/';
const MONITORED_URLS = APPROVED_MONITORED_PATHS.map((path) => `https://${HOST}${path}`);
const RUN_ID = 'daily-2026-09-02-a';
const CHECKED_AT = '2026-09-02T14:00:00.000Z';

function successfulInspection(url: string, canonicalMode: 'MATCH' | 'MISMATCH' = 'MATCH'): unknown {
  return {
    inspectionResult: {
      inspectionResultLink: `https://search.google.com/search-console/inspect?url=${encodeURIComponent(url)}`,
      indexStatusResult: {
        verdict: 'PASS',
        coverageState: 'Submitted and indexed',
        robotsTxtState: 'ALLOWED',
        indexingState: 'INDEXING_ALLOWED',
        pageFetchState: 'SUCCESSFUL',
        crawledAs: 'MOBILE',
        userCanonical: canonicalMode === 'MATCH' ? url : url.replace('https://', 'http://'),
        googleCanonical: url,
        lastCrawlTime: '2026-09-01T08:30:00Z',
        sitemap: ['https://www.evochia.gr/sitemap.xml'],
        referringUrls: [],
      },
    },
  };
}

test('per-URL isolation preserves one complete snapshot group when request 7 fails', () => {
  const requested: string[] = [];
  const writes: Array<{ sheetName: string; keyColumns: string[]; rows: RowRecord[] }> = [];
  let inspectionIndex = 0;

  const transport: HttpTransport = (_endpoint, options) => {
    const payload = JSON.parse(options.payload) as { inspectionUrl: string };
    requested.push(payload.inspectionUrl);
    inspectionIndex += 1;

    if (inspectionIndex === 7) {
      return response('{"error":"quota"}', 429);
    }

    return response(successfulInspection(
      payload.inspectionUrl,
      inspectionIndex === 2 ? 'MISMATCH' : 'MATCH',
    ));
  };

  const result = collectAndPersistInspectionSnapshots(
    {
      runId: RUN_ID,
      checkedAt: CHECKED_AT,
      siteUrl: SITE_URL,
      monitoredUrls: MONITORED_URLS,
    },
    {
      accessToken: 'test-token',
      transport,
      writeRows: (sheetName, keyColumns, rows) => {
        writes.push({ sheetName, keyColumns, rows });
        return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
      },
    },
  );

  assert.equal(result.snapshots.length, APPROVED_MONITORED_PATHS.length);
  assert.equal(result.inspectedCount, APPROVED_MONITORED_PATHS.length - 1);
  assert.equal(result.failedCount, 1);
  assert.deepEqual(requested, MONITORED_URLS, 'one failure must not stop later URL requests');
  assert.equal(new Set(result.snapshots.map((snapshot) => snapshot.runId)).size, 1);
  assert.equal(new Set(result.snapshots.map((snapshot) => snapshot.checkedAt)).size, 1);
  assert.equal(result.snapshots.every((snapshot) => snapshot.runId === RUN_ID), true);
  assert.equal(result.snapshots.every((snapshot) => snapshot.checkedAt === CHECKED_AT), true);

  const failed = result.snapshots[6];
  assert.equal(failed.outcome, 'REQUEST_FAILED');
  if (failed.outcome === 'REQUEST_FAILED') {
    assert.equal(failed.canonicalMatch, 'NOT_COMPARABLE');
    assert.equal(failed.errorClass, 'PipelineError');
    assert.match(failed.errorMessage, /HTTP 429/);
  }

  const mismatch = result.snapshots[1];
  assert.equal(mismatch.outcome, 'INSPECTED');
  if (mismatch.outcome === 'INSPECTED') {
    assert.equal(
      mismatch.canonicalMatch,
      'MISMATCH',
      'snapshot construction must derive canonicalMatch from provider canonicals',
    );
  }

  assert.equal(writes.length, 1, 'the complete in-memory group must persist in one call');
  assert.equal(writes[0].sheetName, 'GSC Indexing');
  assert.deepEqual(writes[0].keyColumns, ['Run Id', 'URL']);
  assert.equal(writes[0].rows.length, APPROVED_MONITORED_PATHS.length);
  assert.equal(writes[0].rows.every((row) => Object.keys(row).length === 19), true);
  assert.deepEqual(result.write, {
    inserted: APPROVED_MONITORED_PATHS.length,
    updated: 0,
    unchanged: 0,
    total: APPROVED_MONITORED_PATHS.length,
  });
});

test('Run Id plus URL persistence is idempotent for one run and preserves new-run history', () => {
  const headers = [
    'Checked At', 'Run Id', 'URL', 'Outcome', 'Verdict', 'Coverage State',
    'Robots.txt State', 'Indexing State', 'Page Fetch State', 'Crawled As',
    'Google Canonical', 'User Canonical', 'Canonical Match', 'Last Crawl Time',
    'Sitemap', 'Referring URLs', 'Inspection Result Link', 'Error Class', 'Error Message',
  ];
  let storedRows: RowRecord[] = [];

  const writeRows = (_sheetName: string, keyColumns: string[], incomingRows: RowRecord[]) => {
    const merged = mergeRowRecords(headers, storedRows, keyColumns, incomingRows);
    storedRows = merged.rows;
    return merged.summary;
  };
  const transport: HttpTransport = (_endpoint, options) => {
    const { inspectionUrl } = JSON.parse(options.payload) as { inspectionUrl: string };
    return response(successfulInspection(inspectionUrl));
  };

  const run = (runId: string): InspectionBatchResult => collectAndPersistInspectionSnapshots(
    {
      runId,
      checkedAt: CHECKED_AT,
      siteUrl: SITE_URL,
      monitoredUrls: MONITORED_URLS,
    },
    { accessToken: 'test-token', transport, writeRows },
  );

  const first = run(RUN_ID);
  assert.equal(first.write.inserted, APPROVED_MONITORED_PATHS.length);
  assert.equal(first.write.unchanged, 0);

  const repeated = run(RUN_ID);
  assert.equal(repeated.write.inserted, 0);
  assert.equal(repeated.write.updated, 0);
  assert.equal(repeated.write.unchanged, APPROVED_MONITORED_PATHS.length);
  assert.equal(storedRows.length, APPROVED_MONITORED_PATHS.length);

  const nextRun = run('daily-2026-09-02-b');
  assert.equal(nextRun.write.inserted, APPROVED_MONITORED_PATHS.length);
  assert.equal(storedRows.length, APPROVED_MONITORED_PATHS.length * 2);
});
