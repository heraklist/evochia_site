import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const CHECKOUT_SHA = '34e114876b0b11c390a56381ad16ebd13914f8d5';
const SETUP_NODE_SHA = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const TRUFFLEHOG_IMAGE =
  'ghcr.io/trufflesecurity/trufflehog@sha256:b8acd9f7306d832b1f16e06003dac2283a737817954554111683ab7a56e9e539';

function readText(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n') : '';
}

function jobBlock(workflow, jobId) {
  const marker = `  ${jobId}:\n`;
  const start = workflow.indexOf(marker);
  if (start === -1) return '';

  const remainder = workflow.slice(start + marker.length);
  const nextJob = remainder.search(/^  [a-zA-Z0-9_-]+:\n/m);
  return nextJob === -1
    ? workflow.slice(start)
    : workflow.slice(start, start + marker.length + nextJob);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workflow = readText('.github/workflows/security-validation.yml');
const scanner = readText('scripts/security/secret-scan.sh');

test('dependency security gate audits the locked graph at moderate severity', () => {
  assert.equal(
    pkg.scripts['security:dependency-audit'],
    'npm audit --package-lock-only --audit-level=moderate',
  );

  const dependencyJob = jobBlock(workflow, 'dependency-audit');
  assert.match(dependencyJob, /node-version: ["']22\.23\.2["']/);
  assert.match(dependencyJob, /npm run security:dependency-audit/);
});

test('security workflow has repository-wide read-only triggers and immutable official actions', () => {
  assert.match(workflow, /^on:\n/m);
  assert.doesNotMatch(workflow, /^\s+paths(?:-ignore)?:/m);
  assert.match(workflow, /^permissions:\n  contents: read$/m);

  const actionReferences = [...workflow.matchAll(/^\s+uses:\s+([^\s#]+)/gm)].map(
    (match) => match[1],
  );
  assert.ok(actionReferences.length > 0, 'security workflow must use pinned actions');
  for (const reference of actionReferences) {
    assert.match(reference, /@[0-9a-f]{40}$/);
  }
  assert.ok(actionReferences.includes(`actions/checkout@${CHECKOUT_SHA}`));
  assert.ok(actionReferences.includes(`actions/setup-node@${SETUP_NODE_SHA}`));
});

test('secret gate scans full Git history in a read-only digest-pinned container', () => {
  const secretJob = jobBlock(workflow, 'secret-scan');
  assert.match(secretJob, /fetch-depth: 0/);
  assert.match(secretJob, /persist-credentials: false/);
  assert.doesNotMatch(secretJob, /\$\{\{\s*secrets\./);
  assert.match(secretJob, /bash scripts\/security\/secret-scan\.sh/);

  assert.match(scanner, new RegExp(TRUFFLEHOG_IMAGE.replaceAll('.', '\\.')));
  assert.match(scanner, /--platform linux\/amd64/);
  assert.match(scanner, /--read-only/);
  assert.match(scanner, /:\/repo:ro/);
  assert.match(scanner, /git file:\/\/\/repo/);
  assert.match(scanner, /--no-update/);
  assert.match(scanner, /--no-color/);
  assert.match(scanner, /--results=verified,unknown/);
  assert.match(scanner, /--fail(?:\s|\\|$)/m);
  assert.match(scanner, /--fail-on-scan-errors/);
});

test('aggregate security gate always runs and requires both scans to succeed', () => {
  const aggregateJob = jobBlock(workflow, 'security-gate');
  assert.match(aggregateJob, /if: \$\{\{ always\(\) \}\}/);
  assert.match(aggregateJob, /needs:\s*\n\s+- dependency-audit\s*\n\s+- secret-scan/);
  assert.match(aggregateJob, /needs\.dependency-audit\.result[^\n]+success/);
  assert.match(aggregateJob, /needs\.secret-scan\.result[^\n]+success/);
  assert.match(aggregateJob, /exit 1/);
});
