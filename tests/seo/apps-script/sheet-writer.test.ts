import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeRowRecords,
  serializeLiteralCell,
  upsertRows,
  type CellValue,
  type RowRecord,
} from '../../../seo/apps-script/src/SheetWriter.ts';
import { getVerifiedActiveWorkbook } from '../../../seo/apps-script/src/WorkbookIdentity.ts';

test('serializes formula-like strings as literal Sheet cells', () => {
  assert.deepEqual(
    [
      serializeLiteralCell('=IMPORTXML("https://example.test", "//title")'),
      serializeLiteralCell('=HYPERLINK("https://example.test", "Evochia")'),
      serializeLiteralCell('+SUM(A1:A2)'),
      serializeLiteralCell('-1+1'),
      serializeLiteralCell('@something'),
    ],
    [
      '\'=IMPORTXML("https://example.test", "//title")',
      '\'=HYPERLINK("https://example.test", "Evochia")',
      "'+SUM(A1:A2)",
      "'-1+1",
      "'@something",
    ],
  );
});

test('preserves safe Sheet cell values while converting null to empty', () => {
  const date = new Date('2026-08-01T00:00:00.000Z');

  assert.equal(serializeLiteralCell('plain text'), 'plain text');
  assert.equal(serializeLiteralCell(42), 42);
  assert.equal(serializeLiteralCell(false), false);
  assert.equal(serializeLiteralCell(date), date);
  assert.equal(serializeLiteralCell(null), '');
});

test('serializes the complete upsert matrix immediately before setValues', () => {
  let written: Exclude<CellValue, null>[][] | undefined;
  const sheet = {
    getLastRow: () => 0,
    getDataRange: () => ({ getValues: () => [] }),
    getRange: () => ({
      setValues: (values: Exclude<CellValue, null>[][]) => {
        written = values;
      },
    }),
  };
  const workbook = {
    getSheetByName: () => sheet,
    getSpreadsheetTimeZone: () => 'Europe/Athens',
  };

  upsertRows(
    'GSC Pages',
    ['id'],
    [{
      id: 'row-1',
      import: '=IMPORTXML("https://example.test", "//title")',
      link: '=HYPERLINK("https://example.test", "Evochia")',
      sum: '+SUM(A1:A2)',
      math: '-1+1',
      handle: '@something',
      label: 'Evochia',
    }],
    { getVerifiedActiveWorkbook: () => workbook },
  );

  assert.deepEqual(written, [
    ['id', 'import', 'link', 'sum', 'math', 'handle', 'label'],
    [
      'row-1',
      '\'=IMPORTXML("https://example.test", "//title")',
      '\'=HYPERLINK("https://example.test", "Evochia")',
      "'+SUM(A1:A2)",
      "'-1+1",
      "'@something",
      'Evochia',
    ],
  ]);
});

test('matches an Athens-local Sheet Date key to the same YYYY-MM-DD string', () => {
  const headers = ['date', 'page', 'clicks'];
  const keyColumns = ['date', 'page'];
  const existing: RowRecord = {
    // 2026-08-01 00:00 in Europe/Athens (UTC+03 during DST).
    date: new Date('2026-07-31T21:00:00.000Z'),
    page: 'https://www.evochia.gr/en/private-chef/',
    clicks: 3,
  };
  const incoming: RowRecord = {
    date: '2026-08-01',
    page: 'https://www.evochia.gr/en/private-chef/',
    clicks: 3,
  };

  const merged = mergeRowRecords(
    headers,
    [existing],
    keyColumns,
    [incoming],
    'Europe/Athens',
  );

  assert.deepEqual(merged.summary, {
    inserted: 0,
    updated: 0,
    unchanged: 1,
    total: 1,
  });
});

test('does not clear existing sheet contents before a replacement write succeeds', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'SpreadsheetApp');
  let clearCalls = 0;
  let setValueCalls = 0;

  const sheet = {
    getLastRow: () => 2,
    getDataRange: () => ({
      getValues: () => [
        ['date', 'page', 'clicks'],
        [new Date('2026-07-31T21:00:00.000Z'), 'https://www.evochia.gr/en/private-chef/', 3],
      ],
    }),
    clearContents: () => {
      clearCalls += 1;
    },
    getRange: () => ({
      setValues: () => {
        setValueCalls += 1;
        throw new Error('simulated write failure');
      },
    }),
  };

  const workbook = {
    getId: () => 'configured-sheet-id',
    getSheetByName: () => sheet,
    getSpreadsheetTimeZone: () => 'Europe/Athens',
  };

  Object.defineProperty(globalThis, 'SpreadsheetApp', {
    configurable: true,
    value: {
      getActiveSpreadsheet: () => workbook,
    },
  });

  try {
    assert.throws(
      () => upsertRows(
        'GSC Pages',
        ['date', 'page'],
        [{
          date: '2026-08-01',
          page: 'https://www.evochia.gr/en/private-chef/',
          clicks: 4,
        }],
        {
          getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook({
            getConfig: () => ({ sheetId: 'configured-sheet-id' }),
            getActiveWorkbook: () => workbook,
          }),
        },
      ),
      /simulated write failure/,
    );

    assert.equal(setValueCalls, 1);
    assert.equal(
      clearCalls,
      0,
      'existing data must remain untouched when the replacement write fails',
    );
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'SpreadsheetApp', originalDescriptor);
    } else {
      delete (globalThis as Record<string, unknown>).SpreadsheetApp;
    }
  }
});

test('rejects a mismatched workbook before any sheet lookup, read, range, or write', () => {
  let sheetLookups = 0;
  let lastRowReads = 0;
  let dataReads = 0;
  let rangeReads = 0;
  let writes = 0;
  const sheet = {
    getLastRow: () => {
      lastRowReads += 1;
      return 0;
    },
    getDataRange: () => ({
      getValues: () => {
        dataReads += 1;
        return [];
      },
    }),
    getRange: () => {
      rangeReads += 1;
      return {
        setValues: () => {
          writes += 1;
        },
      };
    },
  };
  const workbook = {
    getId: () => 'different-sheet-id',
    getSheetByName: () => {
      sheetLookups += 1;
      return sheet;
    },
    getSpreadsheetTimeZone: () => 'Europe/Athens',
  };

  assert.throws(
    () => upsertRows(
      'GSC Pages',
      ['date', 'page'],
      [{ date: '2026-08-01', page: 'https://www.evochia.gr/en/private-chef/', clicks: 4 }],
      {
        getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook({
          getConfig: () => ({ sheetId: 'configured-sheet-id' }),
          getActiveWorkbook: () => workbook,
        }),
      },
    ),
    /does not match the configured sheet ID/,
  );
  assert.equal(sheetLookups, 0);
  assert.equal(lastRowReads, 0);
  assert.equal(dataReads, 0);
  assert.equal(rangeReads, 0);
  assert.equal(writes, 0);
});

test('writes rows after the active workbook ID matches the verified config', () => {
  let writes = 0;
  const sheet = {
    getLastRow: () => 0,
    getDataRange: () => ({ getValues: () => [] }),
    getRange: () => ({
      setValues: () => {
        writes += 1;
      },
    }),
  };
  const workbook = {
    getId: () => 'configured-sheet-id',
    getSheetByName: () => sheet,
    getSpreadsheetTimeZone: () => 'Europe/Athens',
  };

  const summary = upsertRows(
    'GSC Pages',
    ['date', 'page'],
    [{ date: '2026-08-01', page: 'https://www.evochia.gr/en/private-chef/', clicks: 4 }],
    {
      getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook({
        getConfig: () => ({ sheetId: 'configured-sheet-id' }),
        getActiveWorkbook: () => workbook,
      }),
    },
  );

  assert.deepEqual(summary, { inserted: 1, updated: 0, unchanged: 0, total: 1 });
  assert.equal(writes, 1);
});
