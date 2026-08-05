# Evochia Full SEO System — Free-First, Human-Governed

**Status:** Approved design specification  
**Date:** 2026-08-05  
**Repository:** `heraklist/evochia_site`  
**Production branch:** `main`  
**Permanent SEO branch:** `seo-system`  
**Production site:** `https://www.evochia.gr/`  
**Hosting:** Vercel  
**Primary Google account:** `heraklis@evochia.gr`

## 1. Purpose

Build a complete SEO observability, analysis, validation and remediation system for Evochia that initially operates at zero recurring cost by using owned data, free APIs and free cloud tiers.

The system must combine:

- Google Search Console data;
- Google Analytics 4 data;
- production crawling;
- repository-level SEO validation;
- performance and Core Web Vitals monitoring;
- GitHub and Vercel deployment correlation;
- findings management;
- deterministic draft fixes;
- human approval before merge and production deployment.

The objective is not merely reporting. The system must identify the highest-impact SEO constraints and opportunities, provide reproducible evidence, and safely prepare code corrections without taking production authority away from the owner.

## 2. Governing principles

1. **Free-first:** The first production version must use Google APIs, Google Sheets, Apps Script, GitHub Actions, Vercel previews, Playwright, Lighthouse/PageSpeed and open-source tooling. Paid SEO platforms are not required for v1.
2. **Read before write:** Data collection and analysis must be proven reliable before automatic code changes are enabled.
3. **Evidence before action:** No automated patch may be proposed without reproducible evidence and a defined validation method.
4. **Human-governed production:** The system must never merge to `main`, enable auto-merge or trigger a production deployment on its own.
5. **Single permanent branch:** All SEO-system code, configuration, tests, documentation and automated fixes must be committed only to `seo-system`.
6. **Small serial batches:** Only one to three related findings may be included in a review batch. A new batch must not begin while the current batch awaits owner review.
7. **No hidden assumptions:** Stale, missing or failed data sources must be reported as unavailable rather than inferred.
8. **Business relevance:** Priority must reflect traffic, commercial intent, affected pages, confidence and effort—not technical severity alone.

## 3. Current system context

The site is a static bilingual website implemented in plain HTML5, CSS3 and vanilla JavaScript. It is deployed to Vercel from GitHub and includes:

- English and Greek page trees;
- `middleware.ts` for locale-sensitive routing and 404 behaviour;
- `vercel.json` for redirects, headers and canonical URL behaviour;
- `sitemap.xml` and `robots.txt`;
- Playwright end-to-end tests;
- no application framework or required build pipeline.

The canonical URL policy is:

- HTTPS;
- `www.evochia.gr`;
- clean URLs;
- trailing slash enabled;
- deterministic redirects from legacy and slashless variants.

The SEO validator must treat this policy as normative.

## 4. Authority and branch policy

### 4.1 Permanent branches

- `main`: production authority only.
- `seo-system`: the single permanent working branch for all SEO-system changes.

### 4.2 Pull request policy

There must be one long-lived draft pull request:

```text
seo-system -> main
```

The draft PR is the only path by which SEO-system changes may reach production.

### 4.3 Allowed automated actions

Automation may:

- commit to `seo-system`;
- update the existing draft PR;
- run repository and preview validation;
- write findings and evidence;
- create or update non-code proposals and issues where appropriate.

Automation must not:

- create additional working branches;
- write directly to `main`;
- merge a pull request;
- enable auto-merge;
- manually deploy production;
- modify Vercel domains or environment variables;
- write to Search Console or GA4 configuration;
- request indexing or URL removal;
- modify pricing, legal copy, branding or commercial strategy without explicit approval.

### 4.4 Commit isolation

Each finding must remain independently reviewable through focused commits containing its `findingId`, for example:

```text
fix(seo): normalize double-slash links [SEO-0012]
test(seo): add canonical regression coverage [SEO-0012]
docs(seo): record verification evidence [SEO-0012]
```

Selective reversion must remain possible before merge.

### 4.5 Branch lifecycle

After an approved batch is merged:

1. production deployment completes;
2. post-deploy verification runs;
3. findings are updated;
4. `seo-system` is synchronized with `main`;
5. the next batch may begin.

## 5. System architecture

The system consists of five bounded layers.

### 5.1 Data collectors

Read-only collectors acquire data from:

- Google Search Console;
- Google Analytics 4;
- PageSpeed Insights and Lighthouse;
- the live production site;
- sitemap, robots, headers and redirects;
- `heraklist/evochia_site`;
- Vercel deployments and runtime observations;
- free public off-page and competitor sources.

Collectors must not modify source systems.

### 5.2 SEO analysis engine

The analysis layer correlates:

- query to landing page to engagement to key event;
- source code to deployed HTML;
- sitemap URL to canonical to redirect to indexing state;
- commit and PR to Vercel deployment;
- deployment to crawl and performance changes;
- private-chef and catering clusters to commercial outcomes.

### 5.3 Findings ledger

Every finding must have:

- `findingId`;
- category;
- severity;
- confidence;
- affected URLs and files;
- source and evidence;
- first-seen and last-seen timestamps;
- probable SEO and business impact;
- proposed action;
- verification method;
- lifecycle state.

Allowed lifecycle states:

```text
new
confirmed
proposed
draft-pr
deployed
seo-resolved
observed-resolved
accepted-risk
```

### 5.4 Fix proposal engine

The proposal engine determines whether a finding should produce:

- a deterministic patch;
- a human-review issue;
- a content proposal;
- monitoring only.

### 5.5 Draft PR agent

The draft PR agent may update `seo-system` only after all allowlist conditions pass. It must add the change, tests, evidence, risk notes and rollback instructions to the existing draft PR.

## 6. Data sources and collection scope

### 6.1 Google Search Console

Collect daily, with pagination and historical persistence:

- date;
- query;
- page;
- country;
- device;
- search appearance;
- clicks;
- impressions;
- CTR;
- average position.

Analyse:

- query-to-page mapping;
- cannibalization;
- branded versus non-branded demand;
- Greek versus English performance;
- new and lost queries;
- high-impression/low-CTR opportunities;
- positions 4–20;
- private-chef and catering clusters;
- indexing, user canonical and Google-selected canonical;
- double-slash and alternate URL variants.

### 6.2 Google Analytics 4

Use GA4 property `528945896` and account reference `388030118`.

Collect daily:

- users and active users;
- new users;
- sessions and engaged sessions;
- engagement rate;
- average engagement or session duration;
- landing pages;
- source/medium and channel group;
- device category;
- country and city where useful;
- events;
- key events.

Audit and track business actions including:

- contact-form submission;
- WhatsApp click;
- telephone click;
- email click;
- request-offer actions;
- private-chef and catering conversion paths.

Key events must not be used as authoritative business KPIs until duplicate and false event collection has been checked.

### 6.3 Production crawl

The crawler must inspect all discoverable production URLs for:

- HTTP status;
- redirect chains and loops;
- canonical tags;
- hreflang values and reciprocity;
- robots directives;
- title and meta description;
- H1–H6 structure;
- duplicate or missing metadata;
- structured data;
- internal and external links;
- broken links;
- orphan pages;
- image alt text, dimensions and weight;
- sitemap membership;
- robots consistency;
- slash, double-slash, HTTP/HTTPS and `www`/non-`www` variants;
- response headers.

Bilingual parity must be validated between matching English and Greek pages.

### 6.4 Repository validation

On every PR and every change to `seo-system`, validate:

- HTML correctness;
- canonical policy;
- hreflang reciprocity;
- unique titles and H1s;
- metadata completeness;
- JSON-LD syntax;
- sitemap consistency;
- robots/indexability consistency;
- broken internal links;
- forbidden URL patterns and double slashes;
- tracking scripts and consent-sensitive loading;
- Playwright critical-page journeys.

### 6.5 Performance and Core Web Vitals

Store and distinguish:

- laboratory data;
- field data when available;
- mobile and desktop results;
- LCP, INP, CLS, FCP and TTFB;
- render-blocking resources;
- image, font, CSS and JavaScript overhead.

A single Lighthouse run is not sufficient evidence. Performance regressions must be repeatable or exceed a defined threshold across multiple runs.

### 6.6 GitHub and Vercel correlation

Associate:

- commit SHA;
- PR number;
- changed files;
- deployment ID and URL;
- deployment timestamp;
- preview crawl result;
- production crawl before and after;
- performance before and after;
- later GSC and GA4 changes.

### 6.7 Free-first off-page and competitor monitoring

Initially use:

- Search Console link data where available;
- Bing Webmaster data if connected;
- public referring-page checks;
- public brand-mention searches;
- sampled competitor SERPs;
- content, schema and metadata comparisons.

The system must not claim complete backlink coverage without a dedicated paid backlink index.

## 7. Storage model

Use a hybrid model.

### 7.1 Google Sheet

Store:

- GSC and GA4 business data;
- daily and weekly summaries;
- priority-page metrics;
- indexing log;
- issue and run summaries;
- data used by the Monday SEO report.

### 7.2 GitHub artifacts

Store per-run machine-readable evidence:

- crawl JSON and CSV;
- validation reports;
- Lighthouse outputs;
- comparison summaries;
- selected screenshots where needed.

Artifact retention must be bounded to preserve free-tier capacity.

### 7.3 Repository

Store:

- schemas;
- rules and allowlists;
- scripts;
- workflows;
- tests;
- specifications;
- durable evidence summaries.

Secrets, OAuth tokens and service-account JSON keys must not be committed.

### 7.4 Future database

Supabase or another database may be considered only after the Google Sheet demonstrably becomes unsuitable because of volume, query complexity or retention requirements.

## 8. Execution schedule

### Daily

- GSC import, normally with a three-day delay;
- GA4 import, normally with a two-day delay;
- production availability checks;
- priority URL crawl;
- sitemap and critical canonical checks.

### Every pull request

- repository SEO validation;
- HTML/schema/link checks;
- Playwright smoke tests;
- Vercel preview validation;
- no-regression comparison.

### After every production deployment

- production availability;
- priority-page crawl;
- canonical and hreflang verification;
- critical journeys;
- deployment-to-finding reconciliation.

### Weekly

- full production crawl;
- PageSpeed/Lighthouse on priority pages;
- URL Inspection and indexing review;
- consolidated findings analysis;
- existing Evochia SEO Weekly report every Monday at 09:00 Europe/Athens.

### Monthly

- content gaps;
- cannibalization review;
- competitor sampling;
- backlink and brand-mention review;
- strategic reprioritization.

## 9. Finding severity and confidence

### Severity

**Critical**

- production unavailable;
- major site section blocked from indexing;
- broad canonical or redirect failure;
- complete GSC/GA4 pipeline failure.

**High**

- indexable duplicate URLs;
- incorrect hreflang on priority pages;
- broken schema or metadata on commercial pages;
- failed conversion tracking;
- major repeatable performance regression.

**Medium**

- high-impression/low-CTR issue;
- weak internal linking;
- missing descriptions or alt text;
- orphan or low-discovery pages;
- limited title or H1 duplication.

**Low / Opportunity**

- minor metadata improvements;
- FAQ or content gaps;
- queries close to page one;
- small performance opportunities.

### Confidence

- **High:** deterministic evidence or confirmation from at least two independent sources.
- **Medium:** clear evidence from one reliable source.
- **Low:** hypothesis, strategic opportunity or evidence requiring judgement.

## 10. Prioritization

Priority is calculated conceptually as:

```text
Impact × Confidence × Affected Traffic × Commercial Relevance ÷ Effort
```

Default order:

1. indexing and canonical failures;
2. analytics and conversion integrity;
3. private-chef and catering pages with real impressions;
4. queries in positions 4–20;
5. CTR opportunities;
6. performance regressions;
7. content expansion;
8. off-page opportunities.

## 11. Automatic draft PR eligibility

A finding may generate an automated patch only when all conditions are true:

- confidence is High;
- the fix is deterministic;
- scope is limited and reversible;
- automated validation exists;
- no secret access is required;
- the fix does not alter commercial copy, pricing, brand, legal text or strategic positioning;
- the current review batch contains no more than three related findings.

Allowlisted examples:

- double-slash internal links;
- canonical mismatch;
- hreflang reciprocity error;
- broken internal link;
- sitemap inconsistency;
- deterministic technical metadata omission;
- JSON-LD syntax failure;
- missing image dimensions;
- safe redirect normalization;
- robots or indexability regression.

Non-allowlisted examples that require proposal or issue first:

- page rewrites;
- keyword strategy;
- commercially significant title changes;
- new landing pages;
- new FAQ content;
- conversion funnel changes;
- analytics event-definition changes;
- competitor-driven content decisions.

## 12. Draft PR contract

Every automated update to the draft PR must include:

### Problem

- finding and detection time;
- affected URLs and files.

### Evidence

- crawler, repository, production or Google data evidence.

### Change

- exact patch scope;
- explicit non-goals.

### Validation

- repository checks;
- schema and HTML checks;
- Playwright tests;
- preview deployment crawl;
- before/after evidence.

### Risk

- likely side effects;
- confidence;
- rollback steps.

### Approval gate

- explicit statement that owner approval is required;
- no auto-merge;
- no autonomous production deployment.

## 13. CI gates

A batch must remain draft and not be recommended for merge when any required gate fails:

- HTML validation;
- canonical and hreflang policy;
- sitemap consistency;
- broken-link scan;
- structured-data syntax;
- Playwright smoke tests;
- preview availability;
- priority-page crawl;
- deterministic no-regression checks.

PageSpeed may block only after a repeatable regression beyond the configured threshold.

## 14. Failure handling

- Deterministic repository failures block the batch.
- Production indexing or canonical failures create High or Critical findings.
- Network or PageSpeed failures are retried and cannot create an automatic patch from one observation.
- GSC/GA4 failures are recorded as pipeline incidents; stale data must not be presented as current.
- Ambiguous remediation creates no automated code change.
- Preview validation failure keeps the PR in draft.
- Duplicate findings reuse the same identity.
- Reappearing findings reopen under the same identity.
- Flaky rules are quarantined from automated patch generation.

## 15. Rollout phases

### Phase 0 — Baseline

Capture current commit, Vercel production deployment, crawl, canonical/hreflang state, sitemap, redirects, priority PageSpeed, GSC/GA4 baseline and known exceptions.

### Phase 1 — SEO Data Hub

Activate read-only GSC and GA4 collection, historical import, weekly summary, indexing log and conversion audit. No issue or PR automation.

### Phase 2 — Repository SEO CI

Add an isolated SEO workflow rather than expanding the existing manual CodeMaestro workflow. Keep validation permissions read-only.

### Phase 3 — Production and performance monitoring

Add daily priority checks, weekly crawl, bounded Lighthouse runs and GitHub artifacts.

### Phase 4 — Findings ledger

Enable deduplication, lifecycle tracking and priority scoring. Findings remain advisory.

### Phase 5 — Automated draft PRs

Grant narrowly scoped `contents: write` and `pull-requests: write` permissions only to the dedicated draft-fix workflow. All writes go to `seo-system`.

### Phase 6 — Preview and post-deploy verification

Validate Vercel preview before owner approval and production after owner merge. A code fix may be `deployed` before GSC evidence permits `seo-resolved`.

## 16. Free-tier safeguards

The first version must not require:

- Ahrefs or Semrush;
- a paid rank tracker;
- a paid crawler;
- Supabase;
- an external server;
- service-account JSON keys;
- paid monitoring.

Control usage through:

- limited Lighthouse URL sets;
- bounded artifact retention;
- scheduled rather than continuous full crawls;
- compact Sheet summaries;
- no persistent screenshots unless evidence requires them.

## 17. v1 completion criteria

Version 1 is complete only when:

- GSC and GA4 import reliably;
- conversion events have been audited;
- baseline production crawl exists;
- repository SEO gates run on PRs;
- weekly production crawling is operational;
- priority pages have performance history;
- findings have stable identity and deduplication;
- at least one deterministic finding can safely update the draft PR on `seo-system`;
- automation cannot merge or deploy production;
- the Monday report uses the consolidated current data;
- branch synchronization after merge has been tested.

## 18. Explicit non-goals for v1

- fully autonomous SEO strategy;
- automatic content writing and publication;
- automatic merge or deployment;
- full backlink intelligence;
- guaranteed rank attribution from individual code changes;
- replacing human review of commercial and editorial decisions.

## 19. Review and amendment

This specification is normative for the first implementation plan. Material changes to authority, branch policy, data ownership, automatic patch eligibility or production control require explicit owner approval and a specification update before implementation.
