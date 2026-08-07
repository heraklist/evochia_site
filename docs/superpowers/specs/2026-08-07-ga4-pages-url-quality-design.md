# GA4 Pages and URL Quality Design

**Status:** Approved for implementation planning

**Scope:** Next automated Workstream B batch in draft PR #35, after the GSC grain/timezone batch.

## Context

The current GA4 importer collects four report families: Daily, Acquisition, Landing Pages, and Events. Landing Pages is session-entry data and therefore cannot serve as a general page-performance dataset. The existing importer also derives its default available date from the UTC calendar, while GA4 report dates must follow the GA4 property's configured timezone.

A page-performance dataset also needs a stable identity that does not fragment one logical page into separate rows for `utm_*`, `gclid`, `fbclid`, or other query-string variants. At the same time, those raw URL variants are useful for URL-quality monitoring and must not be discarded.

## Goals

1. Add a dedicated GA4 page-performance dataset with a query-free page identity.
2. Keep raw query-string variants in a separate URL-quality dataset instead of polluting page-performance grain.
3. Make GA4 availability dates use the verified GA4 property timezone as a named IANA timezone.
4. Preserve `hostName` so production, alternate, and preview hosts remain distinguishable.
5. Add deterministic language and service classification from the page path.
6. Keep page performance distinct from Landing Pages because their grains and analytical meanings differ.
7. Preserve missing/omitted GA4 rows as missing; do not manufacture zero rows for sparse or thresholded data.
8. Keep this batch code-only and read-only with respect to Google services.

## Non-goals

This batch does not:

- merge page performance into `GA4 Landing Pages`;
- use `pageTitle` as an identity key;
- treat GA4 `pagePath` as an SEO canonicalization engine;
- aggregate raw query-string variants by summing user/session metrics after collection;
- implement per-page `generate_lead` attribution or per-event conversion breakdowns;
- add GA4 Admin API discovery of the property timezone;
- detect or reverse GA4 privacy thresholding;
- implement Apps Script bundling, deployment, triggers, production authorization, or production imports;
- make GA4, GTM, GSC, Google Sheet, Vercel, or production configuration writes.

## Chosen architecture

Use two new GA4 report families and two workbook tabs:

| Dataset | API dimensions | Sheet | Unique key | Purpose |
|---|---|---|---|---|
| Page performance | `date`, `hostName`, `pagePath`, `pageTitle` | `GA4 Pages` | `date + hostName + pagePath` | Query-free page performance and GSC reconciliation |
| URL quality | `date`, `hostName`, `pagePathPlusQueryString`, `pageTitle` | `GA4 URL Quality` | `date + hostName + pagePathPlusQueryString` | Raw URL variants and anomaly monitoring |

`pageTitle` is an attribute, never part of identity. A title change therefore updates the same logical page key rather than creating a new page identity.

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

### Dimensions and attributes

Store:

- `date`;
- `hostName`;
- `pagePath`;
- `pageTitle`;
- `language`;
- `service`;
- `dataAsOf`;
- `collectedAt`.

`language` and `service` are deterministic local classifications from `pagePath`; they are not inferred from GA4 audiences, traffic source, page title, or browser language.

### Metrics

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

The URL-quality report keeps the raw `pagePathPlusQueryString` returned by GA4.

Each retained row includes:

- `date`;
- `hostName`;
- `pagePathPlusQueryString`;
- `pageTitle`;
- `normalizedPagePath` as the query-free path component used only for comparison/classification;
- `anomalyTypes` as a deterministic, comma-separated classification value;
- `dataAsOf`;
- `collectedAt`;
- `screenPageViews`;
- `activeUsers`;
- `sessions`.

The dataset should retain rows that carry at least one URL-quality classification. It is not a second copy of every normal page row.

### URL-quality classifications

Version 1 recognizes:

- `tracking_query_params` — known acquisition parameters such as `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`;
- `unexpected_query_params` — query parameters outside the known tracking allowlist;
- `double_slash` — duplicate slash inside the path component, excluding the URL scheme because only the path/query value is inspected;
- `legacy_html` — a path ending in `.html`;
- `preview_host` — known preview/deployment host patterns such as `*.vercel.app`;
- `non_production_host` — any hostname that is not the verified production hostname and is not already classified as a preview host.

A row may have multiple classifications. `anomalyTypes` must be emitted in a stable deterministic order so idempotent comparisons do not change because of set iteration order.

Tracking parameters are informational URL variants, not automatically a defect. They are retained here so they can be quantified without fragmenting page-performance identity.

## Deterministic language and service classification

Classification uses the path only.

### Language

- path beginning `/en/` or exactly `/en` -> `en`;
- path beginning `/el/` or exactly `/el` -> `el`;
- otherwise -> `unknown`.

### Service/page classification

After removing the leading locale segment for classification only:

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

These labels intentionally match the site's existing analytics vocabulary where practical. Classification does not rewrite the source `pagePath`.

## GA4 property-timezone design

GA4 availability dates must be calculated from the property's named IANA timezone, supplied through verified configuration/dependencies. There is no UTC fallback for production collection and no fixed `+02:00`/`+03:00` offset.

Tests use `Europe/Athens` as the expected Evochia property timezone. Production use still requires the configured timezone value to be verified at the external resource gate.

The availability algorithm must:

1. convert `now` to calendar date components in the supplied property timezone;
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

It should not know page identity, service taxonomy, production hostnames, URL anomaly rules, or Sheet names. The pagination fix already in place remains part of the regression suite.

### `Ga4Importer.ts`

Own GA4 report contracts, property-calendar selection, metadata annotation, page classification, and URL-quality classification.

The importer will add the new page-performance and URL-quality reports to the existing report bundle. Existing Daily, Acquisition, Landing Pages, and Events semantics remain unchanged except that the default date helper now uses the explicit property timezone.

No importer function in this batch writes to a Google Sheet. It returns normalized bundles for later orchestration.

### `Setup.ts`

Add `GA4 Pages` and `GA4 URL Quality` to the required workbook Sheet names. This changes only the version-controlled workbook contract; the implementation must not invoke `setupWorkbook()` against a production Sheet in this batch.

### Configuration

The production GA4 configuration contract must include a named `propertyTimeZone` value and the verified production hostname used by URL-quality classification. Neither value should be guessed at runtime from browser location or current UTC offset.

### Tests

Use injected HTTP transports and pure classification helpers. Tests must not call Google services or mutate Google Sheets.

## Sparse and thresholded data behavior

Low-volume GA4 reports can be sparse or subject to privacy thresholding. This batch does not attempt to recreate hidden rows.

Rules:

- empty successful responses remain empty;
- omitted page rows are not converted into zeros;
- missing metrics remain `null` where the client reports no value;
- no totals are reconstructed by summing URL-quality variants;
- reconciliation reports must treat GA4 absence as `missing/unknown`, not automatically as zero traffic.

## Error behavior

- Invalid GA4 property resource identifiers continue to fail before API collection.
- Collection remains blocked unless production resource verification is `verified`.
- Missing/invalid property timezone or production hostname must fail closed before the new report bundle is collected.
- Non-2xx GA4 Data API responses continue to throw `Ga4PipelineError` and are not swallowed.
- The importer must not silently fall back from `pagePath` to `pagePathPlusQueryString` for page identity.
- URL classifier parsing failures fail closed to an explicit `other`/anomaly result where possible rather than mutating the source path.

## Testing requirements

The batch is complete only when automated tests prove:

1. Page performance requests exactly `date + hostName + pagePath + pageTitle`.
2. Page performance requests exactly the approved v1 metrics.
3. Page identity is `date + hostName + pagePath`; title changes do not create a new identity.
4. Query-string variants do not create separate page-performance keys because that report uses `pagePath`.
5. URL quality requests `date + hostName + pagePathPlusQueryString + pageTitle`.
6. URL-quality rows classify tracking parameters, unexpected parameters, duplicate slashes, `.html`, preview hosts, and non-production hosts deterministically.
7. Normal URLs without a URL-quality classification are not copied into `GA4 URL Quality`.
8. Language and service classification is deterministic for EN, EL, service, utility, and unknown paths.
9. The production hostname remains part of the page key and preview/alternate hosts remain distinguishable.
10. `2026-08-06T21:30:00Z` with `Europe/Athens` and a two-day delay resolves to `2026-08-05`.
11. `2026-11-02T21:30:00Z` with `Europe/Athens` and zero delay resolves to `2026-11-02`, proving DST-aware named-timezone behavior.
12. Invalid delay/timezone values fail closed.
13. Existing Daily, Acquisition, Landing Pages, Events, pagination, verification, and missing-metric tests remain green.
14. Empty/sparse successful API responses do not produce synthetic rows or zeros.
15. Required workbook setup includes `GA4 Pages` and `GA4 URL Quality` idempotently without invoking a live Sheet during tests.

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

- GA4 page performance uses `date + hostName + pagePath` identity;
- `pageTitle`, language, and service are attributes only;
- full query-string variants are isolated in `GA4 URL Quality`;
- GA4 dates use the verified named property timezone with the existing two-day delay;
- sparse/thresholded rows are not synthesized;
- existing GA4/GSC/analytics regressions remain green;
- PR #35 remains open and draft on `seo-system` -> `main`;
- no merge, production deployment, Google authorization, production Sheet import, or GA4/GTM/GSC configuration write occurs.
