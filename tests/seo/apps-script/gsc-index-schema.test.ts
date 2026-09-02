import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GSC_INDEXING_HEADERS,
  SchemaError,
  ensureGscIndexingSchema,
  validateGscIndexingSchema,
  type GscIndexingSheet,
} from '../../../seo/apps-script/src/Setup.ts';

const EXPECTED_HEADERS = [
  'Checked At',
  'Run Id',
  'URL',
  'Outcome',
  'Verdict',
  'Coverage State',
  'Robots.txt State',
  'Indexing State',
  'Page Fetch State',
  'Crawled As',
  'Google Canonical',
  'User Canonical',
  'Canonical Match',
  'Last Crawl Time',
  'Sitemap',
  'Referring URLs',
  'Inspection Result Link',
  'Error Class',
  'Error Message',
] as const;

function sheetWithRows(initialRows: unknown[][]): {
  sheet: GscIndexingSheet;
  rows: unknown[][];
  writes: unknown[][][];
} {
  const rows = initialRows.map((row) => [...row]);
  const writes: unknown[][][] = [];

  return {
    rows,
    writes,
    sheet: {
      getLastRow: () => rows.length,
      getDataRange: () => ({ getValues: () => rows.map((row) => [...row]) }),
      getRange: (_row, _column, numRows, numColumns) => ({
        setValues(values) {
          writes.push(values.map((valueRow) => [...valueRow]));
          rows.splice(0, rows.length, ...values.slice(0, numRows).map((valueRow) => valueRow.slice(0, numColumns)));
        },
      }),
    },
  };
}

test('GSC Indexing canonical schema is exactly 19 columns in approved order', () => {
  assert.deepEqual(GSC_INDEXING_HEADERS, EXPECTED_HEADERS);
  assert.equal(GSC_INDEXING_HEADERS.length, 19);
});

test('setup-owned schema initializer writes exact headers into an empty sheet once', () => {
  const { sheet, rows, writes } = sheetWithRows([]);

  ensureGscIndexingSchema(sheet);
  assert.deepEqual(rows, [[...EXPECTED_HEADERS]]);
  assert.equal(writes.length, 1);

  ensureGscIndexingSchema(sheet);
  assert.deepEqual(rows, [[...EXPECTED_HEADERS]]);
  assert.equal(writes.length, 1, 'exact existing schema must not be rewritten');
});

test('schema initializer fails closed on 18, reordered, or extra headers', () => {
  const invalidSchemas = [
    EXPECTED_HEADERS.slice(0, 18),
    [EXPECTED_HEADERS[1], EXPECTED_HEADERS[0], ...EXPECTED_HEADERS.slice(2)],
    [...EXPECTED_HEADERS, 'Unexpected Column'],
  ];

  for (const headers of invalidSchemas) {
    const { sheet, writes } = sheetWithRows([[...headers]]);
    assert.throws(() => ensureGscIndexingSchema(sheet), SchemaError);
    assert.equal(writes.length, 0);
  }
});

test('preflight validator accepts exact schema without writing', () => {
  const { sheet, writes } = sheetWithRows([[...EXPECTED_HEADERS]]);

  validateGscIndexingSchema(sheet);
  assert.equal(writes.length, 0);
});

test('preflight validator rejects an empty sheet and never initializes it', () => {
  const { sheet, rows, writes } = sheetWithRows([]);

  assert.throws(() => validateGscIndexingSchema(sheet), SchemaError);
  assert.deepEqual(rows, []);
  assert.equal(writes.length, 0);
});

test('preflight validator rejects mismatched schemas without writing', () => {
  const { sheet, writes } = sheetWithRows([[...EXPECTED_HEADERS.slice(0, 18)]]);

  assert.throws(() => validateGscIndexingSchema(sheet), SchemaError);
  assert.equal(writes.length, 0);
});
