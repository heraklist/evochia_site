import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const LF_MANAGED_PATHS = [
  'seo/apps-script/appsscript.json',
  'seo/apps-script/generated/Code.gs',
  'seo/apps-script/generated/appsscript.json',
  'seo/apps-script/generated-smoke/Code.gs',
  'seo/apps-script/generated-smoke/appsscript.json',
];

const production = () => readFileSync('seo/apps-script/generated/Code.gs', 'utf8');
const smoke = () => readFileSync('seo/apps-script/generated-smoke/Code.gs', 'utf8');
const FUTURE_ONLY_GOOGLE_SERVICE_CALL = /\b(?:UrlFetchApp|ScriptApp|DriveApp|TagManager|Drive)\s*\.\s*[A-Za-z_$][\w$]*/;

test('production bundle contains no module syntax or smoke entrypoint', () => {
  const code = production();
  assert.doesNotMatch(code, /^\s*(?:import|export)\s/m);
  assert.doesNotMatch(code, /runRuntimeSmoke/);
  assert.match(code, /onOpen/);
});

test('production bundle excludes future-only Google API capabilities and endpoints', () => {
  const code = production();
  assert.doesNotMatch(code, FUTURE_ONLY_GOOGLE_SERVICE_CALL);
  assert.doesNotMatch(code, /(?:analyticsdata|searchconsole)\.googleapis\.com/);
  assert.doesNotMatch(code, /webmasters\/v3|urlInspection/);
});

test('smoke bundle contains runtime smoke and no unresolved module syntax', () => {
  const code = smoke();
  assert.doesNotMatch(code, /^\s*(?:import|export)\s/m);
  assert.match(code, /runRuntimeSmoke/);
});

test('Apps Script manifest and generated artifacts use explicit LF Git attributes', () => {
  const result = spawnSync(
    'git',
    ['check-attr', 'text', 'eol', '--', ...LF_MANAGED_PATHS],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.stdout.trim().split(/\r?\n/).sort(),
    LF_MANAGED_PATHS.flatMap((relativePath) => [
      `${relativePath}: text: set`,
      `${relativePath}: eol: lf`,
    ]).sort(),
  );
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

test('clasp configuration stays placeholder-only and real local config is ignored', () => {
  const example = JSON.parse(readFileSync('seo/apps-script/.clasp.json.example', 'utf8'));
  assert.equal(example.scriptId, 'NON_PRODUCTION_TEST_SCRIPT_ID');
  assert.equal(example.rootDir, 'generated-smoke');

  const ignore = readFileSync('.gitignore', 'utf8');
  assert.match(ignore, /^seo\/apps-script\/\.clasp\.json$/m);
  assert.match(ignore, /^seo\/apps-script\/\.runtime-smoke\.local\.json$/m);
});
