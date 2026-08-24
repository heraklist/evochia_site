import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deduplicateGscRows,
  GSC_REPORT_SPECS,
} from '../../../seo/apps-script/src/GscImporter.ts';
import type { GscRow } from '../../../seo/apps-script/src/GscClient.ts';

test('defines isolated daily, page, and query report grains', () => {
  assert.deepEqual(GSC_REPORT_SPECS, [
    {
      id: 'daily',
      dimensions: ['date'],
      aggregationType: 'byProperty',
      sheetName: 'GSC Daily',
      keyColumns: ['date'],
    },
    {
      id: 'pages',
      dimensions: ['date', 'page'],
      aggregationType: 'auto',
      sheetName: 'GSC Pages',
      keyColumns: ['date', 'page'],
    },
    {
      id: 'queries',
      dimensions: ['date', 'query'],
      aggregationType: 'byProperty',
      sheetName: 'GSC Queries',
      keyColumns: ['date', 'query'],
    },
  ]);

  for (const spec of GSC_REPORT_SPECS) {
    assert.equal(spec.dimensions.includes('country'), false);
    assert.equal(spec.dimensions.includes('device'), false);
    assert.equal(spec.dimensions.includes('searchAppearance'), false);
  }
});

test('deduplicates rows using the selected report key only', () => {
  const rows: GscRow[] = [
    {
      date: '2026-08-03',
      query: 'private chef greece',
      page: 'https://www.evochia.gr/en/private-chef/',
      country: '',
      device: '',
      searchAppearance: '',
      clicks: 1,
      impressions: 10,
      ctr: 0.1,
      position: 7,
    },
    {
      date: '2026-08-03',
      query: 'luxury private chef',
      page: 'https://www.evochia.gr/en/private-chef/',
      country: '',
      device: '',
      searchAppearance: '',
      clicks: 2,
      impressions: 20,
      ctr: 0.1,
      position: 5,
    },
  ];

  const pageRows = deduplicateGscRows(rows, ['date', 'page']);
  assert.equal(pageRows.length, 1);
  assert.equal(pageRows[0].query, 'luxury private chef');
});
