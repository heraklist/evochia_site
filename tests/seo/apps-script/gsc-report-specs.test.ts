import assert from 'node:assert/strict';
import test from 'node:test';
import { GSC_REPORT_SPECS } from '../../../seo/apps-script/src/GscImporter.ts';

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
