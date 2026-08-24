# PR #35 Repository Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every repository-controlled blocker in PR #35 and produce exact-head Windows, CI, browser, security, and review evidence without any production mutation.

**Architecture:** Preserve default-denied Consent Mode while moving GTM insertion behind exact-host and analytics-consent gates. Centralize Apps Script workbook identity and Sheet serialization safety, add fail-closed CI security gates and a network-isolated Chromium suite, then retire the replaced B0.5 diagnostic at the final gate.

**Tech Stack:** Node.js 22.23.2, Node test runner, TypeScript, Google Apps Script, Playwright Chromium, GitHub Actions, npm audit, TruffleHog OSS.

**Spec:** `docs/superpowers/specs/2026-08-24-pr-35-repository-closure-design.md` and `docs/superpowers/specs/2026-08-24-basic-consent-preview-isolation-design.md`

## Global Constraints

- Work only on permanent branch `seo-system`; do not create another permanent branch or PR.
- PR #35 remains open and draft.
- Do not merge, rebase, mark ready, auto-merge, or deploy.
- Do not write GA4, GTM, GSC, Apps Script, Google Sheets, OAuth, triggers, sitemap submissions, Formspree, or any production system.
- Exact runtime is Node `22.23.2`.
- Every behavior change follows RED, verified expected failure, minimal GREEN, and focused regression verification.
- Do not implement the explicitly rejected/superseded findings in the master workstream.
- Commit each independently reviewed task and push only after the final local review gate.

---

### Task 1: Windows-safe analytics paths and deterministic artifacts

**Files:**
- Create: `.gitattributes`
- Modify: `tests/analytics/site-events.test.mjs`
- Modify: `tests/analytics/consent-html.test.mjs`
- Modify: `tests/analytics/b05-routing.test.mjs`
- Modify: `tests/analytics/b05-diagnostic.test.mjs`
- Test: `tests/seo/apps-script/bundle-contract.test.mjs`

**Produces:** Windows-safe repository paths and LF-stable Apps Script source/generated artifacts while retaining strict byte comparison.

- [ ] Reproduce `npm run test:analytics` failing on Windows from URL pathname misuse and `npm run seo:check:apps-script-bundle` failing from CRLF/LF mismatch.
- [ ] Replace all four pathname conversions with `fileURLToPath()` plus `join()` and run analytics tests to GREEN.
- [ ] Add a failing contract for explicit LF rules covering the source manifest and four generated artifacts.
- [ ] Add the five narrow `text eol=lf` attributes, rematerialize/regenerate artifacts, and run the contract GREEN.
- [ ] Run build/check twice, confirm the second run changes nothing, and inspect `git ls-files --eol`.
- [ ] Run focused typecheck/tests, review the diff, and commit.

### Task 2: PR diff hygiene and sitemap/noindex consistency

**Files:**
- Modify: seven documentation files reported by `git diff --check main...HEAD`
- Modify: `sitemap.xml`
- Create: `tests/seo/sitemap.test.mjs`
- Modify: `.github/workflows/seo-data-hub-validation.yml`

**Produces:** Clean PR whitespace and a 28-entry sitemap excluding the two intentionally noindex privacy pages.

- [ ] Record the exact baseline whitespace locations; remove trailing spaces only and prove both working-tree and PR diff checks are clean.
- [ ] Write sitemap tests requiring privacy pages to remain noindex/self-canonical/cross-linked while absent from the sitemap, and requiring complete EN/EL/x-default reciprocity.
- [ ] Run the sitemap test RED against the current 30-entry sitemap.
- [ ] Remove only the two complete privacy URL blocks and run the sitemap/unit tests GREEN.
- [ ] Add `sitemap.xml`, `.gitattributes`, and relevant contracts to the SEO workflow paths so changes cannot bypass validation.
- [ ] Review the diff and commit.

### Task 3: Fail-closed workbook identity

**Files:**
- Create: `seo/apps-script/src/WorkbookIdentity.ts`
- Create: `tests/seo/apps-script/workbook-identity.test.ts`
- Modify: `seo/apps-script/src/Setup.ts`
- Modify: `seo/apps-script/src/SheetWriter.ts`
- Modify: `tests/seo/apps-script/config.test.ts`
- Modify: `tests/seo/apps-script/sheet-writer.test.ts`
- Regenerate: Apps Script production and smoke bundles

**Produces:** `getVerifiedActiveWorkbook()` returning an active workbook only after exact configured-ID verification.

- [ ] Write focused tests for matching ID, missing workbook, and mismatch; run RED.
- [ ] Implement the smallest injectable identity guard and run its tests GREEN.
- [ ] Write setup tests proving mismatch/missing workbook causes zero sheet lookup or insertion; run RED.
- [ ] Route setup through the guard and run GREEN.
- [ ] Write writer tests proving mismatch causes zero sheet lookup/read/range/write and matching identity still writes; run RED.
- [ ] Route non-empty `upsertRows()` through the same guard without changing historical upsert semantics; run GREEN.
- [ ] Run Apps Script tests, both typechecks, build/check, review, and commit.

### Task 4: Formula-safe Sheet serialization

**Files:**
- Modify: `seo/apps-script/src/SheetWriter.ts`
- Modify: `tests/seo/apps-script/sheet-writer.test.ts`
- Regenerate: Apps Script smoke bundle

**Produces:** A shared literal-cell serializer applied immediately before `setValues()`.

- [ ] Write pure RED cases for `=IMPORTXML(...)`, `=HYPERLINK(...)`, `+SUM(...)`, string `-1+1`, and `@something`.
- [ ] Write preservation cases for benign strings, numbers, booleans, Date, and null behavior.
- [ ] Implement minimal string-only apostrophe neutralization and run pure tests GREEN.
- [ ] Add a RED integration assertion against the captured `setValues()` matrix.
- [ ] Apply the serializer at the shared boundary and run integration/full Apps Script tests GREEN.
- [ ] Regenerate/check bundles, review, and commit.

### Task 5: Current-runtime OAuth least privilege

**Files:**
- Modify: `seo/apps-script/appsscript.json`
- Modify: `seo/apps-script/generated/appsscript.json`
- Modify: `tests/seo/apps-script/config.test.ts`
- Modify: `tests/seo/apps-script/bundle-contract.test.mjs`
- Modify: `seo/apps-script/README.md`

**Produces:** A production manifest limited to `spreadsheets.currentonly` and `script.container.ui`, with explicit future reintroduction gates.

- [ ] Change the exact manifest contract to the two current scopes and run RED against the existing manifest.
- [ ] Narrow the source manifest and regenerate the production manifest; run GREEN.
- [ ] Add production-bundle absence contracts for removed capabilities/endpoints and run them.
- [ ] Document every removed scope as FUTURE_ONLY with its owner-authorized reintroduction gate and clarify smoke scope-inference limits.
- [ ] Run Apps Script tests, contracts, typechecks, build/check, review, and commit.

### Task 6: Blocking dependency and secret security gates

**Files:**
- Modify: `package.json`
- Create: `scripts/security/secret-scan.sh`
- Create: `docs/security/secret-scanning.md`
- Create: `.github/workflows/security-validation.yml`
- Create: `tests/seo/ci-workflow-contract.test.mjs`

**Produces:** Moderate-or-higher locked dependency blocking, immutable-digest TruffleHog scanning, and an aggregate security status.

- [ ] Independently verify official action SHAs and the TruffleHog version/image digest; record sources in documentation.
- [ ] Write workflow contracts for exact Node, immutable action pins, full-history secret scanning, digest/flags, and fail-closed aggregation; run RED.
- [ ] Add `security:dependency-audit` using `npm audit --package-lock-only --audit-level=moderate`.
- [ ] Add the read-only full-history TruffleHog script and narrow suppression policy.
- [ ] Add dependency, secret, and always-run aggregate jobs in the no-path-filter security workflow.
- [ ] Run workflow contracts GREEN, run dependency audit directly, run the secret scanner directly when the verified local runtime is available, review, and commit.

### Task 7: Truthful CodeMaestro and browser CI contracts

**Files:**
- Modify: `.github/workflows/codemaestro-validation.yml`
- Modify: `.github/workflows/site-analytics-validation.yml`
- Create: `.github/workflows/browser-e2e-validation.yml`
- Modify: `tests/seo/ci-workflow-contract.test.mjs`

**Produces:** Only implemented CodeMaestro suites, no silent skips, exact Node, and a dedicated Chromium PR gate.

- [ ] Extend contracts to reject placeholder lint/Supabase choices, `npm test`, conditional skips, and unpinned actions; require every real command and browser job; run RED.
- [ ] Replace CodeMaestro choices with unit-tests, typecheck, dependency-audit, secrets-scan, security-baseline, and ci-review.
- [ ] Map each choice to explicit real commands; use `npm ci --ignore-scripts` where dependencies are needed.
- [ ] Pin Site Analytics to Node 22.23.2.
- [ ] Add dedicated browser CI with exact Node, Chromium installation, and `npm run test:e2e`.
- [ ] Run workflow contracts GREEN, review, and commit.

### Task 8: True Basic Consent and exact-host measurement loading

**Files:**
- Modify: `js/cookieconsent-config.js`
- Modify: `tests/analytics/site-events.test.mjs`
- Modify: `tests/analytics/consent-html.test.mjs`
- Create when useful: `tests/analytics/measurement-loader.test.mjs`
- Modify: 32 localized `en/*.html` and `el/*.html` pages, excluding the diagnostic page

**Produces:** Default-denied bootstrap plus one-shot GTM insertion only after analytics consent on exactly `www.evochia.gr`, with no GTM noscript fallback.

- [ ] Add static and executable RED tests for zero static GTM loaders/noscript frames, exact-host rejection, grant-before-insert, restoration once, repeated callbacks once, rejection zero, and withdrawal denial before reload.
- [ ] Remove only the immediate GTM loader and GTM noscript block from all 32 localized pages while preserving the inline default-denied stub.
- [ ] Implement the exact-host one-shot dynamic loader in the consent module.
- [ ] Run focused loader tests GREEN, then the complete analytics suite.
- [ ] Re-run the HTML inventory and prove 32 pages retain the default while none contains the loader or GTM iframe.
- [ ] Review privacy copy for accuracy, review the diff, and commit.

### Task 9: Real network-isolated Playwright E2E

**Files:**
- Create: `playwright.config.mjs`
- Create: `tests/e2e/server.mjs`
- Create: `tests/e2e/fixtures/network.mjs`
- Create: `tests/e2e/smoke.spec.mjs`
- Create: `tests/e2e/consent-measurement.spec.mjs`
- Create: `tests/e2e/analytics-events.spec.mjs`
- Modify as required: `.github/workflows/browser-e2e-validation.yml`

**Produces:** Dedicated Chromium tests for the 15 required scenarios with all Google/Formspree traffic intercepted locally.

- [ ] Create config/server/fixtures and first smoke spec; run `npm run test:e2e -- --list` and prove only dedicated specs are discovered.
- [ ] Add EN/EL load, navigation, and banner behavior tests; run RED/GREEN against real pages.
- [ ] Add pre-consent silence, exact production-host post-consent attempt, preview denial, restoration, and one-shot tests with host mapping; run RED/GREEN.
- [ ] Add browser event tests for contact, quote start latch, submission attempt, mocked success/lead, and mocked failure/error.
- [ ] Make the network fixture fail on any unhandled external request and prove no real Google/Formspree request escapes.
- [ ] Run the complete Chromium suite on Windows, review traces/output, and commit.

### Task 10: Final B0.5 retirement and documentation truthfulness

> **RETIRED WORK ITEM (2026-08-24).** The paths and checks in this task describe the completed removal of the temporary diagnostic surface. Retained references are historical task evidence; Tasks 11 and 12 remain pending.

**Files:**
- Delete: `en/ga-b05-diagnostic.html`
- Delete: `tests/analytics/b05-diagnostic.test.mjs`
- Delete: `tests/analytics/b05-routing.test.mjs`
- Modify: `middleware.ts`
- Modify: relevant B0.5/routing specs and plans with historical/retired banners
- Modify: stale full-system and routing lifecycle statuses
- Create: `docs/reports/2026-08-24-pr-35-repository-closure.md`

**Produces:** No temporary diagnostic runtime surface and accurate durable repository/external status.

- [ ] Confirm analytics and Playwright replacement coverage is green before deletion.
- [ ] Add/fold a permanent negative contract requiring diagnostic file/route/probe absence; run RED.
- [ ] Remove the diagnostic page, allowlist exception, and diagnostic-only tests; run GREEN.
- [ ] Mark retained historical documents clearly retired, correct stale approval/implementation statuses, and preserve historical evidence.
- [ ] Create the 24-item closure report and traceability tables without claiming unexecuted gates.
- [ ] Run repository-wide diagnostic searches, review, and commit.

### Task 11: Fresh security scan and complete local verification

**Files:**
- Modify only if validated scan/review findings require scoped fixes
- Update: `docs/reports/2026-08-24-pr-35-repository-closure.md`

**Produces:** Fresh final-state security, Windows, deterministic, test, and requirements evidence.

- [ ] Run a fresh Codex Security standard scan and revalidate consent leakage, workbook identity, formula injection, OAuth, loader, hostname, E2E, scanner, and workflow permissions.
- [ ] Fix any validated merge-blocking finding with a focused RED/GREEN cycle and scoped re-review.
- [ ] Under exact Node 22.23.2 run fresh `npm ci`, both typechecks, all test families, build/check twice, Playwright, dependency audit, secret scan, and all discovered contracts.
- [ ] Run `git diff --check`, `git diff --check main...HEAD`, and confirm the final generation leaves a clean tree.
- [ ] Populate exact exit codes, counts, warnings, Windows evidence, security disposition, rejected findings, and external gates in the closure report.
- [ ] Commit any evidence/report updates.

### Task 12: Independent whole-branch review, push, exact-head CI, and draft PR update

**Files:**
- Modify only for validated review findings or final evidence links
- Update: PR #35 body while keeping it draft

**Produces:** Independently reviewed final diff, pushed `seo-system`, exact-final-SHA CI proof, and the final closure classification.

- [ ] Generate a review package from starting SHA to final candidate and dispatch a fresh whole-branch reviewer against every master requirement.
- [ ] Resolve substantive findings through systematic debugging, TDD, full retest, and scoped re-review.
- [ ] Re-run the complete final verification commands immediately before the final commit/push claim.
- [ ] Push reviewed commits to `origin/seo-system`; do not force-push.
- [ ] Verify PR #35 remains open/draft and points `seo-system` to `main`.
- [ ] Wait for and inspect fresh exact-head Site Analytics, SEO Data Hub, security, browser, and other required runs.
- [ ] If exact-head CI is green, update the draft PR body and durable report with exact SHA/run links and the approved status taxonomy.
- [ ] Confirm no merge, ready transition, deployment, or production mutation occurred; return the final 24-part closure report.
