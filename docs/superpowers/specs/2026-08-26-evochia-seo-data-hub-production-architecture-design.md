# Evochia SEO Data Hub V1 Canonical Architecture

**Status:** Owner-locked design; pending implementation plan  
**Baseline:** `main` @ `fe3a791da35fc1810bb4f774f12b4626f3a2343d`

## Purpose

V1 exists to activate the smallest reliable production pipeline that automatically stores canonical GSC and GA4 history for later decision-making. The owner-approved M1/M2 product contracts are already locked and are not re-specified here. This document defines only the architecture needed to support them.

M3–M7 remain frozen, not deleted. They may return only when a recurring decision cannot be made without them.

## 1. Capability-scoped configuration verification

`Config.ts` must stop treating all future resources as one production-readiness gate.

Use explicit capabilities:

```ts
type CapabilityKey = 'workbook' | 'gsc' | 'ga4';

const CAPABILITY_RESOURCES = {
  workbook: ['sheetId'],
  gsc: ['gscProperty'],
  ga4: ['ga4PropertyId', 'ga4PropertyTimeZone', 'productionHostname'],
} as const;
```

`verifyConfig()` and `getConfig()` accept the requested capability set. `getVerifiedActiveWorkbook()` requests only `workbook`; GSC and GA4 callers request their own capability requirements.

Existing owner identity, workbook identity, verification-status, and format validation remain fail-closed. GTM and Drive resource values must not block workbook/GSC/GA4 V1 operation. `ga4AccountId` and `gtmPublicContainerId` are metadata only unless a V1 runtime call actually requires them.

No V1 path may silently fall back from a missing required resource.

## 2. GA4 persistence specifications

Keep the existing GA4 client and `runGa4Reports()` assembly. Add one write specification table and persist each completed bundle through the existing `upsertRows()` writer.

| Bundle | Sheet | Composite key |
| --- | --- | --- |
| `daily` | `GA4 Daily` | `date`, `deviceCategory` |
| `acquisition` | `GA4 Acquisition` | `date`, `sessionSourceMedium`, `sessionDefaultChannelGroup` |
| `landingPages` | `GA4 Landing Pages` | `date`, `landingPagePlusQueryString`, `sessionDefaultChannelGroup`, `deviceCategory` |
| `events` | `GA4 Events` | `date`, `eventName` |
| `pages` | `GA4 Pages` | `date`, `hostName`, `pagePath` |
| `urlQuality` | `GA4 URL Quality` | `date`, `hostName`, `pagePathPlusQueryString` |

The complete GA4 bundle must be fetched successfully before any GA4 sheet write begins. Re-running the same logical range must update/leave unchanged existing keys rather than duplicate rows. No second writer abstraction is introduced.

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

The existing three grains remain unchanged. `GSC Daily` remains property-grain trend data; it is not used as a subtractive page-level baseline.

The branded-query implementation is deliberately data-dependent. V1 implements only:

- Unicode NFD normalization;
- removal of combining marks/accents;
- lowercase normalization;
- stable punctuation/whitespace normalization;
- seed brand forms `evochia` and `ευωχια`;
- an initially empty curated alias set.

The alias set is populated only after the 13-month backfill is inspected. No fuzzy/Levenshtein matching is permitted.

`MIN_PAGE_IMPRESSIONS` starts as `null`. Any decision path that requires it must fail explicitly with `not calibrated`; no temporary numeric default is allowed. `VISIBLE_POSITION_MAX = 5` is already owner-locked and is not recalibrated by the backfill.

## 4. Range-based GSC import and initial backfill

Do not implement the 13-month baseline as a per-day loop.

Add a range-capable variant of the existing importer that accepts explicit `startDate` and `endDate`, uses the existing Search Analytics client, includes `date` in every report grain, preserves the current fetch-before-write behavior, and writes through the same idempotent composite keys.

The initial backfill uses bounded calendar-month chunks over the available 13-month history. With four GSC specs this is approximately 52 base Search Analytics requests before pagination, rather than roughly 1,500 daily-spec requests. Pagination remains the responsibility of the existing client.

The range importer is a reuse path, not a second pipeline: same report specs, same normalization, same writer, same error semantics. No checkpoint subsystem or resumable state machine is added unless a real execution-limit failure later demonstrates the need.

Pages that did not exist for the full history simply have shorter history; V1 must never synthesize prior-year rows.

Before an M1 matured-window evaluation, the exact before/after GSC ranges are re-fetched and idempotently upserted. This repairs gaps caused by missed daily trigger executions without inferring completeness from missing date rows.

## 5. `runDailyImport()` and visible freshness

Add one production orchestrator, `runDailyImport()`.

Its contract is:

1. verify the bound workbook;
2. obtain the OAuth token once;
3. attempt the finalized GSC source date;
4. independently attempt the finalized GA4 source date;
5. persist each source only after that source's full fetch bundle succeeds;
6. record minimal execution evidence in the existing `Run Log`;
7. update the visible freshness block.

Overall status is exact:

```text
GSC success + GA4 success = SUCCESS
exactly one source succeeds = PARTIAL
both sources fail = FAILED
```

A source failure must not prevent the other source from running or persisting. `PARTIAL` must never be represented as success. Missing source data is never fabricated as zero.

Freshness is not a new sheet or monitoring subsystem. `runDailyImport()` maintains one fixed visible block near the top of the workbook's first sheet containing exactly:

```text
GSC dataAsOf
GA4 dataAsOf
last run
status
```

A source `dataAsOf` advances only when that source succeeds. `last run` and overall `status` reflect every attempted run. No email alert, `MailApp`, `GmailApp`, Pipeline Health subsystem, or failure watcher is added.

## 6. Exact production OAuth surface

The production manifest contains exactly these five scopes:

```text
https://www.googleapis.com/auth/spreadsheets.currentonly
https://www.googleapis.com/auth/script.container.ui
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/script.external_request
```

No GTM, Drive, `script.scriptapp`, Search Console write, GA4 admin/edit, Gmail, or Calendar scope is permitted in V1.

`script.external_request` remains required because the existing tested GSC/GA4 clients use `UrlFetchApp` with the Apps Script OAuth token.

## V1 boundary

Implementation ends when the daily GSC/GA4 path is production-capable, idempotent, range-backfilled for 13 months, visibly fresh, and capable of supplying the locked M1/M2 contracts.

After the backfill, two human calibration actions occur from the observed data: populate the curated Evochia brand alias list and choose `MIN_PAGE_IMPRESSIONS` with a recorded value, rationale, eligibility impact, and review date.

No monthly report generator, alerting, URL Inspection integration, GTM ingestion, Drive automation, Pipeline Health subsystem, findings lifecycle, scoring engine, automatic change detection, or M3–M7 recurring contract is part of V1.
