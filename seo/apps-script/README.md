# Evochia SEO Apps Script

This directory contains the version-controlled source for the owner-authorized Google data hub.

## Current scaffold status

Implemented in the scaffold:

- fail-closed production resource configuration;
- read-only OAuth manifest;
- idempotent creation of the required workbook tabs;
- bound-Sheet menu entries for configuration verification and workbook setup;
- read-only GSC and GA4 API clients and importers;
- isolated Search Console daily, page, and query report grains;
- source-specific Search Console date selection using the `America/Los_Angeles` calendar;
- fetch-before-write GSC orchestration so no Sheet writer runs unless all three report fetches succeed;
- GA4 page-performance reporting at query-free page grain;
- GA4 URL-quality classification for query/path/hostname anomalies;
- GA4 source-date selection from a verified named property timezone;
- Node-executable regression tests for configuration, API clients, importers, and Sheet merge/write behavior.

Not yet implemented or authorized for production:

- trigger installation;
- source bundling and deployment into the bound Apps Script project;
- production authorization or baseline imports;
- external reconciliation against live GSC/GA4 interfaces.

The source remains intentionally undeployed. Production authorization, imports, triggers, and any Google-side changes require explicit owner approval.

## Configuration

Store the approved resource JSON in Apps Script **Script Properties** under:

```text
SEO_GOOGLE_RESOURCES_JSON
```

Use `seo/config/google-resources.example.json` as the shape contract. Do not change `verificationStatus` to `verified` while any resource is `UNVERIFIED` or any Phase 0 gate is incomplete.

The GA4 reporting contract additionally requires:

```text
ga4PropertyTimeZone
productionHostname
```

`ga4PropertyTimeZone` must be a verified named IANA timezone such as `Europe/Athens`; no fixed UTC offset is used. `productionHostname` is a lowercase hostname only, without scheme, path, port, or trailing dot.

Do not store the following in the Sheet or repository:

- OAuth access or refresh tokens;
- API keys;
- service-account JSON;
- GitHub tokens;
- cookies or session data.

## Approved scopes

`appsscript.json` is the source of truth. It contains only:

- Search Console read-only;
- Analytics read-only;
- Tag Manager read-only;
- current bound spreadsheet access;
- Drive access limited to files created or managed by the script;
- external-request, trigger-management and container-UI scopes.

No indexing, sitemap submission, Analytics administration or GTM edit scope is allowed.

## Workbook tabs

`setupWorkbook()` creates the following tabs idempotently:

```text
Config
Run Log
Pipeline Health
GSC Daily
GSC Pages
GSC Queries
GSC Indexing
GA4 Daily
GA4 Acquisition
GA4 Landing Pages
GA4 Events
GA4 Pages
GA4 URL Quality
GTM Versions
GTM Changes
Findings Summary
```

Direct invocation is fail-closed: `setupWorkbook()` first requires a complete verified configuration.

## Search Console report grains

| Sheet | Dimensions | Aggregation | Key | Purpose |
|---|---|---|---|---|
| `GSC Daily` | `date` | `byProperty` | `date` | Property totals |
| `GSC Pages` | `date`, `page` | `auto` | `date`, `page` | Canonical page performance |
| `GSC Queries` | `date`, `query` | `byProperty` | `date`, `query` | Query discovery and trends |

Dates are selected from the `America/Los_Angeles` calendar with a default three-day final-data delay. Query rows are not used to reconstruct property totals. The importer fetches all three reports before writing any Sheet. Empty successful API responses remain empty; no synthetic zero rows are created.

## GA4 page reporting contracts

### `GA4 Pages`

Primary metrics are requested directly at:

```text
date + hostName + pagePath
```

That same tuple is the unique page-performance key. Query strings are excluded from identity so campaign parameters do not fragment one logical page. The primary metrics are:

```text
screenPageViews
activeUsers
sessions
engagedSessions
userEngagementDuration
keyEvents
```

`pageTitle` is not part of the primary metrics request or key. It is selected from a separate metadata-only GA4 report (`date + hostName + pagePath + pageTitle`, metric `screenPageViews`). For each page key, the highest-view non-empty title wins; equal-view ties use lexical order. Missing title metadata remains `null`.

`language` and `service` are deterministic local attributes derived from the raw `pagePath`. Trailing slash normalization may be used only for classification matching; it never rewrites the stored path or page key.

### `GA4 URL Quality`

URL-quality rows use:

```text
date + hostName + pagePathPlusQueryString
```

and are retained only when at least one classification applies. Version 1 classifications, in deterministic order, are:

```text
tracking_query_params
unexpected_query_params
double_slash
legacy_html
preview_host
non_production_host
```

Known tracking keys include `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, and `msclkid`. Tracking parameters are informational variants, not automatically defects. Preview hosts such as `*.vercel.app` are identified separately from other non-production hosts.

The URL-quality dataset must not be summed to reconstruct page users or sessions. Its query/path variants remain separate evidence for anomaly monitoring.

### GA4 date semantics and sparse data

GA4 dates use the verified `ga4PropertyTimeZone` calendar with a default two-day processing delay. The calculation is DST-aware and does not fall back to UTC or a fixed `+02:00`/`+03:00` offset.

Empty or thresholded GA4 responses stay missing. The importer does not synthesize zero rows, does not fabricate missing titles, and does not reconstruct hidden totals by summing title or query variants.

The implementation is still code-only and undeployed. A production GSC/GA4 import, authorization flow, trigger, Sheet mutation, or Google configuration write must not be performed without explicit owner approval.

## Local verification

After dependencies are installed from the committed lockfile:

```bash
npm ci --ignore-scripts
npm run test:unit
npm run seo:test:apps-script
npm run typecheck
npm run test:analytics
```

The bound-script build/deployment procedure will be added before triggers are permitted.
