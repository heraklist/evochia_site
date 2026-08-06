# GSC Data Model and Source Timezone Design

**Status:** Approved for implementation planning

**Scope:** First implementation batch of Workstream B in draft PR #35.

## Context

The current Search Console importer requests the combined grain `date + query + page + country + device + searchAppearance` and writes those rows to `GSC Daily`. That dataset cannot safely serve as the source of property-level daily KPIs because detailed Search Console rows can be incomplete and the grain mixes several independent dimensions. The current availability-date helper also subtracts days from the UTC calendar rather than the Search Console source calendar.

## Goals

1. Make daily Search Console totals analytically trustworthy.
2. Separate property totals, page performance, and query performance into distinct datasets and Sheet tabs.
3. Calculate Search Console availability dates using the `America/Los_Angeles` calendar with a default three-day delay.
4. Preserve idempotent writes and explicit typed failures.
5. Keep all work read-only with respect to Google APIs and confined to the existing `seo-system` branch and draft PR #35.

## Non-goals

This batch does not implement:

- country, device, or search-appearance reports;
- GA4 Pages/hostname reporting;
- Apps Script bundling, deployment, triggers, or production authorization;
- GTM collection or fingerprinting;
- any GA4, GTM, GSC, Google Sheet, Vercel, or production configuration write.

## Chosen architecture

Use three independent report contracts and three existing workbook tabs:

| Report | API dimensions | Sheet | Unique key | Intended use |
|---|---|---|---|---|
| Daily totals | `date` | `GSC Daily` | `date` | Property-level clicks, impressions, CTR, and position |
| Pages | `date`, `page` | `GSC Pages` | `date`, `page` | URL-level search performance |
| Queries | `date`, `query` | `GSC Queries` | `date`, `query` | Query discovery and trend analysis; not a complete property-total source |

Country, device, and search appearance are intentionally excluded from these three grains. They may be added later as separate report families if a concrete reporting need justifies them.

## Component boundaries

### `GscClient.ts`

Remain the generic Search Analytics transport and normalizer.

Required changes:

- Callers must provide the report dimensions explicitly; the client must not silently default to the current six-dimension grain.
- The request contract must support the aggregation setting required for property-level daily totals.
- Normalization must continue to retain zero-valued metrics and throw `PipelineError` for non-2xx responses.

The client does not decide Sheet names, keys, or business report semantics.

### `GscImporter.ts`

Own the business report definitions and source-calendar logic.

It will define one immutable report specification for each of `daily`, `pages`, and `queries`. Each specification contains:

- report identifier;
- API dimensions;
- Sheet name;
- unique key columns;
- aggregation setting where required.

The importer will expose one daily bundle operation that:

1. derives the source-local available date;
2. fetches all three reports;
3. stops without writing if any API fetch fails;
4. deduplicates each report at its own key grain;
5. appends `dataAsOf` and `collectedAt` metadata;
6. writes the three report datasets to their assigned Sheet tabs;
7. returns a separate fetch/write summary for each report.

### `Setup.ts`

No Sheet-name change is required because `GSC Daily`, `GSC Pages`, and `GSC Queries` already exist in `REQUIRED_SHEET_NAMES`.

### Tests

`tests/seo/apps-script/gsc-importer.test.ts` remains the focused test file for the client/importer contract. Tests should use injected transports and writers; they must not call Google services.

## Source-timezone design

Search Console dates are interpreted using `America/Los_Angeles`.

The availability algorithm must:

1. obtain the calendar date represented by `now` in `America/Los_Angeles`;
2. subtract `delayDays` as whole calendar days from that local date;
3. return an ISO `YYYY-MM-DD` date;
4. default `delayDays` to `3`;
5. reject negative or non-integer delays.

It must not derive the result from `now.toISOString().slice(0, 10)`.

Boundary examples:

- `2026-08-06T05:00:00Z` is still `2026-08-05` in Los Angeles, so a three-day delay yields `2026-08-02`.
- `2026-08-06T08:00:00Z` is `2026-08-06` in Los Angeles, so a three-day delay yields `2026-08-03`.

The implementation must use timezone-aware calendar conversion rather than a fixed UTC offset because Los Angeles observes daylight-saving transitions.

## Data contracts

Every row written by the importer includes:

- report dimensions;
- `clicks`;
- `impressions`;
- `ctr`;
- `position`;
- `dataAsOf`;
- `collectedAt`.

Keys are report-specific:

- Daily totals: `date`.
- Pages: `date + page`.
- Queries: `date + query`.

The importer must never calculate Daily totals by summing Pages or Queries rows. API-provided CTR and position values must be stored as returned; they must not be recomputed as simple averages of detailed rows.

## Error and partial-write behavior

- API fetches occur before any Sheet write. If any of the three API calls fails, the operation throws the typed error and invokes no writer.
- Empty successful API responses remain valid empty datasets; they are not converted into synthetic zero rows.
- Writer failures remain visible to the caller and are not swallowed.
- Cross-Sheet writes are not transactionally atomic in this batch. Later orchestration must record the run result and surface a partial write if a Sheet operation fails after an earlier Sheet write succeeds.

## Testing requirements

The implementation is complete only when automated tests prove:

1. Daily totals request exactly the `date` dimension and the property-level aggregation setting.
2. Pages request exactly `date + page`.
3. Queries request exactly `date + query`.
4. No report request contains country, device, or search appearance.
5. Each report uses its own Sheet name and key columns.
6. Repeated writes at each report grain are idempotent.
7. `2026-08-06T05:00:00Z` resolves to `2026-08-02` with a three-day Los Angeles delay.
8. `2026-08-06T08:00:00Z` resolves to `2026-08-03` with the same delay.
9. Invalid delay values throw.
10. A failure in any report fetch causes zero writer calls.
11. Empty successful reports do not create synthetic metric rows.
12. Existing URL Inspection allowlist and typed HTTP-error behavior remain green.

Required verification commands:

```bash
npm run seo:test:apps-script
npm run typecheck
npm run test:unit
```

The existing `SEO Data Hub Validation` workflow must pass on the resulting commit.

## Acceptance criteria

This batch is accepted when:

- the three GSC datasets are implemented at the approved grains;
- source-date behavior is Los Angeles calendar-aware;
- all required tests pass locally and in CI;
- the PR remains draft;
- no merge, production deployment, Google API configuration write, or Google Sheet production import has occurred.
