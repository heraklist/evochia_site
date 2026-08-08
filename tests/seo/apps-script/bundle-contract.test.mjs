import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const production = () => readFileSync('seo/apps-script/generated/Code.gs', 'utf8');
const smoke = () => readFileSync('seo/apps-script/generated-smoke/Code.gs', 'utf8');

test('production bundle contains no module syntax or smoke entrypoint', () => {
  const code = production();
  assert.doesNotMatch(code, /^\s*(?:import|export)\s/m);
  assert.doesNotMatch(code, /runRuntimeSmoke/);
  assert.match(code, /onOpen/);
});

test('smoke bundle contains runtime smoke and no unresolved module syntax', () => {
  const code = smoke();
  assert.doesNotMatch(code, /^\s*(?:import|export)\s/m);
  assert.match(code, /runRuntimeSmoke/);
});
