# GSC URL Inspection Telemetry Design — Amendment 1

Date: 2026-09-02
Status: Approved correction layer
Applies to: `docs/superpowers/specs/2026-09-02-gsc-url-inspection-telemetry-design.md`

This amendment is authoritative where it conflicts with the base design. It exists as a narrow correction layer rather than a whole-file rewrite so the approved 795-line design is not exposed to unnecessary replacement risk.

## A1. Run Log ownership for `stageDurationMs`

This amendment replaces the incomplete ownership statement in §10.3.

`stageDurationMs` is a new `Run Log` column added to an existing sheet that already contains historical rows. Its schema evolution is intentionally handled by the existing generic `SheetWriter` dynamic-header behavior, not by `setupWorkbook()`.

Required behavior:

- the first `Run Log` write containing `stageDurationMs` appends that header through the existing generic writer contract;
- historical rows receive a blank cell for the new column;
- `GSC` and `GA4` rows remain blank for `stageDurationMs` in this change;
- the initial `GSC_INDEX` fail-closed placeholder may be blank;
- finalized handled `GSC_INDEX` rows store integer milliseconds;
- hard-killed executions may leave the placeholder duration blank;
- `setupWorkbook()` owns the fixed 19-column `GSC Indexing` schema only and does not pre-create `stageDurationMs` in `Run Log`.

Deployment verification must therefore check both:

1. `GSC Indexing` has exactly the fixed 19 headers after `setupWorkbook()`; and
2. after the first `GSC_INDEX` Run Log write/finalization, `Run Log` contains the appended `stageDurationMs` header with prior historical rows preserved and blank in that column.

The implementation plan must include a regression test proving that generic `Run Log` schema extension preserves existing rows and does not reorder or overwrite historical values.

## A2. Historical snapshot completeness is immutable

This amendment extends §9.4 and §8.1.

The completeness of an already-recorded historical `GSC_INDEX` snapshot is determined exclusively by the matching historical `Run Log` row:

```text
source = GSC_INDEX
sourceStatus = SUCCESS
```

Analytical consumers MUST NOT re-evaluate historical snapshot completeness by comparing its row count against the current value of `APPROVED_MONITORED_PATHS.length`.

Rationale: the approved monitored-path set may legitimately expand in the future. A snapshot that was complete when the approved set contained 16 URLs must remain complete after a later approved change to 17 or more URLs.

Rules:

- current-run success gating derives expected count from the version of `APPROVED_MONITORED_PATHS.length` executing in that run;
- once the run is finalized, its `sourceStatus` is the authoritative historical completeness record;
- same-day tie-break still selects the latest `SUCCESS` Run Id by `Checked At`;
- failed runs remain troubleshooting evidence regardless of row count;
- downstream M-metrics must never use the current repository allowlist length to invalidate older `SUCCESS` runs.

This immutability rule must be covered by a test using an older successful snapshot count and a simulated later larger approved-path set.
