import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeRowRecords,
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
