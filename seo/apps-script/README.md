# Evochia SEO Apps Script

This directory contains the version-controlled source for the owner-authorized Google data hub.

## Current scaffold status

Implemented in the repository:

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
- a GAS-only no-DOM TypeScript gate;
- deterministic separate production and smoke bundles;
- a data-free `runRuntimeSmoke()` suite using synthetic transports and injected writers;
- byte-for-byte committed-bundle equivalence CI under pinned Node.js `22.23.2` and exact `esbuild@0.25.9`.

Not yet authorized or runtime-verified:

- any push to a Google Apps Script project;
- real Apps Script V8 execution of the smoke bundle;
- trigger installation;
- production authorization or baseline imports;
- external reconciliation against live GSC/GA4 interfaces;
- production deployment.

The source remains intentionally undeployed. Repository-green means **repository-accepted**, not Google Apps Script runtime-verified. Real V8 smoke requires a separate explicit owner instruction and must use a dedicated non-production Apps Script project.

## Source and generated artifacts

TypeScript under `seo/apps-script/src/`, `entrypoints/`, and `smoke/` is authoritative. Never hand-edit generated artifacts.

- `generated/Code.gs` + `generated/appsscript.json` are the production bundle and production manifest copy.
- `generated-smoke/Code.gs` + `generated-smoke/appsscript.json` are the non-production runtime-smoke bundle and minimal smoke manifest.
- `runRuntimeSmoke()` must never appear in the production bundle.
- The smoke manifest intentionally contains no GA4, GSC, or GTM OAuth scopes.

Build and equivalence commands:

```bash
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

The equivalence checker rebuilds into an OS temporary directory and compares fresh outputs byte-for-byte with the committed artifacts. It never overwrites the committed baseline before comparison.

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

Do not store OAuth access or refresh tokens, API keys, service-account JSON, GitHub tokens, cookies, session data, real `.clasp.json`, Script IDs, or Sheet IDs in the repository.

## Approved production scopes

`appsscript.json` is the production source of truth. It contains only Search Console read-only, Analytics read-only, Tag Manager read-only, current bound spreadsheet access, Drive access limited to files created or managed by the script, external-request, trigger-management, and container-UI scopes. No indexing, sitemap submission, Analytics administration, or GTM edit scope is allowed.

The non-production smoke manifest is separate and does not require GA4/GSC/GTM scopes because the smoke uses fixed synthetic transports.

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

`GA4 Pages` requests primary metrics at `date + hostName + pagePath`, which is also the unique page-performance key. Query strings are excluded from identity. `pageTitle` comes from a separate metadata-only report and is selected deterministically by highest views with lexical tie-breaking. Missing title metadata remains `null`.

`language` and `service` are deterministic local attributes derived from the raw `pagePath`. Classification matching may normalize a trailing slash but never rewrites the stored page key.

`GA4 URL Quality` uses `date + hostName + pagePathPlusQueryString` and retains only classified anomalies. Version 1 classifications are `tracking_query_params`, `unexpected_query_params`, `double_slash`, `legacy_html`, `preview_host`, and `non_production_host`. Known tracking keys include `utm_*`, `gclid`, `gclsrc`, `dclid`, `gbraid`, `wbraid`, `gad_source`, `_gl`, `srsltid`, `fbclid`, and `msclkid`.

GA4 dates use the verified `ga4PropertyTimeZone` calendar with a default two-day processing delay. Empty or thresholded responses stay missing; no synthetic zero rows or reconstructed hidden totals are created.

## Repository verification

After installing dependencies from the committed lockfile:

```bash
node --version  # v22.23.2
npm ci --ignore-scripts
npm run test:unit
npm run seo:test:apps-script
npm run typecheck
npm run typecheck:gas
npm run test:analytics
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

These repository commands do not authorize or perform Google-side writes.

## Real GAS V8 smoke boundary

See `docs/seo/apps-script-runtime-smoke-runbook.md`. The future smoke must use only `generated-smoke/`, a dedicated non-production Apps Script project, no triggers, no production identifiers, and no live GA4/GSC/GTM requests. A real `.clasp.json` is local/ignored; `.clasp.json.example` contains only the literal placeholder `NON_PRODUCTION_TEST_SCRIPT_ID`.

No Google-side smoke has been executed merely because this repository layer is green. Production deployment, authorization, imports, triggers, and any Google configuration or Sheet mutation remain separately owner-gated.
