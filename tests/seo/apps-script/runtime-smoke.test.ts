import assert from 'node:assert/strict';
import test from 'node:test';
import { runRuntimeSmoke } from '../../../seo/apps-script/smoke/RuntimeSmoke.ts';

test('data-free runtime smoke exercises production logic with synthetic transports', () => {
  const result = runRuntimeSmoke();
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.checks.map(({ name, ok }) => ({ name, ok })),
    [
      { name: 'athens_calendar_dst', ok: true },
      { name: 'gsc_los_angeles_calendar', ok: true },
      { name: 'url_query_parser', ok: true },
      { name: 'page_classification', ok: true },
      { name: 'url_quality_classification', ok: true },
      { name: 'hostname_validation', ok: true },
      { name: 'config_validation', ok: true },
      { name: 'ga4_import_assembly', ok: true },
      { name: 'gsc_import_assembly', ok: true },
      { name: 'sparse_and_error_semantics', ok: true },
    ],
  );
});
