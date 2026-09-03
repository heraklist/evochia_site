# Evochia SEO Data Hub V1 — Production Operations Runbook

This runbook documents the production operating boundary for the V1 Google Search Console (GSC) and GA4 ingestion pipeline. It is intentionally separate from the non-production Apps Script runtime smoke runbook.

## Runtime configuration source

V1 runtime resources are loaded from the Apps Script Script Property:

```text
SEO_GOOGLE_RESOURCES_JSON
```

`seo/apps-script/src/Config.ts` is authoritative for this contract. The legacy values visible in the workbook `Config!A:C` are reference/history only. Editing `Config!A:C` does **not** change the V1 runtime resource configuration.

Do not copy resource IDs from `Config!A:C` into production code. Do not add a second configuration source.

## Scheduled ingestion

Production has exactly one authorized scheduled trigger:

```text
function: runDailyImport
source: Time-driven
type: Day timer
window: 06:00–07:00 Europe/Athens
```

Do not install an additional daily, weekly, repair, or monitoring trigger for V1.

The daily GSC path imports one finalized GSC day per scheduled execution. It does not automatically backfill a previously missed scheduled day. GA4 and GSC are attempted independently and the `Run Log` records source-level status.

## Missing-day repair

If `Run Log`, `GSC Daily`, or a continuity check shows a missing finalized GSC date:

1. Confirm that the date is actually absent and is finalized under the current GSC lag rule.
2. In the bound production Sheet use `Evochia SEO` → `Run range import`.
3. Enter only the missing date, or the smallest contiguous missing finalized range.
4. Choose `Import range`.
5. Do **not** rerun a broad historical backfill merely to repair one missing day.
6. Verify the resulting `dataAsOf`, `collectedAt`, row counts, and logical-key uniqueness in all four GSC grains.
7. If the provider returns zero rows, preserve that as observed provider behavior. Do not create synthetic zero rows.

The 2026-08-25 continuity repair is the reference example: one missed day was repaired with a one-day range import and no wider replay.

## Property totals versus page/query subsets

Use `GSC Daily` (`byProperty`) for Search Console property-level clicks, impressions, CTR, and position comparisons.

Never sum `GSC Pages` or `GSC Page Queries` and call the result a property total.

`GSC Page Queries` is a privacy/truncation-affected visible subset. In the currently observed stored period, page-query rows represented about 466 visible impressions while property-level `GSC Daily` represented about 1,419 impressions (~32.8%). This ratio is descriptive only: it is not a stable sampling rate and must not be extrapolated to hidden queries.

M2 decisions that use page-query data therefore operate on the visible page-query subset, not the complete property impression universe.

## Current operating thresholds

Locked current values:

```text
VISIBLE_POSITION_MAX = 5
MIN_PAGE_IMPRESSIONS = 30
BRAND_SEEDS = ['evochia', 'ευωχια']
BRAND_ALIASES = ['evohia']
```

`MIN_PAGE_IMPRESSIONS = 30` is an owner-calibrated operating judgment, not a statistically derived threshold. In the finalized 28-day calibration window `2026-07-28 → 2026-08-24`, the two current qualifying commercial pages had 67 and 33 non-branded impressions. At the current traffic level, thresholds from 20 through 33 yield the same two-page eligible set. Recalibrate when page-query volume materially increases; do not silently change the value.

Aliases remain observed-only. Do not add guessed spellings, fuzzy matches, Greeklish variants, or phonetic variants without production GSC evidence and owner approval.

## Property-grain reconciliation evidence

The `2026-08-24` reconciliation compared production `GSC Daily` (`byProperty`) with the Search Console UI under equivalent Web/no-extra-filter conditions:

```text
clicks      0
impressions 9
CTR         0%
position    ~31.1
```

The values matched and support the operational property-grain/date-boundary contract. Because this was a low-volume day, treat it as operational reconciliation evidence rather than strong statistical proof. Repeat the comparison opportunistically on a higher-volume finalized day if one becomes available; a later repeat does not invalidate the current pipeline acceptance unless it exposes a real mismatch.

## Historical rebuild limitation

Long historical range rebuilds can exceed Apps Script wall-clock limits because calendar-month chunks fetch four GSC grains and the current UPSERT path performs whole-sheet read/merge/rewrite work.

This is a historical rebuild/resumability concern. GATE-A recorded:

```text
BACKFILL_WRITE_MODE = UPSERT
DAILY_WRITER_OPTIMIZATION_REQUIRED = NO
```

Task 7 incremental writer optimization is therefore not activated for the mature daily path under current evidence. Do not add an alternate writer unless a future measured gate explicitly requires it.

## Historical data horizon

Stored continuous `GSC Daily` data currently begins on `2026-03-03`. Production integrity, idempotency, continuity through the current finalized endpoint, and scheduled operation have been verified.

The retained-history horizon before `2026-03-03` must be described only from provider evidence. A Search Console UI check for the retained pre-March interval is still the authoritative external confirmation. Until that check finishes, do not claim that all earlier retained dates are definitively unavailable, and do not launch another broad backfill solely to answer the question.

If the UI later shows zero impressions for the retained pre-March interval, record `available GSC performance-data horizon = 2026-03-03` in the execution record. If it shows data, reopen the historical-load gate and repair only the missing retained range.

## GSC URL Inspection telemetry

URL Inspection is an auxiliary, read-only telemetry source. It runs only inside `runDailyImport()` after canonical GSC + GA4 persistence and freshness have completed. It never contributes to canonical `overallStatus`, and it must never run from range/backfill or measurement-only paths.

### Canonical sheet and schema ownership

`GSC Indexing` is the only canonical URL Inspection telemetry sheet. `GSC_Index` is legacy and must remain unconsumed.

`setupWorkbook()` is the sole initializer/owner of the fixed `GSC Indexing` header schema. Runtime preflight verifies the schema but must not initialize, repair, reorder, or extend these headers.

The exact 19-column schema is:

```text
Checked At | Run Id | URL | Outcome | Verdict | Coverage State | Robots.txt State | Indexing State | Page Fetch State | Crawled As | Google Canonical | User Canonical | Canonical Match | Last Crawl Time | Sitemap | Referring URLs | Inspection Result Link | Error Class | Error Message
```

If the schema is wrong, use a retention-safe recovery path: rename/archive the existing sheet, recreate the canonical sheet, run `setupWorkbook()`, and verify the exact 19 headers. Destructive clearing is allowed only after an explicit retention check confirms that no evidence needs preservation. `Evochia SEO` → `Set up workbook` surfaces `SchemaError` with a link back to this recovery section.

### Run Log semantics

A `Run Log` row with `source = GSC_INDEX` has auxiliary source status only:

```text
GSC_INDEX SUCCESS = complete, usable snapshot
GSC_INDEX FAILED  = incomplete/unusable snapshot as a whole
```

`fetchedRows` means successful provider responses. Persisted row count is computed, not stored, as:

```text
insertedRows + updatedRows + unchangedRows
```

Persisted count may exceed fetched count because diagnostic `REQUEST_FAILED` rows are persisted even when the provider call did not yield a usable inspection response.

`PipelineError.status` is retained on the in-memory typed error but is not stored in its own Sheet column. For persisted `REQUEST_FAILED` rows with `Error Class = PipelineError`, the machine-readable status contract is the terminal `HTTP <status>` token in `Error Message` (for example, `gsc-url-inspection request failed with HTTP 429`); consumers may extract it with `HTTP (\d{3})$`. Do not apply that parser to other error classes.

This status contract is the path for future evidence-based retry policy: compare historical 429/403/5xx distributions from failed URL rows before introducing retries. Do not infer retry behavior from `Error Class` alone.

`stageDurationMs` is the elapsed time of the auxiliary GSC_INDEX stage only. It is appended to `Run Log` through the generic dynamic-header extension. Historical rows are preserved; canonical GSC/GA4 rows and historical rows may legitimately have a blank value in this column.

`startedAt` remains the common run start. The finalized `finishedAt` of each source row is the time that source row is finalized: canonical GSC/GA4 rows retain their canonical checkpoint time, while the finalized `GSC_INDEX` row records actual completion of the auxiliary stage.

The first `GSC_INDEX` placeholder row is written before GSC_INDEX config/preflight. Placeholder and finalization use the same `Run Id + source` UPSERT key, so `Run Log` retains exactly one `GSC_INDEX` row per run: finalization updates the placeholder rather than appending a second row. If execution is interrupted after the placeholder checkpoint and before finalization, that one fail-closed placeholder remains diagnostic evidence.

### Historical consumption rules

Historical snapshot completeness is immutable. For an old run, use only its historical `Run Log` evidence:

- `source = GSC_INDEX` and `sourceStatus = SUCCESS` means that historical snapshot is complete/usable.
- Never compare historical snapshot row count with the current approved monitored-path count.
- For multiple successful snapshots on the same day, the latest `SUCCESS` by `Checked At` is authoritative.
- `FAILED` snapshots remain troubleshooting evidence and must not be consumed as valid indexing state.

### Activation and deployment sequence

Use the existing production Apps Script deployment model. Do not create a new trigger, deployment model, OAuth scope, or public callback.

Activation sequence:

```text
1. merge/deploy code
2. run updated setupWorkbook
3. verify exact 19 GSC Indexing headers
4. make a backup copy of the existing Run Log before its first dynamic-header extension
5. intentionally observe one run before monitoredUrls is configured:
   GSC_INDEX FAILED / ConfigurationError
   GSC SUCCESS
   GA4 SUCCESS
   overallStatus SUCCESS
6. verify Run Log now contains stageDurationMs header without historical damage
7. update SEO_GOOGLE_RESOURCES_JSON with exact approved absolute URLs
8. run/observe next daily execution
9. verify mechanical first-run acceptance
```

The backup before the isolation run is required because the first `GSC_INDEX` write is the only activation step that mutates an existing production sheet containing historical data: the generic writer appends `stageDurationMs` while preserving old rows with a blank value.

The intentional pre-configuration failure is positive isolation evidence: GSC_INDEX must fail closed without changing canonical GSC/GA4 success or `overallStatus`.

### Lost-day recovery and range prohibition

URL Inspection is not backfilled through `runRangeImport()` and must not be invoked by `measurePageQueryRows()`.

If an indexing snapshot day is lost, the only supported recovery is a manual `runDailyImport()`. This creates a new Run Id and a new current snapshot; it does not reconstruct a historical indexed-version state for the missed day.

### Provider semantics and acceptance interpretation

Search Console URL Inspection reports Google's indexed-version state and is not a live URL test. Omitted provider fields can therefore be legitimate evidence and are represented as `NOT_RETURNED` where the response is structurally valid.

A structurally valid `indexStatusResult` with provider fields omitted remains valid parser input. However, during first production acceptance, if any row has `Outcome = INSPECTED` and every provider field is `NOT_RETURNED`, stop acceptance and investigate the response shape/provider behavior. This is an acceptance observation requiring investigation, not a runtime parser rejection rule.

Mechanical first-run acceptance requires:

```text
matching GSC_INDEX Run Log row       SUCCESS
GSC Indexing rows for Run Id         approved monitored-path count
common Run Id / Checked At           all rows
headers                              exact 19
Outcome                              INSPECTED for all rows
GSC / GA4 / overallStatus            SUCCESS
Sitemap / Referring URLs             valid JSON or NOT_RETURNED
stageDurationMs                      numeric
```

Record the first observed `stageDurationMs` as a datapoint only; do not create a pass/fail timing threshold from one run. Treat the first successful snapshot as T0 and accumulate at least two weeks of `SUCCESS` snapshots before interpreting transition-level EN/EL indexing behavior.

## Production invariants

- Exactly five public Apps Script callbacks remain exposed.
- Exactly five approved OAuth scopes remain in the production manifest.
- Exactly one scheduled production trigger remains installed.
- `GSC_INDEX` remains auxiliary and never contributes to canonical `overallStatus`.
- URL Inspection remains prohibited from range/backfill and measurement-only paths.
- No synthetic zero rows.
- No guessed brand aliases.
- Property totals come from `GSC Daily` / `byProperty`.
- Broad historical reruns are not a default repair mechanism.
