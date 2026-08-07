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

The implementation is still code-only and undeployed. A production GSC import, authorization flow, trigger, or Sheet write must not be performed without explicit owner approval.

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
