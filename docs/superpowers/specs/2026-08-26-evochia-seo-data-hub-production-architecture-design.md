# Evochia SEO Data Hub V1 Canonical Architecture

**Status:** Revised after code-behavior and live workbook review; pending owner approval for implementation plan  
**Baseline:** `main` @ `fe3a791da35fc1810bb4f774f12b4626f3a2343d`

## Purpose

V1 activates the smallest reliable production pipeline that stores canonical GSC and GA4 history for later decision-making. The owner-approved M1/M2 product contracts are already locked and are not re-specified here. M3–M7 remain frozen, not deleted, and may return only when a recurring decision cannot be made without them.

## 1. Capability-scoped configuration verification

`Config.ts` must stop treating all future resources as one readiness gate.

```ts
type CapabilityKey = 'workbook' | 'gsc' | 'ga4';

const CAPABILITY_RESOURCES = {
  workbook: ['sheetId'],
  gsc: ['gscProperty'],
  ga4: ['ga4PropertyId', 'ga4PropertyTimeZone', 'productionHostname'],
} as const;
```

`verifyConfig()` and `getConfig()` accept the requested capability set. `getVerifiedActiveWorkbook()` requests only `workbook`; GSC and GA4 callers request their own requirements.

Existing owner identity, workbook identity, verification-status and format validation remain fail-closed. GTM/Drive resources must not block V1. No V1 path may silently fall back from a missing required resource.

## 2. GA4 persistence specifications

Keep the existing GA4 client and `runGa4Reports()` assembly. Add `GA4_REPORT_SPECS` and persist a successfully fetched bundle through the existing writer semantics.

| Bundle | Sheet | Composite key |
| --- | --- | --- |
| `daily` | `GA4 Daily` | `date`, `deviceCategory` |
| `acquisition` | `GA4 Acquisition` | `date`, `sessionSourceMedium`, `sessionDefaultChannelGroup` |
| `landingPages` | `GA4 Landing Pages` | `date`, `landingPagePlusQueryString`, `sessionDefaultChannelGroup`, `deviceCategory` |
| `events` | `GA4 Events` | `date`, `eventName` |
| `pages` | `GA4 Pages` | `date`, `hostName`, `pagePath` |
| `urlQuality` | `GA4 URL Quality` | `date`, `hostName`, `pagePathPlusQueryString` |

The complete GA4 bundle is fetched before any GA4 write begins. Re-running the same logical range must not create duplicate logical rows.

## 3. Fourth GSC report grain

Extend `GSC_REPORT_SPECS` with:

```ts
{
  id: 'pageQueries',
  dimensions: ['date', 'page', 'query'],
  aggregationType: 'auto',
  sheetName: 'GSC Page Queries',
  keyColumns: ['date', 'page', 'query'],
}
```

The existing grains remain unchanged. `GSC Daily` stays property-grain trend data and is never subtracted from page-grain data.

V1 implements branded-query normalization only: Unicode NFD, removal of combining marks, lowercase, stable punctuation/whitespace normalization, seed forms `evochia` and `ευωχια`, and an initially empty curated alias set. No fuzzy/Levenshtein matching is permitted. Aliases are populated after backfill inspection.

`MIN_PAGE_IMPRESSIONS` starts as `null`; any decision path requiring it fails explicitly as `not calibrated`. No temporary default is allowed. `VISIBLE_POSITION_MAX = 5` is owner-locked.

## 4. Range import, GATE-A sizing and initial backfill

The Search Analytics client already accepts ranges; add a range-capable importer that accepts explicit `startDate`/`endDate`, keeps `date` in every grain, preserves fetch-before-write, and reuses the same report specs, normalization and composite keys.

**GATE-A: sizing before backfill** occurs after the production GSC callable/OAuth path exists and before the 13-month backfill task begins. Run one live read-only `date + page + query` fetch for one finalized day, record the returned row count, and extrapolate the approximate 13-month row volume. This measurement decides the write strategy; no writer-performance assumption is treated as verified beforehand.

This gate is required because current `upsertRows()` reads the complete existing sheet and rewrites the complete merged sheet on every call. Its computational cost therefore grows with accumulated `GSC Page Queries` history.

The initial 13-month backfill uses bounded calendar-month chunks. If the sizing evidence shows whole-sheet upsert remains operationally small, the existing upsert path may be reused. If not, V1 may add an append-only **initial-backfill path** using the same serialization and row schema, with these fail-closed preconditions:

- target sheet has no existing data rows before the one-shot backfill;
- chunks are non-overlapping;
- each chunk is deduplicated by the canonical composite key before append;
- headers are written/validated once;
- append mode is never used for arbitrary repair/replay over existing history.

Daily ingestion and M1 range repair retain idempotent semantics. If GATE-A shows that daily whole-sheet rewrite of the mature `GSC Page Queries` sheet would itself be disproportionate, the implementation plan must add a bounded writer-optimization task before production scheduling rather than silently accepting the cost.

No checkpoint/resume state machine is added unless a real execution-limit failure later demonstrates the need. Pages that did not exist for the full history simply have shorter history; no synthetic prior-year rows are created.

Before M1 evaluation, the exact before/after ranges are re-fetched and idempotently reconciled so missed daily runs cannot create silent gaps.

## 5. Production orchestration, range invocation and visible freshness

Add `runDailyImport()`:

1. verify the bound workbook;
2. obtain the OAuth token once;
3. independently attempt finalized GSC and GA4 source dates;
4. persist each source only after that source's full fetch bundle succeeds;
5. record minimal evidence in `Run Log`;
6. update the visible freshness block.

Overall status is exact:

```text
GSC success + GA4 success = SUCCESS
exactly one source succeeds = PARTIAL
both sources fail = FAILED
```

A source failure does not suppress the other source. `PARTIAL` is never represented as success and unavailable data is never fabricated as zero.

The reusable range implementation is `runRangeImport(startDate, endDate)`. Because a Sheets custom-menu callback is invoked by function name rather than supplied arbitrary arguments, the production operator surface exposes a no-argument `runRangeImportFromMenu()` wrapper that prompts for bounded ISO start/end dates and delegates to `runRangeImport`. Register `runDailyImport` and `runRangeImportFromMenu` in `entrypoints/production.ts` and the production `build.mjs` entrypoint list. The menu wrapper uses only the already-approved container UI capability.

A direct read of the connected production workbook on **2026-08-27** confirmed that `Config!A:C` contains the legacy configuration table and that `Config!E:H` is empty within the inspected range `1:20`. This is live workbook evidence, not a repository inference. Reserve `Config!E:H` for V1 operational metadata unless a later owner edit changes that state before deployment.

Store freshness at exactly `Config!E1:F4`:

```text
E1 GSC dataAsOf   | F1 value
E2 GA4 dataAsOf   | F2 value
E3 last run       | F3 value
E4 status         | F4 value
```

A source `dataAsOf` advances only when that source succeeds; `last run` and `status` reflect every attempted run. `Config!E7:H9` is reserved for human-readable threshold provenance (`key`, `value`, `rationale`, `last reviewed`) without touching legacy `A:C` configuration.

No email alert, `MailApp`, `GmailApp`, Pipeline Health subsystem or failure watcher is added.

## 6. Exact OAuth surface and post-backfill verification

The production manifest contains exactly:

```text
https://www.googleapis.com/auth/spreadsheets.currentonly
https://www.googleapis.com/auth/script.container.ui
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/script.external_request
```

No GTM, Drive, `script.scriptapp`, Search Console write, GA4 admin/edit, Gmail or Calendar scope is permitted. `script.external_request` remains required by the existing `UrlFetchApp` clients.

The GSC source-calendar implementation remains `America/Los_Angeles`, matching the current Search Analytics API PT contract. After the 13-month backfill and before M1 activation, perform one manual reconciliation of a known finalized date at **property grain**: compare the `GSC Daily` `byProperty` clicks/impressions for that date against the Search Console UI property-level totals under equivalent filters. Do not use summed page-level rows for this check. Record PASS/FAIL. A mismatch blocks M1 activation and requires investigation; it does not trigger an unreviewed timezone change.

## V1 boundary

Implementation ends when the daily GSC/GA4 path is production-capable and idempotent, the GATE-A-sized 13-month GSC backfill is complete, freshness is visible, and the stored data can supply the locked M1/M2 contracts.

After backfill, three evidence steps occur before M1/M2 activation: populate the curated Evochia alias list from observed queries; choose `MIN_PAGE_IMPRESSIONS` with recorded value/rationale/eligibility impact/review date; and complete the property-grain GSC date-boundary reconciliation.

No monthly report generator, alerting, URL Inspection integration, GTM ingestion, Drive automation, Pipeline Health subsystem, findings lifecycle, scoring engine, automatic change detection or M3–M7 recurring contract is part of V1.
