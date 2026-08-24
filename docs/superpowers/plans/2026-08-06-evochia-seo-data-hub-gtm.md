# Evochia SEO Data Hub and GTM Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the owner-authorized, read-only Google Apps Script data hub for GSC, GA4 and GTM, including Phase 0 identity verification, data freshness, GTM drift detection and bounded Sheet/Drive storage.

**Architecture:** A bound Apps Script project runs as `heraklis@evochia.gr`, calls Google APIs with read-only scopes and writes normalized rows to one production Sheet. Raw GTM snapshots are created only on baseline or fingerprint change and stored in a dedicated Drive folder. GitHub Actions do not hold Google credentials.

**Tech Stack:** Google Apps Script V8, Apps Script manifest, Search Console API, GA4 Data API, Tag Manager API v2, Google Sheets, Google Drive, clasp-compatible source layout, Node.js 22 for local pure-function tests.

## Global Constraints

- Work only on `seo-system`.
- No service-account JSON key and no Google refresh token in GitHub.
- Required scopes: `webmasters.readonly`, `analytics.readonly`, `tagmanager.readonly`, `spreadsheets.currentonly`, `drive.file` where necessary.
- Do not submit sitemaps, request indexing, remove URLs, publish GTM or change GA4/GSC/GTM settings.
- Treat GA4 property `528945896`, account `388030118` and GTM `GTM-578JXRXS` as provisional until verified.
- Do not activate time-driven triggers until manual verification passes.

---

### Task 1: Establish Reproducible Node Tooling

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `tests/seo/tooling.test.mjs`

**Interfaces:**
- Produces scripts: `typecheck`, `test:unit`, `seo:test:apps-script`.

- [ ] **Step 1: Write the failing tooling test**

```js
// tests/seo/tooling.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('repository defines reproducible SEO scripts', () => {
  assert.equal(pkg.engines.node, '>=22');
  assert.ok(pkg.scripts.typecheck);
  assert.ok(pkg.scripts['test:unit']);
  assert.ok(pkg.scripts['seo:test:apps-script']);
  assert.ok(fs.existsSync('package-lock.json'));
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test tests/seo/tooling.test.mjs`
Expected: FAIL because scripts and lockfile are missing.

- [ ] **Step 3: Add dependencies and scripts**

Add dev dependencies:

```json
{
  "@types/google-apps-script": "^1.0.99",
  "typescript": "^5.9.2",
  "tsx": "^4.20.3"
}
```

Add scripts:

```json
{
  "typecheck": "tsc --noEmit",
  "test:unit": "node --test tests/seo/*.test.mjs",
  "seo:test:apps-script": "tsx --test tests/seo/apps-script/*.test.ts"
}
```

Remove `package-lock.json` from `.gitignore`, then run `npm install`.

- [ ] **Step 4: Run verification**

Run:

```bash
npm ci
node --test tests/seo/tooling.test.mjs
```

Expected: both exit `0`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json package-lock.json tests/seo/tooling.test.mjs
git commit -m "build(seo): establish reproducible tooling"
```

### Task 2: Record Phase 0 Verification Contract

**Files:**
- Create: `docs/seo/phase-0-verification.md`
- Create: `seo/config/google-resources.example.json`
- Create: `seo/schemas/google-resources.schema.json`
- Create: `tests/seo/google-resources.test.mjs`

**Interfaces:**
- Produces `GoogleResourcesConfig` JSON contract consumed by Apps Script setup.

- [ ] **Step 1: Write a failing schema test**

Test that the example contains:

```json
{
  "gscProperty": "sc-domain:evochia.gr",
  "ga4AccountId": "388030118",
  "ga4PropertyId": "528945896",
  "gtmPublicContainerId": "GTM-578JXRXS",
  "gtmAccountId": "UNVERIFIED",
  "gtmContainerId": "UNVERIFIED",
  "sheetId": "UNVERIFIED",
  "driveFolderId": "UNVERIFIED",
  "ownerEmail": "heraklis@evochia.gr",
  "verificationStatus": "pending"
}
```

The test must reject `verificationStatus: "verified"` while any identifier equals `UNVERIFIED`.

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/seo/google-resources.test.mjs`
Expected: FAIL because schema/config do not exist.

- [ ] **Step 3: Implement schema and operator checklist**

The checklist must require evidence for all 11 Phase 0 gates from the approved Revision 2 review and must record verifier, timestamp and evidence reference.

- [ ] **Step 4: Run test**

Run: `node --test tests/seo/google-resources.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/seo/phase-0-verification.md seo/config/google-resources.example.json seo/schemas/google-resources.schema.json tests/seo/google-resources.test.mjs
git commit -m "docs(seo): define phase zero verification contract"
```

### Task 3: Scaffold the Bound Apps Script Project

**Files:**
- Create: `seo/apps-script/appsscript.json`
- Create: `seo/apps-script/src/Config.ts`
- Create: `seo/apps-script/src/Menu.ts`
- Create: `seo/apps-script/src/Setup.ts`
- Create: `seo/apps-script/README.md`
- Create: `tests/seo/apps-script/config.test.ts`
- Create: `tsconfig.json`

**Interfaces:**
- Produces `getConfig(): SeoConfig`, `verifyConfig(config): VerificationResult`, `setupWorkbook(): void`.

- [ ] **Step 1: Write failing config tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyConfig } from '../../../seo/apps-script/src/Config';

test('rejects unverified production identifiers', () => {
  const result = verifyConfig({ verificationStatus: 'pending' } as never);
  assert.equal(result.ok, false);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm run seo:test:apps-script`
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement minimal config and manifest**

Manifest scopes must contain only the approved read-only scopes plus current-only spreadsheet, drive.file, external request, triggers and container UI.

`setupWorkbook()` creates these sheets idempotently:

```text
Config
Run Log
Pipeline Health
GSC Daily
GSC Pages
GSC Queries
GSC Indexing
GA4 Daily
GA4 Acquisition
GA4 Landing Pages
GA4 Events
GTM Versions
GTM Changes
Findings Summary
```

- [ ] **Step 4: Run tests and typecheck**

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script tests/seo/apps-script tsconfig.json
git commit -m "feat(seo): scaffold bound Apps Script data hub"
```

### Task 4: Implement GSC Search Analytics and URL Inspection

**Files:**
- Create: `seo/apps-script/src/GscClient.ts`
- Create: `seo/apps-script/src/GscImporter.ts`
- Create: `seo/apps-script/src/SheetWriter.ts`
- Create: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Produces `fetchSearchAnalytics(request): GscRow[]`, `fetchUrlInspection(url): InspectionRow`, `upsertRows(sheetName, keyColumns, rows): WriteSummary`.

- [ ] **Step 1: Write failing pagination and idempotency tests**

Test two API pages and assert one normalized row per composite key:

```text
date|query|page|country|device|searchAppearance
```

Test a repeated import returns `inserted: 0` and no duplicate rows.

- [ ] **Step 2: Run and verify failure**

Run: `npm run seo:test:apps-script`.

- [ ] **Step 3: Implement minimal importer**

Requirements:

- three-day default delay;
- cursor/startRow pagination until fewer than `rowLimit` rows;
- URL Inspection limited to configured monitored URLs;
- store user canonical, Google-selected canonical, coverage state and inspection time;
- throw a typed pipeline error on non-2xx responses;
- never call sitemap submission or indexing APIs.

- [ ] **Step 4: Run tests**

Expected: pagination, normalization and idempotency tests PASS.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/GscClient.ts seo/apps-script/src/GscImporter.ts seo/apps-script/src/SheetWriter.ts tests/seo/apps-script/gsc-importer.test.ts
git commit -m "feat(seo): import read-only Search Console data"
```

### Task 5: Implement GA4 Daily Collection

**Files:**
- Create: `seo/apps-script/src/Ga4Client.ts`
- Create: `seo/apps-script/src/Ga4Importer.ts`
- Create: `tests/seo/apps-script/ga4-importer.test.ts`

**Interfaces:**
- Produces `runGa4Reports(dateRange): Ga4ImportBundle` with daily, acquisition, landing-page and event rows.

- [ ] **Step 1: Write failing normalization tests**

Fixtures must cover `(not set)`, zero key events, source/medium, landing-page path, device and date.

- [ ] **Step 2: Run and verify failure**

Run: `npm run seo:test:apps-script`.

- [ ] **Step 3: Implement GA4 reports**

Use property resource `properties/528945896` only after verified config. Default to a two-day processing delay. Store independent `dataAsOf` and collection timestamp.

- [ ] **Step 4: Run tests**

Expected: PASS, including no coercion of missing values into fabricated zeros.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/Ga4Client.ts seo/apps-script/src/Ga4Importer.ts tests/seo/apps-script/ga4-importer.test.ts
git commit -m "feat(seo): import read-only GA4 data"
```

### Task 6: Implement GTM Version Fingerprinting and Drift Detection

**Files:**
- Create: `seo/apps-script/src/GtmClient.ts`
- Create: `seo/apps-script/src/GtmNormalizer.ts`
- Create: `seo/apps-script/src/GtmImporter.ts`
- Create: `tests/seo/apps-script/gtm-normalizer.test.ts`

**Interfaces:**
- Produces `normalizeContainerVersion(version): NormalizedGtmVersion`, `fingerprintGtm(normalized): string`, `diffGtm(previous, current): GtmChange[]`.

- [ ] **Step 1: Write failing deterministic fingerprint tests**

Two versions with identical semantic tag/trigger/variable content but different API ordering must produce the same SHA-256 fingerprint. A changed trigger condition must produce a different fingerprint and one change record.

- [ ] **Step 2: Run and verify failure**

Run: `npm run seo:test:apps-script`.

- [ ] **Step 3: Implement normalization**

Normalize by stable ID/name and recursively sorted parameter keys. Record GA4 destination, event names, consent configuration and trigger mappings. Store full export only on baseline or fingerprint change.

- [ ] **Step 4: Run tests**

Expected: deterministic fingerprint and diff tests PASS.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/GtmClient.ts seo/apps-script/src/GtmNormalizer.ts seo/apps-script/src/GtmImporter.ts tests/seo/apps-script/gtm-normalizer.test.ts
git commit -m "feat(seo): monitor published GTM configuration"
```

### Task 7: Add Pipeline Health, Freshness and GitHub Finding Summary Import

**Files:**
- Create: `seo/apps-script/src/PipelineHealth.ts`
- Create: `seo/apps-script/src/GitHubFindingsClient.ts`
- Create: `tests/seo/apps-script/pipeline-health.test.ts`
- Modify: `seo/apps-script/src/Setup.ts`

**Interfaces:**
- Produces `evaluateFreshness(source, dataAsOf, now): FreshnessState`, `fetchFindingIssues(): FindingSummary[]`.

- [ ] **Step 1: Write failing freshness tests**

Test states: `current`, `delayed-expected`, `stale`, `failed`, `unverified` for GSC, GA4 and GTM using source-specific thresholds.

- [ ] **Step 2: Run and verify failure**

Run: `npm run seo:test:apps-script`.

- [ ] **Step 3: Implement health and issue sync**

Store a GitHub fine-grained token only in Apps Script Properties, scoped to read issues/metadata for `heraklist/evochia_site`. Do not store it in the Sheet or repo. If absent, mark Findings Summary as unavailable without failing Google imports.

- [ ] **Step 4: Run tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/PipelineHealth.ts seo/apps-script/src/GitHubFindingsClient.ts seo/apps-script/src/Setup.ts tests/seo/apps-script/pipeline-health.test.ts
git commit -m "feat(seo): expose pipeline freshness and finding summaries"
```

### Task 8: Wire Manual Verification, Triggers and Operator Runbook

**Files:**
- Create: `seo/apps-script/src/Jobs.ts`
- Create: `seo/apps-script/src/Triggers.ts`
- Create: `docs/seo/apps-script-operator-runbook.md`
- Modify: `seo/apps-script/src/Menu.ts`
- Modify: `seo/apps-script/README.md`

**Interfaces:**
- Produces menu functions `verifyAllAccess`, `runInitialBackfill`, `installTriggers`, `removeTriggers`, `runDailyImport`, `runWeeklyInspection`.

- [ ] **Step 1: Add a test that trigger installation is fail-closed**

Assert `installTriggers()` refuses to proceed unless all production identifiers are verified and each read-only access check passed in the current setup session.

- [ ] **Step 2: Run and verify failure**

Run: `npm run seo:test:apps-script`.

- [ ] **Step 3: Implement jobs and runbook**

Schedule:

```text
Daily import: approximately 06:00 Europe/Athens
Weekly URL Inspection: Monday approximately 08:00 Europe/Athens
Weekly ChatGPT report: existing automation Monday 09:00 Europe/Athens
```

The runbook must document manual OAuth, production Sheet/Drive IDs, token storage, baseline comparison and rollback/removal of triggers.

- [ ] **Step 4: Run full plan verification**

```bash
npm ci
npm run typecheck
npm run test:unit
npm run seo:test:apps-script
```

Expected: all exit `0`.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script docs/seo/apps-script-operator-runbook.md
git commit -m "feat(seo): complete owner-authorized data hub jobs"
```

## Plan Gate

Before Plan 2 starts, the owner must manually verify and record:

- GSC, GA4 and GTM identities;
- production Sheet and Drive ownership;
- correct GTM-to-GA4 mapping;
- three consecutive scheduled imports with no duplicate rows;
- explicit data-as-of dates;
- no Google write scope in the manifest.