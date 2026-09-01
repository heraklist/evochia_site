# Apps Script Runtime Smoke Runbook

This runbook separates repository acceptance from real Google Apps Script V8 runtime verification. Completing the repository phase does not authorize or imply any Google-side action.

> **Scope:** this document is for the data-free, non-production V8 smoke only. For production configuration, scheduling, missing-day repair, calibration, property totals, and historical-load operations, use `docs/seo/seo-data-hub-production-runbook.md`.

## Phase 1 — repository-only verification

Run against the exact commit intended for smoke verification:

```bash
node --version  # must print v22.23.2
npm ci --ignore-scripts
npm run test:unit
npm run seo:test:apps-script
npm run typecheck
npm run typecheck:gas
npm run test:analytics
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

These commands operate only on repository files and local build/test artifacts. They do not contact Google, create an Apps Script project, authorize OAuth, install triggers, call GA4/GSC/GTM, or write to a Sheet.

A successful Phase 1 means **repository-accepted**, not runtime-verified.

## Phase 2 — Google-side V8 smoke: STOP until explicit owner instruction

Do not perform any step in this phase without a separate explicit owner command issued after Phase 1 is green.

1. Create or select a clearly named **non-production** Apps Script project. Use a synthetic non-production Sheet only if the selected project form requires one.
2. Copy `seo/apps-script/.clasp.json.example` to the ignored local file `seo/apps-script/.clasp.json`. Replace only `NON_PRODUCTION_TEST_SCRIPT_ID` with the non-production Script ID. Never commit the real file or identifier.
3. Select and pin the clasp version at the time the owner authorizes the real smoke. Do not install or invoke clasp as part of repository acceptance.
4. Push **`seo/apps-script/generated-smoke/` only** to the dedicated non-production project. Never push `generated/` as part of this smoke procedure.
5. Do not install any trigger. Do not configure Script Properties with production resource IDs. Do not authorize GA4, GSC, or GTM scopes for this smoke.
6. In the Apps Script editor, manually execute `runRuntimeSmoke()` under V8.
7. Record the exact result under `docs/reports/apps-script-runtime-smoke/YYYY-MM-DD.md` using the evidence schema in that directory. Evidence must identify the tested repository commit and smoke bundle digest.

**Never substitute the production Apps Script project. Never install triggers. Never authorize GA4/GSC/GTM scopes for this smoke. Never call live Google APIs. Never write to a production Sheet.**

## Expected smoke properties

`runRuntimeSmoke()` is intentionally data-free. It exercises production helper/import assembly code with fixed synthetic transports and injected writers. It must not read production Script Properties, call `UrlFetchApp`, call live GA4/GSC/GTM endpoints, invoke workbook setup, or depend on production data.

A passing real V8 smoke upgrades the tested commit from repository-accepted to **runtime-verified for the data-free smoke boundary only**. It does not authorize production deployment, production imports, triggers, or any other Google-side write.
