import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const CHECKOUT_SHA = '34e114876b0b11c390a56381ad16ebd13914f8d5';
const SETUP_NODE_SHA = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const TRUFFLEHOG_IMAGE =
  'ghcr.io/trufflesecurity/trufflehog@sha256:b8acd9f7306d832b1f16e06003dac2283a737817954554111683ab7a56e9e539';
const SEO_CONTRACT_INPUT_PATHS = [
  '.github/workflows/security-validation.yml',
  '.github/workflows/codemaestro-validation.yml',
  '.github/workflows/site-analytics-validation.yml',
  '.github/workflows/browser-e2e-validation.yml',
  'scripts/security/secret-scan.sh',
  '.gitignore',
];
const SITE_ANALYTICS_CONTRACT_INPUT_PATHS = ['middleware.ts', 'js/**/*.js'];

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

function actionReferences(workflow) {
  return [...workflow.matchAll(/^\s+uses:\s+([^\s#]+)/gm)].map((match) => match[1]);
}

function assertCheckoutCredentialsDisabled(workflow, label, stepName = 'Check out repository') {
  const checkoutStep = stepBlock(workflow, stepName);
  assert.notEqual(checkoutStep, '', `${label} checkout step must exist`);
  assert.match(
    checkoutStep,
    /^\s{8}with:\n(?:\s{10}.+\n)*\s{10}persist-credentials: false$/m,
    `${label} checkout must disable persisted credentials`,
  );
}

function assertExactTriggerPaths(workflow, label, protectedPaths) {
  const triggerSection = workflow.match(/^on:\n[\s\S]*?(?=^permissions:)/m)?.[0] ?? '';
  const pullRequestPaths = triggerSection.match(
    /^on:\n  pull_request:\n    branches:\n      - main\n    paths:\n(?<paths>(?:      - [^\n]+\n)+)\n$/,
  );
  assert.ok(
    pullRequestPaths,
    `${label} must trigger on pull requests to main with paths (never paths-ignore)`,
  );
  const paths = [...pullRequestPaths.groups.paths.matchAll(/^\s{6}- (.+)$/gm)].map(
    (match) => match[1],
  );
  for (const protectedPath of protectedPaths) {
    assert.ok(
      paths.includes(protectedPath),
      `${label} paths must include exact contract input: ${protectedPath}`,
    );
  }
}

function assertImmutableOfficialActions(workflow, label) {
  const references = actionReferences(workflow);
  assert.ok(references.length > 0, `${label} must use pinned actions`);
  for (const reference of references) {
    assert.match(reference, /@[0-9a-f]{40}$/, `${label} action must use an immutable SHA`);
  }
  assert.ok(references.includes(`actions/checkout@${CHECKOUT_SHA}`));
  assert.ok(references.includes(`actions/setup-node@${SETUP_NODE_SHA}`));
}

const CODEMAESTRO_STEP_SUITES = new Map([
  ['Validate suite input', []],
  ['Check out repository', []],
  ['Set up Node.js', []],
  ['Install dependencies', ['unit-tests', 'typecheck', 'ci-review']],
  ['Run typechecks', ['typecheck', 'ci-review']],
  ['Run non-browser tests', ['unit-tests', 'ci-review']],
  ['Verify committed Apps Script bundles', ['ci-review']],
  ['Install Chromium', ['ci-review']],
  ['Run browser tests', ['ci-review']],
  ['Audit locked dependencies', ['dependency-audit', 'security-baseline', 'ci-review']],
  ['Scan full Git history for secrets', ['secrets-scan', 'security-baseline', 'ci-review']],
]);

function assertCodemaestroStepConditions(workflow) {
  const actualStepNames = [...workflow.matchAll(/^\s{6}- name: (.+)$/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(
    actualStepNames,
    [...CODEMAESTRO_STEP_SUITES.keys()],
    'CodeMaestro must contain exactly the reviewed validation steps',
  );

  assert.doesNotMatch(
    workflow,
    /^\s+continue-on-error\s*:/m,
    'CodeMaestro must not declare continue-on-error',
  );
  const commands = workflow.replace(/^\s{8}if:[^\n]*$/gm, '');
  assert.doesNotMatch(
    commands,
    /\|\|/,
    'CodeMaestro commands must not contain a shell failure bypass',
  );
  assert.doesNotMatch(
    commands,
    /^\s*set\s+\+e\s*$/m,
    'CodeMaestro commands must not disable shell error handling',
  );
  assert.doesNotMatch(
    commands,
    /(?:;\s*(?:true|:)|^\s*exit\s+0\s*$)/m,
    'CodeMaestro commands must not force a successful exit',
  );

  for (const [stepName, suites] of CODEMAESTRO_STEP_SUITES) {
    const step = stepBlock(workflow, stepName);
    assert.notEqual(step, '', `CodeMaestro step is missing: ${stepName}`);

    const conditions = [...step.matchAll(/^\s{8}if:\s*(.+)$/gm)].map((match) => match[1]);
    if (suites.length === 0) {
      assert.equal(conditions.length, 0, `${stepName} must be unconditional`);
      continue;
    }

    assert.equal(conditions.length, 1, `${stepName} must have exactly one suite condition`);
    const expression = conditions[0].match(/^\$\{\{\s*(.+?)\s*\}\}$/)?.[1] ?? '';
    assert.notEqual(expression, '', `${stepName} must use a GitHub expression`);

    const actualSuites = expression.split(/\s*\|\|\s*/).map((clause) => {
      const suite = clause.match(/^inputs\.suite\s*==\s*'([^']+)'$/)?.[1];
      assert.ok(suite, `${stepName} condition must be an OR-list of exact suite comparisons`);
      return suite;
    });
    assert.equal(
      new Set(actualSuites).size,
      actualSuites.length,
      `${stepName} condition must not repeat suite comparisons`,
    );
    assert.deepEqual(
      [...actualSuites].sort(),
      [...suites].sort(),
      `${stepName} condition must allow exactly its reviewed suite set`,
    );
  }
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workflow = readText('.github/workflows/security-validation.yml');
const scanner = readText('scripts/security/secret-scan.sh');
const codemaestroWorkflow = readText('.github/workflows/codemaestro-validation.yml');
const analyticsWorkflow = readText('.github/workflows/site-analytics-validation.yml');
const browserWorkflow = readText('.github/workflows/browser-e2e-validation.yml');
const seoWorkflow = readText('.github/workflows/seo-data-hub-validation.yml');

test('dependency security gate audits the locked graph at moderate severity', () => {
  assert.equal(
    pkg.scripts['security:dependency-audit'],
    'npm audit --package-lock-only --audit-level=moderate',
  );

  const dependencyJob = jobBlock(workflow, 'dependency-audit');
  assert.match(dependencyJob, /persist-credentials: false/);
  assert.match(dependencyJob, /node-version: ["']22\.23\.2["']/);
  assert.match(dependencyJob, /npm run security:dependency-audit/);
});

test('security workflow has repository-wide read-only triggers and immutable official actions', () => {
  const triggerSection = workflow.match(/^on:\n[\s\S]*?(?=^permissions:)/m)?.[0] ?? '';
  assert.equal(
    triggerSection,
    `on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main
  workflow_dispatch:

`,
  );
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
  assert.match(scanner, /--cap-drop(?:=|\s+)ALL/);
  assert.match(scanner, /--security-opt(?:=|\s+)no-new-privileges/);
  assert.match(scanner, /--tmpfs \/tmp:[^\n]+/);
  assert.match(scanner, /:\/repo:ro/);
  assert.match(scanner, /git file:\/\/\/repo/);
  assert.match(scanner, /--no-update/);
  assert.match(scanner, /--no-color/);
  assert.match(scanner, /--results=verified,unknown/);
  assert.match(scanner, /--fail(?:\s|\\|$)/m);
  assert.match(scanner, /--fail-on-scan-errors/);
});

test('secret scanner uses the pinned safe formatter instead of logging raw values', () => {
  assert.match(scanner, /--github-actions/);
  assert.doesNotMatch(scanner, /--json(?=[\s\\=]|$)/m);
  assert.doesNotMatch(scanner, /--json-legacy(?=[\s\\=]|$)/m);
});

test('aggregate security gate always runs and requires both scans to succeed', () => {
  const aggregateJob = jobBlock(workflow, 'security-gate');
  assert.match(aggregateJob, /if: \$\{\{ always\(\) \}\}/);
  assert.match(aggregateJob, /needs:\s*\n\s+- dependency-audit\s*\n\s+- secret-scan/);
  assert.match(aggregateJob, /needs\.dependency-audit\.result[^\n]+success/);
  assert.match(aggregateJob, /needs\.secret-scan\.result[^\n]+success/);
  assert.match(aggregateJob, /exit 1/);
});

test('CodeMaestro exposes only validation suites backed by real commands', () => {
  const optionBlock = codemaestroWorkflow.match(
    /^\s{8}options:\n(?<options>(?:\s{10}- [^\n]+\n)+)/m,
  )?.groups.options ?? '';
  const options = [...optionBlock.matchAll(/^\s{10}- (.+)$/gm)].map((match) => match[1]);

  assert.deepEqual(options, [
    'unit-tests',
    'typecheck',
    'dependency-audit',
    'secrets-scan',
    'security-baseline',
    'ci-review',
  ]);
  assert.doesNotMatch(codemaestroWorkflow, /npm pkg get|\bnpm test\b|skipp(?:ed|ing)|unimplemented/i);
});

test('CodeMaestro rejects invalid suite conditions and failure bypasses', () => {
  assert.doesNotThrow(() => assertCodemaestroStepConditions(codemaestroWorkflow));

  const mutations = [
    {
      name: 'impossible AND suite combination',
      error: /OR-list of exact suite comparisons/,
      workflow: codemaestroWorkflow.replace(
        "inputs.suite == 'unit-tests' || inputs.suite == 'typecheck' || inputs.suite == 'ci-review'",
        "inputs.suite == 'unit-tests' && inputs.suite == 'typecheck' && inputs.suite == 'ci-review'",
      ),
    },
    {
      name: 'literal-false condition retaining expected suite names',
      error: /OR-list of exact suite comparisons/,
      workflow: codemaestroWorkflow.replace(
        "inputs.suite == 'typecheck' || inputs.suite == 'ci-review'",
        "false && inputs.suite == 'typecheck' && inputs.suite == 'ci-review'",
      ),
    },
    {
      name: 'unexpected extra suite in a valid OR-list',
      error: /allow exactly its reviewed suite set/,
      workflow: codemaestroWorkflow.replace(
        "inputs.suite == 'typecheck' || inputs.suite == 'ci-review'",
        "inputs.suite == 'typecheck' || inputs.suite == 'security-baseline' || inputs.suite == 'ci-review'",
      ),
    },
    {
      name: 'unexpected condition on an unconditional step',
      error: /must be unconditional/,
      workflow: codemaestroWorkflow.replace(
        '      - name: Check out repository\n',
        '      - name: Check out repository\n        if: ${{ always() }}\n',
      ),
    },
    {
      name: 'step-level continue-on-error',
      error: /must not declare continue-on-error/,
      workflow: codemaestroWorkflow.replace(
        '        run: npm run test:e2e\n',
        '        continue-on-error: true\n        run: npm run test:e2e\n',
      ),
    },
    {
      name: 'shell true fallback',
      error: /shell failure bypass/,
      workflow: codemaestroWorkflow.replace(
        '        run: npm run test:e2e\n',
        '        run: npm run test:e2e || true\n',
      ),
    },
    {
      name: 'shell fallback command',
      error: /shell failure bypass/,
      workflow: codemaestroWorkflow.replace(
        '        run: npm run security:dependency-audit\n',
        '        run: npm run security:dependency-audit || echo "ignored"\n',
      ),
    },
    {
      name: 'shell error disabling',
      error: /disable shell error handling/,
      workflow: codemaestroWorkflow.replace(
        '        run: |\n          npm run test:unit\n',
        '        run: |\n          set +e\n          npm run test:unit\n',
      ),
    },
    {
      name: 'shell semicolon success fallback',
      error: /force a successful exit/,
      workflow: codemaestroWorkflow.replace(
        '        run: npm run test:e2e\n',
        '        run: npm run test:e2e; true\n',
      ),
    },
    {
      name: 'explicit successful exit',
      error: /force a successful exit/,
      workflow: codemaestroWorkflow.replace(
        '          npm run typecheck:gas\n',
        '          npm run typecheck:gas\n          exit 0\n',
      ),
    },
  ];

  for (const mutation of mutations) {
    assert.notEqual(mutation.workflow, codemaestroWorkflow, `${mutation.name} fixture must mutate YAML`);
    assert.throws(
      () => assertCodemaestroStepConditions(mutation.workflow),
      mutation.error,
      mutation.name,
    );
  }
});

test('CodeMaestro uses exact Node and installs dependencies without lifecycle scripts', () => {
  assertImmutableOfficialActions(codemaestroWorkflow, 'CodeMaestro workflow');
  assert.match(codemaestroWorkflow, /persist-credentials: false/);
  assert.match(codemaestroWorkflow, /fetch-depth: 0/);
  assert.match(codemaestroWorkflow, /node-version: ["']22\.23\.2["']/);

  const installStep = stepBlock(codemaestroWorkflow, 'Install dependencies');
  assert.match(installStep, /unit-tests/);
  assert.match(installStep, /typecheck/);
  assert.match(installStep, /ci-review/);
  assert.match(installStep, /run: npm ci --ignore-scripts/);
});

test('CodeMaestro unit and typecheck suites run every implemented family explicitly', () => {
  const unitStep = stepBlock(codemaestroWorkflow, 'Run non-browser tests');
  assert.match(unitStep, /unit-tests/);
  assert.match(unitStep, /ci-review/);
  assert.match(unitStep, /npm run test:unit/);
  assert.match(unitStep, /npm run test:analytics/);
  assert.match(unitStep, /npm run seo:test:apps-script\n/);
  assert.match(unitStep, /npm run seo:test:apps-script-contracts/);

  const typecheckStep = stepBlock(codemaestroWorkflow, 'Run typechecks');
  assert.match(typecheckStep, /typecheck/);
  assert.match(typecheckStep, /ci-review/);
  assert.match(typecheckStep, /npm run typecheck\n/);
  assert.match(typecheckStep, /npm run typecheck:gas/);
});

test('CodeMaestro security suites and ci-review are blocking and complete', () => {
  const dependencyStep = stepBlock(codemaestroWorkflow, 'Audit locked dependencies');
  assert.match(dependencyStep, /dependency-audit/);
  assert.match(dependencyStep, /security-baseline/);
  assert.match(dependencyStep, /ci-review/);
  assert.match(dependencyStep, /npm run security:dependency-audit/);

  const secretStep = stepBlock(codemaestroWorkflow, 'Scan full Git history for secrets');
  assert.match(secretStep, /secrets-scan/);
  assert.match(secretStep, /security-baseline/);
  assert.match(secretStep, /ci-review/);
  assert.match(secretStep, /bash scripts\/security\/secret-scan\.sh/);

  const bundleStep = stepBlock(codemaestroWorkflow, 'Verify committed Apps Script bundles');
  assert.match(bundleStep, /ci-review/);
  assert.match(bundleStep, /npm run seo:check:apps-script-bundle/);

  const browserInstallStep = stepBlock(codemaestroWorkflow, 'Install Chromium');
  assert.match(browserInstallStep, /ci-review/);
  assert.match(browserInstallStep, /npx playwright install --with-deps chromium/);

  const browserTestStep = stepBlock(codemaestroWorkflow, 'Run browser tests');
  assert.match(browserTestStep, /ci-review/);
  assert.match(browserTestStep, /npm run test:e2e/);
});

test('Site Analytics uses the repository Node version and immutable actions', () => {
  assertImmutableOfficialActions(analyticsWorkflow, 'Site Analytics workflow');
  assert.match(analyticsWorkflow, /node-version: ["']22\.23\.2["']/);
});

test('pull-request workflows executing repository code disable checkout credentials', () => {
  for (const [label, pullRequestWorkflow, stepName] of [
    ['Security Validation dependency audit', jobBlock(workflow, 'dependency-audit')],
    [
      'Security Validation secret scan',
      jobBlock(workflow, 'secret-scan'),
      'Check out full repository history',
    ],
    ['SEO Data Hub', seoWorkflow],
    ['Site Analytics', analyticsWorkflow],
    ['Browser E2E', browserWorkflow],
  ]) {
    assertCheckoutCredentialsDisabled(pullRequestWorkflow, label, stepName);
    assert.throws(
      () =>
        assertCheckoutCredentialsDisabled(
          pullRequestWorkflow.replace('persist-credentials: false', 'persist-credentials: true'),
          label,
          stepName,
        ),
      /must disable persisted credentials/,
      `${label} mutation must fail closed`,
    );
  }
});

test('SEO and analytics path filters include every contract-consumed input exactly', () => {
  assertExactTriggerPaths(seoWorkflow, 'SEO workflow', SEO_CONTRACT_INPUT_PATHS);
  for (const [mutationName, mutate] of [
    ['event', (source) => source.replace('  pull_request:\n', '  push:\n')],
    ['branch', (source) => source.replace('      - main\n', '      - develop\n')],
    ['paths-ignore', (source) => source.replace('    paths:\n', '    paths-ignore:\n')],
  ]) {
    assert.throws(
      () => assertExactTriggerPaths(mutate(seoWorkflow), 'SEO workflow', SEO_CONTRACT_INPUT_PATHS),
      /must trigger on pull requests to main with paths/,
      `SEO ${mutationName} mutation must fail closed`,
    );
    assert.throws(
      () =>
        assertExactTriggerPaths(
          mutate(analyticsWorkflow),
          'Site Analytics',
          SITE_ANALYTICS_CONTRACT_INPUT_PATHS,
        ),
      /must trigger on pull requests to main with paths/,
      `Site Analytics ${mutationName} mutation must fail closed`,
    );
  }
  for (const protectedPath of SEO_CONTRACT_INPUT_PATHS) {
    assert.throws(
      () =>
        assertExactTriggerPaths(
          seoWorkflow.replace(`      - ${protectedPath}\n`, `      - ${protectedPath}.disabled\n`),
          'SEO workflow',
          SEO_CONTRACT_INPUT_PATHS,
        ),
      new RegExp(protectedPath.replaceAll('.', '\\.')),
      `${protectedPath} mutation must fail closed`,
    );
  }
  assert.throws(
    () =>
      assertExactTriggerPaths(
        seoWorkflow.replace('      - .gitignore\n', ''),
        'SEO workflow',
        SEO_CONTRACT_INPUT_PATHS,
      ),
    /\.gitignore/,
    '.gitignore removal must fail closed',
  );

  assertExactTriggerPaths(
    analyticsWorkflow,
    'Site Analytics',
    SITE_ANALYTICS_CONTRACT_INPUT_PATHS,
  );
  assert.throws(
    () =>
      assertExactTriggerPaths(
        analyticsWorkflow.replace('      - middleware.ts\n', '      - middleware.ts.disabled\n'),
        'Site Analytics',
        SITE_ANALYTICS_CONTRACT_INPUT_PATHS,
      ),
    /middleware\.ts/,
    'middleware.ts mutation must fail closed',
  );
  for (const [mutationName, mutatedWorkflow] of [
    ['narrowing', analyticsWorkflow.replace('      - js/**/*.js\n', '      - js/site.js\n')],
    ['removal', analyticsWorkflow.replace('      - js/**/*.js\n', '')],
  ]) {
    assert.throws(
      () =>
        assertExactTriggerPaths(
          mutatedWorkflow,
          'Site Analytics',
          SITE_ANALYTICS_CONTRACT_INPUT_PATHS,
        ),
      /js\/\*\*\/\*\.js/,
      `Site Analytics production JS ${mutationName} must fail closed`,
    );
  }
});

test('browser E2E workflow is a dedicated immutable Chromium pull-request gate', () => {
  const triggerSection = browserWorkflow.match(/^on:\n[\s\S]*?(?=^permissions:)/m)?.[0] ?? '';
  assert.equal(
    triggerSection,
    `on:
  pull_request:
    branches:
      - main

`,
  );
  assertImmutableOfficialActions(browserWorkflow, 'browser E2E workflow');
  assert.match(browserWorkflow, /^permissions:\n  contents: read$/m);
  assert.match(browserWorkflow, /node-version: ["']22\.23\.2["']/);
  assert.match(browserWorkflow, /run: npm ci --ignore-scripts/);
  assert.match(browserWorkflow, /run: npx playwright install --with-deps chromium/);
  assert.match(browserWorkflow, /run: npm run test:e2e/);
});
