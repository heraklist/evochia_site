import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeRowRecords,
  upsertRows,
  type RowRecord,
} from '../../../seo/apps-script/src/SheetWriter.ts';

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
