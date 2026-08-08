# Apps Script Runtime Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compile-time GAS compatibility gate, deterministic production/smoke Apps Script bundles with committed-bundle equivalence CI, shared runtime utilities, and a documented owner-gated non-production GAS V8 smoke procedure without performing any Google-side write.

**Architecture:** Keep `seo/apps-script/src/` as the only production source of truth. Add a GAS-only no-DOM TypeScript configuration, extract two runtime helpers used across existing modules, and use esbuild to create two deterministic IIFE-style Apps Script targets: a production bundle without smoke code and a smoke bundle that includes production logic plus a test-only `runRuntimeSmoke()` entrypoint. Commit generated artifacts and make CI rebuild into a temporary directory and byte-compare against them. The repository batch stops before any `clasp push`, test-project creation, OAuth authorization, or Google API/Sheet mutation.

**Tech Stack:** TypeScript 5.9.x, Node.js 22.23.2, Google Apps Script V8 typings, esbuild exact-pinned in `package.json`/`package-lock.json`, Node test runner + tsx, GitHub Actions.

## Global Constraints

- Permanent working branch remains `seo-system`; existing PR #35 remains open and draft against `main`.
- No merge, ready-for-review transition, auto-merge, production deployment, or production Google write.
- No creation of an Apps Script test project, synthetic Sheet, OAuth authorization, or `clasp push` during this repository-only plan.
- TypeScript source is authoritative; generated bundles are derivatives and must never be hand-edited.
- Production and smoke builds are separate; `runRuntimeSmoke()` must not exist in the production artifact.
- GAS source must typecheck without `DOM`/`DOM.Iterable` libraries and with Google Apps Script types.
- Normal SEO CI must run both repository-wide and GAS-scoped typechecks.
- Build-equivalence is byte-for-byte and runs under Node.js 22.23.2 with the lockfile-pinned bundler.
- Real `.clasp.json`, Script IDs, Sheet IDs, OAuth tokens, refresh tokens, cookies, and credentials must not be committed.
- Real GAS V8 smoke remains an external owner-gated readiness step after this plan; no success evidence may be fabricated.
- Shared calendar/hostname refactors must preserve existing behavior exactly.
- Site analytics consent-state cleanup remains out of scope.

---

## File Structure

### New files

- `seo/apps-script/tsconfig.gas.json` — GAS-only compiler configuration with no DOM libraries.
- `seo/apps-script/src/RuntimeCompat.ts` — shared named-timezone calendar and hostname validation helpers.
- `seo/apps-script/entrypoints/production.ts` — production-only global entrypoint wiring for the bundle.
- `seo/apps-script/smoke/RuntimeSmoke.ts` — deterministic, data-free GAS V8 smoke assertions and `runRuntimeSmoke()`.
- `seo/apps-script/entrypoints/smoke.ts` — smoke bundle entrypoint that exposes only the smoke callable plus required production logic.
- `seo/apps-script/build.mjs` — deterministic esbuild orchestration for production and smoke outputs.
- `seo/apps-script/check-bundle.mjs` — clean temporary rebuild plus byte-for-byte equivalence/security checks.
- `seo/apps-script/generated/Code.gs` — committed production generated artifact.
- `seo/apps-script/generated/appsscript.json` — committed production manifest copy.
- `seo/apps-script/generated-smoke/Code.gs` — committed smoke generated artifact.
- `seo/apps-script/generated-smoke/appsscript.json` — committed minimal smoke manifest.
- `seo/apps-script/.clasp.json.example` — placeholder-only local test-project shape.
- `docs/seo/apps-script-runtime-smoke-runbook.md` — repository-only and owner-gated Google-side smoke procedure.
- `docs/reports/apps-script-runtime-smoke/README.md` — evidence schema/template instructions, not a fabricated pass record.
- `tests/seo/apps-script/runtime-compat.test.ts` — behavioral tests for extracted shared helpers.
- `tests/seo/apps-script/runtime-smoke.test.ts` — Node execution of the exact smoke assertion suite using injected synthetic transports.
- `tests/seo/apps-script/gas-tsconfig-contract.test.mjs` — validates no-DOM compiler config and proves a browser global is rejected.
- `tests/seo/apps-script/bundle-contract.test.mjs` — validates production/smoke artifact boundaries and generated-output invariants.

### Modified files

- `seo/apps-script/src/Config.ts` — consume shared hostname/timezone helpers.
- `seo/apps-script/src/Ga4Importer.ts` — consume shared calendar/hostname helpers.
- `seo/apps-script/src/GscImporter.ts` — consume shared calendar helper.
- `seo/apps-script/src/SheetWriter.ts` — consume shared calendar formatter where semantics match.
- `seo/apps-script/appsscript.json` — remain the production manifest source of truth; no scope expansion.
- `package.json` / `package-lock.json` — exact-pin esbuild and add build/check/GAS-typecheck scripts.
- `.github/workflows/seo-data-hub-validation.yml` — pin Node 22.23.2 and run GAS typecheck + build equivalence.
- `.gitignore` — ignore real local clasp/operator smoke config while retaining `.clasp.json.example`.
- `seo/apps-script/README.md` — document generated artifacts and no-Google-write boundary.

---

### Task 1: Add the GAS-scoped no-DOM compile gate

**Files:**
- Create: `seo/apps-script/tsconfig.gas.json`
- Create: `tests/seo/apps-script/gas-tsconfig-contract.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/seo-data-hub-validation.yml`

**Interfaces:**
- Produces: npm script `typecheck:gas` that executes `tsc -p seo/apps-script/tsconfig.gas.json --noEmit`.
- Consumes: existing `@types/google-apps-script` and TypeScript dependency.

- [ ] **Step 1: Write the failing config-contract test**

Create `tests/seo/apps-script/gas-tsconfig-contract.test.mjs` that loads the future config and asserts all of the following:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const GAS_TSCONFIG = 'seo/apps-script/tsconfig.gas.json';

test('GAS TypeScript config excludes browser DOM libraries', () => {
  const config = JSON.parse(readFileSync(GAS_TSCONFIG, 'utf8'));
  assert.deepEqual(config.compilerOptions.lib, ['ES2022', 'ES2022.Intl']);
  assert.deepEqual(config.compilerOptions.types, ['google-apps-script']);
  assert.equal(config.compilerOptions.strict, true);
  assert.deepEqual(config.include, ['src/**/*.ts', 'entrypoints/**/*.ts', 'smoke/**/*.ts']);
});

test('GAS typecheck rejects browser-only URLSearchParams', () => {
  const result = spawnSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      '--noEmit',
      '--strict',
      '--target', 'ES2022',
      '--module', 'NodeNext',
      '--moduleResolution', 'NodeNext',
      '--lib', 'ES2022,ES2022.Intl',
      '--types', 'google-apps-script',
      '--allowImportingTsExtensions',
      'tests/seo/fixtures/gas-browser-global.ts',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /URLSearchParams/);
});
```

Also create `tests/seo/fixtures/gas-browser-global.ts` containing only:

```ts
new URLSearchParams('utm_source=test');
```

- [ ] **Step 2: Run the Apps Script test suite and confirm RED**

Run through CI: `npm run seo:test:apps-script` and `node --test tests/seo/apps-script/gas-tsconfig-contract.test.mjs`.

Expected: config-contract test fails because `seo/apps-script/tsconfig.gas.json` does not exist; browser-global fixture compilation must fail specifically on `URLSearchParams` once the compiler command is reachable.

- [ ] **Step 3: Add the minimal GAS tsconfig and npm script**

Create `seo/apps-script/tsconfig.gas.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "ES2022.Intl"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "types": ["google-apps-script"]
  },
  "include": ["src/**/*.ts", "entrypoints/**/*.ts", "smoke/**/*.ts"]
}
```

Add to `package.json`:

```json
"typecheck:gas": "tsc -p seo/apps-script/tsconfig.gas.json --noEmit"
```

Do not change the root tsconfig DOM settings because browser/site code still needs them.

- [ ] **Step 4: Update SEO CI to execute both typecheck layers**

In `.github/workflows/seo-data-hub-validation.yml`, keep the existing root typecheck and add a separate step:

```yaml
- name: Run Apps Script TypeScript validation
  run: npm run typecheck:gas
```

Also add `seo/apps-script/tsconfig.gas.json` to the workflow path coverage implicitly through `seo/apps-script/**`.

- [ ] **Step 5: Verify GREEN and commit**

Run/observe:

```bash
node --test tests/seo/apps-script/gas-tsconfig-contract.test.mjs
npm run typecheck:gas
npm run seo:test:apps-script
npm run typecheck
```

Expected: all pass; the explicit fixture compilation still fails as the contract test expects.

Commit:

```bash
git add seo/apps-script/tsconfig.gas.json tests/seo/apps-script/gas-tsconfig-contract.test.mjs tests/seo/fixtures/gas-browser-global.ts package.json .github/workflows/seo-data-hub-validation.yml
git commit -m "test(seo): enforce GAS-only TypeScript globals"
```

---

### Task 2: Extract shared GAS runtime compatibility utilities

**Files:**
- Create: `seo/apps-script/src/RuntimeCompat.ts`
- Create: `tests/seo/apps-script/runtime-compat.test.ts`
- Modify: `seo/apps-script/src/Config.ts`
- Modify: `seo/apps-script/src/Ga4Importer.ts`
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify: `seo/apps-script/src/SheetWriter.ts`

**Interfaces:**
- Produces:
  - `calendarDateParts(date: Date, timeZone: string): { year: number; month: number; day: number }`
  - `formatCalendarDate(date: Date, timeZone: string): string`
  - `isValidIanaTimeZone(value: string): boolean`
  - `isValidHostname(value: string): boolean`
- Existing public functions `getAvailableGa4Date`, `getAvailableGscDate`, `verifyConfig`, `buildCompositeKey`, and `runGa4Reports` retain signatures/semantics.

- [ ] **Step 1: Write failing shared-helper tests**

Create `tests/seo/apps-script/runtime-compat.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarDateParts,
  formatCalendarDate,
  isValidHostname,
  isValidIanaTimeZone,
} from '../../../seo/apps-script/src/RuntimeCompat.ts';

test('calendar helpers honor named source calendars and DST', () => {
  assert.deepEqual(calendarDateParts(new Date('2026-08-06T21:30:00Z'), 'Europe/Athens'), {
    year: 2026, month: 8, day: 7,
  });
  assert.deepEqual(calendarDateParts(new Date('2026-08-06T05:00:00Z'), 'America/Los_Angeles'), {
    year: 2026, month: 8, day: 5,
  });
  assert.equal(formatCalendarDate(new Date('2026-11-02T21:30:00Z'), 'Europe/Athens'), '2026-11-02');
});

test('runtime validators preserve existing timezone and hostname policy', () => {
  assert.equal(isValidIanaTimeZone('Europe/Athens'), true);
  assert.equal(isValidIanaTimeZone('Not/A_Timezone'), false);
  assert.equal(isValidHostname('www.evochia.gr'), true);
  assert.equal(isValidHostname('https://www.evochia.gr'), false);
  assert.equal(isValidHostname('www.evochia.gr:443'), false);
  assert.equal(isValidHostname('WWW.evochia.gr'), false);
});
```

- [ ] **Step 2: Verify RED**

Run `npm run seo:test:apps-script`.

Expected: module-not-found/export failures because `RuntimeCompat.ts` does not exist.

- [ ] **Step 3: Implement `RuntimeCompat.ts` minimally**

Use `Intl.DateTimeFormat(...).formatToParts()` exactly once for shared calendar extraction. Keep the existing hostname regex unchanged. `formatCalendarDate` must format from extracted numeric parts, not depend on locale string formatting.

- [ ] **Step 4: Delegate existing modules to shared helpers one file at a time**

Refactor in this order, verifying after each edit:

1. `Config.ts` → `isValidIanaTimeZone` and `isValidHostname`.
2. `Ga4Importer.ts` → `calendarDateParts` and `isValidHostname`.
3. `GscImporter.ts` → `calendarDateParts`.
4. `SheetWriter.ts` → `formatCalendarDate`.

Do not alter public error text except where importing the shared boolean validator naturally preserves it.

- [ ] **Step 5: Verify all historical timezone/hostname regressions stay GREEN**

Run:

```bash
npm run seo:test:apps-script
npm run typecheck:gas
npm run typecheck
```

Expected: GA4 Athens boundaries, GSC Los Angeles boundaries, DST, Sheet date-key, and config-validation tests all pass unchanged.

- [ ] **Step 6: Commit**

```bash
git add seo/apps-script/src/RuntimeCompat.ts seo/apps-script/src/Config.ts seo/apps-script/src/Ga4Importer.ts seo/apps-script/src/GscImporter.ts seo/apps-script/src/SheetWriter.ts tests/seo/apps-script/runtime-compat.test.ts
git commit -m "refactor(seo): share Apps Script runtime utilities"
```

---

### Task 3: Add deterministic separate production and smoke builds

**Files:**
- Create: `seo/apps-script/entrypoints/production.ts`
- Create: `seo/apps-script/entrypoints/smoke.ts`
- Create: `seo/apps-script/build.mjs`
- Create: `tests/seo/apps-script/bundle-contract.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces npm script `seo:build:apps-script`.
- Production target path: `seo/apps-script/generated/Code.gs`.
- Smoke target path: `seo/apps-script/generated-smoke/Code.gs`.
- Production bundle exposes only normal Apps Script global entrypoints such as `onOpen`, `verifyConfiguration`, `setupWorkbookFromMenu`.
- Smoke bundle exposes `runRuntimeSmoke` and must not be used for production deployment.

- [ ] **Step 1: Write failing bundle-boundary test**

Create `tests/seo/apps-script/bundle-contract.test.mjs` to assert after build:

```js
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
```

- [ ] **Step 2: Verify RED**

Run `node --test tests/seo/apps-script/bundle-contract.test.mjs`.

Expected: ENOENT because generated artifacts/build script do not exist.

- [ ] **Step 3: Exact-pin esbuild and Node build environment**

Use npm with exact save semantics:

```bash
npm install --save-dev --save-exact esbuild@0.25.9
```

Update `package.json` engines from `>=22` to exactly:

```json
"engines": { "node": "22.23.2" }
```

The lockfile is the dependency-integrity source. Do not add clasp yet; no Google-side smoke execution is authorized in this plan.

- [ ] **Step 4: Create explicit entrypoint files**

`entrypoints/production.ts` imports the production menu functions and assigns them to `globalThis` through an Apps-Script-safe typed object so esbuild cannot tree-shake them:

```ts
import { onOpen, setupWorkbookFromMenu, verifyConfiguration } from '../src/Menu.ts';

type GasGlobals = typeof globalThis & {
  onOpen?: typeof onOpen;
  setupWorkbookFromMenu?: typeof setupWorkbookFromMenu;
  verifyConfiguration?: typeof verifyConfiguration;
};

const gas = globalThis as GasGlobals;
gas.onOpen = onOpen;
gas.setupWorkbookFromMenu = setupWorkbookFromMenu;
gas.verifyConfiguration = verifyConfiguration;
```

`entrypoints/smoke.ts` imports only `runRuntimeSmoke` from `../smoke/RuntimeSmoke.ts` and assigns it to `globalThis`. Do not import production menu entrypoints into the smoke target unless the smoke suite explicitly needs them.

- [ ] **Step 5: Implement deterministic `build.mjs`**

Use the esbuild JS API with explicit settings:

```js
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const targets = [
  ['entrypoints/production.ts', 'generated/Code.gs'],
  ['entrypoints/smoke.ts', 'generated-smoke/Code.gs'],
];

for (const [entry, out] of targets) {
  await mkdir(new URL(`./${out.split('/')[0]}/`, import.meta.url), { recursive: true });
  const result = await build({
    entryPoints: [new URL(`./${entry}`, import.meta.url).pathname],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: ['es2022'],
    treeShaking: true,
    legalComments: 'none',
    charset: 'utf8',
    minify: false,
  });
  const header = '// GENERATED FILE — DO NOT EDIT. Run: npm run seo:build:apps-script\n';
  await writeFile(new URL(`./${out}`, import.meta.url), header + result.outputFiles[0].text, 'utf8');
}

await writeFile(
  new URL('./generated/appsscript.json', import.meta.url),
  await readFile(new URL('./appsscript.json', import.meta.url), 'utf8'),
);
```

Also generate a minimal smoke manifest in `generated-smoke/appsscript.json` with `runtimeVersion: "V8"`, `exceptionLogging: "STACKDRIVER"`, `timeZone: "Europe/Athens"`, and **no GA4/GSC/GTM scopes**. If a pure smoke needs zero explicit OAuth scopes, omit `oauthScopes` entirely.

- [ ] **Step 6: Add build script and generate artifacts**

Add:

```json
"seo:build:apps-script": "node seo/apps-script/build.mjs"
```

Run `npm run seo:build:apps-script` and commit the generated outputs.

- [ ] **Step 7: Verify GREEN and commit**

Run:

```bash
npm run seo:build:apps-script
node --test tests/seo/apps-script/bundle-contract.test.mjs
npm run typecheck:gas
```

Expected: production has no smoke symbol/import/export; smoke contains `runRuntimeSmoke`; both compile targets are deterministic across two successive builds.

Commit:

```bash
git add package.json package-lock.json seo/apps-script/build.mjs seo/apps-script/entrypoints seo/apps-script/generated seo/apps-script/generated-smoke tests/seo/apps-script/bundle-contract.test.mjs
git commit -m "build(seo): add deterministic Apps Script bundles"
```

---

### Task 4: Implement the data-free runtime smoke suite

**Files:**
- Create: `seo/apps-script/smoke/RuntimeSmoke.ts`
- Create: `tests/seo/apps-script/runtime-smoke.test.ts`
- Modify: `seo/apps-script/entrypoints/smoke.ts`
- Modify: `seo/apps-script/generated-smoke/Code.gs` via build only

**Interfaces:**
- Produces:
  - `runRuntimeSmoke(): RuntimeSmokeResult`
  - `RuntimeSmokeResult = { ok: boolean; checks: Array<{ name: string; ok: boolean; detail?: string }> }`
- Smoke functions call the same production helpers/importers used by normal code.
- No external network access, Script Properties, triggers, or production Sheet APIs.

- [ ] **Step 1: Write failing smoke-suite test**

Create a Node test that imports `runRuntimeSmoke()` directly from source and asserts:

```ts
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
```

- [ ] **Step 2: Verify RED**

Run `npm run seo:test:apps-script`.

Expected: module-not-found for `RuntimeSmoke.ts`.

- [ ] **Step 3: Implement fixed assertion helpers and synthetic transports**

`RuntimeSmoke.ts` must import production functions from `RuntimeCompat.ts`, `Config.ts`, `Ga4Importer.ts`, and `GscImporter.ts`.

Use a small internal assertion wrapper:

```ts
function check(name: string, assertion: () => void): RuntimeSmokeCheck {
  try {
    assertion();
    return { name, ok: true };
  } catch (error) {
    return { name, ok: false, detail: String(error) };
  }
}
```

Synthetic GA4/GSC transports must return fixed JSON payloads and must never call `UrlFetchApp`. Inject writers into GSC import assembly so no `SpreadsheetApp`/Sheet write occurs.

At the end:

```ts
export function runRuntimeSmoke(): RuntimeSmokeResult {
  const checks = [/* fixed ordered checks */];
  const result = { ok: checks.every((item) => item.ok), checks };
  if (!result.ok) {
    throw new Error(`Apps Script runtime smoke failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
  return result;
}
```

Do not read `PropertiesService`, call `UrlFetchApp`, or invoke `setupWorkbook()`.

- [ ] **Step 4: Verify source smoke GREEN and regenerate smoke artifact**

Run:

```bash
npm run seo:test:apps-script
npm run typecheck:gas
npm run seo:build:apps-script
node --test tests/seo/apps-script/bundle-contract.test.mjs
```

Expected: source smoke passes and production artifact remains free of `runRuntimeSmoke`.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/smoke/RuntimeSmoke.ts seo/apps-script/entrypoints/smoke.ts seo/apps-script/generated-smoke/Code.gs tests/seo/apps-script/runtime-smoke.test.ts
git commit -m "test(seo): add data-free GAS runtime smoke"
```

---

### Task 5: Add committed-bundle equivalence and generated-artifact security checks

**Files:**
- Create: `seo/apps-script/check-bundle.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/seo-data-hub-validation.yml`
- Modify: `tests/seo/apps-script/bundle-contract.test.mjs`

**Interfaces:**
- Produces npm script `seo:check:apps-script-bundle`.
- Script exits non-zero on stale bundle, module syntax, smoke symbol in production, real clasp config, credential-like content, or nondeterministic mismatch.

- [ ] **Step 1: Extend the bundle-contract test with a controlled stale-artifact reproduction**

The test should copy tracked artifacts to a temporary directory, mutate one byte, invoke the equivalence helper against the modified copy, and assert a non-zero result containing `bundle mismatch`. Keep all mutations in OS temp paths; never modify tracked files during the test.

Also assert production `Code.gs` has no `runRuntimeSmoke`, no `import`/`export`, and neither generated directory contains `.clasp.json`.

- [ ] **Step 2: Verify RED**

Run `node --test tests/seo/apps-script/bundle-contract.test.mjs`.

Expected: failure because `check-bundle.mjs`/equivalence API is absent.

- [ ] **Step 3: Implement clean rebuild + byte compare**

`check-bundle.mjs` must:

1. create an OS temp directory;
2. invoke the same build configuration with an overridable output root, never touching committed artifacts during comparison;
3. compare `Code.gs` + manifests byte-for-byte for both production and smoke targets;
4. reject unresolved `import`/`export` syntax;
5. reject `runRuntimeSmoke` in production;
6. reject credential markers such as `ya29.`, `1//`, `-----BEGIN PRIVATE KEY-----`, or a committed real `.clasp.json`;
7. clean up the temp directory in `finally`;
8. exit non-zero with a concise path-specific mismatch message.

Refactor `build.mjs` to export a `buildAppsScript(outputRoot)` function and execute it only when run as the CLI entrypoint. The equivalence checker imports that exact build function so CI cannot accidentally compare outputs produced by a different transform.

- [ ] **Step 4: Add npm script and CI steps**

Add:

```json
"seo:check:apps-script-bundle": "node seo/apps-script/check-bundle.mjs"
```

Pin workflow Node exactly:

```yaml
with:
  node-version: "22.23.2"
```

Add after typechecks:

```yaml
- name: Build Apps Script bundles
  run: npm run seo:build:apps-script

- name: Verify committed Apps Script bundles
  run: npm run seo:check:apps-script-bundle
```

The check must still perform its own clean temp rebuild; the explicit build step verifies the normal build command and makes CI output easier to diagnose.

- [ ] **Step 5: Verify GREEN and deterministic rebuild**

Run/observe:

```bash
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
node --test tests/seo/apps-script/bundle-contract.test.mjs
```

Expected: both equivalence runs pass with no git diff after the second build.

- [ ] **Step 6: Commit**

```bash
git add seo/apps-script/build.mjs seo/apps-script/check-bundle.mjs package.json package-lock.json .github/workflows/seo-data-hub-validation.yml tests/seo/apps-script/bundle-contract.test.mjs seo/apps-script/generated seo/apps-script/generated-smoke
git commit -m "ci(seo): enforce Apps Script bundle equivalence"
```

---

### Task 6: Add non-production clasp placeholders, runbook, and auditable evidence schema

**Files:**
- Create: `seo/apps-script/.clasp.json.example`
- Modify: `.gitignore`
- Create: `docs/seo/apps-script-runtime-smoke-runbook.md`
- Create: `docs/reports/apps-script-runtime-smoke/README.md`
- Modify: `seo/apps-script/README.md`
- Test: `tests/seo/apps-script/bundle-contract.test.mjs`

**Interfaces:**
- Produces a documented manual/owner-gated smoke procedure; performs no Google-side action.

- [ ] **Step 1: Add a failing repository-safety assertion**

Extend `bundle-contract.test.mjs` to assert:

```js
const example = JSON.parse(readFileSync('seo/apps-script/.clasp.json.example', 'utf8'));
assert.equal(example.scriptId, 'NON_PRODUCTION_TEST_SCRIPT_ID');
assert.equal(example.rootDir, 'generated-smoke');

const ignore = readFileSync('.gitignore', 'utf8');
assert.match(ignore, /^seo\/apps-script\/\.clasp\.json$/m);
```

Expected initial RED because files/rules do not exist.

- [ ] **Step 2: Add placeholder clasp shape and ignore real config**

Create exactly:

```json
{
  "scriptId": "NON_PRODUCTION_TEST_SCRIPT_ID",
  "rootDir": "generated-smoke"
}
```

Add to `.gitignore`:

```text
seo/apps-script/.clasp.json
seo/apps-script/.runtime-smoke.local.json
```

Do not commit any real identifiers.

- [ ] **Step 3: Write the runbook with explicit two-phase governance**

`docs/seo/apps-script-runtime-smoke-runbook.md` must include:

**Repository-only phase (allowed now):**

```bash
node --version  # must print v22.23.2
npm ci --ignore-scripts
npm run test:unit
npm run seo:test:apps-script
npm run typecheck
npm run typecheck:gas
npm run test:analytics
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

State that these commands do not contact Google.

**Google-side phase (STOP until explicit owner instruction):**

1. create/select a clearly named non-production Apps Script project and synthetic Sheet only if required;
2. copy `.clasp.json.example` to ignored `.clasp.json` and replace only the placeholder Script ID locally;
3. push **`generated-smoke/` only** using an explicitly documented clasp version selected and pinned at the time the owner authorizes the real smoke;
4. run `runRuntimeSmoke()` manually in the non-production project;
5. record evidence under `docs/reports/apps-script-runtime-smoke/YYYY-MM-DD.md` for the exact commit.

The runbook must contain a bold warning: never substitute the production Apps Script project, never install triggers, never authorize GA4/GSC/GTM scopes for this smoke, never call live APIs.

Because no Google-side smoke is authorized now, do not install or invoke clasp in this plan.

- [ ] **Step 4: Write the evidence schema README**

Document the required future evidence fields:

```markdown
- Tested branch:
- Tested commit SHA:
- Smoke bundle SHA-256:
- Non-production project label (redacted identifier):
- Execution timestamp:
- Overall result: PASS | FAIL
- Named checks:
- Operator confirmation: no live GA4/GSC/GTM requests; no production Sheet writes; no triggers installed.
```

Explicitly state that this README is a schema/template, not evidence that a smoke has run.

- [ ] **Step 5: Update Apps Script README**

Document production vs smoke generated directories, `typecheck:gas`, bundle-equivalence commands, and that the repository is still undeployed/unverified in real GAS V8 until the owner-gated smoke is executed.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
node --test tests/seo/apps-script/bundle-contract.test.mjs
npm run seo:check:apps-script-bundle
```

Commit:

```bash
git add seo/apps-script/.clasp.json.example .gitignore docs/seo/apps-script-runtime-smoke-runbook.md docs/reports/apps-script-runtime-smoke/README.md seo/apps-script/README.md tests/seo/apps-script/bundle-contract.test.mjs
git commit -m "docs(seo): add non-production GAS smoke runbook"
```

---

### Task 7: Final repository-only verification and PR metadata refresh

**Files:**
- Modify only if necessary: PR #35 body metadata/status text; do not change draft state.
- No Google-side files/resources.

**Interfaces:**
- Produces final evidence that repository runtime-readiness work is green while external GAS smoke remains explicitly pending.

- [ ] **Step 1: Run the full repository gate on the final tree**

Required commands/workflow steps:

```bash
npm ci --ignore-scripts
npm run test:unit
npm run seo:test:apps-script
npm run typecheck
npm run typecheck:gas
npm run test:analytics
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

Because this session uses GitHub as the execution environment, verify equivalent fresh GitHub Actions evidence rather than claiming local execution.

- [ ] **Step 2: Verify final generated artifacts are stable**

Confirm:

- production bundle has no `runRuntimeSmoke`;
- both bundles contain no unresolved module syntax;
- a second clean build produces no diff;
- no `.clasp.json`, Script ID, Sheet ID, token, or credential was committed;
- smoke manifest has no GA4/GSC/GTM scopes;
- production manifest scopes remain unchanged.

- [ ] **Step 3: Verify both CI workflows**

`SEO Data Hub Validation` must show success for root tests, Apps Script tests, root typecheck, GAS typecheck, build, and bundle-equivalence.

`Site Analytics Validation` must remain success.

- [ ] **Step 4: Refresh stale PR body text only**

If PR #35 still lists GSC grain split / GA4 Pages as open, update only the descriptive body to mark them code-complete and add Apps Script runtime-readiness repository work as complete while keeping **real GAS V8 smoke, production orchestration, deployment, triggers, and external reconciliation open**.

Do not mark the PR ready, merge it, or request production deployment.

- [ ] **Step 5: Final checkpoint report**

Report exact head SHA and CI run/job IDs. State explicitly:

- repository build/runtime-readiness layer is code-complete and CI-green;
- real GAS V8 smoke is **not executed** and remains a hard production-readiness gate;
- no Google-side write, OAuth authorization, trigger installation, or production deployment occurred;
- the next action requiring owner approval is creation/selection of the non-production test project and the first smoke `clasp push`.

---

## Plan Self-Review

- Spec coverage: no-DOM GAS typecheck, pinned Node build environment, deterministic separate production/smoke artifacts, committed byte-equivalence, shared calendar/hostname utilities, data-free production-logic smoke, secret handling, evidence schema, and owner-gated Google-side boundary are all mapped to tasks.
- Scope: production orchestration, triggers, GTM monitoring, live Google verification, and consent-state cleanup are intentionally excluded.
- Type consistency: `RuntimeCompat.ts`, `runRuntimeSmoke()`, npm script names, artifact paths, and CI step names are consistent across tasks.
- No fabricated evidence: only the evidence schema/runbook is created; a dated PASS note is forbidden until an actual owner-authorized GAS run occurs.
- No placeholders in implementation behavior: the only placeholder string is the intentionally literal safe value `NON_PRODUCTION_TEST_SCRIPT_ID` in `.clasp.json.example`.
