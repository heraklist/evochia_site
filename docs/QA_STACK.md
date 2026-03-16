# QA Stack

This repository now includes a repeatable QA stack for technical checks, browser checks, performance audits, field-data checks, markup validation, and baseline security scans.

## Commands

- `npm run preview`: serves the static site locally with clean URLs, redirects, localized 404s, and Vercel-style headers.
- `npm run qa:repo`: runs repo-native assertions plus HTTP/header/redirect integration tests.
- `npm run qa:browser`: runs Playwright against the default local browser matrix.
- `npm run qa:pa11y`: runs Pa11y CI against the local accessibility route set.
- `npm run qa:browser:update`: refreshes the visual baselines used by `tests/playwright/visual.spec.mjs`.
- `npm run qa:browserstack`: runs the BrowserStack SDK against the dedicated real-device Safari smoke config in `playwright.browserstack.config.mjs` using BrowserStack Local.
- `npm run qa:browserstack:public`: runs the same BrowserStack smoke suite against a public URL without BrowserStack Local.
- `npm run qa:browser:install`: downloads the Playwright WebKit binary so Safari-style audits can run.
- `npm run qa:browser:install:all`: downloads Playwright-managed Chromium, Firefox, and WebKit if you want the full bundled matrix.
- `npm run qa:lighthouse:mobile`: runs Lighthouse with mobile settings and writes reports to `.reports/lighthouse/mobile`.
- `npm run qa:lighthouse:desktop`: runs Lighthouse with desktop settings and writes reports to `.reports/lighthouse/desktop`.
- `npm run qa:lhci:local`: runs Lighthouse CI across the key EN landing pages on the local preview target.
- `npm run qa:lhci:live`: runs Lighthouse CI against the live target configured by `LIVE_BASE_URL`.
- `npm run qa:vnu`: runs Nu Html Checker (`vnu-jar`) across the HTML files when Java and `vnu-jar` are installed.
- `npm run qa:seo:rules`: validates meta title/description, canonical, OG tags, robots directives, and sitemap presence.
- `npm run qa:hreflang:local`: validates EN/EL alternate markup directly from the repo.
- `npm run qa:hreflang:live`: validates EN/EL alternate markup from the live site.
- `npm run qa:structured-data:local`: validates JSON-LD presence and expected types directly from the repo.
- `npm run qa:structured-data:live`: validates JSON-LD presence and expected types from the live site.
- `npm run qa:links`: crawls internal page links through the preview server and reports 404s or redirect chains.
- `npm run qa:headers`: checks live security headers such as CSP, HSTS, Referrer-Policy, and Permissions-Policy.
- `npm run qa:crux`: queries CrUX field data for the configured origin and URLs.
- `npm run qa:gsc`: queries Google Search Console and URL Inspection with graceful skip when secrets are missing.
- `npm run qa:pass1`: runs the local-first audit stack and finishes with a consolidated summary.
- `npm run qa:pass2`: runs the live-field audit stack and finishes with a consolidated summary.
- `npm run qa:pagespeed -- https://www.evochia.gr/en/`: calls PageSpeed Insights for a public URL and stores JSON summaries in `.reports/pagespeed`.
- `npm run qa:zap`: runs an OWASP ZAP baseline scan through Docker and writes reports to `.reports/zap`.
- `npm run qa:local`: runs repo checks, browser checks, and both Lighthouse profiles in sequence.

## What each layer covers

### Repo and HTTP checks

- Canonical, hreflang, OG locale, sitemap, privacy/noindex, CSP consistency.
- Redirect behavior, localized 404 behavior, security headers, and cache headers.

### Playwright

- Default local matrix: desktop Chromium via your installed Edge plus mobile Chromium emulation.
- Optional Firefox once you set `PLAYWRIGHT_ENABLE_FIREFOX=1` and have the Playwright Firefox browser installed.
- Optional WebKit and mobile Safari emulation once you set `PLAYWRIGHT_ENABLE_WEBKIT=1` and install WebKit.
- Dedicated BrowserStack smoke lane for real iPhone Safari sign-off using the same critical flows.
- Runtime smoke tests for core routes.
- Contact form flow against a mocked Formspree endpoint.
- Axe accessibility scans for high-value routes.
- Visual snapshots for Chromium by default, with optional mobile WebKit coverage.

### Pa11y CI

- WCAG 2.1 AA scan on the local preview target.
- Useful as a second accessibility pass alongside Playwright + axe because it highlights issues with different rule phrasing.

### Lighthouse

- Core landing pages on both mobile and desktop profiles.
- Budget assertions for performance, accessibility, SEO, CLS, console errors, and TBT/LCP warning thresholds.
- Reports are saved locally so you can compare runs.
- When no external target is configured, the script starts the local preview server automatically.

### Lighthouse CI

- Local pass and live pass over the same landing-page set.
- Filesystem report output under `.reports/lhci`.
- Separate from the custom Lighthouse script so you keep both raw lab reports and CI-style assertions.

### Custom Node checks

- `check-seo-rules.mjs`: titles, descriptions, canonicals, OG tags, robots directives, sitemap coverage.
- `check-hreflang.mjs`: EN/EL/x-default consistency locally and on live responses.
- `check-structured-data.mjs`: JSON-LD parseability and expected Schema.org types locally and live.
- `check-links.mjs`: broken internal links and redirect chains against the preview server.
- `check-security-headers.mjs`: live CSP/HSTS/header verification.
- `check-crux.mjs`: field Core Web Vitals from the CrUX API.
- `check-search-console.mjs`: clicks, impressions, and URL inspection summaries from Search Console.
- `summarize-reports.mjs`: executive summary, top priorities, quick wins, and fix plan.

### External / hosted checks

- BrowserStack: `npm run qa:browserstack` runs the smoke suite against a real iPhone Safari session through BrowserStack Local.
- BrowserStack public sign-off: `npm run qa:browserstack:public` targets a public URL such as production, avoids the local tunnel entirely, and uses a dedicated single-session iPhone Safari smoke spec.
- Google Search Console is now scriptable when you provide `GSC_SITE_URL` plus either `GSC_ACCESS_TOKEN` or `GSC_SERVICE_ACCOUNT_JSON`.
- PageSpeed Insights: still scriptable here for public URLs only, with optional retries and API key support if Google rate-limits anonymous requests.
- ZAP baseline: scripted here, but requires Docker Desktop.
- Manual spot-check tools that remain useful: Screaming Frog and Google's Rich Results Test.

## Suggested audit flow

1. `npm install`
2. Copy `.env.example` to `.env` if you want fixed targets. The scripts auto-load `.env`.
3. `npm run qa:pass1`
4. `npm run qa:pass2`
5. For WebKit: `npm run qa:browser:install` then `set PLAYWRIGHT_ENABLE_WEBKIT=1`
6. For full Playwright Firefox/WebKit matrix: `npm run qa:browser:install:all` then set `PLAYWRIGHT_ENABLE_FIREFOX=1` and `PLAYWRIGHT_ENABLE_WEBKIT=1`
7. For real iPhone Safari on local or staging: add BrowserStack credentials, keep `BROWSERSTACK_TEST_BASE_URL` pointed at either the local preview URL or a staging URL, then run `npm run qa:browserstack`
8. For real iPhone Safari on production: set `BROWSERSTACK_PUBLIC_BASE_URL` if needed, then run `npm run qa:browserstack:public`

## Environment variables

Copy `.env.example` to `.env` if you want explicit targets.

- `AUDIT_BASE_URL`: Playwright target. Defaults to the local preview server and still starts the preview automatically if you point it at that same local address.
- `LIGHTHOUSE_BASE_URL`: Lighthouse target. If omitted, Lighthouse starts the local preview server automatically.
- `LIVE_BASE_URL`: live target used by Pass 2 tools such as LHCI live, header checks, CrUX URL defaults, and Search Console inspection defaults.
- `PAGESPEED_URL`: public URL for PageSpeed Insights.
- `PAGESPEED_STRATEGIES`: comma-separated, usually `mobile,desktop`.
- `PAGESPEED_API_KEY`: optional Google API key if you want more reliable PageSpeed quota.
- `PAGESPEED_RETRIES`: retry count for `429` or transient `5xx` responses.
- `CRUX_API_KEY`: API key for the Chrome UX Report API. If omitted, `qa:crux` falls back to `PAGESPEED_API_KEY`.
- `CRUX_ORIGIN`: origin queried through CrUX, usually `https://www.evochia.gr`.
- `CRUX_URLS`: comma-separated public URLs for URL-level CrUX checks.
- `CRUX_FORM_FACTORS`: comma-separated form factors such as `PHONE,DESKTOP`.
- `GSC_SITE_URL`: Search Console property identifier, for example `sc-domain:evochia.gr` or `https://www.evochia.gr/`.
- `GSC_ACCESS_TOKEN`: optional direct OAuth bearer token for Search Console.
- `GSC_SERVICE_ACCOUNT_JSON`: optional service-account JSON string or path to a JSON file. The property must be shared with that service account.
- `GSC_LOOKBACK_DAYS`: analytics lookback window. Defaults to `28`.
- `GSC_INSPECTION_URLS`: comma-separated URLs for URL Inspection API checks.
- `ZAP_TARGET_URL`: production or staging URL for ZAP baseline.
- `PLAYWRIGHT_ENABLE_FIREFOX=1`: enables the Playwright Firefox project after the bundled browser is installed.
- `PLAYWRIGHT_ENABLE_WEBKIT=1`: enables the desktop/mobile WebKit projects after the binary is installed.
- `BROWSERSTACK_*`: placeholders for real-device Safari testing.
- `BROWSERSTACK_PUBLIC_BASE_URL`: public base URL used by `npm run qa:browserstack:public`. Defaults to `https://www.evochia.gr`.
