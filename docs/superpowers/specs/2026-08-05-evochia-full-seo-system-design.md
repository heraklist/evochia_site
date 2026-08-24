# Evochia Full SEO System — Free-First, Human-Governed

**Status:** Revised design specification — pending second review
**Revision:** 2
**Date:** 2026-08-05
**Repository:** `heraklist/evochia_site`
**Repository visibility:** Private
**Production branch:** `main`
**Permanent SEO branch:** `seo-system`
**Production site:** `https://www.evochia.gr/`
**Hosting:** Vercel
**Primary Google account:** `heraklis@evochia.gr`
**Observed GTM container:** `GTM-578JXRXS`

## 1. Purpose

Build a complete SEO observability, analysis, validation and remediation system for Evochia that initially operates at zero recurring cost by using owned data, free APIs and free cloud tiers.

The system must combine:

- Google Search Console data;
- Google Analytics 4 data;
- Google Tag Manager configuration history and integrity signals;
- production crawling;
- repository-level SEO validation;
- performance and Core Web Vitals monitoring;
- GitHub, GTM and Vercel change correlation;
- findings management;
- deterministic draft fixes;
- human approval before merge and production deployment.

The objective is not merely reporting. The system must identify the highest-impact SEO constraints and opportunities, provide reproducible evidence, and safely prepare code corrections without taking production authority away from the owner.

## 2. Governing principles

1. **Free-first:** The first production version must use Google APIs, Google Sheets, Apps Script, Google Drive, GitHub Actions, Vercel previews, Playwright, Lighthouse/PageSpeed and open-source tooling. Paid SEO platforms are not required for v1.
2. **Read before write:** Data collection and analysis must be proven reliable before automatic code changes are enabled.
3. **Evidence before action:** No automated patch may be proposed without reproducible evidence and a defined validation method.
4. **Human-governed production:** Automation must be technically prevented from updating `main`, merging a pull request, enabling auto-merge, promoting a preview, or triggering a production deployment.
5. **Single permanent working branch:** All SEO-system code, configuration, tests, documentation and automated fixes must be committed only to `seo-system`.
6. **One active review batch:** There may be at most one open SEO draft PR at a time, always from `seo-system` to `main`.
7. **Small serial batches:** Only one to three related findings may be included in a review batch. A new batch must not begin while the current batch awaits owner review.
8. **No hidden assumptions:** Stale, missing, unverified or failed data sources must be reported as unavailable rather than inferred.
9. **Least privilege:** Google, GitHub and Vercel access must use the minimum scopes and permissions needed for the current phase.
10. **Business relevance:** Priority must reflect traffic, commercial intent, affected pages, confidence and effort—not technical severity alone.
11. **No routine operational data in production history:** Raw crawls, API responses, screenshots and recurring evidence must not be committed through the production PR path.

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

The repository is private. GitHub Actions usage must therefore be budgeted explicitly rather than treated as unlimited.

The site loads Google Tag Manager container `GTM-578JXRXS`. Analytics tags, triggers, variables and event definitions may therefore change outside GitHub and Vercel. GTM is a first-class configuration source, not an implementation detail.

The following external identifiers are provisional until Phase 0 verification:

- GA4 account reference `388030118`;
- GA4 property `528945896`;
- the mapping between `GTM-578JXRXS` and the production GA4 measurement/configuration tag;
- the owner permissions of `heraklis@evochia.gr` for GSC, GA4 and GTM.

No GSC, GA4 or GTM metric may be treated as production-authoritative until this mapping and access are confirmed.

## 4. Authority, branch and production-control policy

### 4.1 Permanent branches

- `main`: production authority only.
- `seo-system`: the single permanent working branch for all SEO-system changes.

Automation must not create additional working branches.

### 4.2 Pull request policy

There may be at most one open SEO draft pull request at any time:

```text
seo-system -> main
```

After a PR is merged or closed, the next review batch may create a new draft PR using the same permanent branch. A merged PR is not reused.

The draft PR is the only path by which SEO-system changes may reach production.

### 4.3 Mandatory `main` ruleset or branch protection

Before Phase 5 can be enabled, `main` must have an enforced GitHub ruleset or equivalent branch protection that:

- blocks direct pushes;
- requires a pull request;
- requires at least one approval from the human owner or an explicitly designated human reviewer;
- requires review from `CODEOWNERS` for SEO-critical files;
- dismisses stale approvals when the reviewed diff changes materially;
- requires all designated status checks;
- blocks force pushes and branch deletion;
- restricts updates to `main` to the owner or an explicit human-only allowlist;
- does not place the automation actor or GitHub Actions app on a bypass list;
- does not allow administrators or apps to bypass the rule for automated SEO changes;
- keeps repository auto-merge disabled for the SEO PR workflow.

A GitHub Actions token with `pull-requests: write` is not, by itself, a sufficient safety boundary. The protected-branch ruleset is the production authority boundary.

If the repository plan or account configuration cannot enforce these controls, Phase 5 must remain disabled and the specification must not claim that autonomous merge is technically impossible.

### 4.4 `CODEOWNERS`

The implementation must add owner review coverage for at least:

- `en/**/*.html`;
- `el/**/*.html`;
- `sitemap.xml`;
- `robots.txt`;
- `vercel.json`;
- `middleware.ts`;
- `js/**`;
- `.github/workflows/**`;
- SEO rules, schemas and configuration;
- this specification and later SEO governance documents.

The exact owner identity is resolved during implementation, but it must be a human account controlled by the owner, not an automation actor.

### 4.5 Allowed automated actions

Automation may:

- commit to `seo-system`;
- create or update the single active draft PR;
- run repository and preview validation;
- update findings and bounded evidence summaries outside the production diff;
- create or update non-code proposals and issues where appropriate;
- fast-forward or otherwise synchronize `seo-system` from the owner-approved post-merge `main` state.

Automation must not:

- create additional working branches;
- write directly to `main`;
- merge a pull request;
- enable auto-merge;
- promote a Vercel preview to production;
- invoke a manual production deployment;
- possess a Vercel credential capable of production promotion;
- modify Vercel domains or environment variables;
- write to Search Console, GA4 or GTM configuration;
- submit a sitemap;
- request indexing or URL removal;
- modify pricing, legal copy, branding or commercial strategy without explicit approval.

### 4.6 Commit taxonomy and merge strategy

Each finding must remain independently reviewable through focused commits containing its `findingId`, for example:

```text
fix(seo): normalize double-slash links [SEO-0012]
test(seo): add canonical regression coverage [SEO-0012]
docs(seo): record approved decision summary [SEO-0012]
```

Routine crawl data, API responses and generated evidence files must not be committed with these changes.

SEO batch PRs must use a **merge commit**. Squash and rebase merging are not permitted for these PRs because the per-finding commit boundary and selective revert capability must survive in `main`.

### 4.7 Branch lifecycle

After an approved batch is merged by the owner:

1. Vercel creates the production deployment from `main`;
2. post-deploy verification runs;
3. findings are updated;
4. `seo-system` is synchronized to the resulting `main` merge commit;
5. the merged PR is closed;
6. the next batch may begin and may open a new draft PR.

No new automated fix batch may start until synchronization has succeeded.

## 5. Runtime and authentication model

Every collector must have an explicit runtime, identity and credential model.

### 5.1 Google Apps Script runtime

A production-bound Apps Script project attached to the approved Google Sheet is the only unattended runtime for first-party Google data.

It runs as `heraklis@evochia.gr` through owner-authorized time-driven triggers and performs:

- GSC Search Analytics collection;
- GSC URL Inspection collection for the bounded monitored set;
- GA4 Data API collection;
- GTM published-container metadata and version collection;
- normalized GTM export and fingerprint generation;
- writing approved metrics and summaries to the production Google Sheet;
- writing bounded raw GTM snapshots created by the script to a dedicated Google Drive folder.

The Apps Script project must not use a service-account JSON key. No Google OAuth refresh token may be stored in GitHub.

### 5.2 Required Google OAuth scopes

The implementation must request only the minimum scopes required by the approved collectors, including:

- `https://www.googleapis.com/auth/webmasters.readonly`;
- `https://www.googleapis.com/auth/analytics.readonly`;
- `https://www.googleapis.com/auth/tagmanager.readonly`;
- the narrowest spreadsheet scope that supports the bound production Sheet, preferring `https://www.googleapis.com/auth/spreadsheets.currentonly`;
- `https://www.googleapis.com/auth/drive.file` only for GTM snapshot files created or managed by this script;
- Apps Script external-request and trigger scopes only where technically required.

The implementation must not request write scopes for Search Console, Analytics administration, Tag Manager administration, sitemap submission, URL removal or indexing actions.

### 5.3 GitHub Actions runtime

GitHub Actions performs:

- repository static SEO validation;
- HTML, metadata, schema and link checks;
- `middleware.ts` routing and canonical behaviour tests;
- Playwright critical journeys;
- production and preview crawling;
- PageSpeed API and bounded Lighthouse runs;
- findings analysis based on exported or public inputs;
- draft fix generation and commits to `seo-system` only after Phase 5 is enabled.

Google first-party API collection must not depend on a GitHub-hosted Google credential.

### 5.4 Vercel runtime

Vercel performs preview and production deployments through the existing Git integration.

- `seo-system` and PR changes may produce preview deployments only.
- Production deployment may originate only from an owner-approved merge to `main`.
- Preview promotion is prohibited for automation.
- SEO workflows must not receive a token capable of promoting or manually deploying production.

### 5.5 Human-only actions

Only the owner or an explicitly delegated human may:

- approve and merge the SEO PR;
- change GTM tags, triggers, variables or published versions;
- change GA4 key-event definitions or administration settings;
- change GSC ownership or configuration;
- approve commercial, editorial, legal or brand changes;
- change production domains, Vercel settings or production secrets.

## 6. System architecture

The system consists of six bounded layers.

### 6.1 First-party data collectors

Read-only collectors acquire data from:

- Google Search Console;
- Google Analytics 4;
- Google Tag Manager published configuration and version history;
- PageSpeed Insights;
- the live production site;
- sitemap, robots, headers and redirects;
- `heraklist/evochia_site`;
- Vercel deployment observations;
- compliant public off-page sources.

Collectors must not modify source systems.

### 6.2 SEO and analytics analysis engine

The analysis layer correlates:

- query to landing page to engagement to key event;
- source code to deployed HTML;
- GTM published version to observed event schema and GA4 behaviour;
- sitemap URL to canonical to redirect to indexing state;
- commit and PR to Vercel deployment;
- deployment to crawl and performance changes;
- GTM or analytics changes with no corresponding repository commit;
- private-chef and catering clusters to commercial outcomes.

A material GTM or GA4 behavioural change without an approved repository change or documented human change record is a **tracking-drift finding**.

### 6.3 Findings ledger

Every finding must have:

- `findingId`;
- category;
- severity;
- confidence;
- affected URLs, files and external configuration objects where relevant;
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
invalid
```

`invalid` is a terminal state for a verified false positive or an inapplicable rule. Reopening an `invalid` finding requires new evidence and a reviewer decision.

### 6.4 Fix proposal engine

The proposal engine determines whether a finding should produce:

- a deterministic patch;
- a human-review issue;
- a content proposal;
- a GTM/analytics change proposal;
- monitoring only;
- an `invalid` disposition.

### 6.5 Draft PR agent

The draft PR agent may update `seo-system` only after all allowlist conditions pass. It must add the change, tests, evidence summary, risk notes and rollback instructions to the single active draft PR.

It may not modify GTM, GA4 or GSC configuration.

### 6.6 Reporting layer

The reporting layer produces:

- the production Google Sheet as the operational data hub;
- the existing Evochia SEO Weekly report every Monday at 09:00 Europe/Athens;
- explicit `data as of` timestamps for every source;
- pipeline health and staleness indicators;
- concise PR evidence summaries linked to bounded raw artifacts.

## 7. Data sources and collection scope

### 7.1 Google Search Console

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

GSC data must display its effective `data as of` date and must not be labelled current merely because the collector ran today.

### 7.2 Google Analytics 4

Treat GA4 property `528945896` and account reference `388030118` as provisional until Phase 0 confirms that the published GTM container routes production traffic to the expected GA4 destination.

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

Key events must not be used as authoritative business KPIs until duplicate, false and missing event collection has been checked against the GTM published configuration and observed browser behaviour.

GA4 data must display its effective `data as of` date independently from the GSC date.

### 7.3 Google Tag Manager

The GTM collector must observe the published container associated with `GTM-578JXRXS` and record:

- account and container identifiers resolved through the authorized Google account;
- current published container version;
- publication timestamp and available version metadata;
- normalized tag, trigger and variable definitions;
- a deterministic configuration fingerprint;
- the GA4 measurement/configuration destination found in the published container;
- event-name and trigger mappings relevant to Evochia conversions;
- consent-related tags and sequencing where observable;
- changes from the previously observed published version.

Collection policy:

- check lightweight version metadata daily;
- fetch and persist a normalized export only when the published fingerprint changes or during an approved baseline run;
- store raw snapshots in the dedicated owner Drive folder with bounded retention;
- store fingerprints, version metadata and change summaries in the Google Sheet;
- never publish, modify or restore a GTM version automatically.

A published GTM change with no corresponding approved human change record must create a tracking-drift finding. A GA4 event-schema change with no repository or GTM explanation must also create a tracking-integrity finding.

### 7.4 Production crawl

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

### 7.5 Repository validation

On every PR and every change to `seo-system`, validate:

- HTML correctness;
- canonical policy;
- hreflang reciprocity;
- unique titles and H1s;
- metadata completeness;
- JSON-LD syntax;
- sitemap consistency;
- robots/indexability consistency, including the intentional `/_publish_repo/` disallow rule;
- broken internal links;
- forbidden URL patterns and double slashes;
- tracking-script and consent-sensitive loading;
- GTM container-ID presence and consistency where expected;
- `middleware.ts` redirect, locale and 404 behaviour;
- consistency between `middleware.ts` and `vercel.json` for routing and security-sensitive headers;
- Playwright critical-page journeys.

### 7.6 Performance and Core Web Vitals

Store and distinguish:

- laboratory data;
- field data when available;
- mobile and desktop results;
- LCP, INP, CLS, FCP and TTFB;
- render-blocking resources;
- image, font, CSS and JavaScript overhead.

A single Lighthouse run is not sufficient evidence. Performance regressions must be repeatable or exceed a defined threshold across multiple runs.

### 7.7 GitHub, GTM and Vercel correlation

Associate:

- commit SHA;
- PR number;
- changed files;
- deployment ID and URL;
- deployment timestamp;
- preview crawl result;
- production crawl before and after;
- performance before and after;
- GTM published version and fingerprint;
- later GSC and GA4 changes.

The system must distinguish:

- code-deployment changes;
- GTM-only changes;
- combined code and GTM changes;
- unexplained analytics behaviour changes.

### 7.8 Free-first off-page and competitor monitoring

Initially use:

- Search Console link data where available;
- Bing Webmaster data if connected;
- public referring-page checks that permit automated access;
- public brand-mention searches through compliant sources;
- manual, owner-reviewed competitor SERP sampling;
- content, schema and metadata comparisons on publicly accessible competitor pages where terms permit.

The system must not automate scraping of Google search-result HTML. It must not claim complete backlink or rank-tracking coverage without a dedicated compliant data provider.

## 8. Storage and evidence model

Use a hybrid model with a strict distinction between production-bound source changes and operational evidence.

### 8.1 Google Sheet

Store:

- GSC and GA4 business data;
- GTM fingerprints, version metadata and normalized change summaries;
- daily and weekly summaries;
- priority-page metrics;
- indexing log;
- findings, issue and run summaries;
- per-source `data as of` timestamps;
- pipeline health and staleness states;
- data used by the Monday SEO report.

### 8.2 Google Drive

Store only files created and managed by the Apps Script collector, including:

- bounded raw GTM published-container snapshots;
- optional approved first-party export backups that cannot reasonably fit in the Sheet.

Retention must be explicit. General Drive access is not permitted; the preferred scope is `drive.file`.

### 8.3 GitHub Actions artifacts

Store per-run machine-readable evidence:

- crawl JSON and CSV;
- validation reports;
- Lighthouse outputs;
- comparison summaries;
- selected screenshots where needed.

Artifact retention must be bounded to preserve free-tier capacity.

### 8.4 Repository and production PR path

Store only production-appropriate, reviewable source material:

- schemas;
- rules and allowlists;
- scripts;
- workflows;
- tests;
- configuration;
- specifications;
- approved architecture or decision records;
- short, manually reviewed evidence summaries only when they are necessary to explain a permanent source decision.

Do not commit:

- daily or weekly metric rows;
- raw crawl outputs;
- Lighthouse JSON;
- screenshots;
- recurring API responses;
- raw GTM exports;
- generated run logs;
- secrets or OAuth tokens;
- service-account JSON keys.

The `seo-system -> main` diff must remain a source-code and governance diff, not an operational data archive.

### 8.5 Future database

Supabase or another database may be considered only after the Google Sheet demonstrably becomes unsuitable because of volume, query complexity or retention requirements.

## 9. Execution schedule

### Daily

- GSC import, normally with a three-day availability delay;
- GA4 import, normally with a two-day processing delay;
- GTM published-version metadata check;
- production availability checks;
- priority URL crawl;
- sitemap and critical canonical checks.

### On GTM fingerprint change

- fetch normalized published-container export;
- store bounded snapshot in Drive;
- produce tag/trigger/variable change summary;
- verify the production GA4 destination and conversion mappings;
- create or update tracking-drift findings.

### Every pull request

- repository SEO validation;
- HTML/schema/link checks;
- `middleware.ts` routing tests;
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
- PageSpeed/Lighthouse on the bounded priority set;
- URL Inspection and indexing review;
- consolidated findings analysis;
- existing Evochia SEO Weekly report every Monday at 09:00 Europe/Athens with per-source `data as of` dates.

### Monthly

- content gaps;
- cannibalization review;
- compliant competitor review;
- backlink and brand-mention review;
- GitHub Actions budget review;
- strategic reprioritization.

## 10. Finding severity and confidence

### Severity

**Critical**

- production unavailable;
- major site section blocked from indexing;
- broad canonical or redirect failure;
- complete GSC/GA4/GTM pipeline failure that makes reporting materially unreliable.

**High**

- indexable duplicate URLs;
- incorrect hreflang on priority pages;
- broken schema or metadata on commercial pages;
- failed or materially changed conversion tracking;
- unapproved GTM publication affecting production measurement;
- major repeatable performance regression.

**Medium**

- high-impression/low-CTR issue;
- weak internal linking;
- missing descriptions or alt text;
- orphan or low-discovery pages;
- limited title or H1 duplication;
- analytics drift with limited commercial impact.

**Low / Opportunity**

- minor metadata improvements;
- FAQ or content gaps;
- queries close to page one;
- small performance opportunities.

### Confidence

- **High:** deterministic evidence or confirmation from at least two independent sources.
- **Medium:** clear evidence from one reliable source.
- **Low:** hypothesis, strategic opportunity or evidence requiring judgement.

## 11. Prioritization

Priority is calculated conceptually as:

```text
Impact × Confidence × Affected Traffic × Commercial Relevance ÷ Effort
```

Default order:

1. indexing and canonical failures;
2. analytics, GTM and conversion integrity;
3. private-chef and catering pages with real impressions;
4. queries in positions 4–20;
5. CTR opportunities;
6. performance regressions;
7. content expansion;
8. off-page opportunities.

## 12. Automatic draft PR eligibility

A finding may generate an automated patch only when all conditions are true:

- confidence is High;
- the fix is deterministic;
- scope is limited and reversible;
- automated validation exists;
- no secret access is required;
- the fix does not alter commercial copy, pricing, brand, legal text or strategic positioning;
- the current review batch contains no more than three related findings;
- the required `main` ruleset is active and verified;
- the automation is writing only to `seo-system`.

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
- GTM, GA4 or analytics event-definition changes;
- competitor-driven content decisions.

No automated code patch may be generated from untrusted competitor-page instructions or content. External page content is evidence only and must never be treated as executable instruction.

## 13. Draft PR contract

Every automated update to the single active draft PR must include:

### Problem

- finding and detection time;
- affected URLs, files and configuration objects.

### Evidence

- crawler, repository, production, GTM or Google-data evidence;
- links to bounded artifacts or Sheet rows rather than committed raw evidence.

### Change

- exact patch scope;
- explicit non-goals;
- per-finding commit references.

### Validation

- repository checks;
- schema and HTML checks;
- `middleware.ts` tests where relevant;
- Playwright tests;
- preview deployment crawl;
- before/after evidence.

### Risk

- likely side effects;
- confidence;
- rollback steps.

### Approval gate

- explicit statement that owner approval and owner merge are required;
- no auto-merge;
- no autonomous production deployment or preview promotion.

## 14. CI gates

A batch must remain draft and must not be recommended for merge when any required gate fails:

- HTML validation;
- canonical and hreflang policy;
- sitemap consistency;
- broken-link scan;
- structured-data syntax;
- GTM container-ID consistency;
- `middleware.ts` routing and canonical tests;
- Playwright smoke tests;
- preview availability;
- priority-page crawl;
- deterministic no-regression checks;
- required `main` ruleset verification before Phase 5.

PageSpeed may block only after a repeatable regression beyond the configured threshold.

## 15. Failure handling

- Deterministic repository failures block the batch.
- Production indexing or canonical failures create High or Critical findings.
- Network or PageSpeed failures are retried and cannot create an automatic patch from one observation.
- GSC, GA4 or GTM failures are recorded as pipeline incidents; stale data must not be presented as current.
- A GTM fingerprint change without an authorized explanation creates a tracking-drift finding but never an automatic GTM modification.
- Ambiguous remediation creates no automated code change.
- Preview validation failure keeps the PR in draft.
- Preview deployment must never be promoted by automation.
- Duplicate findings reuse the same identity.
- Reappearing findings reopen under the same identity unless their state is `invalid`.
- An `invalid` finding may reopen only after new evidence and human review.
- Flaky rules are quarantined from automated patch generation.
- If branch-protection verification fails, Phase 5 write automation is disabled immediately.
- If the Apps Script owner authorization is revoked or expires, Google imports stop and the report shows the source as stale; no fallback credential is inferred.

## 16. Rollout phases

### Phase 0 — Baseline and external identity verification

Capture current commit, Vercel production deployment, crawl, canonical/hreflang state, sitemap, redirects, priority PageSpeed and known exceptions.

Verify before any production data claim:

- GSC property access for `heraklis@evochia.gr`;
- GA4 account and property access;
- GTM account/container access;
- that `GTM-578JXRXS` is the container published on production;
- the GA4 destination configured in the published GTM version;
- the mapping between production conversion events and GTM triggers;
- current `main` branch-protection capabilities and repository auto-merge state;
- current GitHub Actions allowance and the configured project budget.

### Phase 1 — SEO Data Hub

Activate owner-authorized, read-only Apps Script collection for GSC, GA4 and GTM, historical import, weekly summary, indexing log and conversion audit. No issue or PR automation.

### Phase 2 — Repository SEO CI

Add an isolated SEO workflow rather than expanding the existing manual CodeMaestro workflow. Keep validation permissions read-only. Add explicit `middleware.ts` and GTM-ID checks.

### Phase 3 — Production and performance monitoring

Add daily priority checks, weekly crawl, bounded Lighthouse runs and GitHub artifacts under the configured Actions budget.

### Phase 4 — Findings ledger

Enable deduplication, lifecycle tracking, `invalid` disposition, tracking-drift findings and priority scoring. Findings remain advisory.

### Phase 5 — Automated draft PRs

Phase 5 may begin only after the mandatory `main` ruleset has been configured and independently verified.

Grant narrowly scoped `contents: write` and `pull-requests: write` permissions only to the dedicated draft-fix workflow. All writes go to `seo-system`. The automation actor must remain unable to update protected `main` under the repository ruleset.

### Phase 6 — Preview and post-deploy verification

Validate Vercel preview before owner approval and production after owner merge. A code fix may be `deployed` before GSC evidence permits `seo-resolved`.

## 17. Free-tier and capacity safeguards

The first version must not require:

- Ahrefs or Semrush;
- a paid rank tracker;
- a paid crawler;
- Supabase;
- an external server;
- service-account JSON keys;
- Google OAuth refresh tokens stored in GitHub;
- paid monitoring.

Because the repository is private, the system must use an explicitly configured monthly GitHub Actions budget rather than assuming unlimited minutes.

Before scheduled monitoring is enabled, configuration must define:

- the current monthly Actions-minute allowance relevant to the repository;
- a lower operating budget reserved for SEO workflows;
- warning, downgrade and non-critical-stop thresholds;
- maximum crawl duration and concurrency;
- maximum Lighthouse pages and repetitions;
- artifact-retention duration.

Default budget behaviour:

- warn when cumulative SEO workflow duration approaches the configured warning threshold;
- reduce optional Lighthouse repetitions and non-critical crawl depth at the downgrade threshold;
- stop monthly competitor checks, optional screenshots and other non-critical scheduled runs at the stop threshold;
- preserve critical production-availability and deterministic PR checks;
- use concurrency groups with `cancel-in-progress` where newer runs supersede older runs;
- avoid large matrices and repeated dependency installation where caching is safe;
- prefer the PageSpeed Insights API over local Lighthouse when it provides the required evidence at lower compute cost.

The specification intentionally does not hard-code the platform's monthly quota because it depends on the repository account and plan. Phase 0 must record the actual allowance and set the project budget.

Additional controls:

- limited Lighthouse URL sets;
- bounded artifact and Drive snapshot retention;
- scheduled rather than continuous full crawls;
- compact Sheet summaries;
- no persistent screenshots unless evidence requires them;
- GTM full export only on baseline or fingerprint change.

## 18. v1 completion criteria

Version 1 is complete only when:

- owner-authorized GSC and GA4 imports run reliably without a service-account key or GitHub-stored Google refresh token;
- the GA4 property and published GTM destination mapping have been verified;
- GTM version and fingerprint monitoring is operational;
- conversion events have been audited against GTM configuration and observed behaviour;
- baseline production crawl exists;
- repository SEO gates run on PRs;
- `middleware.ts` behaviour is covered by deterministic tests;
- weekly production crawling is operational within the configured Actions budget;
- priority pages have performance history;
- findings have stable identity, deduplication and an `invalid` terminal disposition;
- at least one deterministic finding can safely update the draft PR on `seo-system`;
- branch protection technically prevents the automation actor from updating `main`;
- automation cannot merge, enable auto-merge, promote a preview or deploy production;
- the Monday report uses consolidated data and displays separate `data as of` dates for GSC, GA4 and GTM;
- routine evidence and operational data do not enter the production PR diff;
- merge-commit preservation of per-finding commits has been tested;
- branch synchronization after merge has been tested.

## 19. Explicit non-goals for v1

- fully autonomous SEO strategy;
- automatic content writing and publication;
- automatic GTM, GA4 or GSC configuration changes;
- automatic merge or deployment;
- preview promotion;
- full backlink intelligence;
- automated Google SERP scraping;
- guaranteed rank attribution from individual code or GTM changes;
- replacing human review of commercial, editorial and measurement decisions.

## 20. Review and amendment

This revised specification is normative only after the second review is complete and the owner explicitly approves Revision 2.

Material changes to authority, branch policy, authentication, data ownership, GTM treatment, automatic patch eligibility, production control or evidence storage require explicit owner approval and a specification update before implementation.

No implementation plan may be authored until:

1. Revision 2 has passed the second specification review;
2. all remaining High findings are resolved or explicitly accepted by the owner;
3. the owner approves the reviewed Revision 2 specification.
