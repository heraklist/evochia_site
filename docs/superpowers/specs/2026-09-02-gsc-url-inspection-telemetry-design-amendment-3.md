# GSC URL Inspection Telemetry Design — Amendment 3

Date: 2026-09-02
Status: Approved Task 6 review correction
Applies to: `docs/superpowers/specs/2026-09-02-gsc-url-inspection-telemetry-design.md`

This amendment supersedes only the `GSC_INDEX` placeholder placement and Run Log `finishedAt` timing semantics described below. All other approved design requirements remain binding.

## `GSC_INDEX` placeholder placement

The fail-closed `GSC_INDEX` placeholder must be written immediately after the canonical GSC + GA4 checkpoint and after `gscIndexStartedMs` is captured, but **before** either:

- `getConfig(['gscIndex'])`, or
- `GSC Indexing` schema preflight.

The placeholder uses:

```text
source         GSC_INDEX
sourceStatus   FAILED
errorClass     InspectionStageIncomplete
```

This ordering is intentional. A hard execution stop during configuration validation or schema preflight must leave diagnostic evidence that the auxiliary stage started but never completed. The placeholder is later replaced/upserted by the final `GSC_INDEX` result for the same `Run Id + source` key.

## Run Log `finishedAt` semantics

`startedAt` remains the common run-start timestamp for every source row in a daily execution.

`finishedAt` is the timestamp at which the specific source row reaches its final persisted state:

- canonical `GSC` and `GA4` rows use the canonical checkpoint completion timestamp;
- the final `GSC_INDEX` row uses the actual auxiliary-stage completion timestamp, captured after configuration/preflight, provider collection, persistence, and failure handling complete;
- the temporary `InspectionStageIncomplete` placeholder may use the canonical checkpoint timestamp because it is a provisional fail-closed checkpoint, not the final source observation.

Therefore `GSC_INDEX.finishedAt` may be later than `GSC.finishedAt` and `GA4.finishedAt` for the same `Run Id`. This is expected and prevents the final auxiliary row from appearing to finish before its stage actually ran.

`stageDurationMs` remains the dedicated elapsed-time measurement for the `GSC_INDEX` stage and is measured from `gscIndexStartedMs` through finalization. No timing threshold is introduced by this amendment.
