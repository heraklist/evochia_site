import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const smoke = () => readFileSync('seo/apps-script/generated-smoke/Code.gs', 'utf8');

const FORBIDDEN_GOOGLE_SERVICES = [
  'SpreadsheetApp',
  'UrlFetchApp',
  'ScriptApp',
  'DriveApp',
];

test('non-production smoke bundle infers no Google service capabilities', () => {
  const code = smoke();
  for (const service of FORBIDDEN_GOOGLE_SERVICES) {
    assert.doesNotMatch(
      code,
      new RegExp(`\\b${service}\\b`),
      `generated-smoke/Code.gs must not contain ${service}; the synthetic smoke must not infer production OAuth scopes`,
    );
  }
});

test('scope-clean smoke keeps the real runtime entrypoint discoverable', () => {
  const code = smoke();
  assert.match(code, /^function runRuntimeSmoke\s*\(/m);
});
