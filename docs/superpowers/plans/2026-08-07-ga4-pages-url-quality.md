# GA4 Pages and URL Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GA4 page-performance and URL-quality report bundles at stable grains, with deterministic title/classification enrichment and DST-safe property-timezone date selection.

**Architecture:** Keep `Ga4Client.ts` generic. Extend verified configuration with `ga4PropertyTimeZone` and `productionHostname`; keep page metrics at `date + hostName + pagePath`; collect page title through a metadata-only report; collect raw URL variants separately and classify anomalies locally. The importer remains read-only and returns bundles only; Sheet writes/deployment remain outside this batch.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Apps Script source, GA4 Data API v1beta, JSON Schema, GitHub Actions.

## Global Constraints

- Work only on existing branch `seo-system` and draft PR #35.
- No merge, ready-for-review, auto-merge, production deployment, Google authorization, Google Sheet production import, or GA4/GTM/GSC configuration write.
- No new runtime dependency.
- `GA4 Pages` unique key is `date + hostName + pagePath`.
- `pageTitle` is metadata only and never changes primary metrics grain.
- `GA4 URL Quality` unique key is `date + hostName + pagePathPlusQueryString` and retains only classified rows.
- GA4 availability uses verified named IANA `ga4PropertyTimeZone`, default delay 2 days, no UTC/fixed-offset fallback.
- Raw `pagePath` is never rewritten; trailing slash normalization is classification-only.
- Sparse/thresholded rows remain missing/null; do not synthesize zeros.
- Use injected transports/pure helpers in tests; no live Google calls.

---

### Task 1: Verified GA4 timezone and production-host configuration

**Files:**
- Modify: `seo/apps-script/src/Config.ts`
- Modify: `seo/config/google-resources.example.json`
- Modify: `seo/schemas/google-resources.schema.json`
- Modify: `tests/seo/apps-script/config.test.ts`
- Modify: `tests/seo/google-resources.test.mjs`
- Modify: `seo/apps-script/src/Ga4Importer.ts`
- Test: `tests/seo/apps-script/ga4-importer.test.ts`

**Interfaces:**
- Produces `SeoConfig.ga4PropertyTimeZone: string` and `SeoConfig.productionHostname: string`.
- Produces `getAvailableGa4Date(now: Date, propertyTimeZone: string, delayDays?: number): string`.
- `runGa4Reports` consumes both verified values from its range/config input before collection.

- [ ] **Step 1: Add failing config/schema/date tests**

Add fixtures containing:

```ts
ga4PropertyTimeZone: 'Europe/Athens',
productionHostname: 'www.evochia.gr',
```

Add assertions that verified config rejects `UNVERIFIED`, invalid IANA timezones, and hostnames containing scheme/path/port/trailing dot. Add date assertions:

```ts
assert.equal(
  getAvailableGa4Date(new Date('2026-08-06T21:30:00Z'), 'Europe/Athens'),
  '2026-08-05',
);
assert.equal(
  getAvailableGa4Date(new Date('2026-11-02T21:30:00Z'), 'Europe/Athens', 0),
  '2026-11-02',
);
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run through CI-equivalent command:

```bash
npm run seo:test:apps-script
npm run test:unit
```

Expected: failures only because the new config keys and named-timezone signature are not implemented.

- [ ] **Step 3: Implement fail-closed configuration and timezone calendar**

In `Config.ts` add both keys to the interface and verified resource validation. Validate timezone by constructing:

```ts
new Intl.DateTimeFormat('en-CA', { timeZone: value });
```

inside `try/catch`. Validate hostname with a strict lowercase-hostname shape and explicit rejection of `://`, `/`, `:port`, and trailing dot.

In `Ga4Importer.ts` replace UTC subtraction with timezone calendar extraction using `Intl.DateTimeFormat(...).formatToParts()` and calendar-day subtraction via `Date.UTC(...)`.

- [ ] **Step 4: Run Apps Script/root tests and typecheck**

```bash
npm run seo:test:apps-script
npm run test:unit
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/Config.ts seo/apps-script/src/Ga4Importer.ts seo/config/google-resources.example.json seo/schemas/google-resources.schema.json tests/seo/apps-script/config.test.ts tests/seo/apps-script/ga4-importer.test.ts tests/seo/google-resources.test.mjs
git commit -m "feat(seo): verify GA4 property calendar settings"
```

---

### Task 2: Pure page, title, and URL-quality classification helpers

**Files:**
- Modify: `seo/apps-script/src/Ga4Importer.ts`
- Modify: `tests/seo/apps-script/ga4-importer.test.ts`

**Interfaces:**
- Produces `classifyPagePath(pagePath: string): { language: string; service: string }`.
- Produces `selectPageTitles(rows: Ga4Row[]): Map<string, string | null>` keyed by `date + hostName + pagePath`.
- Produces `classifyUrlQuality(hostName: string, pagePathPlusQueryString: string, productionHostname: string): { normalizedPagePath: string; anomalyTypes: string[] }`.

- [ ] **Step 1: Add failing pure-helper tests**

Cover:

```ts
classifyPagePath('/en/private-chef/') -> { language: 'en', service: 'private_chef' }
classifyPagePath('/el/private-chef') -> { language: 'el', service: 'private_chef' }
classifyPagePath('/unknown') -> { language: 'unknown', service: 'other' }
```

Assert the raw path remains unchanged externally.

Title-selection fixtures must prove highest `screenPageViews` wins, lexical tie-break applies, empty titles are ignored, and missing title metadata returns `null`.

URL-quality fixtures must prove fixed anomaly ordering for combinations of `tracking_query_params`, `unexpected_query_params`, `double_slash`, `legacy_html`, `preview_host`, and `non_production_host`.

- [ ] **Step 2: Run Apps Script tests and confirm RED**

```bash
npm run seo:test:apps-script
```

Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement minimal pure helpers**

Use only string/URL parsing available in V8/Node. Tracking allowlist:

```text
utm_*, gclid, gbraid, wbraid, fbclid, msclkid
```

Emit anomaly types in the exact fixed order above. Detect `*.vercel.app` as preview. Do not classify a preview hostname again as `non_production_host`.

For service matching, strip leading `/en` or `/el` only for comparison and append a trailing slash only to the temporary comparison value.

- [ ] **Step 4: Run Apps Script tests and typecheck**

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add seo/apps-script/src/Ga4Importer.ts tests/seo/apps-script/ga4-importer.test.ts
git commit -m "feat(seo): classify GA4 page and URL quality data"
```

---

### Task 3: Add page metrics, title metadata, and URL-quality report bundle

**Files:**
- Modify: `seo/apps-script/src/Ga4Importer.ts`
- Modify: `tests/seo/apps-script/ga4-importer.test.ts`

**Interfaces:**
- Extend `Ga4ReportRange` with `ga4PropertyTimeZone` and `productionHostname`.
- Extend `Ga4ImportBundle` with `pages: Ga4Row[]` and `urlQuality: Ga4Row[]`.
- Existing `daily`, `acquisition`, `landingPages`, and `events` outputs remain unchanged.

- [ ] **Step 1: Add failing report-contract tests**

Use an injected transport that records request dimensions/metrics and returns distinct fixtures for all seven calls. Assert new calls are exactly:

```text
Page metrics dimensions: date, hostName, pagePath
Page metrics metrics: screenPageViews, activeUsers, sessions, engagedSessions, userEngagementDuration, keyEvents

Title metadata dimensions: date, hostName, pagePath, pageTitle
Title metadata metrics: screenPageViews

URL quality dimensions: date, hostName, pagePathPlusQueryString
URL quality metrics: screenPageViews, activeUsers, sessions
```

Assert page rows use primary metrics untouched, are enriched with selected title/language/service, and carry `dataAsOf`/`collectedAt`.

Assert URL-quality output drops normal unclassified rows and retains classified rows with `normalizedPagePath`, deterministic `anomalyTypes`, and title lookup using the normalized path key.

- [ ] **Step 2: Add sparse/empty regression test**

Return empty rows for title metadata and URL quality while returning one page-metrics row. Assert page metrics survive with `pageTitle: null`; no synthetic URL-quality rows appear.

- [ ] **Step 3: Run Apps Script tests and confirm RED**

```bash
npm run seo:test:apps-script
```

Expected: FAIL because the bundle has only four report families.

- [ ] **Step 4: Implement the three new API calls and enrichment**

Build the primary page rows only from the page-metrics response. Build a metadata map from the title report. Filter URL-quality rows through `classifyUrlQuality(...)`; enrich retained rows with title from `date + hostName + normalizedPagePath`.

Do not sum title variants or URL-query variants.

- [ ] **Step 5: Run full Apps Script suite and typecheck**

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS, including existing pagination/missing-metric/report-family tests.

- [ ] **Step 6: Commit**

```bash
git add seo/apps-script/src/Ga4Importer.ts tests/seo/apps-script/ga4-importer.test.ts
git commit -m "feat(seo): add GA4 page and URL quality reports"
```

---

### Task 4: Workbook contract, operator documentation, and repository gate

**Files:**
- Modify: `seo/apps-script/src/Setup.ts`
- Modify: `tests/seo/apps-script/config.test.ts`
- Modify: `seo/apps-script/README.md`
- Verify: draft PR #35 and GitHub Actions

**Interfaces:**
- `REQUIRED_SHEET_NAMES` adds `GA4 Pages` and `GA4 URL Quality`.
- Documentation records exact grains, title metadata semantics, property timezone, anomaly classes, and no-production-write gate.

- [ ] **Step 1: Add workbook-name assertions**

Assert `REQUIRED_SHEET_NAMES` contains both new names and `ensureWorkbookSheets()` remains idempotent.

- [ ] **Step 2: Implement workbook contract**

Add:

```ts
'GA4 Pages',
'GA4 URL Quality',
```

next to existing GA4 tabs. Do not call `setupWorkbook()` against a live Sheet.

- [ ] **Step 3: Update README**

Document:

```text
GA4 Pages key: date + hostName + pagePath
GA4 URL Quality key: date + hostName + pagePathPlusQueryString
GA4 property calendar: verified ga4PropertyTimeZone, default 2-day delay
pageTitle: metadata lookup only; never used to aggregate page metrics
URL-quality anomaly classes: tracking_query_params, unexpected_query_params, double_slash, legacy_html, preview_host, non_production_host
```

State that code remains undeployed/read-only and production authorization/import needs explicit owner approval.

- [ ] **Step 4: Run full repository validation**

```bash
npm run test:unit
npm run seo:test:apps-script
npm run typecheck
npm run test:analytics
```

Expected: all exit 0. In this environment use the corresponding GitHub Actions runs as the execution evidence; do not claim local execution.

- [ ] **Step 5: Verify PR governance and CI**

Confirm PR #35 is open, draft, `seo-system` -> `main`; `SEO Data Hub Validation` and `Site Analytics Validation` are success on final head; Vercel is informational only. Confirm no Google/production writes occurred.

- [ ] **Step 6: Commit documentation/workbook contract**

```bash
git add seo/apps-script/src/Setup.ts tests/seo/apps-script/config.test.ts seo/apps-script/README.md
git commit -m "docs(seo): document GA4 page reporting contract"
```

- [ ] **Step 7: Handoff checkpoint**

Report final head SHA, CI run IDs/conclusions, changed files, implemented grains, and remaining next automated batch. Do not merge or deploy.
