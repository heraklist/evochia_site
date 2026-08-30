import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const CHECKOUT_SHA = '34e114876b0b11c390a56381ad16ebd13914f8d5';
const SETUP_NODE_SHA = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const WORKFLOW_PATH = '.github/workflows/page-integrity-validation.yml';
const EXPECTED_PATHS = [
  'en/**',
  'el/**',
  'middleware.ts',
  'sitemap.xml',
  'tests/seo/page-integrity.test.mjs',
  'tests/seo/page-integrity-workflow-contract.test.mjs',
  'package.json',
  'package-lock.json',
  WORKFLOW_PATH,
];

function normalizePathScalar(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (quote === "'" || quote === '"') {
    const closingQuote = trimmed.indexOf(quote, 1);
    if (closingQuote !== -1) {
      const suffix = trimmed.slice(closingQuote + 1).trim();
      if (suffix === '' || suffix.startsWith('#')) return trimmed.slice(1, closingQuote);
    }
  }
  return trimmed.replace(/\s+#.*$/, '').trimEnd();
}

function stepBlock(workflow, stepName) {
  const marker = `      - name: ${stepName}\n`;
  const start = workflow.indexOf(marker);
  if (start === -1) return '';
  const remainder = workflow.slice(start + marker.length);
  const nextStep = remainder.search(/^      - name:/m);
  return nextStep === -1
    ? workflow.slice(start)
    : workflow.slice(start, start + marker.length + nextStep);
}

function assertContract(workflow) {
  const triggerSection = workflow.match(/^on:\n[\s\S]*?(?=^permissions:)/m)?.[0] ?? '';
  const pullRequestPaths = triggerSection.match(
    /^on:\n  pull_request:\n    branches:\n      - main\n    paths:\n(?<paths>(?:      - [^\n]+\n)+)\n$/,
  );
  assert.ok(
    pullRequestPaths,
    'page-integrity workflow must trigger only on pull requests to main with an explicit paths allowlist',
  );

  const rawPaths = [...pullRequestPaths.groups.paths.matchAll(/^\s{6}- (.+)$/gm)].map(
    (match) => match[1],
  );
  assert.ok(
    rawPaths.every((path) => !/^\s*['"]?!/.test(path)),
    'page-integrity workflow must not contain negative path entries',
  );
  assert.deepEqual(
    rawPaths.map(normalizePathScalar),
    EXPECTED_PATHS,
    'page-integrity workflow paths must match the exact reviewed allowlist',
  );

  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.doesNotMatch(workflow, /^\s+continue-on-error\s*:/m);

  const actionReferences = [...workflow.matchAll(/^\s+uses:\s+([^\s#]+)/gm)].map(
    (match) => match[1],
  );
  assert.ok(actionReferences.length > 0, 'page-integrity workflow must use pinned actions');
  for (const reference of actionReferences) {
    assert.match(reference, /@[0-9a-f]{40}$/, 'every action must be pinned to an immutable SHA');
  }
  assert.ok(actionReferences.includes(`actions/checkout@${CHECKOUT_SHA}`));
  assert.ok(actionReferences.includes(`actions/setup-node@${SETUP_NODE_SHA}`));

  const checkoutStep = stepBlock(workflow, 'Check out repository');
  assert.match(checkoutStep, /persist-credentials: false/);

  const setupNodeStep = stepBlock(workflow, 'Set up Node.js');
  assert.match(setupNodeStep, /node-version: ["']22\.23\.2["']/);

  const installStep = stepBlock(workflow, 'Install locked dependencies');
  assert.match(installStep, /run: npm ci --ignore-scripts/);

  const testStep = stepBlock(workflow, 'Run SEO page integrity contracts');
  assert.match(testStep, /run: npm run test:unit/);

  const commands = workflow.replace(/^\s{8}if:[^\n]*$/gm, '');
  assert.doesNotMatch(commands, /\|\|/);
  assert.doesNotMatch(commands, /^\s*set\s+\+e\s*$/m);
  assert.doesNotMatch(commands, /(?:;\s*(?:true|:)|^\s*exit\s+0\s*$)/m);
}

const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8').replaceAll('\r\n', '\n');

test('SEO Page Integrity workflow is pinned, read-only, and exact-path guarded', () => {
  assert.doesNotThrow(() => assertContract(workflow));
});

test('SEO Page Integrity workflow contract fails closed on security or coverage drift', () => {
  const mutations = [
    workflow.replace(
      '      - tests/seo/page-integrity-workflow-contract.test.mjs\n',
      '',
    ),
    workflow.replace('      - en/**\n', '      - en/**\n      - !en/private-chef.html\n'),
    workflow.replace('persist-credentials: false', 'persist-credentials: true'),
    workflow.replace(`actions/checkout@${CHECKOUT_SHA}`, 'actions/checkout@v4'),
    workflow.replace('permissions:\n  contents: read', 'permissions:\n  contents: write'),
    workflow.replace('node-version: "22.23.2"', 'node-version: "22"'),
    workflow.replace('run: npm run test:unit', 'run: npm run test:unit || true'),
  ];

  for (const mutated of mutations) {
    assert.notEqual(mutated, workflow, 'mutation fixture must change the workflow');
    assert.throws(() => assertContract(mutated));
  }
});
