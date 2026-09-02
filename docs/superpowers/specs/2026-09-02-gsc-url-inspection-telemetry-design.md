# Evochia SEO Data Hub — GSC URL Inspection Telemetry Activation Design

Date: 2026-09-02
Status: Design approved in conversation; awaiting final spec review
Scope: Production activation and completion of existing read-only Google Search Console URL Inspection support

## 1. Purpose

Activate the already implemented Search Console URL Inspection client as a bounded, read-only telemetry source in the production SEO Data Hub without weakening the existing GSC Search Analytics or GA4 pipelines.

The system must measure indexed-version state over time for a fixed, approved set of Evochia commercial landing pages. It must distinguish provider observations from collection failures, preserve historical snapshots, and make incomplete runs impossible to consume as valid daily observations.

This work is not request-indexing automation and does not submit sitemaps, remove URLs, mutate Search Console configuration, or change site pages.

## 2. Existing state

The repository already contains:

- `fetchUrlInspection()` in `seo/apps-script/src/GscClient.ts`.
- `inspectMonitoredUrls()` in `seo/apps-script/src/GscImporter.ts`.
- URL Inspection allowlist tests.
- `GSC Indexing` as a canonical required workbook sheet.
- `webmasters.readonly` in the existing production OAuth scopes.

Production intentionally disables URL Inspection today:

- the bundle contract rejects `urlInspection/index:inspect`;
- production jobs pass `monitoredUrls: []`;
- the active daily job logs only `GSC` and `GA4` sources.

The change therefore removes a deliberate production capability guard; it is not greenfield importer work.

## 3. Non-goals

This design does not:

- change or merge PR #42;
- modify any public site HTML;
- request indexing;
- add another scheduled trigger;
- add another public Apps Script callback;
- activate URL Inspection in range/backfill/repair workflows;
- add Pipeline Health or M3–M7 reporting logic;
- treat one inspection snapshot as a diagnosis of the EN/EL indexing hypothesis;
- migrate or consume the legacy `GSC_Index` sheet.

## 4. Configuration model

### 4.1 Capability isolation

Extend `CapabilityKey` with a dedicated `gscIndex` capability.

Required resources:

```text
workbook  -> sheetId
gsc       -> gscProperty
gscIndex  -> gscProperty + productionHostname + monitoredUrls
ga4       -> ga4PropertyId + ga4PropertyTimeZone + productionHostname
```

A malformed or missing indexing allowlist must fail only `GSC_INDEX`. It must not cause the canonical `GSC` Search Analytics stage to fail.

### 4.2 Production config key

Add `monitoredUrls: string[]` to `SeoConfig` under the existing `SEO_GOOGLE_RESOURCES_JSON` Script Property.

Do not reuse or expand workbook `TARGET_URLS`. That legacy workbook key remains reference/history only and is outside the production runtime configuration source.

### 4.3 Approved path set

Repository source of truth:

```ts
APPROVED_MONITORED_PATHS
```

The constant contains paths only, not hostnames:

```text
/en/private-chef/
/en/villa-private-chef/
/en/yacht-private-chef/
/en/athens-private-chef/
/en/greek-islands-private-chef/
/el/private-chef/
/el/villa-private-chef/
/el/yacht-private-chef/
/el/athens-private-chef/
/el/greek-islands-private-chef/
/en/catering/
/en/wedding-catering/
/en/corporate-catering/
/el/catering/
/el/wedding-catering/
/el/corporate-catering/
```

Current approved count:

```ts
APPROVED_MONITORED_PATHS.length === 16
```

No production logic may depend on a literal `16`; expected count is always derived from `APPROVED_MONITORED_PATHS.length`.

### 4.4 Host composition and validation

Expected absolute monitored URLs are composed exactly as:

```ts
APPROVED_MONITORED_PATHS.map(
  (path) => `https://${productionHostname}${path}`,
)
```

The configured `monitoredUrls` must equal this composed absolute URL set exactly.

Validation rules:

- array required;
- non-empty;
- no duplicates;
- `MAX_INSPECTION_URLS = 25` hard cap;
- exact set equality against the approved composed set;
- every entry absolute and `https:`;
- for URL-prefix GSC properties, hostname must equal `productionHostname`;
- for `sc-domain:` properties, URL-prefix host validation does not apply, but exact-set equality still applies;
- no silent URL correction or normalization during config validation.

### 4.5 Route existence contract

Every approved path must map to an existing repository route file. The contract test must fail when an approved route is removed or renamed without an explicit telemetry-contract update.

The test should map `/en/foo/` to `en/foo.html` and `/el/foo/` to `el/foo.html` and require the file to exist.

## 5. URL Inspection provider model

### 5.1 Structural response validity

An HTTP 2xx response is not automatically a valid inspection result.

Required structure:

```text
inspectionResult
  -> indexStatusResult
```

Rules:

- HTTP non-2xx -> `REQUEST_FAILED` via typed pipeline error;
- JSON parse failure -> `REQUEST_FAILED`;
- absent `inspectionResult` -> `REQUEST_FAILED` / `MalformedInspectionResponse`;
- absent `indexStatusResult` -> `REQUEST_FAILED` / `MalformedInspectionResponse`;
- present `indexStatusResult` -> `INSPECTED`; individual fields inside it may be `NOT_RETURNED`.

The current `parsed.inspectionResult?.indexStatusResult ?? {}` fallback must be removed from the production parser path.

### 5.2 API field names

API-facing parsing must use the actual provider property names:

- `verdict`
- `coverageState`
- `robotsTxtState`
- `indexingState`
- `lastCrawlTime`
- `pageFetchState`
- `googleCanonical`
- `userCanonical`
- `crawledAs`
- `sitemap` (singular property name, array value)
- `referringUrls`
- `inspectionResultLink` from `inspectionResult`

A contract test must pin `sitemap` singular and reject accidental API-facing use of `sitemaps`.

### 5.3 Provider presence types

Internal representation must preserve field presence semantics.

```ts
type ScalarField =
  | { state: 'VALUE'; value: string }
  | { state: 'NOT_RETURNED' };

type ArrayField =
  | { state: 'VALUE'; value: string[] }
  | { state: 'EMPTY' }
  | { state: 'NOT_RETURNED' };
```

Successful inspection snapshot:

```ts
{
  runId: string;
  checkedAt: string;
  url: string;
  outcome: 'INSPECTED';
  verdict: ScalarField;
  coverageState: ScalarField;
  robotsTxtState: ScalarField;
  indexingState: ScalarField;
  pageFetchState: ScalarField;
  crawledAs: ScalarField;
  googleCanonical: ScalarField;
  userCanonical: ScalarField;
  canonicalMatch: 'MATCH' | 'MISMATCH' | 'NOT_COMPARABLE';
  lastCrawlTime: ScalarField;
  sitemap: ArrayField;
  referringUrls: ArrayField;
  inspectionResultLink: ScalarField;
}
```

Failed request snapshot:

```ts
{
  runId: string;
  checkedAt: string;
  url: string;
  outcome: 'REQUEST_FAILED';
  canonicalMatch: 'NOT_COMPARABLE';
  errorClass: string;
  errorMessage: string;
}
```

`NOT_RETURNED` is reserved for fields omitted from an otherwise structurally valid `indexStatusResult`. It must never represent request failure.

### 5.4 Empty arrays

For array fields only:

- property absent -> `NOT_RETURNED`;
- property present as `[]` -> `EMPTY`;
- property present with values -> `VALUE`.

Scalar fields use only `VALUE | NOT_RETURNED`.

### 5.5 Indexed-version limitation

URL Inspection reports the version known to Google's index. It is not a live URL indexability test.

Consequences:

- `lastCrawlTime` and `googleCanonical` may legitimately be `NOT_RETURNED` for URLs without a meaningful indexed version;
- early post-deploy snapshots may remain unchanged until Google recrawls;
- `NOT_RETURNED` in `sitemap` is not, by itself, an indexing problem and must be interpreted with fields such as `coverageState` and `verdict`;
- content conclusions are outside telemetry acceptance criteria.

## 6. Canonical comparison

`Canonical Match` is derived, not a provider field.

Normalize only non-semantic URL syntax:

- lowercase hostname;
- remove default `:80` / `:443` ports;
- remove fragment.

Do not normalize:

- `http` vs `https`;
- `www` vs non-`www`;
- trailing slash;
- query string;
- path casing.

Path comparison remains case-sensitive.

Results:

```text
MATCH
MISMATCH
NOT_COMPARABLE
```

`NOT_COMPARABLE` applies when either canonical is absent or the snapshot outcome is `REQUEST_FAILED`.

## 7. Canonical workbook schema

`GSC Indexing` is the only production destination. `GSC_Index` is ignored.

Fixed schema, exactly 19 columns in this order:

```text
Checked At
Run Id
URL
Outcome
Verdict
Coverage State
Robots.txt State
Indexing State
Page Fetch State
Crawled As
Google Canonical
User Canonical
Canonical Match
Last Crawl Time
Sitemap
Referring URLs
Inspection Result Link
Error Class
Error Message
```

### 7.1 Header ownership

`setupWorkbook()` owns initialization of this schema.

Behavior:

- completely empty `GSC Indexing` -> write exactly the 19 headers;
- existing exact 19-header schema -> accept;
- any other non-empty header state -> `SchemaError`, fail closed;
- do not dynamically append/reorder these headers through generic `SheetWriter` behavior.

Deployment runbook must call the updated `setupWorkbook()` after repository deployment and verify the 19 headers before enabling `monitoredUrls` in the production Script Property.

Schema recovery:

- prefer rename/archive of incompatible sheet, e.g. `GSC Indexing Legacy YYYY-MM-DD`;
- create/recreate clean canonical `GSC Indexing` and rerun setup;
- destructive clearing is allowed only after confirming no data needs retention.

### 7.2 Sheet flattening

For `INSPECTED` rows:

```text
scalar VALUE        -> actual string
scalar NOT_RETURNED -> "NOT_RETURNED"
array VALUE         -> JSON.stringify(value)
array EMPTY         -> "[]"
array NOT_RETURNED  -> "NOT_RETURNED"
```

Never serialize arrays by comma/semicolon join.

For `REQUEST_FAILED` rows:

- provider-field cells remain blank;
- `Outcome = REQUEST_FAILED`;
- `Canonical Match = NOT_COMPARABLE`;
- `Error Class` and `Error Message` carry the failure.

## 8. Snapshot identity and history

All URL inspections in one daily run share:

```text
Run Id     = daily runId
Checked At = daily startedAt
```

Production orchestration must always pass `checkedAt = startedAt` downward. It must not rely on per-call `new Date()` defaults.

Persistence key:

```text
Run Id + URL
```

This provides idempotency for the same logical run while preserving append-only history across different runs.

### 8.1 Same-day tie-break

Multiple successful runs may occur on the same calendar day, for example after manual recovery.

Downstream rule:

> For a given calendar day, the latest `SUCCESS` `GSC_INDEX` Run Id by `Checked At` is the authoritative daily snapshot. Earlier same-day runs remain troubleshooting/history evidence.

A `FAILED` Run Id never becomes an authoritative snapshot regardless of row count.

## 9. Failure model

### 9.1 Source semantics

`GSC_INDEX` uses existing source status values only:

```text
SUCCESS | FAILED
```

No `PARTIAL` source status is added.

Meaning:

- `SUCCESS` -> complete usable snapshot;
- `FAILED` -> incomplete/unusable snapshot as a whole.

Per-URL `Outcome` and counters explain how incomplete a failed source run was.

### 9.2 Per-URL isolation

Inspection is not fail-fast.

Each approved URL executes independently:

```text
success -> INSPECTED row
failure -> REQUEST_FAILED row
```

One URL failure must not prevent the remaining URLs from being inspected.

No automatic retry policy is introduced in the first version. The next daily run or an explicit manual `runDailyImport()` is the retry path.

### 9.3 Preflight failure

Before provider calls, validate:

- `gscIndex` configuration;
- exact approved set;
- cap;
- URL validity;
- canonical sheet schema.

If preflight fails:

- zero provider calls;
- zero snapshot rows;
- `GSC_INDEX` Run Log row -> `FAILED` with typed config/schema error;
- canonical GSC and GA4 results remain unaffected.

### 9.4 Persistence failure

Collect all URL outcomes in memory first, then perform one persistence operation for the snapshot group.

If persistence fails, `GSC_INDEX` remains `FAILED`. Partial rows, if any exist due to lower-level write failure behavior, are troubleshooting evidence only.

Downstream invariant:

> A `Run Id` in `GSC Indexing` is a valid snapshot only when the matching `Run Log` row has `source = GSC_INDEX` and `sourceStatus = SUCCESS`.

Any other rows for that Run Id must be ignored by analytical consumers.

### 9.5 Hard termination checkpoint

Before the first provider inspection call, write/upsert a fail-closed placeholder Run Log row:

```text
source        = GSC_INDEX
sourceStatus  = FAILED
errorClass    = InspectionStageIncomplete
errorMessage  = GSC_INDEX stage did not reach a completed snapshot state
```

The row uses the same `Run Id + source` key and is finalized later to either `SUCCESS` or a specific final `FAILED` state.

If Apps Script is terminated before finalization, the placeholder remains and prevents accidental consumption of the associated rows as a valid snapshot.

### 9.6 Lost-day recovery

There is no historical/range repair for URL Inspection.

A hard-killed or failed day is recovered only by running `runDailyImport()` again, which creates a new Run Id and a new point-in-time snapshot.

The same-day tie-break rule determines the authoritative successful snapshot.

## 10. Run Log semantics

Extend source types to include:

```text
GSC | GA4 | GSC_INDEX
```

### 10.1 Canonical overall status isolation

`overallStatus` remains derived strictly from canonical sources:

```ts
overallStatus(gsc, ga4)
```

`GSC_INDEX` never participates in this computation.

Expected valid state:

```text
GSC       SUCCESS
GA4       SUCCESS
GSC_INDEX FAILED
overall    SUCCESS
```

This is intentional, not contradictory.

Operational freshness remains limited to canonical GSC/GA4 dataAsOf plus last run/status. No `GSC Indexing dataAsOf` is added because `Checked At` is not Google's dataAsOf.

### 10.2 Counters

For `GSC_INDEX`:

```text
fetchedRows
= count of structurally valid successful provider inspection responses

insertedRows / updatedRows / unchangedRows
= persistence outcomes for telemetry rows, including REQUEST_FAILED diagnostic rows
```

Therefore `persistedRows > fetchedRows` is valid for `GSC_INDEX` and must not be treated as an anomaly by future reporting.

Example:

```text
16 requested
15 INSPECTED
1 REQUEST_FAILED
16 persisted
sourceStatus FAILED
```

### 10.3 Stage duration

Add a machine-readable `stageDurationMs` column to `Run Log`.

Semantics:

- `GSC_INDEX`: integer milliseconds from the beginning of the GSC_INDEX stage preflight/checkpoint to stage finalization;
- `GSC` and `GA4`: blank in this change; no attempt is made to retrofit per-stage timing semantics onto canonical sources;
- the field does not alter the meaning of existing `startedAt` / `finishedAt`, which remain run-level timestamps.

The fail-closed placeholder may initially store a blank `stageDurationMs`; successful or handled-failure finalization writes the measured integer duration. A hard-killed stage may therefore retain a blank duration, which is itself consistent with incomplete finalization.

No arbitrary soft execution deadline is introduced initially. Future budget gates must be based on collected production duration evidence.

## 11. Daily orchestration

Required order:

```text
1. Verify workbook / acquire run identity
2. Run GSC Search Analytics
3. Run GA4
4. Compute canonical overallStatus
5. Persist canonical Run Log rows
6. Persist canonical freshness/status
   ----- canonical checkpoint complete -----
7. Preflight GSC_INDEX and write FAILED placeholder
8. Run APPROVED_MONITORED_PATHS.length URL inspections independently
9. Persist the complete in-memory GSC Indexing group
10. Finalize GSC_INDEX Run Log row, including stageDurationMs
11. Return daily result
```

URL Inspection must run last so auxiliary latency cannot consume execution budget needed by canonical GSC or GA4 ingestion.

## 12. Range and repair prohibition

Hard contract:

```text
runDailyImport       -> may call URL Inspection
runRangeImport       -> must never call URL Inspection
measurePageQueryRows -> must never call URL Inspection
```

URL Inspection is point-in-time state and must never be attached to historical range/backfill/repair runs.

## 13. Deployment sequence

Activation is intentionally two-sided because repo contract and production Script Property must agree.

Sequence:

1. Merge/deploy repository code and contract changes.
2. Run the updated `setupWorkbook()` in production.
3. Verify exact 19-column `GSC Indexing` headers in the canonical sheet.
4. Before setting `monitoredUrls`, execute/observe production once: `GSC_INDEX FAILED / ConfigurationError` is expected while `GSC`, `GA4`, and canonical `overallStatus` remain successful. This is production evidence that capability isolation works.
5. Update `SEO_GOOGLE_RESOURCES_JSON` with the approved absolute monitored URLs composed from `https://${productionHostname}${path}`.
6. Run/observe the next daily execution.
7. Validate the first successful telemetry snapshot against acceptance criteria.

The temporary activation failure in step 4 is expected evidence, not a regression.

## 14. RED tests required before implementation

All tests below must fail before the corresponding implementation is written.

### 14.1 Capability isolation

Malformed `monitoredUrls` must produce:

```text
GSC_INDEX FAILED
GSC SUCCESS
GA4 SUCCESS
overallStatus SUCCESS
0 GSC Indexing rows
```

This is the central isolation test.

### 14.2 Bundle contract inversion

Replace the production negative assertion for `urlInspection/index:inspect` with a positive contract in its own commit, with explicit rationale documenting the intentional capability activation.

### 14.3 `sitemap` singular

Fixture containing `sitemap: [...]` must parse correctly.

Guard that API-facing type/parser code does not use `sitemaps` as the provider property name.

### 14.4 Malformed 200 fixtures

Required cases:

```text
{}                                      -> MalformedInspectionResponse
{ inspectionResult: {} }                -> MalformedInspectionResponse
{ inspectionResult: { indexStatusResult: {} } }
                                        -> INSPECTED with fields NOT_RETURNED
```

### 14.5 Presence trichotomy

Verify:

- absent array property -> `NOT_RETURNED`;
- `[]` -> `EMPTY` -> sheet `[]`;
- populated array -> `VALUE` -> `JSON.stringify`.

Verify scalar absent -> `NOT_RETURNED`.

### 14.6 Canonical comparison table

Required cases:

- `www` vs non-`www` -> MISMATCH;
- `http` vs `https` -> MISMATCH;
- trailing slash difference -> MISMATCH;
- `/Foo/` vs `/foo/` -> MISMATCH;
- hostname case only -> MATCH;
- default `:443` only -> MATCH;
- fragment only -> MATCH;
- either canonical absent -> NOT_COMPARABLE;
- REQUEST_FAILED -> NOT_COMPARABLE.

### 14.7 Per-URL isolation

`APPROVED_MONITORED_PATHS.length` URLs; seventh request fails -> full diagnostic row set, one `REQUEST_FAILED`, all remaining rows `INSPECTED`, sourceStatus FAILED.

### 14.8 Snapshot atomicity

All rows for one daily stage share one Run Id and one Checked At.

Production path must pass explicit checkedAt; it must not rely on the client's per-call default timestamp.

### 14.9 Range prohibition

`runRangeImport()` with valid monitored config and spy transport produces zero URL Inspection calls.

### 14.10 Approved set and route existence

Verify:

- expected count derives from `APPROVED_MONITORED_PATHS.length`;
- exact set equality after `https://${productionHostname}${path}` composition;
- cap 25;
- all approved paths resolve to existing repository route files.

### 14.11 Schema fail-closed

18-column, reordered, or otherwise mismatched `GSC Indexing` headers -> `SchemaError` and zero snapshot writes.

### 14.12 Placeholder lifecycle

Interruption/failure after placeholder checkpoint but before finalization leaves `GSC_INDEX FAILED / InspectionStageIncomplete`.

### 14.13 Stage duration

Verify `stageDurationMs` is numeric on finalized `GSC_INDEX` Run Log rows, blank on the initial placeholder, and absent/blank for canonical GSC/GA4 rows in this change. Verify it does not modify canonical overall-status semantics.

## 15. First production-run acceptance

Acceptance is mechanical only. It must not depend on whether the EN/EL indexing hypothesis is confirmed.

Required successful-run evidence:

```text
Run Log GSC_INDEX row for Run Id        SUCCESS
GSC Indexing rows for Run Id            APPROVED_MONITORED_PATHS.length
common Checked At and Run Id            all rows
headers                                 exactly 19, correct order
Outcome                                 INSPECTED for all rows
GSC / GA4 / overallStatus               SUCCESS
Sitemap / Referring URLs                valid JSON or NOT_RETURNED
stageDurationMs                         numeric on GSC_INDEX Run Log row
```

Additional structural guard:

> No row with `Outcome = INSPECTED` may have every provider field equal to `NOT_RETURNED`.

If such a row appears, treat it as evidence that malformed-response protection may be leaking; do not accept production activation until investigated.

Record the observed `stageDurationMs` as the first production runtime-budget data point. Duration is evidence, not a pass/fail threshold.

Do not use any content-state expectation as acceptance criteria, including whether EN child pages appear indexed or not indexed.

## 16. Interpretation after activation

The first successful snapshot is T0 only.

Do not draw transition-level conclusions from a single snapshot. The system exists to observe changes in Google's indexed-version knowledge over time.

Initial interpretation horizon:

- accumulate at least two weeks of `SUCCESS` snapshots before using the sequence for substantive crawl/index transition interpretation;
- use latest successful Run Id per calendar day;
- ignore failed Run Ids for analytical time series;
- correlate indexing-state transitions with GSC page/query allocation only after the page has a meaningful crawled/indexed state.

The current workbook visibility asymmetry is hypothesis-generating only: 2 of 6 EL specialized children have stored GSC page visibility versus 0 of 6 EN specialized children. URL Inspection telemetry is intended to test whether the explanation is language-specific, specialized-child-wide, or something else.

## 17. Security and authorization

No new OAuth scope is required. Production already has `webmasters.readonly`, which covers URL Inspection read access.

Security boundary remains read-only:

- allowed: inspect indexed-version state for approved URLs;
- prohibited: sitemap submission, URL removal, indexing requests, Search Console configuration mutation.

The production bundle contract must continue to reject unrelated privileged capabilities.

## 18. Operational documentation requirements

Update the production runbook to document:

- canonical `GSC Indexing` schema and `GSC_Index` legacy status;
- approved monitored-path governance and cap;
- `gscIndex` capability isolation;
- Run Log status/counter semantics;
- `stageDurationMs` semantics;
- same-day latest-SUCCESS tie-break;
- range-inspection prohibition;
- schema recovery procedure;
- activation sequence and expected temporary ConfigurationError state;
- downstream rule that only `GSC_INDEX SUCCESS` Run Ids are valid snapshots;
- absence of live-indexability testing and indexed-version limitation.

## 19. Interfaces currently in main

For implementation reference, current `SeoConfig` is:

```ts
export interface SeoConfig {
  gscProperty: string;
  ga4AccountId: string;
  ga4PropertyId: string;
  ga4PropertyTimeZone: string;
  productionHostname: string;
  gtmPublicContainerId: string;
  gtmAccountId: string;
  gtmContainerId: string;
  sheetId: string;
  driveFolderId: string;
  ownerEmail: string;
  verificationStatus: 'pending' | 'verified';
}
```

Current generic sheet writer contract:

```ts
export type CellValue = string | number | boolean | Date | null;
export type RowRecord = Record<string, CellValue>;

export interface WriteSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  total: number;
}

export function upsertRows(
  sheetName: string,
  keyColumns: string[],
  incomingRows: RowRecord[],
  dependencies?: SheetWriterDependencies,
): WriteSummary;
```

Implementation must preserve generic writer behavior for existing sheets while adding fixed-schema enforcement for `GSC Indexing` at the appropriate setup/inspection persistence boundary.
