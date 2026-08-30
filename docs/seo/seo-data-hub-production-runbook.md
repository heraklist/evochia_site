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

## Production invariants

- Exactly five public Apps Script callbacks remain exposed.
- Exactly five approved OAuth scopes remain in the production manifest.
- Exactly one scheduled production trigger remains installed.
- No synthetic zero rows.
- No guessed brand aliases.
- Property totals come from `GSC Daily` / `byProperty`.
- Broad historical reruns are not a default repair mechanism.
