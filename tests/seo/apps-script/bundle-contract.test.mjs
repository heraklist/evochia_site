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
const FORBIDDEN_PRODUCTION_CAPABILITY = /\b(?:DriveApp|TagManager|MailApp|GmailApp)\s*\.|\bScriptApp\s*\.\s*(?:newTrigger|getProjectTriggers|deleteTrigger)\s*\(/;
const PUBLIC_CLASS_FIELD_DECLARATION = /\bclass(?:\s+[A-Za-z_$][\w$]*)?(?:\s+extends\s+[^\s{]+)?\s*{\s*(?:[A-Za-z_$][\w$]*;\s*)+(?=constructor\s*\()/;

test('production bundle contains no module syntax or smoke entrypoint', () => {
  const code = production();
  assert.doesNotMatch(code, /^\s*(?:import|export)\s/m);
  assert.doesNotMatch(code, /runRuntimeSmoke/);
  assert.match(code, /onOpen/);
});

test('production bundle contains only the intended read-only Google API surface', () => {
  const code = production();
  assert.match(code, /UrlFetchApp\s*\.\s*fetch/);
  assert.match(code, /ScriptApp\s*\.\s*getOAuthToken/);
  assert.match(code, /searchconsole\.googleapis\.com\/webmasters\/v3\/sites\//);
  assert.match(code, /searchAnalytics\/query/);
  assert.match(code, /analyticsdata\.googleapis\.com\/v1beta\//);
  assert.match(code, /:runReport/);

  // URL Inspection is now a permanent read-only production telemetry capability.
  // This assertion is intentionally one-way so future bundles cannot silently
  // drop indexing observability while appearing otherwise healthy.
  assert.match(code, /urlInspection\/index:inspect/);

  assert.doesNotMatch(code, FORBIDDEN_PRODUCTION_CAPABILITY);
  assert.doesNotMatch(code, /(?:www\.)?googleapis\.com\/drive\//i);
  assert.doesNotMatch(code, /tagmanager\.googleapis\.com/i);
});

test('smoke bundle contains runtime smoke, no unresolved module syntax, and no URL Inspection capability', () => {
  const code = smoke();
  assert.doesNotMatch(code, /^\s*(?:import|export)\s/m);
  assert.match(code, /runRuntimeSmoke/);
  assert.doesNotMatch(code, /urlInspection\/index:inspect/);
});

test('generated bundles exclude Apps Script-incompatible public class fields', () => {
  for (const [relativePath, code] of [
    ['generated/Code.gs', production()],
    ['generated-smoke/Code.gs', smoke()],
  ]) {
    assert.doesNotMatch(
      code,
      PUBLIC_CLASS_FIELD_DECLARATION,
      `${relativePath} contains an emitted public class field declaration`,
    );
  }
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
