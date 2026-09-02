import assert from 'node:assert/strict';
import test from 'node:test';

import {
  upsertRows,
  type CellValue,
} from '../../../seo/apps-script/src/SheetWriter.ts';

const OLD_HEADERS = [
  'runId',
  'startedAt',
  'finishedAt',
  'source',
  'sourceStatus',
  'overallStatus',
  'dataAsOf',
  'fetchedRows',
  'insertedRows',
  'updatedRows',
  'unchangedRows',
  'errorClass',
  'errorMessage',
];

test('first GSC_INDEX write appends stageDurationMs while preserving historical Run Log rows', () => {
  const existing = [
    OLD_HEADERS,
    ['run-old', '2026-09-01T06:00:00Z', '2026-09-01T06:00:05Z', 'GSC', 'SUCCESS', 'SUCCESS', '2026-08-29', 10, 10, 0, 0, '', ''],
    ['run-old', '2026-09-01T06:00:00Z', '2026-09-01T06:00:05Z', 'GA4', 'SUCCESS', 'SUCCESS', '2026-08-30', 20, 20, 0, 0, '', ''],
  ];
  let written: Exclude<CellValue, null>[][] | undefined;

  const sheet = {
    getLastRow: () => existing.length,
    getDataRange: () => ({ getValues: () => existing.map((row) => [...row]) }),
    getRange: () => ({
      setValues(values: Exclude<CellValue, null>[][]) {
        written = values;
      },
    }),
  };
  const workbook = {
    getSheetByName: () => sheet,
    getSpreadsheetTimeZone: () => 'Europe/Athens',
  };

  const summary = upsertRows(
    'Run Log',
    ['runId', 'source'],
    [{
      runId: 'run-new',
      startedAt: '2026-09-02T06:00:00Z',
      finishedAt: '2026-09-02T06:00:05Z',
      source: 'GSC_INDEX',
      sourceStatus: 'SUCCESS',
      overallStatus: 'SUCCESS',
      dataAsOf: '',
      fetchedRows: 16,
      insertedRows: 16,
      updatedRows: 0,
      unchangedRows: 0,
      errorClass: '',
      errorMessage: '',
      stageDurationMs: 842,
    }],
    { getVerifiedActiveWorkbook: () => workbook },
  );

  assert.deepEqual(summary, { inserted: 1, updated: 0, unchanged: 0, total: 3 });
  assert.ok(written);
  assert.deepEqual(written![0], [...OLD_HEADERS, 'stageDurationMs']);
  assert.deepEqual(written![1], [...existing[1], '']);
  assert.deepEqual(written![2], [...existing[2], '']);
  assert.equal(written![3][3], 'GSC_INDEX');
  assert.equal(written![3].at(-1), 842);
});
