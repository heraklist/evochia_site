# Evochia SEO Data Hub V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate a minimal corporate Apps Script pipeline that stores trustworthy GSC and GA4 history, supports the locked M1/M2 decision contracts, and backfills 13 months of GSC data without introducing broader monitoring infrastructure.

**Architecture:** Reuse the existing GSC/GA4 clients, importers, workbook identity guard and sheet writer. Add capability-scoped configuration, GA4 persistence, one additional GSC grain, a range-capable GSC path, one daily orchestrator, two discoverable production entrypoints, and fixed Config-sheet operational metadata. Stop after the production callable path is live for GATE-A sizing; only then select the backfill writer path and decide whether the mature `GSC Page Queries` sheet needs a bounded incremental writer.

**Tech Stack:** TypeScript 5.9, Google Apps Script V8, esbuild 0.25.9, Node 22.23.2, Node test runner, `tsx`, Google Search Console Search Analytics API, GA4 Data API.

**Spec:** `docs/superpowers/specs/2026-08-26-evochia-seo-data-hub-production-architecture-design.md` @ `43e8823df0fdba1dd0e4bb1dbb52f2190e6cfeb0`

## Global Constraints

- Baseline implementation target is `main` @ `fe3a791da35fc1810bb4f774f12b4626f3a2343d`; create an isolated worktree at execution time before source edits.
- No new npm dependency.
- Production manifest must contain exactly five scopes: `spreadsheets.currentonly`, `script.container.ui`, `webmasters.readonly`, `analytics.readonly`, `script.external_request`.
- Do not add GTM, Drive, `script.scriptapp`, Gmail, Calendar, Search Console write, GA4 Admin/edit, URL Inspection, alerting, Pipeline Health, findings lifecycle, scoring, automatic change detection, or M3–M7 logic.
- Keep `GSC_TIME_ZONE = 'America/Los_Angeles'` until the post-backfill property-grain reconciliation proves a mismatch.
- `VISIBLE_POSITION_MAX = 5`. `MIN_PAGE_IMPRESSIONS` has no temporary numeric value; it remains uncalibrated until after backfill.
- Branded matching begins only with `evochia` and `ευωχια`; curated aliases are populated from observed GSC data after backfill. No fuzzy/Levenshtein matching.
- Live workbook evidence from 2026-08-27 showed `Config!A:C` occupied and `Config!E:H` empty in rows 1–20. Re-read `Config!E1:H9` immediately before the first production write; unexpected content is a stop condition, not something to overwrite.
- Generated Apps Script artifacts are derivatives. Never hand-edit `seo/apps-script/generated/**` or `seo/apps-script/generated-smoke/**`.
- No live GSC/GA4 call in CI. All automated tests use injected synthetic transports.
- Each task ends with its task-specific test plus the repository gates below green before the next task starts.

```bash
npm run typecheck
npm run typecheck:gas
npm run test:unit
npm run test:analytics
npm run seo:test:apps-script
npm run seo:build:apps-script
npm run seo:test:apps-script-contracts
npm run seo:check:apps-script-bundle
npm run security:dependency-audit
```

---

### Task 1: Capability-Scoped Configuration

**Files:**
- Modify: `seo/apps-script/src/Config.ts`
- Modify: `seo/apps-script/src/WorkbookIdentity.ts`
- Modify: `seo/apps-script/src/Menu.ts`
- Test: `tests/seo/apps-script/config.test.ts`

**Interfaces:**
- Produces: `CapabilityKey = 'workbook' | 'gsc' | 'ga4'`
- Produces: `verifyConfig(config, capabilities?)`
- Produces: `getConfig(capabilities?)`
- Preserves: `getVerifiedActiveWorkbook()` fail-closed workbook-ID behavior

- [ ] **Step 1: Write failing capability tests**

Add tests proving workbook verification ignores unrelated GTM/Drive readiness, GSC requires only `gscProperty` plus global owner/verification checks, GA4 requires `ga4PropertyId`, `ga4PropertyTimeZone`, and `productionHostname`, and the menu-level verification can request all three V1 capabilities.

```ts
assert.deepEqual(
  verifyConfig({ ...verifiedConfig, gtmAccountId: 'UNVERIFIED', driveFolderId: 'UNVERIFIED' }, ['workbook']),
  { ok: true, errors: [] },
);

assert.equal(
  verifyConfig({ ...verifiedConfig, gscProperty: 'UNVERIFIED' }, ['gsc']).errors.includes('gscProperty is unverified'),
  true,
);

assert.equal(
  verifyConfig({ ...verifiedConfig, ga4PropertyId: 'UNVERIFIED' }, ['workbook']).ok,
  true,
);
```

Also spy on the dependency passed through `getVerifiedActiveWorkbook()` and assert that the default production path requests only `['workbook']`.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
npx tsx --test tests/seo/apps-script/config.test.ts
```

Expected: FAIL because `verifyConfig`/`getConfig` do not accept capability sets and the current code requires every resource.

- [ ] **Step 3: Implement the capability map and scoped validation**

Use this contract in `Config.ts`:

```ts
export type CapabilityKey = 'workbook' | 'gsc' | 'ga4';

const CAPABILITY_RESOURCES: Record<CapabilityKey, readonly (keyof SeoConfig)[]> = {
  workbook: ['sheetId'],
  gsc: ['gscProperty'],
  ga4: ['ga4PropertyId', 'ga4PropertyTimeZone', 'productionHostname'],
};

export function verifyConfig(
  config: Partial<SeoConfig>,
  capabilities: readonly CapabilityKey[] = ['workbook'],
): VerificationResult { /* validate only required resource keys + global owner/status */ }

export function getConfig(
  capabilities: readonly CapabilityKey[] = ['workbook'],
): SeoConfig { /* parse Script Property, then verifyConfig(parsed, capabilities) */ }
```

Keep owner email and `verificationStatus` checks global. Run format validators only for resource fields required by the requested capability; an unrelated malformed GTM/Drive value must not block workbook/GSC/GA4 V1 operation.

In `WorkbookIdentity.ts`, make the production fallback equivalent to:

```ts
const getVerifiedConfig = dependencies?.getConfig ?? (() => getConfig(['workbook']));
```

In `Menu.ts`, make `verifyConfiguration()` explicitly request `['workbook', 'gsc', 'ga4']` so the operator-facing check still means “V1 production configuration is ready.”

- [ ] **Step 4: Run focused + global gates**

```bash
npx tsx --test tests/seo/apps-script/config.test.ts
npm run typecheck
npm run typecheck:gas
npm run seo:test:apps-script
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add seo/apps-script/src/Config.ts seo/apps-script/src/WorkbookIdentity.ts seo/apps-script/src/Menu.ts tests/seo/apps-script/config.test.ts
git commit -m "feat(seo): scope Apps Script config verification"
```

Run the full repository gate set before starting Task 2.

---

### Task 2: GA4 Persistence Specifications

**Files:**
- Modify: `seo/apps-script/src/Ga4Importer.ts`
- Test: `tests/seo/apps-script/ga4-importer.test.ts`

**Interfaces:**
- Produces: `GA4_REPORT_SPECS`
- Produces: `importGa4Reports(range, dependencies?)`
- Reuses: `runGa4Reports()` and `upsertRows()`

- [ ] **Step 1: Write failing persistence tests**

Add tests asserting the six exact sheet/key mappings and that no write occurs until the complete GA4 fetch bundle returns.

```ts
assert.deepEqual(
  GA4_REPORT_SPECS.map(({ id, sheetName, keyColumns }) => ({ id, sheetName, keyColumns })),
  [
    { id: 'daily', sheetName: 'GA4 Daily', keyColumns: ['date', 'deviceCategory'] },
    { id: 'acquisition', sheetName: 'GA4 Acquisition', keyColumns: ['date', 'sessionSourceMedium', 'sessionDefaultChannelGroup'] },
    { id: 'landingPages', sheetName: 'GA4 Landing Pages', keyColumns: ['date', 'landingPagePlusQueryString', 'sessionDefaultChannelGroup', 'deviceCategory'] },
    { id: 'events', sheetName: 'GA4 Events', keyColumns: ['date', 'eventName'] },
    { id: 'pages', sheetName: 'GA4 Pages', keyColumns: ['date', 'hostName', 'pagePath'] },
    { id: 'urlQuality', sheetName: 'GA4 URL Quality', keyColumns: ['date', 'hostName', 'pagePathPlusQueryString'] },
  ],
);
```

Use a synthetic transport that fails on the final GA4 report request and assert the injected writer was called zero times.

- [ ] **Step 2: Run focused test and verify RED**

```bash
npx tsx --test tests/seo/apps-script/ga4-importer.test.ts
```

Expected: FAIL because there is no write specification or importing writer path.

- [ ] **Step 3: Add the minimal persistence path**

Extend `Ga4ImportDependencies` with optional `writeRows`, then add:

```ts
export type Ga4ReportId = 'daily' | 'acquisition' | 'landingPages' | 'events' | 'pages' | 'urlQuality';

export const GA4_REPORT_SPECS = [ /* exact six mappings above */ ] as const;

export function importGa4Reports(
  range: Ga4ReportRange,
  dependencies: Ga4ImportDependencies = {},
): { bundle: Ga4ImportBundle; writes: Record<Ga4ReportId, WriteSummary> } {
  const bundle = runGa4Reports(range, dependencies);
  const writer = dependencies.writeRows ?? upsertRows;
  // Only after bundle exists: write all six arrays using GA4_REPORT_SPECS.
}
```

Do not create a second writer abstraction. Convert `Ga4Row[]` to the existing `RowRecord[]` shape at the call boundary.

- [ ] **Step 4: Prove idempotent keys with existing merge semantics**

Add one test that feeds the same logical GA4 rows twice through `mergeRowRecords()` using each spec’s composite key and expects the second pass to be `unchanged`, not inserted.

- [ ] **Step 5: Run focused + global gates and commit**

```bash
npx tsx --test tests/seo/apps-script/ga4-importer.test.ts
npm run typecheck
npm run typecheck:gas
npm run seo:test:apps-script
git add seo/apps-script/src/Ga4Importer.ts tests/seo/apps-script/ga4-importer.test.ts
git commit -m "feat(seo): persist canonical GA4 report grains"
```

Run the full repository gate set before Task 3.

---

### Task 3: GSC Page Queries, Range Import, and Brand Normalization

**Files:**
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify: `seo/apps-script/src/Setup.ts`
- Create: `seo/apps-script/src/BrandedQuery.ts`
- Test: `tests/seo/apps-script/gsc-importer.test.ts`
- Test: `tests/seo/apps-script/config.test.ts`
- Create test: `tests/seo/apps-script/branded-query.test.ts`

**Interfaces:**
- Produces: fourth report ID `pageQueries`
- Produces: `importSearchAnalyticsRange(config, startDate, endDate, dependencies?)`
- Preserves: `importSearchAnalyticsDay()` as the daily finalized-date wrapper
- Produces: `normalizeBrandText()` and `isBrandedQuery()`

- [ ] **Step 1: Write failing fourth-grain and range tests**

Change the expected GSC report set to four grains and assert:

```ts
{ dimensions: ['date', 'page', 'query'], aggregationType: 'auto' }
{ sheetName: 'GSC Page Queries', keyColumns: ['date', 'page', 'query'] }
```

Add a range test with `startDate='2026-07-01'`, `endDate='2026-07-31'` and assert all four Search Analytics requests carry exactly those dates. Add a failure test where the fourth fetch returns HTTP 429 and assert writer calls remain zero.

Also assert `REQUIRED_SHEET_NAMES.includes('GSC Page Queries')`.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npx tsx --test tests/seo/apps-script/gsc-importer.test.ts tests/seo/apps-script/config.test.ts
```

Expected: FAIL on missing grain, sheet and range importer.

- [ ] **Step 3: Refactor the day importer through one range implementation**

Use one fetch/write path:

```ts
export function importSearchAnalyticsRange(
  config: GscImportConfig,
  startDate: string,
  endDate: string,
  dependencies: GscImportDependencies = {},
): GscImportResult { /* four-spec fetch-before-write; dataAsOf = endDate */ }

export function importSearchAnalyticsDay(
  config: GscImportConfig,
  now: Date,
  dependencies: GscImportDependencies = {},
): GscImportResult {
  const dataAsOf = getAvailableGscDate(now, 3);
  return importSearchAnalyticsRange(config, dataAsOf, dataAsOf, dependencies);
}
```

Validate ISO `YYYY-MM-DD` inputs and reject `startDate > endDate`. Keep Search Analytics pagination in `GscClient.ts`; do not duplicate it.

- [ ] **Step 4: Write brand-normalization RED tests**

```ts
assert.equal(isBrandedQuery('Evochia private chef'), true);
assert.equal(isBrandedQuery('Ευωχία private chef'), true);
assert.equal(isBrandedQuery('ευωχια'), true);
assert.equal(isBrandedQuery('evo-chia'), true);
assert.equal(isBrandedQuery('euphoria'), false);
assert.equal(isBrandedQuery('Heraklis Xekalos'), false);
assert.equal(isBrandedQuery('evohia', ['evohia']), true);
assert.equal(isBrandedQuery('evohia'), false);
```

- [ ] **Step 5: Implement deterministic normalization without fuzzy matching**

`BrandedQuery.ts` must expose fixed seeds and an empty default alias set:

```ts
export const BRAND_SEEDS = ['evochia', 'ευωχια'] as const;
export const BRAND_ALIASES: readonly string[] = [];
```

Normalize by Unicode NFD, strip combining marks, lowercase, and normalize punctuation/whitespace before exact seed/alias containment. Do not add guessed misspellings now.

- [ ] **Step 6: Run focused + global gates and commit**

```bash
npx tsx --test tests/seo/apps-script/gsc-importer.test.ts tests/seo/apps-script/branded-query.test.ts tests/seo/apps-script/config.test.ts
npm run typecheck
npm run typecheck:gas
npm run seo:test:apps-script
git add seo/apps-script/src/GscImporter.ts seo/apps-script/src/Setup.ts seo/apps-script/src/BrandedQuery.ts tests/seo/apps-script/gsc-importer.test.ts tests/seo/apps-script/branded-query.test.ts tests/seo/apps-script/config.test.ts
git commit -m "feat(seo): add GSC page-query range ingestion"
```

Run the full repository gate set before Task 4.

---

### Task 4: Daily/Range Jobs, Run Log, and Config Freshness

**Files:**
- Create: `seo/apps-script/src/Jobs.ts`
- Create: `seo/apps-script/src/OperationalMetadata.ts`
- Test: create `tests/seo/apps-script/jobs.test.ts`
- Test: create `tests/seo/apps-script/operational-metadata.test.ts`

**Interfaces:**
- Produces: `runDailyImport(dependencies?)`
- Produces: `runRangeImport(startDate, endDate, dependencies?)`
- Produces: fixed freshness writer for `Config!E1:F4`
- Reuses: capability-scoped `getConfig`, `importSearchAnalyticsDay`, `importSearchAnalyticsRange`, `importGa4Reports`, `upsertRows`

- [ ] **Step 1: Write RED tests for source isolation and status semantics**

Use dependency injection only; do not touch Apps Script globals in unit tests. Cover exactly:

```text
GSC success + GA4 success -> SUCCESS
GSC failure + GA4 success -> PARTIAL
GSC success + GA4 failure -> PARTIAL
GSC failure + GA4 failure -> FAILED
```

Assert `getOAuthToken()` is called once per job run, GSC config failure does not prevent GA4, GA4 config failure does not prevent GSC, and `Run Log` gets two rows sharing one `runId` with `source = GSC|GA4`.

Use this minimal evidence shape:

```ts
interface RunLogRow {
  runId: string;
  startedAt: string;
  finishedAt: string;
  source: 'GSC' | 'GA4';
  sourceStatus: 'SUCCESS' | 'FAILED';
  overallStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  dataAsOf: string;
  fetchedRows: number;
  insertedRows: number;
  updatedRows: number;
  unchangedRows: number;
  errorClass: string;
  errorMessage: string;
}
```

- [ ] **Step 2: Write RED tests for freshness safety**

Model `Config!E1:F4` with an injected sheet range. Assert a failed source preserves that source’s previous `dataAsOf`, while `last run` and `status` always update. Add a preflight test that unexpected content in `Config!E1:H9` causes a hard failure before the first metadata initialization write.

- [ ] **Step 3: Implement `OperationalMetadata.ts`**

Keep the fixed cells explicit:

```ts
export const FRESHNESS_RANGE = 'E1:F4';
export const THRESHOLD_RANGE = 'E7:H9';
```

Write labels exactly:

```text
GSC dataAsOf
GA4 dataAsOf
last run
status
```

Provide an initialization helper that writes the threshold provenance header plus `VISIBLE_POSITION_MAX = 5` and a blank/uncalibrated `MIN_PAGE_IMPRESSIONS` only when the reserved target cells are empty. It must never overwrite unexpected owner content.

- [ ] **Step 4: Implement `Jobs.ts` with independent source catches**

Production defaults should resolve `getVerifiedActiveWorkbook()`, `ScriptApp.getOAuthToken()`, `Utilities.getUuid()`, `getConfig(['gsc'])`, and `getConfig(['ga4'])`; tests inject replacements.

`runRangeImport(startDate, endDate)` is GSC-only and returns the `GscImportResult`, including `reports.pageQueries.fetched`, so GATE-A can record the real row count.

`runDailyImport()` must write the two Run Log rows using `upsertRows('Run Log', ['runId', 'source'], rows)` and update freshness after both source attempts have resolved.

- [ ] **Step 5: Run focused + global gates and commit**

```bash
npx tsx --test tests/seo/apps-script/jobs.test.ts tests/seo/apps-script/operational-metadata.test.ts
npm run typecheck
npm run typecheck:gas
npm run seo:test:apps-script
git add seo/apps-script/src/Jobs.ts seo/apps-script/src/OperationalMetadata.ts tests/seo/apps-script/jobs.test.ts tests/seo/apps-script/operational-metadata.test.ts
git commit -m "feat(seo): add daily and range import jobs"
```

Run the full repository gate set before Task 5.

---

### Task 5: Production Entrypoints, Menu, Exact Manifest, and Live Callable Path

**Files:**
- Modify: `seo/apps-script/src/Menu.ts`
- Modify: `seo/apps-script/entrypoints/production.ts`
- Modify: `seo/apps-script/build.mjs`
- Modify: `seo/apps-script/appsscript.json`
- Modify: `tests/seo/apps-script/config.test.ts`
- Modify: `tests/seo/apps-script/entrypoint-discoverability.test.mjs`
- Modify: `tests/seo/apps-script/bundle-contract.test.mjs`
- Regenerate: `seo/apps-script/generated/Code.gs`
- Regenerate: `seo/apps-script/generated/appsscript.json`
- Regenerate/check unchanged purpose: `seo/apps-script/generated-smoke/Code.gs`, `seo/apps-script/generated-smoke/appsscript.json`

**Interfaces:**
- Exposes exactly two new production callables: `runDailyImport()` and `runRangeImportFromMenu()`
- Keeps: `onOpen()`, `setupWorkbookFromMenu()`, `verifyConfiguration()`
- Does not expose: URL Inspection, trigger-management, GTM, Drive, Gmail or smoke functions

- [ ] **Step 1: Write RED entrypoint/manifest/bundle contract tests**

Update production expected entrypoints to:

```js
const PRODUCTION_ENTRYPOINTS = [
  'onOpen',
  'setupWorkbookFromMenu',
  'verifyConfiguration',
  'runDailyImport',
  'runRangeImportFromMenu',
];
```

Change the manifest test to the exact five-scope list from Global Constraints.

Replace the obsolete bundle assertion that production contains no Search Console/GA4 calls. The new contract must positively allow the required `UrlFetchApp`/OAuth/Search Analytics/GA4 Data API path while still rejecting `DriveApp`, GTM/TagManager, `MailApp`, `GmailApp`, and the URL Inspection endpoint.

- [ ] **Step 2: Run contract tests and verify RED**

```bash
npm run seo:build:apps-script
npm run seo:test:apps-script-contracts
```

Expected: FAIL until entrypoint list, manifest and production imports are updated.

- [ ] **Step 3: Implement the operator surface**

`Menu.ts` adds menu items for daily import and range import. `runRangeImportFromMenu()` prompts for bounded ISO start/end dates, calls `runRangeImport(startDate, endDate)`, and displays the returned `reports.pageQueries.fetched` count so the sizing gate is observable.

Register `runDailyImport` and `runRangeImportFromMenu` in `entrypoints/production.ts`. Add the same two names to the production target `entrypoints` array in `build.mjs`; do not touch the smoke target list.

- [ ] **Step 4: Set the exact five-scope manifest and rebuild artifacts**

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/spreadsheets.currentonly",
  "https://www.googleapis.com/auth/script.container.ui",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/script.external_request"
]
```

Then:

```bash
npm run seo:build:apps-script
npm run seo:test:apps-script-contracts
npm run seo:check:apps-script-bundle
```

- [ ] **Step 5: Run all repository gates and commit the repo-only portion**

```bash
git add seo/apps-script/src/Menu.ts seo/apps-script/entrypoints/production.ts seo/apps-script/build.mjs seo/apps-script/appsscript.json tests/seo/apps-script/config.test.ts tests/seo/apps-script/entrypoint-discoverability.test.mjs tests/seo/apps-script/bundle-contract.test.mjs seo/apps-script/generated seo/apps-script/generated-smoke
git commit -m "feat(seo): expose production import entrypoints"
```

All Global Constraints gates must be green before any production deployment.

- [ ] **Step 6: STOP for explicit production authorization, then establish the corporate callable path**

Do not perform this step under repo-only authorization. After explicit owner approval for corporate Apps Script production deployment/OAuth and one finalized-day GSC sizing run:

1. confirm the active Google identity is `heraklis@evochia.gr`;
2. re-read `Config!E1:H9`; unexpected content is a stop condition;
3. deploy the generated production `Code.gs` and `appsscript.json` into the corporate bound Apps Script project for the authoritative Data Hub;
4. authorize only the five manifest scopes; any unexpected consent scope is a stop condition;
5. run workbook setup/metadata initialization once;
6. verify the editor exposes the five expected callable functions;
7. do **not** install the daily trigger yet.

If the corporate production Apps Script project is not yet bound/selected, create or bind it under the corporate account as part of this owner-authorized step; do not reuse the personal legacy project.

---

## GATE-A: Sizing Before Backfill — HARD STOP

**Do not start Task 6 until this gate is complete and the measured values have been reported to the owner.**

Use `runRangeImportFromMenu()` for exactly one finalized GSC day. Record the actual `GSC Page Queries` fetched-row count returned by the job. Compute the simple 13-month sizing projection with 395 days only as an operational estimate, not as a claim about seasonality or future volume.

The execution record must contain all five facts using the actual measured values:

```text
GATE-A date
GSC Page Queries rows for that finalized day
projected 395-day rows
BACKFILL_WRITE_MODE = UPSERT or APPEND
DAILY_WRITER_OPTIMIZATION_REQUIRED = YES or NO
```

Then **stop and send the measurement**. Task 6 begins only after the number and chosen branch are explicitly recorded. If `DAILY_WRITER_OPTIMIZATION_REQUIRED = YES`, Task 7 becomes mandatory before daily scheduling.

---

### Task 6: Sizing-Selected 13-Month Backfill, Calibration, and Activation Evidence

**Files:**
- Modify only if GATE-A selected APPEND: `seo/apps-script/src/SheetWriter.ts`
- Modify only if GATE-A selected APPEND: `seo/apps-script/src/Jobs.ts`
- Modify only if GATE-A selected APPEND: `seo/apps-script/src/Menu.ts`
- Test only if GATE-A selected APPEND: `tests/seo/apps-script/sheet-writer.test.ts`
- Test only if GATE-A selected APPEND: `tests/seo/apps-script/jobs.test.ts`
- Modify after observed-query review: `seo/apps-script/src/BrandedQuery.ts`
- Test after observed-query review: `tests/seo/apps-script/branded-query.test.ts`

**Interfaces:**
- Consumes the exact GATE-A evidence before any code or backfill action
- Produces 13 months of canonical GSC history
- Produces curated `BRAND_ALIASES`
- Produces owner-chosen `MIN_PAGE_IMPRESSIONS` provenance in `Config!E7:H9`
- Produces property-grain GSC date reconciliation evidence

- [ ] **Step 1: Start by writing the GATE-A number into the execution notes**

Do not infer the branch from memory. Copy the actual measured row count, 395-day projection, `BACKFILL_WRITE_MODE`, and daily-writer decision into the task execution record before editing source.

- [ ] **Step 2: If GATE-A selected APPEND, write RED append-safety tests before implementation**

The append path must fail when data rows already exist before the initial backfill, preserve the canonical headers, serialize formula-like cells with `serializeLiteralCell`, deduplicate each monthly chunk by `date+page+query`, and never be selectable for repair/replay.

A minimal source interface is:

```ts
appendInitialBackfillRows(
  sheetName: string,
  keyColumns: string[],
  incomingRows: RowRecord[],
  dependencies?: SheetWriterDependencies,
): WriteSummary
```

Do not add this function at all when GATE-A selected UPSERT.

- [ ] **Step 3: If APPEND was selected, implement only the initial-history append path**

`runRangeImportFromMenu()` may expose an explicit “initial backfill” confirmation only for this branch. The confirmed initial-backfill path splits the full requested history into non-overlapping calendar-month chunks and uses append semantics only after proving the target canonical GSC sheets are in the expected initial state. Normal range repair remains on `upsertRows()`.

If UPSERT was selected, make no writer change; use the existing idempotent range path for each calendar-month chunk.

- [ ] **Step 4: Run the 13-month backfill in bounded calendar-month chunks**

Use the latest finalized GSC date as the end boundary and cover the preceding 13 calendar months. Confirm each chunk completes before starting the next. On any error, stop; do not silently skip a month or invent zero rows.

After completion, verify:

- earliest stored date matches the intended available-history boundary;
- latest stored GSC date matches the finalized end boundary;
- `GSC Daily`, `GSC Pages`, `GSC Queries`, and `GSC Page Queries` contain real rows where GSC reports them;
- rerunning one already-imported monthly range produces no duplicate logical keys.

- [ ] **Step 5: Derive the curated brand aliases from observed queries**

Read distinct high-impression queries from the backfilled GSC query data, inspect likely brand variants manually, and update only the approved real variants in `BRAND_ALIASES`. Add one positive test per added alias and retain the `euphoria` false-positive regression.

Run:

```bash
npx tsx --test tests/seo/apps-script/branded-query.test.ts
```

- [ ] **Step 6: Calibrate `MIN_PAGE_IMPRESSIONS` as an operating judgment**

Using the real 28-day non-branded page-query data, show the owner the eligibility effect of at least `20`, `30`, `50`, and `100` impressions. The owner chooses the value. Record it in the reserved threshold provenance row with the chosen value, rationale, eligibility impact, and review date. Do not describe the chosen value as statistically derived.

- [ ] **Step 7: Perform the property-grain GSC date-boundary reconciliation**

Choose one known finalized date and compare `GSC Daily` (`aggregationType: byProperty`) clicks/impressions with the Search Console UI property-level totals under equivalent filters. Do not compare summed page rows. Record `PASS` or `FAIL`.

`FAIL` blocks M1 activation and triggers investigation; it does not authorize changing `GSC_TIME_ZONE` automatically.

- [ ] **Step 8: Commit any Task 6 source changes, rebuild, and return gates to green**

If aliases or APPEND code changed source:

```bash
npm run typecheck
npm run typecheck:gas
npm run seo:test:apps-script
npm run seo:build:apps-script
npm run seo:test:apps-script-contracts
npm run seo:check:apps-script-bundle
git add seo/apps-script/src tests/seo/apps-script seo/apps-script/generated seo/apps-script/generated-smoke
git commit -m "feat(seo): complete initial GSC history activation"
```

Run the full repository gate set.

- [ ] **Step 9: Schedule daily collection only if Task 7 is not required**

Before installing the corporate daily trigger, perform the separate owner-approved legacy-trigger retirement check and verify legacy scheduled trigger count is exactly zero. Then install one daily corporate trigger manually in the Apps Script UI and observe the first scheduled execution. Do not add `script.scriptapp` or programmatic trigger management.

If GATE-A set `DAILY_WRITER_OPTIMIZATION_REQUIRED = YES`, do not schedule yet; proceed to Task 7.

---

### Task 7 (Conditional): Incremental Idempotent Writer for Mature `GSC Page Queries`

**Run this task only when GATE-A recorded `DAILY_WRITER_OPTIMIZATION_REQUIRED = YES`.**

**Files:**
- Modify: `seo/apps-script/src/SheetWriter.ts`
- Modify: `seo/apps-script/src/GscImporter.ts`
- Test: `tests/seo/apps-script/sheet-writer.test.ts`
- Test: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Produces: a bounded incremental upsert used only by `GSC Page Queries`
- Preserves: existing `upsertRows()` for all other canonical sheets
- Must support daily inserts and historical M1 repair without rewriting the whole accumulated sheet

- [ ] **Step 1: Write RED tests that prove whole-sheet rewrite is no longer used for this grain**

Model a mature sheet with existing headers/rows. Assert:

- unchanged incoming key causes no write;
- a new key appends only the new row;
- an existing changed key updates only its existing row;
- formula-like strings are serialized before every write;
- an unknown incoming column after headers are established fails rather than silently changing the schema;
- workbook identity mismatch still causes zero sheet reads/writes.

- [ ] **Step 2: Implement an incremental idempotent writer without replacing the general writer**

Use a function with a narrow contract such as:

```ts
upsertRowsIncremental(
  sheetName: string,
  keyColumns: string[],
  incomingRows: RowRecord[],
  dependencies?: SheetWriterDependencies,
): WriteSummary
```

It may read the existing sheet once to build a composite-key-to-row-number index, but it must not write the full accumulated matrix. Batch changed existing rows by contiguous row ranges where practical and append genuinely new rows after `getLastRow()`. Keep header order fixed once established.

- [ ] **Step 3: Route only `GSC Page Queries` to the incremental writer**

Do not change writer behavior for `GSC Daily`, `GSC Pages`, `GSC Queries`, GA4 sheets, Run Log or Config metadata. The range repair path for page queries uses the same incremental idempotent semantics.

- [ ] **Step 4: Run focused + full gates and commit**

```bash
npx tsx --test tests/seo/apps-script/sheet-writer.test.ts tests/seo/apps-script/gsc-importer.test.ts
npm run typecheck
npm run typecheck:gas
npm run seo:test:apps-script
npm run seo:build:apps-script
npm run seo:test:apps-script-contracts
npm run seo:check:apps-script-bundle
git add seo/apps-script/src/SheetWriter.ts seo/apps-script/src/GscImporter.ts tests/seo/apps-script/sheet-writer.test.ts tests/seo/apps-script/gsc-importer.test.ts seo/apps-script/generated seo/apps-script/generated-smoke
git commit -m "perf(seo): bound page-query sheet writes"
```

Run the full repository gate set.

- [ ] **Step 5: Re-deploy the rebuilt corporate artifact and only then schedule daily collection**

Under explicit production authorization, deploy the regenerated production artifact, verify the exact five scopes remain unchanged, rerun one finalized day to prove idempotency, confirm legacy scheduled triggers are zero, install one manual corporate daily trigger, and observe the first scheduled execution.

---

## Final Acceptance

V1 is accepted only when all applicable tasks are green and the evidence shows:

- capability-scoped workbook/GSC/GA4 configuration works without GTM/Drive blockers;
- six GA4 grains persist with exact composite keys;
- four GSC grains include `GSC Page Queries` at `date+page+query`;
- production bundle exposes exactly the intended five callable functions and only the approved five OAuth scopes;
- daily source isolation returns truthful `SUCCESS`/`PARTIAL`/`FAILED` states;
- `Config!E1:F4` freshness updates without touching legacy `A:C` content;
- GATE-A row count and writer decision are recorded before backfill;
- 13 months of available GSC history are loaded without fabricated data or duplicate logical keys;
- curated aliases come from observed GSC queries, not guesses;
- `MIN_PAGE_IMPRESSIONS` is owner-calibrated and documented, not temporarily defaulted;
- property-grain Search Console reconciliation passes before M1 activation;
- if required, the mature page-query writer is incremental before scheduling;
- the corporate daily trigger is installed manually only after legacy scheduled triggers are verified at zero.
