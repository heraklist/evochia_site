# GSC URL Inspection Telemetry Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the existing read-only Google Search Console URL Inspection client as an isolated daily telemetry source that persists complete historical snapshots for a fixed approved URL set without weakening canonical GSC Search Analytics or GA4 ingestion.

**Architecture:** Extend the current Apps Script production pipeline with a dedicated `gscIndex` capability, strict monitored-URL governance, structurally validated URL Inspection parsing, fixed-schema `GSC Indexing` persistence, and a last-running auxiliary orchestration stage. `GSC_INDEX` gets its own Run Log source status and fail-closed lifecycle but never participates in canonical `overallStatus` or range/backfill paths.

**Tech Stack:** TypeScript 5.9, Node 22 test runner, `tsx --test`, Google Apps Script V8, Search Console URL Inspection API, existing `SheetWriter`, existing Apps Script bundle build/check pipeline.

**Spec:**
- `docs/superpowers/specs/2026-09-02-gsc-url-inspection-telemetry-design.md`
- `docs/superpowers/specs/2026-09-02-gsc-url-inspection-telemetry-design-amendment-1.md`

## Global Constraints

- Keep the existing production OAuth scope set unchanged; `webmasters.readonly` remains the Search Console scope.
- Add no scheduled trigger and no public Apps Script callback.
- `GSC_INDEX` runs only in `runDailyImport()` and always after canonical GSC + GA4 persistence/freshness checkpoint.
- `runRangeImport()` and `measurePageQueryRows()` must never call URL Inspection.
- `overallStatus` remains a function of GSC + GA4 only.
- `GSC_INDEX` uses `SUCCESS | FAILED`; no `PARTIAL` source status.
- `APPROVED_MONITORED_PATHS` contains paths only; absolute URLs are composed as `https://${productionHostname}${path}`.
- Current approved path count is asserted in tests as 16, but production expected-count logic always derives from `APPROVED_MONITORED_PATHS.length`.
- `MAX_INSPECTION_URLS = 25`.
- Every approved path must resolve to an existing repository `.html` route.
- `sitemap` is the provider JSON property name; never `sitemaps` in API-facing types/parser code.
- `NOT_RETURNED` is allowed only for omitted fields inside a structurally valid `indexStatusResult`; request/structural failures become `REQUEST_FAILED`.
- Canonical comparison normalizes hostname case, default ports, and fragments only. Scheme, `www`, trailing slash, query string, and path casing remain significant.
- `GSC Indexing` is the only canonical indexing telemetry sheet. `GSC_Index` remains legacy and unused.
- Fixed `GSC Indexing` schema is exactly 19 columns in approved order.
- Preflight verifies schema only; `setupWorkbook()` is the sole initializer of `GSC Indexing` headers.
- Historical snapshot completeness is immutable and is determined only by the historical `Run Log` `GSC_INDEX` row having `sourceStatus = SUCCESS`; never re-evaluate old snapshots against the current allowlist length.
- For same-day multiple successful runs, latest `SUCCESS` by `Checked At` is authoritative.
- `stageDurationMs` is appended to existing `Run Log` through generic `SheetWriter` dynamic-header extension; historical rows remain preserved with blank duration.
- `persistedRowCount` is not a stored field. Whenever the plan refers to persisted row count, compute it as `insertedRows + updatedRows + unchangedRows`.
- A synthetic `{ inspectionResult: { indexStatusResult: {} } }` fixture is valid `INSPECTED` test input with all provider fields `NOT_RETURNED`. The production acceptance guard against an all-`NOT_RETURNED` `INSPECTED` row is an observation requiring investigation, not a runtime parser rejection.
- The bundle contract inversion is intentional and one-way for this design: after activation the production bundle is required to contain URL Inspection support. Commit rationale must state this explicitly.

---

## File Structure

Primary existing files to modify:

- `seo/apps-script/src/Config.ts` — add `gscIndex`, `monitoredUrls`, approved-path config validation boundary.
- `seo/apps-script/src/GscClient.ts` — structural response validation, provider presence model, additional API fields, malformed-response error.
- `seo/apps-script/src/GscImporter.ts` — approved paths, URL composition/validation, canonical matching, per-URL isolation, flattening/persistence helpers.
- `seo/apps-script/src/Setup.ts` — fixed 19-column `GSC Indexing` schema initialization and verification.
- `seo/apps-script/src/Jobs.ts` — `GSC_INDEX` source type, canonical checkpoint, placeholder lifecycle, stage timing, daily-only orchestration.
- `seo/apps-script/src/SheetWriter.ts` — preserve generic behavior; add tests only unless a small compatibility hook is required.
- `seo/apps-script/generated/Code.gs` / `generated-smoke/Code.gs` — regenerated artifacts only via existing build script.
- `docs/seo/seo-data-hub-production-runbook.md` — operational semantics, deployment, recovery, consumption rules.

Tests to modify/create:

- `tests/seo/apps-script/gsc-importer.test.ts`
- `tests/seo/apps-script/jobs.test.ts` if present; otherwise create `tests/seo/apps-script/gsc-index-jobs.test.ts`
- `tests/seo/apps-script/config.test.ts` if present; otherwise extend the existing closest config test.
- `tests/seo/apps-script/setup.test.ts` if present; otherwise create `tests/seo/apps-script/gsc-index-schema.test.ts`
- `tests/seo/apps-script/bundle-contract.test.mjs`
- `tests/seo/apps-script/sheet-writer.test.ts` or existing sheet-writer coverage file
- `tests/seo/apps-script/gsc-index-contract.test.ts` for approved paths/routes/canonical comparison if separation improves readability.

Do not refactor unrelated files.

---

### Task 1: Lock the configuration and approved-path contract

**Files:**
- Modify: `seo/apps-script/src/Config.ts`
- Modify/Create: closest config test under `tests/seo/apps-script/`
- Create or Modify: `tests/seo/apps-script/gsc-index-contract.test.ts`

**Interfaces:**
- Produces: `CapabilityKey` including `'gscIndex'`
- Produces: `SeoConfig.monitoredUrls: string[]`
- Produces: `APPROVED_MONITORED_PATHS: readonly string[]`
- Produces: `MAX_INSPECTION_URLS = 25`
- Produces: helper that composes expected URLs from `productionHostname` without rewriting configured values

- [ ] **Step 1: Write RED tests for capability isolation and approved path governance**

Add tests that prove:

```ts
assert.deepEqual(required resources for 'gsc', ['gscProperty']);
assert.deepEqual(required resources for 'gscIndex', [
  'gscProperty',
  'productionHostname',
  'monitoredUrls',
]);
```

and:

```ts
assert.equal(APPROVED_MONITORED_PATHS.length, 16);
assert.equal(new Set(APPROVED_MONITORED_PATHS).size, APPROVED_MONITORED_PATHS.length);
assert.ok(APPROVED_MONITORED_PATHS.length <= MAX_INSPECTION_URLS);
```

For every approved path:

```ts
const relative = path.replace(/^\//, '').replace(/\/$/, '.html');
assert.ok(fs.existsSync(relative), `${path} must resolve to ${relative}`);
```

Add config fixtures proving malformed/missing `monitoredUrls` fails only `verifyConfig(..., ['gscIndex'])`, while `verifyConfig(..., ['gsc'])` remains valid with the same `gscProperty`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm run seo:test:apps-script -- --test-name-pattern="gscIndex|approved monitored|route existence"
```

Expected: FAIL because `gscIndex`, `monitoredUrls`, and approved-path exports do not yet exist.

- [ ] **Step 3: Implement minimal configuration support**

In `Config.ts`:

```ts
export type CapabilityKey = 'workbook' | 'gsc' | 'gscIndex' | 'ga4';

export interface SeoConfig {
  gscProperty: string;
  monitoredUrls: string[];
  // existing fields unchanged
}

const CAPABILITY_RESOURCES = {
  workbook: ['sheetId'],
  gsc: ['gscProperty'],
  gscIndex: ['gscProperty', 'productionHostname', 'monitoredUrls'],
  ga4: ['ga4PropertyId', 'ga4PropertyTimeZone', 'productionHostname'],
} as const;
```

Keep approved paths in a focused module if that avoids coupling `Config.ts` to repository-route concerns, e.g. `seo/apps-script/src/GscIndexConfig.ts`:

```ts
export const MAX_INSPECTION_URLS = 25;
export const APPROVED_MONITORED_PATHS = [
  '/en/private-chef/',
  '/en/villa-private-chef/',
  '/en/yacht-private-chef/',
  '/en/athens-private-chef/',
  '/en/greek-islands-private-chef/',
  '/el/private-chef/',
  '/el/villa-private-chef/',
  '/el/yacht-private-chef/',
  '/el/athens-private-chef/',
  '/el/greek-islands-private-chef/',
  '/en/catering/',
  '/en/wedding-catering/',
  '/en/corporate-catering/',
  '/el/catering/',
  '/el/wedding-catering/',
  '/el/corporate-catering/',
] as const;

export function expectedMonitoredUrls(productionHostname: string): string[] {
  return APPROVED_MONITORED_PATHS.map((path) => `https://${productionHostname}${path}`);
}
```

Validation must compare configured URL set exactly to `expectedMonitoredUrls(...)`, reject duplicates, reject non-HTTPS values, enforce the cap, and never silently rewrite input URLs.

- [ ] **Step 4: Run focused tests GREEN**

```bash
npm run seo:test:apps-script -- --test-name-pattern="gscIndex|approved monitored|route existence"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/Config.ts seo/apps-script/src/GscIndexConfig.ts tests/seo/apps-script/
git commit -m "test: lock GSC index capability and monitored routes"
```

---

### Task 2: Replace lossy URL Inspection parsing with structural/presence-aware parsing

**Files:**
- Modify: `seo/apps-script/src/GscClient.ts`
- Modify: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Produces: `MalformedInspectionResponse extends Error`
- Produces: `ScalarField`, `ArrayField`
- Produces: structurally valid parsed inspection result including `sitemap`, `referringUrls`, `crawledAs`, `inspectionResultLink`

- [ ] **Step 1: Add RED malformed-200 and provider-property fixtures**

Required cases:

```ts
{} // throws MalformedInspectionResponse
{ inspectionResult: {} } // throws MalformedInspectionResponse
{ inspectionResult: { indexStatusResult: {} } }
// succeeds; every indexStatusResult scalar field => NOT_RETURNED,
// arrays => NOT_RETURNED, inspectionResultLink => NOT_RETURNED
```

Add fixture with:

```ts
{
  inspectionResult: {
    inspectionResultLink: 'https://search.google.com/search-console/inspect?...',
    indexStatusResult: {
      verdict: 'PASS',
      sitemap: ['https://www.evochia.gr/sitemap.xml'],
      referringUrls: [],
      crawledAs: 'MOBILE',
    },
  },
}
```

Assert:

```ts
assert.deepEqual(result.sitemap, { state: 'VALUE', value: ['https://www.evochia.gr/sitemap.xml'] });
assert.deepEqual(result.referringUrls, { state: 'EMPTY' });
assert.deepEqual(result.crawledAs, { state: 'VALUE', value: 'MOBILE' });
```

Add guard that API-facing source does not contain provider property `sitemaps`.

- [ ] **Step 2: Run RED**

```bash
npm run seo:test:apps-script -- --test-name-pattern="MalformedInspectionResponse|sitemap|presence"
```

Expected: FAIL because current parser uses `?? {}` and does not model provider presence.

- [ ] **Step 3: Implement structural parser and presence helpers**

Use explicit own-property checks:

```ts
function scalarField(object: Record<string, unknown>, key: string): ScalarField {
  return Object.prototype.hasOwnProperty.call(object, key)
    ? { state: 'VALUE', value: String(object[key] ?? '') }
    : { state: 'NOT_RETURNED' };
}
```

For arrays, reject non-array returned values as malformed rather than coercing them:

```ts
function arrayField(object: Record<string, unknown>, key: string): ArrayField {
  if (!Object.prototype.hasOwnProperty.call(object, key)) return { state: 'NOT_RETURNED' };
  const value = object[key];
  if (!Array.isArray(value)) throw new MalformedInspectionResponse(`${key} must be an array`);
  if (value.length === 0) return { state: 'EMPTY' };
  return { state: 'VALUE', value: value.map(String) };
}
```

Structural gate:

```ts
if (!parsed || typeof parsed !== 'object' || !('inspectionResult' in parsed)) {
  throw new MalformedInspectionResponse('inspectionResult is required');
}
if (!inspectionResult || typeof inspectionResult !== 'object' || !('indexStatusResult' in inspectionResult)) {
  throw new MalformedInspectionResponse('indexStatusResult is required');
}
```

Do not add a runtime rule rejecting an `indexStatusResult: {}` body; that fixture must remain valid `INSPECTED` data with `NOT_RETURNED` fields.

- [ ] **Step 4: Run focused tests GREEN**

```bash
npm run seo:test:apps-script -- --test-name-pattern="MalformedInspectionResponse|sitemap|presence"
```

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/GscClient.ts tests/seo/apps-script/gsc-importer.test.ts
git commit -m "feat: preserve URL Inspection response semantics"
```

---

### Task 3: Implement canonical comparison and flattening without ambiguity

**Files:**
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify/Create: `tests/seo/apps-script/gsc-index-contract.test.ts`

**Interfaces:**
- Produces: `canonicalMatch(userCanonical, googleCanonical)`
- Produces: `InspectionSnapshot` discriminated union
- Produces: `flattenInspectionSnapshot(snapshot): RowRecord`

- [ ] **Step 1: Write RED table-driven canonical tests**

Cases:

```text
www vs non-www        MISMATCH
http vs https         MISMATCH
trailing slash        MISMATCH
/Foo/ vs /foo/        MISMATCH
hostname case only    MATCH
:443 only             MATCH
fragment only         MATCH
missing canonical     NOT_COMPARABLE
REQUEST_FAILED        NOT_COMPARABLE
```

Use actual URL strings and ensure only hostname is lowercased; path remains case-sensitive.

- [ ] **Step 2: Write RED flattening tests**

Assert:

```ts
VALUE scalar      -> actual string
NOT_RETURNED      -> 'NOT_RETURNED'
VALUE array       -> JSON.stringify(value)
EMPTY array       -> '[]'
REQUEST_FAILED    -> provider cells ''
```

Do not introduce a stored `persistedRows` field.

- [ ] **Step 3: Run RED**

```bash
npm run seo:test:apps-script -- --test-name-pattern="canonical match|flatten inspection"
```

- [ ] **Step 4: Implement minimal canonical normalization**

Normalize only:

```ts
url.hostname = url.hostname.toLowerCase();
if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
url.hash = '';
```

Do not modify scheme, hostname labels such as `www`, pathname, trailing slash, search params, or path case.

- [ ] **Step 5: Implement flattening with exact 19-column field names**

Return `RowRecord` keys matching the approved sheet headers exactly.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm run seo:test:apps-script -- --test-name-pattern="canonical match|flatten inspection"
git add seo/apps-script/src/GscImporter.ts tests/seo/apps-script/gsc-index-contract.test.ts
git commit -m "feat: normalize and flatten GSC index snapshots"
```

---

### Task 4: Make `GSC Indexing` a fixed-schema canonical sheet

**Files:**
- Modify: `seo/apps-script/src/Setup.ts`
- Create/Modify: `tests/seo/apps-script/gsc-index-schema.test.ts`

**Interfaces:**
- Produces: `GSC_INDEXING_HEADERS` exact 19-element readonly tuple/list
- Produces: `ensureGscIndexingSchema(workbook)` or equivalent setup-owned helper
- Preflight consumes a read-only validator and never initializes headers

- [ ] **Step 1: Write RED initialization and fail-closed schema tests**

Test:

```text
empty GSC Indexing sheet      -> setup writes exactly 19 headers
exact schema                  -> accepted unchanged
18 columns                    -> SchemaError
reordered columns             -> SchemaError
extra columns                 -> SchemaError
```

Add explicit test proving inspection preflight validation on an empty sheet throws `SchemaError` and does not write headers.

- [ ] **Step 2: Run RED**

```bash
npm run seo:test:apps-script -- --test-name-pattern="GSC Indexing schema|SchemaError|preflight"
```

- [ ] **Step 3: Implement setup-owned header initialization**

Keep `setupWorkbook()` as the only initializer. Do not teach generic `upsertRows()` special `GSC Indexing` behavior.

- [ ] **Step 4: Implement read-only schema validator for orchestration preflight**

The validator may read row 1 but must never write.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm run seo:test:apps-script -- --test-name-pattern="GSC Indexing schema|SchemaError|preflight"
git add seo/apps-script/src/Setup.ts tests/seo/apps-script/gsc-index-schema.test.ts
git commit -m "feat: enforce fixed GSC Indexing schema"
```

---

### Task 5: Build per-URL isolated snapshot collection and one-shot persistence

**Files:**
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Produces: batch collector accepting `runId`, `checkedAt`, `siteUrl`, `monitoredUrls`
- Produces: batch result with snapshots, inspected count, failed count, persistence summary

- [ ] **Step 1: Write RED per-URL isolation test**

Generate `APPROVED_MONITORED_PATHS.length` monitored URLs. Make request 7 throw typed pipeline error. Assert:

```text
total snapshots = approved length
INSPECTED = approved length - 1
REQUEST_FAILED = 1
remaining URLs still requested
all Run Id equal
all Checked At equal
```

- [ ] **Step 2: Write RED persistence-key/idempotency test**

Persist with key:

```ts
['Run Id', 'URL']
```

Re-persist same run and rows: unchanged rather than duplicate. New Run Id: new history rows.

- [ ] **Step 3: Run RED**

```bash
npm run seo:test:apps-script -- --test-name-pattern="per-URL isolation|Run Id|Checked At|idempotent"
```

- [ ] **Step 4: Implement collection loop**

Use `for ... of`, not fail-fast `.map()`:

```ts
for (const url of monitoredUrls) {
  try {
    const result = fetchUrlInspection({
      siteUrl,
      inspectionUrl: url,
      accessToken,
      transport,
      inspectedAt: checkedAt,
    });
    snapshots.push(toInspectedSnapshot(runId, checkedAt, result));
  } catch (error) {
    snapshots.push(toFailedSnapshot(runId, checkedAt, url, error));
  }
}
```

- [ ] **Step 5: Persist the complete in-memory group once**

Call `upsertRows('GSC Indexing', ['Run Id', 'URL'], rows)` only after collection completes.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm run seo:test:apps-script -- --test-name-pattern="per-URL isolation|Run Id|Checked At|idempotent"
git add seo/apps-script/src/GscImporter.ts tests/seo/apps-script/gsc-importer.test.ts
git commit -m "feat: collect isolated GSC indexing snapshots"
```

---

### Task 6: Orchestrate `GSC_INDEX` after the canonical checkpoint

**Files:**
- Modify: `seo/apps-script/src/Jobs.ts`
- Create/Modify: `tests/seo/apps-script/gsc-index-jobs.test.ts` or existing jobs test
- Modify: closest `SheetWriter` test file

**Interfaces:**
- Extends `RunLogRow.source` and `SourceOutcome.source` to include `'GSC_INDEX'`
- Adds `stageDurationMs` to Run Log rows without changing canonical rows' timing semantics
- Daily result may expose indexing source outcome, but canonical `status` remains unchanged

- [ ] **Step 1: Write the central RED capability-isolation test**

With malformed `monitoredUrls`:

```text
GSC sourceStatus       SUCCESS
GA4 sourceStatus       SUCCESS
GSC_INDEX sourceStatus FAILED
overallStatus          SUCCESS
GSC Indexing rows      0
```

This is the highest-priority test in the plan.

- [ ] **Step 2: Write RED orchestration-order test**

Use spies to assert call order:

```text
GSC import
GA4 import
canonical Run Log write
freshness update
GSC_INDEX placeholder write
inspection calls
GSC Indexing persistence
GSC_INDEX final Run Log write
```

- [ ] **Step 3: Write RED placeholder lifecycle test**

Inject failure/hard-stop simulation after placeholder checkpoint and before finalization. Assert the last stored row for `(Run Id, GSC_INDEX)` remains:

```text
FAILED
InspectionStageIncomplete
```

- [ ] **Step 4: Write RED duration and historical Run Log extension test**

Start from Run Log rows with old headers/data. Write a `GSC_INDEX` row containing `stageDurationMs`. Assert:

- new header is appended, not reordered;
- old rows/values remain unchanged;
- old rows have blank new cell;
- finalized GSC_INDEX row has integer duration;
- GSC/GA4 rows remain blank for duration in this change.

- [ ] **Step 5: Write RED historical-completeness immutability test**

Create historical Run Log snapshot:

```text
source = GSC_INDEX
sourceStatus = SUCCESS
historical snapshot rows = 16
```

Simulate current approved-path length >16. Assert downstream validity helper still considers the historical run valid solely from historical `sourceStatus` and does not compare to the current length.

- [ ] **Step 6: Run RED**

```bash
npm run seo:test:apps-script -- --test-name-pattern="capability isolation|orchestration|InspectionStageIncomplete|stageDurationMs|historical snapshot"
```

- [ ] **Step 7: Implement canonical checkpoint then auxiliary stage**

Preserve:

```ts
const status = overallStatus(gsc, ga4);
```

Persist GSC + GA4 Run Log and freshness before starting `gscIndex` config/preflight.

- [ ] **Step 8: Implement placeholder and finalization**

Placeholder uses same `['runId', 'source']` key and `overallStatus` already computed from canonical sources.

Measure:

```ts
const gscIndexStartedMs = Date.now();
// preflight + collection + persistence
const stageDurationMs = Date.now() - gscIndexStartedMs;
```

If using injected clock for deterministic tests, preserve production semantics equivalent to elapsed milliseconds.

- [ ] **Step 9: Implement source counters without fake `persistedRows` field**

For source-level descriptions/tests compute:

```ts
const persistedRowCount = write.inserted + write.updated + write.unchanged;
```

Do not add `persistedRows` to `RunLogRow`.

- [ ] **Step 10: Run GREEN and commit**

```bash
npm run seo:test:apps-script -- --test-name-pattern="capability isolation|orchestration|InspectionStageIncomplete|stageDurationMs|historical snapshot"
git add seo/apps-script/src/Jobs.ts tests/seo/apps-script/ seo/apps-script/src/SheetWriter.ts
git commit -m "feat: isolate daily GSC indexing telemetry stage"
```

---

### Task 7: Lock range prohibition and invert the production bundle capability contract

**Files:**
- Modify: `tests/seo/apps-script/gsc-range-brand.test.ts`
- Modify: `tests/seo/apps-script/bundle-contract.test.mjs`
- Regenerate: `seo/apps-script/generated/Code.gs`
- Regenerate: `seo/apps-script/generated-smoke/Code.gs`

**Interfaces:**
- Production bundle must contain URL Inspection endpoint after this feature
- Range and measure paths remain Search Analytics-only

- [ ] **Step 1: Write RED range-prohibition spy test**

Call `runRangeImport()` with otherwise valid monitored configuration and a transport spy capable of recognizing the URL Inspection endpoint. Assert zero inspection endpoint calls.

Add equivalent measure-only assertion for `measurePageQueryRows()`.

- [ ] **Step 2: Run RED or verify current behavior remains GREEN while the new explicit contract is absent**

```bash
npm run seo:test:apps-script -- --test-name-pattern="range.*inspection|measure.*inspection"
```

- [ ] **Step 3: Invert bundle contract in its own commit**

Replace:

```js
assert.doesNotMatch(code, /urlInspection\/index:inspect/);
```

with a positive requirement:

```js
assert.match(code, /urlInspection\/index:inspect/);
```

Keep all unrelated privileged-capability denials.

Commit rationale must state:

> URL Inspection is now a permanent read-only production telemetry capability. The positive assertion is intentionally one-way so future bundles cannot silently drop indexing observability while appearing otherwise healthy.

- [ ] **Step 4: Build generated Apps Script artifacts**

```bash
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

- [ ] **Step 5: Run bundle/contracts GREEN**

```bash
npm run seo:test:apps-script-contracts
```

- [ ] **Step 6: Commit**

```bash
git add tests/seo/apps-script/bundle-contract.test.mjs tests/seo/apps-script/gsc-range-brand.test.ts seo/apps-script/generated seo/apps-script/generated-smoke
git commit -m "feat: activate URL Inspection in production bundle"
```

---

### Task 8: Document operational semantics and deployment/recovery path

**Files:**
- Modify: `docs/seo/seo-data-hub-production-runbook.md`
- Modify: design/spec only if wording alignment is required; do not rewrite whole approved spec unnecessarily

**Interfaces:**
- Produces operator instructions for setup, activation, recovery, and consumption

- [ ] **Step 1: Add the canonical schema and ownership rules**

Document:

- fixed 19-column `GSC Indexing` schema;
- `setupWorkbook()` initializes, preflight verifies only;
- `GSC_Index` is legacy/unconsumed;
- schema mismatch recovery is rename/archive + recreate + setup, with destructive clear only after explicit retention check.

- [ ] **Step 2: Add Run Log semantics**

Document:

```text
GSC_INDEX SUCCESS = complete usable snapshot
GSC_INDEX FAILED  = incomplete/unusable snapshot as a whole
```

and:

```text
fetchedRows = successful provider responses
persisted row count = insertedRows + updatedRows + unchangedRows
```

State explicitly that persisted count may exceed fetched count for diagnostic rows and that `stageDurationMs` is auxiliary stage timing only.

- [ ] **Step 3: Add historical consumption rules**

Document:

- only historical Run Log `sourceStatus = SUCCESS` determines historical completeness;
- never compare historical row count to current approved-path length;
- latest same-day SUCCESS by `Checked At` wins;
- failed rows remain troubleshooting evidence only.

- [ ] **Step 4: Add deployment sequence**

Exact sequence:

```text
1. merge/deploy code
2. run updated setupWorkbook
3. verify exact 19 GSC Indexing headers
4. intentionally observe one run before monitoredUrls is configured:
   GSC_INDEX FAILED / ConfigurationError
   GSC SUCCESS
   GA4 SUCCESS
   overallStatus SUCCESS
5. verify Run Log now contains stageDurationMs header without historical damage
6. update SEO_GOOGLE_RESOURCES_JSON with exact approved absolute URLs
7. run/observe next daily execution
8. verify mechanical first-run acceptance
```

- [ ] **Step 5: Add lost-day recovery and range prohibition**

Manual `runDailyImport()` is the only recovery. It creates a new Run Id; range/backfill remains prohibited for inspection.

- [ ] **Step 6: Add indexed-version limitation and acceptance interpretation**

State URL Inspection is not a live URL test; missing fields can be provider evidence. Also state the all-`NOT_RETURNED` `INSPECTED` production guard is an **acceptance observation requiring investigation, not runtime rejection**.

- [ ] **Step 7: Commit docs**

```bash
git add docs/seo/seo-data-hub-production-runbook.md
git commit -m "docs: add GSC indexing telemetry operations"
```

---

### Task 9: Full repository verification before PR review

**Files:**
- No new implementation files unless verification exposes a defect

**Interfaces:**
- Produces evidence that the branch satisfies type, unit, contract, build, and existing repository gates

- [ ] **Step 1: Run Apps Script unit suite**

```bash
npm run seo:test:apps-script
```

Expected: PASS.

- [ ] **Step 2: Run Apps Script contract suite**

```bash
npm run seo:test:apps-script-contracts
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript checks**

```bash
npm run typecheck
npm run typecheck:gas
```

Expected: PASS.

- [ ] **Step 4: Verify generated bundle is current**

```bash
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

Expected: build makes no unexpected uncommitted delta; bundle check PASS.

- [ ] **Step 5: Run broader SEO/unit regression gates**

```bash
npm run test:unit
npm run test:analytics
```

Expected: PASS.

- [ ] **Step 6: Inspect final diff**

Confirm:

- no public HTML change;
- no OAuth scope addition;
- no second trigger/public callback;
- no range inspection path;
- bundle contains URL Inspection endpoint intentionally;
- `sitemap` singular preserved;
- fixed 19-column schema exactly matches spec;
- current expected-count logic derives from `.length`;
- historical validity logic does not derive from current `.length`.

- [ ] **Step 7: Commit any verification-only fixes separately**

Use narrow commits; do not hide unrelated cleanup inside final verification.

---

### Task 10: Production activation and acceptance evidence

**Files:**
- Production bound Apps Script / Sheet configuration only; no source edits unless evidence reveals a defect

**Interfaces:**
- Produces production evidence for capability isolation and first valid telemetry snapshot

- [ ] **Step 1: Deploy merged/generated Apps Script code**

Use the repository's existing production deployment mechanism. Do not create a new trigger or deployment model.

- [ ] **Step 2: Run `setupWorkbook()` before configuring monitored URLs**

Verify `GSC Indexing` header row is exactly:

```text
Checked At | Run Id | URL | Outcome | Verdict | Coverage State | Robots.txt State | Indexing State | Page Fetch State | Crawled As | Google Canonical | User Canonical | Canonical Match | Last Crawl Time | Sitemap | Referring URLs | Inspection Result Link | Error Class | Error Message
```

- [ ] **Step 3: Capture intentional isolation evidence**

Before adding `monitoredUrls`, run/observe daily import and require:

```text
GSC       SUCCESS
GA4       SUCCESS
GSC_INDEX FAILED / ConfigurationError
overall   SUCCESS
```

This is positive production evidence of isolation, not activation regression.

- [ ] **Step 4: Verify Run Log schema extension**

Confirm `stageDurationMs` exists after the GSC_INDEX Run Log write, historical rows are preserved, and historical/canonical rows have blank values in the new column.

- [ ] **Step 5: Update `SEO_GOOGLE_RESOURCES_JSON`**

Add exactly the approved absolute URLs composed from current `productionHostname` + approved paths. Preserve all existing verified config values exactly.

- [ ] **Step 6: Run/observe next daily import**

Mechanical acceptance only:

```text
matching GSC_INDEX Run Log row       SUCCESS
GSC Indexing rows for Run Id         APPROVED_MONITORED_PATHS.length
common Run Id / Checked At           all rows
headers                              exact 19
Outcome                              INSPECTED for all rows
GSC / GA4 / overallStatus            SUCCESS
Sitemap / Referring URLs             valid JSON or NOT_RETURNED
stageDurationMs                      numeric
```

- [ ] **Step 7: Inspect the all-NOT_RETURNED acceptance guard**

If a production `Outcome = INSPECTED` row has every provider field `NOT_RETURNED`, do **not** reject it in parser logic. Instead stop acceptance and investigate whether the provider returned a structurally empty but technically valid `indexStatusResult`, a response-shape issue escaped fixtures, or another cause.

- [ ] **Step 8: Record first duration datapoint**

Store/report observed `stageDurationMs`. Do not create a pass/fail timing threshold from one run.

- [ ] **Step 9: Start observation window**

Treat the first successful snapshot as T0 only. Do not interpret EN/EL content/indexing hypothesis from acceptance. Accumulate at least two weeks of `SUCCESS` snapshots before transition-level analysis.

---

## Plan Self-Review Checklist

Before implementation starts, verify:

- Every spec section is mapped to at least one task.
- Amendment 1 is reflected in Tasks 6, 8, and 10.
- No task uses `persistedRows` as a stored field.
- `stageDurationMs` ownership is generic Run Log header extension, not `setupWorkbook()`.
- Preflight never initializes `GSC Indexing` headers.
- Historical completeness never compares an old run against current allowlist length.
- The synthetic empty `indexStatusResult` fixture remains valid parser input; the all-NOT_RETURNED rule is production acceptance observation only.
- Bundle positive assertion rationale states the capability is intentionally permanent/read-only.
- No range/backfill path invokes inspection.
- No production acceptance criterion presumes EN children are indexed or not indexed.
