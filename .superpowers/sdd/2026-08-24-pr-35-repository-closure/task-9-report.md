# Task 9 report: real network-isolated Playwright E2E

## Status

IMPLEMENTED_VERIFIED_AND_COMMITTED

The repository now has a dedicated real-browser Chromium suite with exactly 15 master scenarios in three E2E specs. The suite renders the real EN/EL static pages through a deterministic loopback Node server, simulates the exact `www.evochia.gr` hostname through Chromium DNS mapping, inspects the real browser `dataLayer`, and prevents every browser transport from reaching Google/GTM, Formspree, or any other external origin.

## Commits

- Implementation commit: `039493a`
- Implementation subject: `test(e2e): isolate consent browser coverage`
- Report commit: recorded in the Task 9 handoff because this report cannot truthfully contain its own Git hash
- Branch: `seo-system`
- Push, PR mutation, deployment, and workflow trigger: not performed

## Files and workflow preservation

Created:

- `playwright.config.mjs`
- `tests/e2e/server.mjs`
- `tests/e2e/fixtures/network.mjs`
- `tests/e2e/smoke.spec.mjs`
- `tests/e2e/consent-measurement.spec.mjs`
- `tests/e2e/analytics-events.spec.mjs`

The Task 7 `.github/workflows/browser-e2e-validation.yml` was intentionally left unchanged. It already uses exact Node `22.23.2`, installs dependencies with `npm ci --ignore-scripts`, installs Chromium, and runs `npm run test:e2e`. The existing Task 7 executable workflow contract remains green.

## Playwright and server architecture

- Discovery is rooted at `tests/e2e` and accepts only `**/*.spec.mjs`; Node unit tests elsewhere in `tests/` are not collected.
- Chromium is the only project. Service workers are blocked, traces are retained on failure, and screenshots are captured only on failure.
- Chromium receives `MAP www.evochia.gr 127.0.0.1` plus `--no-proxy-server`. The page URL is `http://www.evochia.gr:4173/...`, so `window.location.hostname` is exactly `www.evochia.gr` while all document and asset bytes come from loopback.
- `--disable-blink-features=AutomationControlled` is required because CookieConsent 3.1.0 intentionally treats `navigator.webdriver === true` as a bot and otherwise exits before generating its banner. This changes only the test browser signal; no production consent or host gate was weakened.
- The server binds only `127.0.0.1:4173`, maps clean `/en/`, `/el/`, and `/{locale}/{slug}/` routes to repository HTML, serves repository assets with explicit content types and `Cache-Control: no-store`, rejects path traversal, supports only GET/HEAD, and exposes `/__health`.
- Playwright starts the server with its own `process.execPath`; `/__health` reports `v22.23.2`, and scenario 01 enforces that exact runtime.
- `reuseExistingServer: false` prevents a stale or unrelated process from satisfying the run.

## Exact 15-scenario inventory

`tests/e2e/smoke.spec.mjs` — 4 tests:

1. Critical English home route renders the real title, locale, heading, and exact Node health.
2. Critical Greek home route renders the real title, locale, and heading.
3. EN-to-EL language switching plus Greek primary navigation preserves clean localized routes.
4. The real consent banner rejects analytics, persists necessary-only consent, and leaves GTM absent.

`tests/e2e/consent-measurement.spec.mjs` — 5 tests:

5. Simulated production emits no Google request before consent and retains the four-signal denied default in `dataLayer`.
6. Accepted analytics on exact `www.evochia.gr` attempts exactly one fixed `GTM-578JXRXS` request, fulfilled locally, after the granted update.
7. Accepted analytics on loopback preview attempts zero Google/GTM requests and inserts no script.
8. Repeated accepted CookieConsent commands leave one GTM script, one request, and one intercepted execution.
9. A valid stored analytics consent cookie restores measurement exactly once without showing the banner.

`tests/e2e/analytics-events.spec.mjs` — 6 tests:

10. `contact_click` is absent before consent, present once after consent, routes to `G-2R3S78PTDL`, and excludes link text/URL PII.
11. `quote_form_start` does not latch on a dropped pre-consent interaction, retries after consent, and dispatches once across repeated focus/input events.
12. A valid form submit dispatches one `form_submit_attempt` with the fixed destination and sanitized dimensions.
13. A locally mocked Formspree 200 response renders success and dispatches exactly one `generate_lead`, no error, and no submitted name/email/location in any `dataLayer` event.
14. A locally mocked Formspree 500 response renders the Greek error state and dispatches one `form_submit_error`, no lead.
15. GTM and Formspree attempts are locally intercepted and counted, an otherwise unknown `example.invalid` probe aborts with `TypeError`, and zero external requests escape.

Discovery proof: `15 tests in 3 files`, all under the sole `[chromium]` project.

## Network-isolation proof

The automatic `network` fixture depends on the Playwright browser context and installs one catch-all `context.route('**/*')` before each test body can navigate.

- Only the two exact local origins continue: `http://127.0.0.1:4173` and host-mapped `http://www.evochia.gr:4173`.
- Google-related suffixes are classified before any continuation. Every Google attempt is counted. The exact GTM script is fulfilled with inert local JavaScript; other Google requests are aborted with `blockedbyclient`.
- Every Formspree request is counted and fulfilled from per-test local JSON/status configuration. The fixture defaults to 503 unless a test explicitly selects a mock response. Request records deliberately exclude POST bodies.
- Every other external HTTP(S) request is recorded and aborted. Fixture teardown fails on any such request unless a test pre-registered the exact URL as the intentional scenario-15 abort probe.
- A `requestfinished` listener tracks any external request that was not first marked by the catch-all interception route. Teardown requires this escaped-request list to remain exactly empty in every test.
- Scenario 15 proves both provider branches and the fail-closed branch: one locally executed GTM fulfillment, one locally fulfilled Formspree 202, one expected unknown-origin abort, and zero escaped external requests.
- Service workers are blocked at Playwright context configuration, so no worker can bypass the page/context route policy.

No browser request was continued to Google, GTM, Formspree, production Evochia, or the isolation-probe origin. No real lead was created and no real analytics endpoint was contacted.

## RED/GREEN evidence

### Discovery RED → GREEN

Initial command:

`npm run test:e2e -- --list`

- RED exit/result: exit `1`; the default Playwright search evaluated repository Node test files, listed zero Playwright tests, and ended with `Error: No tests found`.
- GREEN result after dedicated config/spec creation: exit `0`; first `1 test in 1 file`, then final `15 tests in 3 files`, exclusively `[chromium]` E2E specs.

### Real banner RED → GREEN

Command:

`npx -y node@22.23.2 node_modules/@playwright/test/cli.js test tests/e2e/smoke.spec.mjs`

- First browser run was blocked only by the missing Playwright Chromium binary. Authorized repository setup `npx playwright install chromium` downloaded Chromium/headless shell build 1234 successfully.
- Behavioral RED: 4 tests, 2 passed and 2 failed because no CookieConsent dialog existed.
- Root-cause capture showed `window.__EVOCHIA_COOKIECONSENT_BOOTED__ === true`, `CookieConsent` present, `#cc-main` absent, and `navigator.webdriver === true`.
- A one-variable launch experiment with `--disable-blink-features=AutomationControlled` produced `navigator.webdriver === false`, `#cc-main` present, and title `We use cookies`.
- GREEN after the harness change and URL-decoding the real persisted cookie: focused scenario 04 passed; the final smoke file passes all four scenarios.

### Event and fail-closed fixture RED → GREEN

Command:

`npx -y node@22.23.2 node_modules/@playwright/test/cli.js test tests/e2e/analytics-events.spec.mjs`

- RED result: 6 tests, 3 passed and 3 failed.
- Expected gaps exposed: the contact locator was not uniquely scoped to the main content, the accept-button helper did not yet include the Greek label, and the exact expected-block probe API did not exist.
- Minimal corrections scoped the real contact link, made the real localized button selector bilingual, and added a pre-registered exact probe that still aborts but does not make the self-test fail teardown.
- Focused GREEN: contact and Greek failure scenarios `2 passed`; isolation scenario `1 passed`.
- Final file result: all 6 pass.

### Exact Node server RED → GREEN

Focused scenario 01 first asserted `/__health` equals `{ nodeVersion: 'v22.23.2', status: 'ok' }`.

- RED: health returned only `{ status: 'ok' }`.
- Minimal implementation bound the web server to Playwright's `process.execPath` and reported `process.version`.
- GREEN: scenario 01 passed under Node `22.23.2`.

The five Task 8 consent/host browser characterizations passed on their first focused run because the Task 8 production behavior already existed; this Task added the previously missing browser boundary and interception proof rather than changing that production implementation.

## Final fresh verification

All final commands ran on Windows from the repository root.

1. Discovery:

   `npm run test:e2e -- --list`

   Exit `0`; exactly `15 tests in 3 files`; only `[chromium]` and only `tests/e2e/*.spec.mjs`.

2. Required npm script under exact Node:

   `npx -y node@22.23.2 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run test:e2e`

   Exit `0`; `15 passed`, `0 failed`, complete in 16.7 seconds. Scenario 01 also proved the server runtime was `v22.23.2`.

3. Complete analytics regression suite under exact Node:

   `npx -y node@22.23.2 --test tests/analytics/*.test.mjs`

   Exit `0`; `146 passed`, `0 failed` including hostname subtests.

4. Existing top-level SEO and Task 7 workflow contracts under exact Node:

   `npx -y node@22.23.2 --test tests/seo/*.test.mjs`

   Exit `0`; `20 passed`, `0 failed`. The dedicated immutable Chromium workflow contract passed.

5. TypeScript under exact Node:

   `npx -y node@22.23.2 node_modules/typescript/bin/tsc --noEmit`

   Exit `0`; no diagnostics.

6. Staged review:

   `git diff --cached --check`

   Exit `0`; implementation scope was exactly the six created Task 9 files, 680 inserted lines. Git emitted only expected LF-to-CRLF working-copy notices.

## Concerns and runtime boundary

- This proves repository browser behavior with locally intercepted transports. It does not validate the deployed site, TLS/CDN behavior, live GTM container, GA4 collection/DebugView, Formspree delivery, or GA4 `generate_lead` acceptance. Those remain `POST_DEPLOY_RUNTIME_VALIDATION_PENDING` or `OWNER_AUTHORIZATION_REQUIRED`.
- Exact-host logic is exercised through `http://www.evochia.gr:4173` mapped to loopback. That proves `window.location.hostname` and client-side allowlist behavior but intentionally does not test production HTTPS or redirects.
- CookieConsent's bot guard requires the test-only AutomationControlled launch setting to render the real UI. Production code and bot handling are unchanged.
- The server intentionally fails startup if deterministic port 4173 is occupied; `reuseExistingServer: false` avoids false evidence from stale processes.
- The local machine default `node` was v24.16.0, so final execution hosted npm/Playwright with the cached exact Node 22.23.2 package. CI already selects 22.23.2 through the preserved Task 7 workflow.
- Chromium installation was the only external setup download. Browser test execution contacted no Google, GTM, Formspree, production Evochia, or arbitrary external endpoint.
