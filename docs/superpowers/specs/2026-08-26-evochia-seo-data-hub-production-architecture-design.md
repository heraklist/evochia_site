# Evochia SEO Data Hub Production Activation Work Order

**Status:** Revised after technical review; pending owner approval for implementation

**Baseline:** `main` @ `fe3a791da35fc1810bb4f774f12b4626f3a2343d`

**Purpose:** Activate the already-built GSC and GA4 Apps Script pipeline in production with the smallest safe wiring change. Do not rebuild capabilities that already exist. Defer GTM, Drive snapshots, findings lifecycle, Pipeline Health, and programmatic trigger management until a concrete production need justifies them.

This document replaces the broader architecture text previously stored at this path. It is intentionally a bounded V1 work order rather than a second full-system design.

## 1. Verified repository baseline

The following behavior already exists and must be preserved rather than re-specified or rewritten:

| Contract | Existing implementation |
| --- | --- |
| Canonical workbook tabs | `seo/apps-script/src/Setup.ts` — `REQUIRED_SHEET_NAMES`, idempotent `ensureWorkbookSheets` |
| Fail-closed bound workbook identity | `seo/apps-script/src/WorkbookIdentity.ts` |
| GSC Search Analytics import | `seo/apps-script/src/GscImporter.ts` |
| GSC fetch-before-write | `importSearchAnalyticsDay()` fetches all three reports before its write loop |
| GSC idempotent report keys | `GSC_REPORT_SPECS` |
| GA4 six-report collection bundle | `seo/apps-script/src/Ga4Importer.ts` — `runGa4Reports()` |
| GA4 property-timezone date logic | `getAvailableGa4Date()` |
| Composite-key upserts | `seo/apps-script/src/SheetWriter.ts` |
| Formula-injection defense | `serializeLiteralCell()` |
| Deterministic GAS build | `seo/apps-script/build.mjs` and bundle-equivalence tooling |
| Real GAS V8 compatibility | existing smoke bundle/runtime gate |

The production gap is narrow:

1. configuration verification is over-coupled to resources that are not needed for workbook/GSC/GA4 operation;
2. GA4 returns a complete bundle but has no sheet-write specification;
3. there is no production GSC+GA4 orchestrator;
4. production registration/build exposes only `onOpen`, `setupWorkbookFromMenu`, and `verifyConfiguration`;
5. the production manifest still contains only the two existing Sheet/UI scopes.

## 2. Scope

### V1 includes

- capability-scoped config verification for `workbook`, `gsc`, and `ga4`;
- GA4 report-to-sheet specs and composite keys;
- exact read-only GSC/GA4 OAuth scopes plus `script.external_request`;
- one production `runDailyImport()` orchestrator;
- independent GSC/GA4 failure isolation with `SUCCESS` / `PARTIAL` / `FAILED` overall result;
- minimal Run Log evidence;
- one additional top-level production entrypoint and menu item;
- manual production validation and idempotency proof;
- manual installation of the corporate daily trigger only after legacy triggers are verified at zero.

### V1 explicitly excludes

- GTM API integration or fingerprinting;
- Drive snapshots or any Drive API scope;
- `Pipeline Health` implementation;
- findings lifecycle/state machine;
- `runWeeklyInspection()`;
- programmatic trigger installation/removal;
- `script.scriptapp` scope;
- a separate backfill/checkpoint subsystem;
- a 17-stage promotion state machine;
- workbook-tab renames/deletes or destructive migration;
- Apps Script Web App endpoints;
- Gmail/Calendar scopes;
- credentials or tokens in Sheets/source control.

Existing empty canonical tabs such as `Pipeline Health`, `GTM Versions`, `GTM Changes`, and `Findings Summary` remain untouched. Removing them would create unnecessary churn and is not part of V1.

## 3. T1 — Capability-scoped configuration

### Problem

`Config.ts` currently requires every resource key to be populated and non-`UNVERIFIED`. `getConfig()` always performs that full verification, and `getVerifiedActiveWorkbook()` calls `getConfig()`. Therefore workbook setup is blocked by unrelated, currently unconfigured GTM/Drive resources.

### Required change

Introduce a bounded capability contract equivalent to:

```ts
export type CapabilityKey = 'workbook' | 'gsc' | 'ga4';

const CAPABILITY_RESOURCES: Record<CapabilityKey, readonly string[]> = {
  workbook: ['sheetId'],
  gsc: ['gscProperty'],
  ga4: ['ga4PropertyId', 'ga4PropertyTimeZone', 'productionHostname'],
};
```

`verifyConfig()` accepts an explicit capability list, defaulting to `['workbook']`.

`getConfig()` accepts/threads the same capability request. `getVerifiedActiveWorkbook()` verifies only the workbook capability. GSC and GA4 callers request their own capability requirements.

The existing owner and global verification checks remain fail-closed. Existing format validators remain in place and continue to validate configured values.

`gtmAccountId`, `gtmContainerId`, and `driveFolderId` must not block V1. `ga4AccountId` and `gtmPublicContainerId` may remain configuration metadata but are not V1 readiness requirements unless a concrete call uses them.

### Tests

- workbook-only config succeeds with GTM/Drive values absent or `UNVERIFIED`;
- GSC config fails when `gscProperty` is missing/unverified;
- missing GA4 property ID fails GA4 but not workbook verification;
- missing/invalid GA4 timezone fails GA4 but not GSC/workbook;
- workbook setup succeeds when GTM/Drive are not configured;
- workbook ID mismatch still hard-fails.

## 4. T2 — GA4 report write specifications

`runGa4Reports()` already returns six complete arrays. Do not rewrite the GA4 client/report assembly.

Add `GA4_REPORT_SPECS`, mirroring the existing GSC pattern:

| Bundle key | Sheet | Composite key |
| --- | --- | --- |
| `daily` | `GA4 Daily` | `date`, `deviceCategory` |
| `acquisition` | `GA4 Acquisition` | `date`, `sessionSourceMedium`, `sessionDefaultChannelGroup` |
| `landingPages` | `GA4 Landing Pages` | `date`, `landingPagePlusQueryString`, `sessionDefaultChannelGroup`, `deviceCategory` |
| `events` | `GA4 Events` | `date`, `eventName` |
| `pages` | `GA4 Pages` | `date`, `hostName`, `pagePath` |
| `urlQuality` | `GA4 URL Quality` | `date`, `hostName`, `pagePathPlusQueryString` |

Use the existing `upsertRows()` implementation. Do not introduce a second writer abstraction.

The GA4 bundle must be fully fetched before any GA4 sheet write begins. `runGa4Reports()` already provides that fetch boundary; the new writer runs only after it returns successfully.

### Tests

- every bundle grain writes to the correct canonical sheet;
- every spec uses the exact key columns above;
- re-writing the identical bundle inserts zero new logical rows;
- changed values for an existing key update rather than duplicate;
- formula-injection protection remains intact through the shared writer.

## 5. T3 — Exact V1 manifest

The V1 production manifest must contain exactly these five scopes:

```text
https://www.googleapis.com/auth/spreadsheets.currentonly
https://www.googleapis.com/auth/script.container.ui
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/script.external_request
```

Do not add:

- `tagmanager.readonly`;
- `drive.file` or broad Drive scope;
- `script.scriptapp`;
- Search Console write scope;
- GA4 admin/edit scope;
- Gmail/Calendar scope.

`script.external_request` remains required because the existing GSC and GA4 clients use `UrlFetchApp` with `ScriptApp.getOAuthToken()`; replacing those tested clients with Advanced Services solely to remove this scope is out of scope.

### Backup rule

V1 does not use a Drive API scope to back up the pre-existing production workbook. If a pre-activation backup is desired, it is a manual owner runbook action (`File` → `Make a copy`) and its completion is recorded as evidence. No scope escalation is permitted for this purpose.

### Tests

The manifest contract test asserts the exact five-scope set and rejects any additional production scope.

## 6. T4 — `runDailyImport()` orchestrator

Add a single production orchestration path that reuses the existing importers.

### Required behavior

1. verify the bound workbook;
2. obtain one OAuth token with `ScriptApp.getOAuthToken()`;
3. run GSC using workbook+GSC configuration;
4. independently run GA4 using workbook+GA4 configuration;
5. persist GA4 through `GA4_REPORT_SPECS` only after the full GA4 bundle has been fetched;
6. record source results in `Run Log`;
7. return an overall status.

GSC and GA4 are isolated at the source level:

```text
GSC success + GA4 success = SUCCESS
exactly one source succeeds = PARTIAL
both sources fail = FAILED
```

A failure in GSC must not prevent GA4 from running/writing. A failure in GA4 must not remove or roll back valid GSC data.

`PARTIAL` must never be logged or presented as success.

### Minimal Run Log contract

Use one row per attempted source, sharing the same `runId`. Each row contains only operational evidence needed for V1:

```text
runId
startedAt
finishedAt
source
sourceStatus
overallStatus
dataAsOf
fetchedRows
insertedRows
updatedRows
unchangedRows
errorClass
errorMessage
```

Do not build `Pipeline Health` in V1. Do not store stack traces, OAuth tokens, response bodies containing sensitive data, or credentials in the sheet.

### Error behavior

- configuration/auth/resource failures are recorded as failures and are not blindly retried;
- no synthetic zero rows are written for unavailable data;
- source-level errors do not suppress the other source;
- unexpected errors remain fail-visible.

### Tests

Use synthetic transports only; no live API calls in CI.

Required cases:

- both sources succeed → `SUCCESS`;
- GSC fails, GA4 succeeds → `PARTIAL`, GA4 rows present;
- GA4 fails, GSC succeeds → `PARTIAL`, GSC rows preserved;
- both fail → `FAILED`;
- identical second run produces no duplicate logical data;
- Run Log source rows carry the correct shared `runId`, source status and overall status.

## 7. T5 — Production registration and menu

Register `runDailyImport` in `seo/apps-script/entrypoints/production.ts`.

Add `runDailyImport` to the production target entrypoint list in `seo/apps-script/build.mjs` so the generated bundle contains a genuine top-level Apps Script wrapper outside the IIFE.

Add a single operator menu item in `Menu.ts` to run the daily import manually.

The production callable surface after V1 is:

```text
onOpen()
setupWorkbookFromMenu()
verifyConfiguration()
runDailyImport()
```

Do not add `verifyAllAccess`, `runWeeklyInspection`, `installTriggers`, or `removeTriggers` in V1.

### Tests

- entrypoint-discoverability test finds a top-level `function runDailyImport()` outside the IIFE;
- production build remains deterministic;
- generated bundle equivalence remains green;
- smoke bundle remains separate and unchanged in purpose.

## 8. T6 — Historical range import only if needed

Do not create a separate backfill subsystem, checkpoint model, or second orchestration architecture.

If historical baseline rows are required after the one-day production path is verified, add a bounded internal range runner that calls the same per-date import path with an injected `now`/source date. It must reuse the exact T4 behavior and idempotent writer.

Do not add a second public production entrypoint unless operator usability demonstrates a real need. Do not add checkpoint/resume machinery unless an actual Apps Script execution-limit failure is observed.

## 9. GSC source-time semantics

Keep `GSC_TIME_ZONE = 'America/Los_Angeles'` for the Search Analytics API.

The technical review suggested that this constant may be obsolete due to property-local-time reporting. That objection is not supported by the current official Search Analytics API contract: `startDate` and `endDate` are documented in PT (UTC-7/UTC-8), and incomplete-data metadata is documented in `America/Los_Angeles`.

Official reference:

`https://developers.google.com/webmaster-tools/v1/searchanalytics/query`

Therefore V1 must not change this constant without contrary official API documentation or reproducible live evidence showing different Search Analytics API semantics.

A live production reconciliation may still record a known-date comparison as operational evidence, but it is not a prerequisite for retaining the documented PT calendar contract.

## 10. Workbook handling

V1 is additive only:

- keep the existing authoritative workbook/file ID;
- keep all legacy underscore-named tabs untouched;
- create missing canonical tabs idempotently through existing setup;
- do not rename/delete legacy tabs;
- do not change workbook timezone as part of V1;
- do not transform legacy headers-only data into new grains.

This avoids a migration project before the ingestion path itself is proven.

## 11. Trigger and legacy cutover

Programmatic trigger management is out of V1. Do not request `script.scriptapp`.

After manual production validation and idempotency pass:

1. perform the final read-only inventory of the legacy personal automation;
2. remove its scheduled triggers under the separate owner-approved legacy retirement action;
3. verify legacy trigger count is exactly zero;
4. only then install one corporate daily trigger manually from the Apps Script UI;
5. observe the first real scheduled execution.

The legacy project and historical spreadsheet are archived, not deleted.

The corporate production trigger is never installed while the legacy scheduled pipeline remains active.

## 12. Five observable promotion states

V1 uses only these evidence-backed states:

```text
ARTIFACT_BUILT
OAUTH_AUTHORIZED
LIVE_ACCESS_OK
IDEMPOTENT
SCHEDULED
```

### `ARTIFACT_BUILT`

- repository gates green;
- production build green;
- bundle equivalence green;
- exact production manifest verified.

### `OAUTH_AUTHORIZED`

- corporate Apps Script project shows only the approved V1 scopes;
- unexpected scope → stop, do not authorize.

### `LIVE_ACCESS_OK`

- one manual production `runDailyImport()` completes;
- at least one real GSC row and at least one real GA4 row are written for an eligible source day;
- Run Log contains truthful source statuses/data dates.

### `IDEMPOTENT`

- rerun the same logical source window;
- zero duplicate logical rows are inserted;
- updates/unchanged counts match expectations.

### `SCHEDULED`

- legacy scheduled triggers verified at zero;
- corporate daily trigger installed manually;
- first scheduled run observed and logged successfully.

No additional lifecycle state machine is implemented in V1.

## 13. Repository gates

Strict TDD applies task by task. Every task returns the existing repository gates to green before the next task begins.

At minimum verify:

```text
typecheck
GAS-scoped typecheck
unit tests
Apps Script tests
entrypoint discoverability
production/smoke bundle contracts
bundle equivalence
security validation
```

No live GSC/GA4 call is permitted in CI.

Generated artifacts are derivatives of source and must never be hand-edited.

## 14. V1 Definition of Done

V1 is complete only when all of the following are true:

- capability-scoped config no longer blocks workbook/GSC/GA4 on absent GTM/Drive resources;
- GA4 report specs persist all six existing report grains through `upsertRows()`;
- production manifest contains exactly five approved scopes;
- production bundle exposes top-level `runDailyImport()`;
- all repository gates are green;
- one manual real production run writes real GSC and GA4 data;
- a second run over the same logical source window inserts zero duplicate logical rows;
- Run Log truthfully represents source and overall status;
- missing/unavailable data is never fabricated as zero;
- legacy personal triggers are verified at zero before corporate scheduling;
- one manually configured corporate daily trigger executes successfully at least once.

## 15. Deferred capabilities

The following may return only when a concrete decision or operational problem requires them:

- GTM drift monitoring;
- Drive snapshot archival;
- Pipeline Health dashboard/state machine;
- findings lifecycle (`NEW`/`ACTIVE`/`CHANGED`/`RESOLVED`);
- programmatic trigger management;
- weekly inspection orchestration;
- checkpointed/resumable backfill;
- broader workbook migration/legacy-tab retirement.

Reintroducing a deferred capability requires a bounded design/approval for that capability. It must not be restored simply because it existed in an earlier architecture diagram.

## 16. Implementation order

Implement exactly in this order:

```text
T1 capability-scoped config
→ T2 GA4 report specs/writes
→ T3 exact manifest
→ T4 runDailyImport orchestrator + Run Log
→ T5 production entrypoint/menu/build registration
→ T6 bounded historical range helper only if needed
```

Do not produce another implementation-plan document for V1. This work order is the implementation contract.

Implementation itself remains a separate owner gate. No Google-side production mutation is authorized by this document.