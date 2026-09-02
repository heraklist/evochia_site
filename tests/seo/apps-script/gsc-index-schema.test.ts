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
  reads: Array<[number, number, number, number]>;
} {
  const rows = initialRows.map((row) => [...row]);
  const writes: unknown[][][] = [];
  const reads: Array<[number, number, number, number]> = [];

  return {
    rows,
    writes,
    reads,
    sheet: {
      getLastRow: () => rows.length,
      getRange: (row, column, numRows, numColumns) => ({
        getValues() {
          reads.push([row, column, numRows, numColumns]);
          return rows
            .slice(row - 1, row - 1 + numRows)
            .map((valueRow) => valueRow.slice(column - 1, column - 1 + numColumns));
        },
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

test('schema initializer fails closed on missing or reordered canonical headers', () => {
  const invalidSchemas = [
    EXPECTED_HEADERS.slice(0, 18),
    [EXPECTED_HEADERS[1], EXPECTED_HEADERS[0], ...EXPECTED_HEADERS.slice(2)],
  ];

  for (const headers of invalidSchemas) {
    const { sheet, writes } = sheetWithRows([[...headers]]);
    assert.throws(() => ensureGscIndexingSchema(sheet), SchemaError);
    assert.equal(writes.length, 0);
  }
});

test('schema validation ignores cells beyond the canonical 19-column contract', () => {
  const { sheet, writes, reads } = sheetWithRows([[
    ...EXPECTED_HEADERS,
    'Unrelated note outside canonical schema',
  ]]);

  ensureGscIndexingSchema(sheet);
  assert.deepEqual(reads, [[1, 1, 1, EXPECTED_HEADERS.length]]);
  assert.equal(writes.length, 0);
});

test('preflight validator reads only the bounded 1x19 header range and never writes', () => {
  const { sheet, writes, reads } = sheetWithRows([
    [...EXPECTED_HEADERS],
    ...Array.from({ length: 100 }, () => Array.from({ length: 25 }, () => 'data')),
  ]);

  validateGscIndexingSchema(sheet);
  assert.deepEqual(reads, [[1, 1, 1, EXPECTED_HEADERS.length]]);
  assert.equal(writes.length, 0);
});

test('preflight validator rejects an empty sheet and never initializes it', () => {
  const { sheet, rows, writes, reads } = sheetWithRows([]);

  assert.throws(() => validateGscIndexingSchema(sheet), SchemaError);
  assert.deepEqual(rows, []);
  assert.deepEqual(reads, []);
  assert.equal(writes.length, 0);
});

test('preflight validator rejects mismatched schemas without writing', () => {
  const { sheet, writes } = sheetWithRows([[...EXPECTED_HEADERS.slice(0, 18)]]);

  assert.throws(() => validateGscIndexingSchema(sheet), SchemaError);
  assert.equal(writes.length, 0);
});
