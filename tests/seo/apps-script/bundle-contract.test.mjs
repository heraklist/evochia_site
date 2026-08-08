import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

test('bundle checker rejects a stale committed artifact copy', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'evochia-bundle-contract-'));
  cpSync('seo/apps-script/generated', path.join(root, 'generated'), { recursive: true });
  cpSync('seo/apps-script/generated-smoke', path.join(root, 'generated-smoke'), { recursive: true });

  const stalePath = path.join(root, 'generated', 'Code.gs');
  writeFileSync(stalePath, `${readFileSync(stalePath, 'utf8')}\n// stale mutation\n`, 'utf8');

  const result = spawnSync(
    process.execPath,
    ['seo/apps-script/check-bundle.mjs', '--committed-root', root],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /bundle mismatch.*generated\/Code\.gs/i);
});
