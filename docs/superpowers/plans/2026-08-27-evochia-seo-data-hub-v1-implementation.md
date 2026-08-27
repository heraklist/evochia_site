# Evochia SEO Data Hub V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the smallest production Apps Script pipeline that stores trustworthy GSC and GA4 history for Evochia, supports the locked M1/M2 contracts, and loads 13 months of GSC history without introducing broader monitoring infrastructure.

**Architecture:** Reuse the existing GSC/GA4 clients, importers, bound-workbook guard and canonical writer. Add capability-scoped config, GA4 persistence, one `date+page+query` GSC grain, range ingestion, daily orchestration, fixed Config-sheet freshness, and two production operator callbacks. Complete Tasks 1–5, then stop at **GATE-A** for a live **read-only** page-query sizing measurement. Task 6 uses the measured row count to choose UPSERT vs initial-backfill APPEND; Task 7 exists only if the measurement proves mature daily whole-sheet rewrites are disproportionate.

**Tech Stack:** TypeScript 5.9, Google Apps Script V8, esbuild 0.25.9, Node 22.23.2, Node test runner, `tsx`, Search Console Search Analytics API, GA4 Data API.

**Spec:** `docs/superpowers/specs/2026-08-26-evochia-seo-data-hub-production-architecture-design.md` @ `43e8823df0fdba1dd0e4bb1dbb52f2190e6cfeb0`

## Global Constraints

- Execution starts from `main` @ `fe3a791da35fc1810bb4f774f12b4626f3a2343d` in an isolated worktree created at execution time.
- No new dependency.
- Production OAuth scopes are exactly: `spreadsheets.currentonly`, `script.container.ui`, `webmasters.readonly`, `analytics.readonly`, `script.external_request`.
- Do not add GTM, Drive, `script.scriptapp`, Gmail, Calendar, URL Inspection, alerting, Pipeline Health, findings lifecycle, scoring, automatic change detection or M3–M7 logic.
- Keep `GSC_TIME_ZONE = 'America/Los_Angeles'` until the specified property-grain reconciliation proves a mismatch.
- `VISIBLE_POSITION_MAX = 5`; `MIN_PAGE_IMPRESSIONS` remains explicitly uncalibrated until after backfill.
- Branded matching begins with `evochia` and `ευωχια`; the alias list starts empty and is populated only from observed GSC queries. No fuzzy/Levenshtein matching.
- Live workbook read on 2026-08-27 confirmed `Config!A:C` occupied and `Config!E:H` empty in rows 1–20. Re-read `Config!E1:H9` immediately before first production write; unexpected content is a hard stop.
- Generated bundles are derivatives; never hand-edit `seo/apps-script/generated/**` or `generated-smoke/**`.
- CI uses synthetic transports only; no live GSC/GA4 request in automated tests.
- Every task must return all repository gates to green before the next task.

## Mandatory Review Invariants Between Tasks

Every fresh reviewer must explicitly report **PASS/FAIL** for both invariants below before the next task begins. These are intentional product constraints, not missing implementation.

1. **Uncalibrated threshold remains uncalibrated:** before Task 6 owner calibration, `MIN_PAGE_IMPRESSIONS` must have no numeric fallback, default, heuristic, environment value, or test-only production substitute. Any decision path that requires it must remain explicitly unavailable / `not calibrated`. A reviewer must reject any “sensible default” added for convenience.
2. **Observed-only aliases remain observed-only:** before Task 6 query review, `BRAND_ALIASES` must remain empty. Only the locked seeds `evochia` and `ευωχια` may exist by default. A reviewer must reject guessed spelling, Greeklish, phonetic, edit-distance, or other “obvious” aliases unless they were actually observed in the backfilled GSC queries and approved during Task 6.

After Task 6 calibration, the same review gate changes from “must remain empty/null” to “every non-null threshold / non-seed alias has recorded provenance from the Task 6 evidence.”

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
- Produce `CapabilityKey = 'workbook' | 'gsc' | 'ga4'`.
- `verifyConfig(config, capabilities?)` validates only requested resource groups plus global owner/status checks.
- `getConfig(capabilities?)` threads the same capability set.
- `getVerifiedActiveWorkbook()` verifies only `workbook` by default.

- [ ] **Write RED tests** proving workbook verification ignores `UNVERIFIED` GTM/Drive values; GSC requires `gscProperty`; GA4 requires `ga4PropertyId`, `ga4PropertyTimeZone`, `productionHostname`; owner email and `verificationStatus` remain global fail-closed checks.

```ts
assert.deepEqual(
  verifyConfig({ ...verifiedConfig, gtmAccountId: 'UNVERIFIED', driveFolderId: 'UNVERIFIED' }, ['workbook']),
  { ok: true, errors: [] },
);
assert.equal(verifyConfig({ ...verifiedConfig, gscProperty: 'UNVERIFIED' }, ['gsc']).ok, false);
assert.equal(verifyConfig({ ...verifiedConfig, ga4PropertyId: 'UNVERIFIED' }, ['workbook']).ok, true);
```

- [ ] **Run RED:**

```bash
npx tsx --test tests/seo/apps-script/config.test.ts
```

Expected failure: current `verifyConfig()` has no capability parameter and requires every resource.

- [ ] **Implement minimal scoped validation:**

```ts
export type CapabilityKey = 'workbook' | 'gsc' | 'ga4';

const CAPABILITY_RESOURCES: Record<CapabilityKey, readonly (keyof SeoConfig)[]> = {
  workbook: ['sheetId'],
  gsc: ['gscProperty'],
  ga4: ['ga4PropertyId', 'ga4PropertyTimeZone', 'productionHostname'],
};
```

`verifyConfig(config, capabilities = ['workbook'])` validates required values and only relevant format validators. `getConfig()` defaults to `['workbook']`. `WorkbookIdentity.ts` must call `getConfig(['workbook'])` on the production path. `verifyConfiguration()` in `Menu.ts` explicitly requests `['workbook','gsc','ga4']` so the UI check means V1-ready.

- [ ] **Run focused + full gates**, then commit:

```bash
git add seo/apps-script/src/Config.ts seo/apps-script/src/WorkbookIdentity.ts seo/apps-script/src/Menu.ts tests/seo/apps-script/config.test.ts
git commit -m "feat(seo): scope Apps Script config verification"
```

---

### Task 2: Persist the Existing Six GA4 Grains

**Files:**
- Modify: `seo/apps-script/src/Ga4Importer.ts`
- Test: `tests/seo/apps-script/ga4-importer.test.ts`

**Interfaces:**
- Produce `GA4_REPORT_SPECS`.
- Produce `importGa4Reports(range, dependencies?)`.
- Reuse `runGa4Reports()` and `upsertRows()`; do not create another general writer.

- [ ] **Write RED tests** for the exact mappings:

```text
daily         -> GA4 Daily         -> date,deviceCategory
acquisition   -> GA4 Acquisition   -> date,sessionSourceMedium,sessionDefaultChannelGroup
landingPages  -> GA4 Landing Pages -> date,landingPagePlusQueryString,sessionDefaultChannelGroup,deviceCategory
events        -> GA4 Events        -> date,eventName
pages         -> GA4 Pages         -> date,hostName,pagePath
urlQuality    -> GA4 URL Quality   -> date,hostName,pagePathPlusQueryString
```

Also inject a transport that fails on the final GA4 request and assert writer calls remain zero: the complete bundle must exist before the first GA4 write.

- [ ] **Run RED:**

```bash
npx tsx --test tests/seo/apps-script/ga4-importer.test.ts
```

- [ ] **Implement** `GA4_REPORT_SPECS`, optional `writeRows` dependency and:

```ts
export function importGa4Reports(
  range: Ga4ReportRange,
  dependencies: Ga4ImportDependencies = {},
): { bundle: Ga4ImportBundle; writes: Record<Ga4ReportId, WriteSummary> }
```

Call `runGa4Reports()` first; only then iterate the six specs through the existing writer.

- [ ] **Add idempotency tests** using `mergeRowRecords()` with every exact composite key; a second identical logical row must be `unchanged`, never inserted.

- [ ] **Run focused + full gates**, then commit:

```bash
git add seo/apps-script/src/Ga4Importer.ts tests/seo/apps-script/ga4-importer.test.ts
git commit -m "feat(seo): persist canonical GA4 report grains"
```

---

### Task 3: Add `GSC Page Queries`, Range Ingestion, and Deterministic Brand Normalization

**Files:**
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify: `seo/apps-script/src/Setup.ts`
- Create: `seo/apps-script/src/BrandedQuery.ts`
- Test: `tests/seo/apps-script/gsc-importer.test.ts`
- Test: `tests/seo/apps-script/config.test.ts`
- Create: `tests/seo/apps-script/branded-query.test.ts`

**Interfaces:**
- Add report ID `pageQueries` with `date,page,query`, aggregation `auto`, sheet `GSC Page Queries`, key `date,page,query`.
- Produce `importSearchAnalyticsRange(config,startDate,endDate,dependencies?)`.
- Preserve `importSearchAnalyticsDay()` as a finalized-day wrapper around the range implementation.
- Produce `normalizeBrandText()` and `isBrandedQuery(query, aliases?)`.

- [ ] **Write RED GSC tests** expecting four requests/writes and `REQUIRED_SHEET_NAMES` to include `GSC Page Queries`. Add a month-range test asserting all four request payloads receive the supplied `startDate/endDate`. Add a fourth-fetch failure and assert zero writes across all four grains.

- [ ] **Run RED:**

```bash
npx tsx --test tests/seo/apps-script/gsc-importer.test.ts tests/seo/apps-script/config.test.ts
```

- [ ] **Implement one range path** and make the day importer delegate to it. Validate strict `YYYY-MM-DD` inputs and `startDate <= endDate`; keep pagination inside `GscClient.ts`.

- [ ] **Write RED brand tests:**

```ts
assert.equal(isBrandedQuery('Evochia private chef'), true);
assert.equal(isBrandedQuery('Ευωχία private chef'), true);
assert.equal(isBrandedQuery('ευωχια'), true);
assert.equal(isBrandedQuery('evo-chia'), true);
assert.equal(isBrandedQuery('euphoria'), false);
assert.equal(isBrandedQuery('Heraklis Xekalos'), false);
assert.equal(isBrandedQuery('evohia'), false);
assert.equal(isBrandedQuery('evohia', ['evohia']), true);
```

- [ ] **Implement normalization:** Unicode NFD -> strip combining marks -> lowercase -> normalize punctuation/whitespace. Defaults:

```ts
export const BRAND_SEEDS = ['evochia', 'ευωχια'] as const;
export const BRAND_ALIASES: readonly string[] = [];
```

No guessed misspellings and no fuzzy match.

- [ ] **Run focused + full gates**, then commit:

```bash
git add seo/apps-script/src/GscImporter.ts seo/apps-script/src/Setup.ts seo/apps-script/src/BrandedQuery.ts tests/seo/apps-script/gsc-importer.test.ts tests/seo/apps-script/config.test.ts tests/seo/apps-script/branded-query.test.ts
git commit -m "feat(seo): add GSC page-query range ingestion"
```

---

### Task 4: Jobs, Run Log, Freshness, and Read-Only Sizing Primitive

**Files:**
- Create: `seo/apps-script/src/Jobs.ts`
- Create: `seo/apps-script/src/OperationalMetadata.ts`
- Create: `tests/seo/apps-script/jobs.test.ts`
- Create: `tests/seo/apps-script/operational-metadata.test.ts`

**Interfaces:**
- Produce `runDailyImport(dependencies?)`.
- Produce write-capable `runRangeImport(startDate,endDate,dependencies?)` for GSC repair/backfill.
- Produce read-only `measurePageQueryRows(startDate,endDate,dependencies?)` for GATE-A. It may call `fetchSearchAnalytics()` but must not call any writer.
- Store freshness at `Config!E1:F4`; threshold provenance at `Config!E7:H9`.

- [ ] **Write RED status tests** covering exactly:

```text
GSC success + GA4 success = SUCCESS
one source succeeds        = PARTIAL
both sources fail          = FAILED
```

Assert GSC and GA4 are attempted independently, `ScriptApp.getOAuthToken()` is abstracted/injected and obtained once per daily run, and Run Log receives two rows with the same `runId`, one per source.

Use the minimal row contract:

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

- [ ] **Write RED metadata tests** proving a failed source does not advance that source’s prior `dataAsOf`, while `last run` and `status` always update. Unexpected pre-existing content in the reserved metadata cells must fail before initialization writes.

- [ ] **Write RED sizing tests** proving `measurePageQueryRows()` requests only the page-query grain for the supplied finalized date/range and returns the fetched row count while writer calls remain exactly zero.

- [ ] **Implement `OperationalMetadata.ts`:**

```ts
export const FRESHNESS_RANGE = 'E1:F4';
export const THRESHOLD_RANGE = 'E7:H9';
```

Freshness labels are exactly `GSC dataAsOf`, `GA4 dataAsOf`, `last run`, `status`. Initialize threshold provenance with `VISIBLE_POSITION_MAX = 5` and an explicitly blank/uncalibrated `MIN_PAGE_IMPRESSIONS`, only when reserved cells are empty.

- [ ] **Implement `Jobs.ts`:** daily job uses capability-scoped config, one token, independent source catches, `upsertRows('Run Log',['runId','source'],rows)`, and final freshness update. `runRangeImport()` delegates to the write-capable range importer. `measurePageQueryRows()` uses only the fourth GSC spec and never writes.

- [ ] **Run focused + full gates**, then commit:

```bash
git add seo/apps-script/src/Jobs.ts seo/apps-script/src/OperationalMetadata.ts tests/seo/apps-script/jobs.test.ts tests/seo/apps-script/operational-metadata.test.ts
git commit -m "feat(seo): add import jobs and sizing primitive"
```

---

### Task 5: Production Operator Surface, Bundle, and Exact OAuth Manifest

**Files:**
- Modify: `seo/apps-script/src/Menu.ts`
- Modify: `seo/apps-script/entrypoints/production.ts`
- Modify: `seo/apps-script/build.mjs`
- Modify: `seo/apps-script/appsscript.json`
- Modify: `tests/seo/apps-script/config.test.ts`
- Modify: `tests/seo/apps-script/entrypoint-discoverability.test.mjs`
- Modify: `tests/seo/apps-script/bundle-contract.test.mjs`
- Regenerate: `seo/apps-script/generated/**`
- Regenerate/check purpose: `seo/apps-script/generated-smoke/**`

**Interfaces:**
- Expose exactly five production callbacks: `onOpen`, `setupWorkbookFromMenu`, `verifyConfiguration`, `runDailyImport`, `runRangeImportFromMenu`.
- `runRangeImportFromMenu()` is the only range UI callback and presents two explicit modes: **Measure only** and **Import range**.
- **Measure only** delegates to `measurePageQueryRows()` and performs zero Sheet data writes.
- **Import range** delegates to `runRangeImport()`.

- [ ] **Write RED entrypoint tests** by changing `PRODUCTION_ENTRYPOINTS` to the exact five functions above. Smoke must expose only `runRuntimeSmoke`.

- [ ] **Write RED manifest test** for exactly:

```text
https://www.googleapis.com/auth/spreadsheets.currentonly
https://www.googleapis.com/auth/script.container.ui
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/script.external_request
```

- [ ] **Update bundle-security contract:** remove the now-obsolete rule forbidding Search Console/GA4 endpoints in production. Require the intended API path while still rejecting `DriveApp`, Drive APIs, GTM/TagManager, `MailApp`, `GmailApp`, URL Inspection endpoint, and trigger-management capabilities.

- [ ] **Run RED:**

```bash
npm run seo:build:apps-script
npm run seo:test:apps-script-contracts
```

- [ ] **Implement Menu + registry + build:** add daily import and range import menu items. `runRangeImportFromMenu()` validates bounded ISO dates and asks the operator to choose `Measure only` or `Import range`; measure mode displays `GSC Page Queries rows: N` and never invokes `runRangeImport()`.

Register `runDailyImport` and `runRangeImportFromMenu` in `entrypoints/production.ts` and in the production `build.mjs` entrypoint array. Do not alter smoke entrypoints.

- [ ] **Set exact manifest, rebuild, run all gates, commit:**

```bash
git add seo/apps-script/src/Menu.ts seo/apps-script/entrypoints/production.ts seo/apps-script/build.mjs seo/apps-script/appsscript.json tests/seo/apps-script/config.test.ts tests/seo/apps-script/entrypoint-discoverability.test.mjs tests/seo/apps-script/bundle-contract.test.mjs seo/apps-script/generated seo/apps-script/generated-smoke
git commit -m "feat(seo): expose production import operator surface"
```

- [ ] **STOP for explicit production authorization.** Only after owner approval: use corporate `heraklis@evochia.gr`; re-read `Config!E1:H9`; deploy the generated production artifact to the authoritative corporate bound Apps Script project; authorize only the exact five scopes; run setup/metadata initialization; verify the five callable functions. Do not install a daily trigger yet.

---

## GATE-A: Sizing Before Backfill — HARD STOP AFTER TASK 5

**Task 6 must not start until this gate is complete and the measured values are written into the execution record.**

Under the owner-authorized corporate production path, call `runRangeImportFromMenu()` for exactly one finalized GSC day and choose **Measure only**. This must execute `measurePageQueryRows()` and make no GSC data-sheet write.

Record exactly:

```text
GATE-A finalized date: <actual date>
GSC Page Queries rows: <actual N>
Projected 395-day rows: <N × 395>
BACKFILL_WRITE_MODE: UPSERT | APPEND
DAILY_WRITER_OPTIMIZATION_REQUIRED: YES | NO
```

The 395-day multiplication is an operational sizing estimate only. Then **stop and report the measurement**. Do not begin backfill automatically.

If the evidence selects `APPEND`, Task 6 includes the bounded initial-backfill append path. If `DAILY_WRITER_OPTIMIZATION_REQUIRED = YES`, Task 7 becomes mandatory before scheduling.

---

### Task 6: Measurement-Selected 13-Month Backfill and M1/M2 Activation Evidence

**Files:**
- Conditional APPEND branch only: modify `seo/apps-script/src/SheetWriter.ts`, `seo/apps-script/src/Jobs.ts`, tests `sheet-writer.test.ts`, `jobs.test.ts`
- Modify after observed-query review: `seo/apps-script/src/BrandedQuery.ts`
- Test: `tests/seo/apps-script/branded-query.test.ts`

**Interfaces:**
- Consume the literal GATE-A evidence before any Task 6 edit/action.
- Produce 13 months of available canonical GSC history.
- Produce observed curated `BRAND_ALIASES`.
- Produce owner-selected `MIN_PAGE_IMPRESSIONS` provenance.
- Produce property-grain timezone/date-boundary reconciliation evidence.

- [ ] **Copy the actual GATE-A values into the Task 6 execution record.** If missing, stop.

- [ ] **If `BACKFILL_WRITE_MODE=APPEND`, write RED safety tests first.** The append helper must fail if target data rows already exist, validate/write headers once, serialize cells with `serializeLiteralCell`, deduplicate each incoming chunk by the canonical key, and be callable only for explicitly confirmed initial backfill. It must not be used for repair/replay.

Narrow interface:

```ts
appendInitialBackfillRows(
  sheetName: string,
  keyColumns: string[],
  incomingRows: RowRecord[],
  dependencies?: SheetWriterDependencies,
): WriteSummary
```

If GATE-A selected UPSERT, do not add this function.

- [ ] **Implement the selected backfill write branch only.** APPEND uses non-overlapping month chunks into an initially empty canonical history. UPSERT uses the existing range+idempotent writer. M1 repair always remains idempotent; never use append for repair.

- [ ] **Run the 13-month GSC history load** in bounded calendar-month chunks ending on the latest finalized GSC date. Confirm each month before proceeding. On any failure, stop; do not skip or synthesize zero rows.

Verify earliest/latest stored dates, real rows across all four GSC grains where reported, and one repeated month with zero duplicate logical keys.

- [ ] **Derive aliases from observed queries.** Inspect distinct high-impression queries, approve only actual Evochia variants, add them to `BRAND_ALIASES`, and add regression tests for each. Retain `euphoria` false-positive protection.

- [ ] **Calibrate `MIN_PAGE_IMPRESSIONS` with the owner.** Show the count of eligible pages at 20, 30, 50 and 100 reported non-branded impressions over 28 finalized days. The owner chooses the operating judgment. Record `key`, chosen `value`, `rationale`, eligibility impact, and `last reviewed` in `Config!E7:H9`. Never describe it as statistically derived.

- [ ] **Perform GSC property-grain reconciliation.** Pick one finalized date and compare `GSC Daily` (`aggregationType: byProperty`) clicks/impressions against Search Console UI **property-level totals** under equivalent filters. Do not compare summed page rows. Record PASS/FAIL. FAIL blocks M1 activation and requires investigation; it does not authorize automatic timezone change.

- [ ] **Run all repo gates and commit any source changes** from APPEND implementation and/or curated aliases.

- [ ] **If Task 7 is not required, schedule only after the separate legacy cutover gate:** verify personal legacy scheduled triggers are exactly zero, then manually install one corporate daily trigger and observe its first execution. Do not add `script.scriptapp`.

---

### Task 7 (Conditional): Incremental Idempotent Writes for Mature `GSC Page Queries`

**Run only if GATE-A recorded `DAILY_WRITER_OPTIMIZATION_REQUIRED=YES`.**

**Files:**
- Modify: `seo/apps-script/src/SheetWriter.ts`
- Modify: `seo/apps-script/src/GscImporter.ts`
- Test: `tests/seo/apps-script/sheet-writer.test.ts`
- Test: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Produce a narrow incremental upsert used only for `GSC Page Queries`.
- Preserve existing `upsertRows()` for all other sheets.
- Support both daily insert/update and M1 range repair without rewriting the full accumulated matrix.

- [ ] **Write RED tests** against a mature sheet: unchanged key = no write; new key = append only that row; changed key = update only that existing row; formula-like cells remain serialized; unexpected new columns after header establishment hard-fail; workbook ID mismatch performs zero data reads/writes.

- [ ] **Implement:**

```ts
upsertRowsIncremental(
  sheetName: string,
  keyColumns: string[],
  incomingRows: RowRecord[],
  dependencies?: SheetWriterDependencies,
): WriteSummary
```

It may read the existing sheet once to build a key-to-row index, but must not write the full matrix. Keep headers fixed. Batch changed rows where practical and append only new rows after the current last row.

- [ ] **Route only the `pageQueries` GSC spec** to this writer. GSC Daily/Pages/Queries, GA4, Run Log and Config metadata keep their existing paths.

- [ ] **Run all focused and global gates**, commit:

```bash
git add seo/apps-script/src/SheetWriter.ts seo/apps-script/src/GscImporter.ts tests/seo/apps-script/sheet-writer.test.ts tests/seo/apps-script/gsc-importer.test.ts seo/apps-script/generated seo/apps-script/generated-smoke
git commit -m "perf(seo): bound page-query sheet writes"
```

- [ ] **Under explicit production authorization**, redeploy the regenerated production artifact, verify scopes unchanged, rerun one finalized day to prove idempotency, verify legacy triggers zero, manually install one corporate daily trigger, and observe the first scheduled execution.

---

## Final Acceptance

V1 is complete only when evidence shows all applicable items below:

- capability-scoped config no longer couples workbook/GSC/GA4 readiness to GTM/Drive;
- all six GA4 grains persist under the exact composite keys;
- all four GSC grains exist, including `GSC Page Queries` at `date+page+query`;
- generated production bundle exposes exactly the five intended callables;
- manifest contains exactly the five approved OAuth scopes;
- daily orchestration reports truthful `SUCCESS/PARTIAL/FAILED` and isolates source failure;
- `Config!E1:F4` freshness works without touching legacy `A:C`;
- GATE-A was measure-only, recorded actual page-query rows, and produced a writer decision before backfill;
- 13 months of available GSC history loaded without fabricated data or duplicate logical keys;
- aliases came from observed queries;
- `MIN_PAGE_IMPRESSIONS` is owner-calibrated and documented;
- property-grain GSC reconciliation passes before M1 activation;
- when required, mature page-query writes are incremental before scheduling;
- corporate daily scheduling occurs manually only after legacy scheduled triggers are verified at zero.
