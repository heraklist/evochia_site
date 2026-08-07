import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeRowRecords,
  type RowRecord,
} from '../../../seo/apps-script/src/SheetWriter.ts';

test('repeated row merge is idempotent for every GSC report grain', () => {
  const cases: Array<{
    headers: string[];
    keyColumns: string[];
    row: RowRecord;
  }> = [
    {
      headers: ['date', 'clicks', 'impressions', 'ctr', 'position'],
      keyColumns: ['date'],
      row: { date: '2026-08-02', clicks: 5, impressions: 50, ctr: 0.1, position: 4 },
    },
    {
      headers: ['date', 'page', 'clicks', 'impressions', 'ctr', 'position'],
      keyColumns: ['date', 'page'],
      row: {
        date: '2026-08-02',
        page: '/en/private-chef.html',
        clicks: 3,
        impressions: 30,
        ctr: 0.1,
        position: 5,
      },
    },
    {
      headers: ['date', 'query', 'clicks', 'impressions', 'ctr', 'position'],
      keyColumns: ['date', 'query'],
      row: {
        date: '2026-08-02',
        query: 'private chef greece',
        clicks: 2,
        impressions: 20,
        ctr: 0.1,
        position: 6,
      },
    },
  ];

  for (const { headers, keyColumns, row } of cases) {
    const first = mergeRowRecords(headers, [], keyColumns, [row]);
    assert.deepEqual(first.summary, {
      inserted: 1,
      updated: 0,
      unchanged: 0,
      total: 1,
    });

    const second = mergeRowRecords(headers, first.rows, keyColumns, [row]);
    assert.deepEqual(second.summary, {
      inserted: 0,
      updated: 0,
      unchanged: 1,
      total: 1,
    });

    const changed = mergeRowRecords(
      headers,
      second.rows,
      keyColumns,
      [{ ...row, clicks: 9 }],
    );
    assert.deepEqual(changed.summary, {
      inserted: 0,
      updated: 1,
      unchanged: 0,
      total: 1,
    });
    assert.equal(changed.rows[0].clicks, 9);
  }
});
