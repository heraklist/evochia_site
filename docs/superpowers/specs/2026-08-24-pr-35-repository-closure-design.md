# PR #35 Repository Closure Design

**Status:** Owner-approved for repository implementation
**Date:** 2026-08-24
**Branch:** `seo-system`
**Starting SHA:** `a606aaffb0a0825d3c48c40510bc60607bec5723`
**PR:** #35, which must remain open and draft

## Purpose

This design closes the repository-controlled defects identified by the final readiness audit without performing any production mutation. It implements the architectural invariants and authorization boundaries in the owner-provided master closure workstream.

Repository closure is distinct from post-deploy and owner-controlled validation. A green repository does not certify a real Formspree lead, Google Apps Script V8 execution, Google authorization, production analytics behavior, or Google Search Console state.

## Authorization boundary

Authorized work includes repository edits, tests, Playwright infrastructure, CI security gates, consent-loading architecture, sitemap repair, diagnostic cleanup, commits, push to `seo-system`, and an accurate draft PR body.

The work must not merge or rebase, mark the PR ready, deploy production, write Google or Formspree state, authorize OAuth, install triggers, push Apps Script, submit a sitemap, or perform any other production mutation.

## Architecture

### Measurement loading and consent

Every localized HTML document retains the inline Consent Mode default-denied bootstrap before any other analytics behavior. The immediate GTM loader and GTM `noscript` iframe are removed from all localized pages.

`js/cookieconsent-config.js` becomes the single measurement-loader integration point. It will:

- recognize only the exact normalized production hostname `www.evochia.gr`;
- update Consent Mode to granted before inserting the GTM script;
- insert `https://www.googletagmanager.com/gtm.js?id=GTM-578JXRXS` only after analytics consent;
- guard insertion with shared state and an existing-script check so restoration and callbacks cannot initialize GTM twice;
- refuse insertion on localhost, Vercel preview hosts, the apex host unless it is deliberately added later, look-alike domains, and every other non-production hostname;
- restore persisted analytics consent through the existing shared consent parser and initialize measurement once;
- keep site-authored events gated by live analytics consent;
- update consent to denied on withdrawal and use the current reload behavior so the next document starts without GTM.

The exact `www` allowlist is intentional: repository canonicals and the production configuration identify `www.evochia.gr`, while the apex is expected to redirect. Broad suffix or substring matching is forbidden.

### Browser verification and network isolation

A dedicated Playwright configuration discovers only `tests/e2e/**/*.spec.*`. A deterministic Node test server maps localized clean routes to their static HTML files and supports both localhost and a simulated `www.evochia.gr` hostname.

Chromium uses a host-resolver rule to map `www.evochia.gr` to loopback. Playwright intercepts Google/GTM and Formspree endpoints before any test action. Assertions inspect attempted requests while fulfilling or aborting them locally; no real Google or Formspree request may escape the test process.

The suite covers localized loading and navigation, consent banner behavior, pre-consent silence, post-consent production-host GTM initialization, preview isolation, one-time initialization, the six-event contract's critical browser paths, and mocked Formspree success/error behavior. Mocked success does not upgrade `LEAD_METRIC_E2E_NOT_VALIDATED`.

### Spreadsheet identity

A shared workbook identity boundary obtains the verified configuration and active workbook, rejects a missing workbook, and compares `workbook.getId()` with `config.sheetId`. It returns the workbook only after equality succeeds.

Both workbook setup and `upsertRows()` use that boundary before sheet lookup or mutation. Dependencies remain injectable so tests can prove that mismatch and missing-workbook failures happen before `getSheetByName`, `insertSheet`, `getRange`, or `setValues`.

Historical upsert semantics remain unchanged. No trailing-row or trailing-column truncation is added.

### Spreadsheet formula safety

The shared Sheet writer serializes values immediately before `setValues()`. String values beginning with `=`, `+`, `-`, or `@` receive a leading apostrophe and therefore remain literal Sheet text. Numbers, booleans, dates, null behavior, benign strings, headers, keys, and historical upsert semantics remain intact.

### OAuth least privilege

The current executable production bundle provides configuration verification, workbook setup, and the bound-sheet menu. Its manifest therefore retains only:

- `https://www.googleapis.com/auth/spreadsheets.currentonly`
- `https://www.googleapis.com/auth/script.container.ui`

The following scopes are future-only and are removed from the current production manifest:

- `webmasters.readonly` and `analytics.readonly`, reintroduced only with owner-authorized production importer entrypoints;
- `script.external_request`, reintroduced only with an executable production API transport;
- `tagmanager.readonly`, reintroduced only with owner-authorized GTM monitoring;
- `drive.file`, reintroduced only with an approved bounded snapshot workflow;
- `script.scriptapp`, reintroduced only with an approved trigger or project-management workflow.

Manifest contracts and the generated production manifest must match this classification. No Google authorization occurs during repository verification.

### CI security gates

Dependency policy is the locked graph evaluated by `npm audit --audit-level=moderate`; moderate-or-higher findings block validation.

Secret scanning uses a mature credential-free scanner whose GitHub Action is pinned to an independently verified immutable commit SHA. It scans the checkout/history supported by that action, uses only narrow repository-owned suppressions, and blocks on a finding. If an immutable pin cannot be verified from the official upstream, the gate is reported as blocked rather than invented.

The SEO validation workflow aggregates dependency audit, secret scan, tests, typechecks, and bundle verification as blocking gates. CodeMaestro exposes only implemented suites, maps unit/typecheck/security choices to real commands, and its aggregate review cannot skip absent checks. No lint or Supabase system is introduced.

### Portability and generated artifacts

Node tests convert file URLs with `fileURLToPath()` and filesystem helpers. A narrow `.gitattributes` rule forces LF only for the committed Apps Script generated artifacts. Byte comparison remains strict; the checker does not normalize away differences.

### Sitemap consistency

The two intentionally `noindex` privacy URLs are removed from `sitemap.xml`, including their alternate links inside those sitemap entries. The pages, navigation, canonicals, and `noindex` directives remain unchanged. A repository test prevents noindex pages from re-entering the sitemap.

### Diagnostic cleanup

> **RETIRED SURFACE (2026-08-24).** Replacement analytics (`146/146`) and Playwright (`15/15`) coverage passed before cleanup. The page, middleware allowlist exception, diagnostic-only tests, and obsolete requirement claims were then removed. Historical documentation remains only where clearly labeled historical or retired.

## Error handling and fail-closed behavior

- Invalid or absent consent state leaves measurement unloaded.
- Non-production hostname checks return without inserting a script.
- Missing or mismatched workbook identity throws before any mutation.
- CI security tooling fails the gate rather than silently skipping.
- Browser tests abort unexpected Google and Formspree traffic.

## Verification strategy

Behavior changes follow red-green-refactor TDD. Each independently reviewable task receives a focused review before the next dependent task proceeds.

Final evidence includes the complete Node 22.23.2 Windows matrix, deterministic generation with a clean tree, a fresh security scan, an independent whole-branch review, pushed exact-head CI runs, and proof that PR #35 remains draft.

Repository closure may be classified `REPOSITORY_CLOSURE_VERIFIED` only after every repository-controlled gate passes. Remaining external work is classified `OWNER_AUTHORIZATION_REQUIRED` and `POST_DEPLOY_RUNTIME_VALIDATION_PENDING` without downgrading the completed read-only GA4/GSC audit.
