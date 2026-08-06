# Evochia SEO Apps Script

This directory contains the version-controlled source for the owner-authorized Google data hub.

## Current scaffold status

Implemented in the scaffold:

- fail-closed production resource configuration;
- read-only OAuth manifest;
- idempotent creation of the required workbook tabs;
- bound-Sheet menu entries for configuration verification and workbook setup;
- Node-executable tests for pure configuration and setup logic.

Not yet implemented:

- Google API collectors;
- trigger installation;
- source bundling and deployment into the bound Apps Script project;
- production authorization or baseline imports.

The source is intentionally not operational until the later Plan 1 tasks and all Phase 0 identity gates are complete.

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

## Local verification

After dependencies are installed from the committed lockfile:

```bash
npm ci
npm run seo:test:apps-script
npm run typecheck
```

The bound-script build/deployment procedure will be added before triggers are permitted.