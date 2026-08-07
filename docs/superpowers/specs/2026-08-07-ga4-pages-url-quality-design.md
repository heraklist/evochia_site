# GA4 Pages and URL Quality Design

**Status:** Approved for implementation planning

**Scope:** Next automated Workstream B batch in draft PR #35, after the GSC grain/timezone batch.

## Context

The current GA4 importer collects four report families: Daily, Acquisition, Landing Pages, and Events. Landing Pages is session-entry data and therefore cannot serve as a general page-performance dataset. The existing importer also derives its default available date from the UTC calendar, while GA4 report dates must follow the GA4 property's configured timezone.

A page-performance dataset needs a stable identity that does not fragment one logical page into separate rows for `utm_*`, `gclid`, `fbclid`, or other query-string variants. At the same time, those raw URL variants are useful for URL-quality monitoring and must not be discarded.

A second grain issue applies to `pageTitle`: requesting `pageTitle` alongside page metrics can split one `date + hostName + pagePath` key into multiple GA4 rows when the title changes during the day. Metrics such as `activeUsers` and `sessions` are not safely additive across those title variants. Therefore title is collected separately as metadata and never participates in the primary metrics grain.

## Goals

1. Add a dedicated GA4 page-performance dataset with a query-free page identity.
2. Keep page metrics exactly at `date + hostName + pagePath` grain.
3. Enrich page rows with a deterministic `pageTitle` selected from a separate metadata lookup report.
4. Keep raw query-string variants in a separate URL-quality dataset instead of polluting page-performance grain.
5. Make GA4 availability dates use the verified GA4 property timezone as a named IANA timezone.
6. Preserve `hostName` so production, alternate, and preview hosts remain distinguishable.
7. Add deterministic language and service classification from the page path.
8. Keep page performance distinct from Landing Pages because their grains and analytical meanings differ.
9. Preserve missing/omitted GA4 rows as missing; do not manufacture zero rows for sparse or thresholded data.
10. Keep this batch code-only and read-only with respect to Google services.

## Non-goals

This batch does not:

- merge page performance into `GA4 Landing Pages`;
- use `pageTitle` as an identity key;
- calculate page metrics by summing title variants;
- treat GA4 `pagePath` as an SEO canonicalization engine;
- aggregate raw query-string variants by summing user/session metrics after collection;
- implement per-page `generate_lead` attribution or per-event conversion breakdowns;
- add GA4 Admin API discovery of the property timezone;
- detect or reverse GA4 privacy thresholding;
- implement Apps Script bundling, deployment, triggers, production authorization, or production imports;
- make GA4, GTM, GSC, Google Sheet, Vercel, or production configuration writes.

## Chosen architecture

Use three GA4 Data API report contracts feeding two workbook datasets:

| Report contract | API dimensions | Metrics | Output use |
|---|---|---|---|
| Page metrics | `date`, `hostName`, `pagePath` | `screenPageViews`, `activeUsers`, `sessions`, `engagedSessions`, `userEngagementDuration`, `keyEvents` | Primary `GA4 Pages` metrics at exact key grain |
| Page-title metadata | `date`, `hostName`, `pagePath`, `pageTitle` | `screenPageViews` | Deterministic title attribute lookup only |
| URL quality | `date`, `hostName`, `pagePathPlusQueryString` | `screenPageViews`, `activeUsers`, `sessions` | Raw URL variants and anomaly monitoring |

The workbook outputs are:

| Dataset | Sheet | Unique key | Purpose |
|---|---|---|---|
| Page performance | `GA4 Pages` | `date + hostName + pagePath` | Query-free page performance and GSC reconciliation |
| URL quality | `GA4 URL Quality` | `date + hostName + pagePathPlusQueryString` | Raw URL variants and anomaly monitoring |

`pageTitle` is an attribute, never part of identity and never part of the primary page-metrics API request. A title change therefore cannot split `activeUsers`, `sessions`, or engagement metrics in the page-performance dataset.

`hostName` is mandatory in both datasets. Reporting can filter to the verified production hostname for production KPIs and GSC reconciliation while still retaining evidence of preview, alternate, or unexpected hosts.

### Important terminology

GA4 `pagePath` means the path component reported by GA4 without the query string. It is the page-performance identity chosen for this batch, but it is **not** assumed to be the SEO canonical URL. Path anomalies such as `.html`, duplicate slashes, or alternate path forms remain separate paths and are surfaced by URL-quality classification rather than silently merged.

## Page-performance contract

### Identity

The unique key is:

```text
date + hostName + pagePath
```

The importer must not derive this key from `pagePathPlusQueryString`, and it must not add `pageTitle` to the key.

### Primary metrics request

The primary page report requests exactly:

```text
dimensions: date, hostName, pagePath
metrics: screenPageViews, activeUsers, sessions, engagedSessions,
         userEngagementDuration, keyEvents
```

No post-fetch summing is used to reconstruct this grain from a more detailed title/query report.

### Page-title metadata lookup

A separate report requests:

```text
dimensions: date, hostName, pagePath, pageTitle
metric: screenPageViews
```

For each `date + hostName + pagePath` key, choose one title deterministically:

1. prefer the non-empty title variant with the greatest `screenPageViews`;
2. if multiple non-empty titles tie on views, choose the lexicographically smallest title;
3. if no non-empty title exists, use `null`.

This report is metadata-only. Its rows must never be used to sum or recalculate `activeUsers`, `sessions`, `engagedSessions`, `userEngagementDuration`, or `keyEvents`.

### Dimensions and attributes written to `GA4 Pages`

Store:

- `date`;
- `hostName`;
- `pagePath`;
- `pageTitle` selected by the metadata rule above;
- `language`;
- `service`;
- `dataAsOf`;
- `collectedAt`.

`language` and `service` are deterministic local classifications from `pagePath`; they are not inferred from GA4 audiences, traffic source, page title, or browser language.

### Metrics written to `GA4 Pages`

Version 1 stores:

- `screenPageViews`;
- `activeUsers`;
- `sessions`;
- `engagedSessions`;
- `userEngagementDuration`;
- `keyEvents`.

`keyEvents` remains the aggregate GA4 key-event metric in this batch. Page-level `generate_lead` analysis is a later report family rather than an extra dimension added to this grain.

### GSC reconciliation

The clean comparison key is the production `hostName + pagePath` pair. GSC page URLs should be decomposed into the same host/path components for joins. Query parameters are intentionally absent from the GA4 page-performance identity.

The implementation must not claim that the GA4 path is an SEO canonical. If GSC reports a different canonical path, that discrepancy belongs in reconciliation/anomaly reporting rather than being normalized away inside this importer.

## URL-quality contract

The URL-quality report requests `date + hostName + pagePathPlusQueryString` and keeps the raw `pagePathPlusQueryString` returned by GA4. It does not request `pageTitle`, so its metrics stay at its declared key grain.

Each retained output row includes:

- `date`;
- `hostName`;
- `pagePathPlusQueryString`;
- `pageTitle`, looked up from the page-title metadata map using `date + hostName + normalizedPagePath`;
- `normalizedPagePath` as the query-free path component used only for comparison/classification;
- `anomalyTypes` as a deterministic, comma-separated classification value;
- `dataAsOf`;
- `collectedAt`;
- `screenPageViews`;
- `activeUsers`;
- `sessions`.

The dataset retains only rows that carry at least one URL-quality classification. It is not a second copy of every normal page row.

### URL-quality classifications

Version 1 recognizes:

- `tracking_query_params` — known acquisition parameters such as `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`;
- `unexpected_query_params` — query parameters outside the known tracking allowlist;
- `double_slash` — duplicate slash inside the path component;
- `legacy_html` — a path ending in `.html`;
- `preview_host` — known preview/deployment host patterns such as `*.vercel.app`;
- `non_production_host` — any hostname that is not the verified production hostname and is not already classified as a preview host.

A row may have multiple classifications. `anomalyTypes` must be emitted in the fixed order listed above so idempotent comparisons do not change because of set iteration order.

Tracking parameters are informational URL variants, not automatically a defect. They are retained here so they can be quantified without fragmenting page-performance identity.

## Deterministic language and service classification

Classification uses the path only and never mutates the source path or key.

### Language

- path beginning `/en/` or exactly `/en` -> `en`;
- path beginning `/el/` or exactly `/el` -> `el`;
- otherwise -> `unknown`.

### Service/page classification

For classification only:

1. remove the leading locale segment when present;
2. if the remaining non-root path has no trailing slash, append one to the temporary comparison value;
3. match the normalized comparison value against the taxonomy below;
4. retain the original raw `pagePath` unchanged in output and identity.

Taxonomy:

- `/` -> `home`;
- `/wedding-catering/` prefix -> `wedding_catering`;
- `/corporate-catering/` prefix -> `corporate_catering`;
- `/villa-private-chef/` prefix -> `villa_private_chef`;
- `/yacht-private-chef/` prefix -> `yacht_private_chef`;
- `/athens-private-chef/` prefix -> `athens_private_chef`;
- `/greek-islands-private-chef/` prefix -> `greek_islands_private_chef`;
- `/private-chef/` prefix -> `private_chef`;
- `/catering/` prefix -> `catering`;
- `/menus/` prefix -> `menus`;
- `/contact/` prefix -> `contact`;
- `/about/` prefix -> `about`;
- `/faq/` prefix -> `faq`;
- `/lookbook/` prefix -> `lookbook`;
- `/privacy/` prefix -> `privacy`;
- `/404` prefix -> `not_found`;
- otherwise -> `other`.

This normalization exists only to keep classification deterministic for pre-redirect/non-trailing-slash hits. It does not canonicalize, merge, or rewrite the original GA4 path.

## GA4 property-timezone design

GA4 availability dates must be calculated from the property's named IANA timezone, supplied through verified configuration. There is no UTC fallback for production collection and no fixed `+02:00`/`+03:00` offset.

The configuration keys introduced by this batch are:

```text
ga4PropertyTimeZone
productionHostname
```

Both are required verified strings. `ga4PropertyTimeZone` must be accepted by `Intl.DateTimeFormat` as an IANA timezone. `productionHostname` is stored as a lowercase hostname without scheme, path, port, or trailing dot. Tests use `Europe/Athens` and `www.evochia.gr`.

The availability algorithm must:

1. convert `now` to calendar date components in `ga4PropertyTimeZone`;
2. subtract `delayDays` as whole calendar days from that local date;
3. return `YYYY-MM-DD`;
4. keep the existing default two-day GA4 processing delay;
5. reject negative or non-integer delays;
6. reject an absent or invalid property timezone for production report collection.

Boundary tests must distinguish this from UTC and from a permanent Athens `+03:00` offset. Examples:

- `2026-08-06T21:30:00Z` is `2026-08-07` in `Europe/Athens`; with a two-day delay the available date is `2026-08-05`.
- `2026-11-02T21:30:00Z` is still `2026-11-02` in winter `Europe/Athens`; with zero delay the date remains `2026-11-02`. A permanent `+03:00` offset would incorrectly roll this timestamp into November 3.

## Component boundaries

### `Ga4Client.ts`

Remain the generic paginated GA4 Data API transport and row normalizer.

It must not know page identity, service taxonomy, production hostnames, title-selection policy, URL anomaly rules, or Sheet names. The pagination fix already in place remains part of the regression suite.

### `Ga4Importer.ts`

Own GA4 report contracts, property-calendar selection, metadata annotation, title selection, page classification, and URL-quality classification.

The importer adds the new page metrics, title metadata, and URL-quality API calls to the existing report bundle. Existing Daily, Acquisition, Landing Pages, and Events semantics remain unchanged except that the default date helper now uses the explicit property timezone.

No importer function in this batch writes to a Google Sheet. It returns normalized bundles for later orchestration.

### `Setup.ts`

Add `GA4 Pages` and `GA4 URL Quality` to the required workbook Sheet names. This changes only the version-controlled workbook contract; the implementation must not invoke `setupWorkbook()` against a production Sheet in this batch.

### `Config.ts`, schema, and example config

Extend the version-controlled production configuration contract with:

- `ga4PropertyTimeZone`;
- `productionHostname`.

Both participate in the verified/fail-closed invariant. The example may keep `ga4PropertyTimeZone` as `UNVERIFIED` until externally confirmed; the verified test fixtures use `Europe/Athens`. `productionHostname` uses `www.evochia.gr` in fixtures and must pass strict hostname-shape validation.

### Tests

Use injected HTTP transports and pure classification/title-selection helpers. Tests must not call Google services or mutate Google Sheets.

## Sparse and thresholded data behavior

Low-volume GA4 reports can be sparse or subject to privacy thresholding. This batch does not attempt to recreate hidden rows.

Rules:

- empty successful responses remain empty;
- omitted page rows are not converted into zeros;
- missing metrics remain `null` where the client reports no value;
- missing title metadata yields `pageTitle: null` rather than a fabricated string;
- no totals are reconstructed by summing title or URL-quality variants;
- reconciliation reports must treat GA4 absence as `missing/unknown`, not automatically as zero traffic.

## Error behavior

- Invalid GA4 property resource identifiers continue to fail before API collection.
- Collection remains blocked unless production resource verification is `verified`.
- Missing/invalid `ga4PropertyTimeZone` or `productionHostname` must fail closed before the new report bundle is collected.
- Non-2xx GA4 Data API responses continue to throw `Ga4PipelineError` and are not swallowed.
- The importer must not silently fall back from `pagePath` to `pagePathPlusQueryString` for page identity.
- The title metadata report must not alter primary metrics if it is sparse; unmatched titles remain `null`.
- URL classifier parsing failures must retain the raw source value and produce deterministic classification output rather than mutating the path.

## Testing requirements

The batch is complete only when automated tests prove:

1. Page metrics request exactly `date + hostName + pagePath`.
2. Page metrics request exactly the approved v1 metrics.
3. Page identity is `date + hostName + pagePath`.
4. Query-string variants do not create separate page-performance keys because that report uses `pagePath`.
5. Page-title metadata requests exactly `date + hostName + pagePath + pageTitle` with only `screenPageViews`.
6. Title selection prefers the highest-view non-empty title and uses lexical tie-breaking; missing metadata yields `null`.
7. Title variants never cause summing/recalculation of primary page metrics.
8. URL quality requests exactly `date + hostName + pagePathPlusQueryString` with its approved metrics.
9. URL-quality rows classify tracking parameters, unexpected parameters, duplicate slashes, `.html`, preview hosts, and non-production hosts in fixed order.
10. Normal URLs without a URL-quality classification are not copied into `GA4 URL Quality`.
11. Language and service classification is deterministic for EN, EL, service, utility, unknown, and non-trailing-slash paths without changing the raw key.
12. The production hostname remains part of the page key and preview/alternate hosts remain distinguishable.
13. `2026-08-06T21:30:00Z` with `Europe/Athens` and a two-day delay resolves to `2026-08-05`.
14. `2026-11-02T21:30:00Z` with `Europe/Athens` and zero delay resolves to `2026-11-02`, proving DST-aware named-timezone behavior.
15. Invalid delay/timezone/hostname configuration values fail closed.
16. Existing Daily, Acquisition, Landing Pages, Events, pagination, verification, and missing-metric tests remain green.
17. Empty/sparse successful API responses do not produce synthetic rows or zeros.
18. Required workbook setup includes `GA4 Pages` and `GA4 URL Quality` idempotently without invoking a live Sheet during tests.
19. Schema and example/config unit tests enforce the two new configuration keys and the verified invariant.

Required repository verification:

```bash
npm run seo:test:apps-script
npm run typecheck
npm run test:unit
npm run test:analytics
```

The `SEO Data Hub Validation` and `Site Analytics Validation` workflows must be green on the final batch head.

## Acceptance criteria

This design is accepted for implementation when:

- GA4 page metrics are collected directly at `date + hostName + pagePath` grain;
- `pageTitle` is selected from a separate metadata lookup and remains an attribute only;
- full query-string variants are isolated in `GA4 URL Quality`;
- service classification may normalize trailing slash for matching only, without mutating identity;
- GA4 dates use the verified named property timezone with the existing two-day delay;
- sparse/thresholded rows are not synthesized;
- existing GA4/GSC/analytics regressions remain green;
- PR #35 remains open and draft on `seo-system` -> `main`;
- no merge, production deployment, Google authorization, production Sheet import, or GA4/GTM/GSC configuration write occurs.
