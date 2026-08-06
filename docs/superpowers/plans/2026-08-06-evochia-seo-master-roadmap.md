# Evochia Full SEO System Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Evochia Full SEO System Revision 2 as five independently testable subsystems, while preserving the single permanent `seo-system` branch and human-only production authority.

**Architecture:** Google-owned data collection runs in a bound Apps Script project and writes to the production Google Sheet. Repository validation, crawling, performance checks, finding reconciliation and deterministic draft fixes run in GitHub Actions. Vercel remains Git-driven: previews come from `seo-system` or its PR, while production comes only from an owner-approved merge to `main`.

**Tech Stack:** Node.js 22+, npm, Playwright, TypeScript/tsx, Node test runner, Cheerio, fast-xml-parser, Google Apps Script V8, Search Console API, GA4 Data API, Tag Manager API v2, Google Sheets/Drive, GitHub Actions, GitHub Issues, Vercel deployments, PageSpeed Insights API.

## Global Constraints

- Work only on the permanent `seo-system` branch; do not create feature branches.
- Keep at most one open draft PR from `seo-system` to `main`.
- Never push directly to `main`, merge automatically, enable auto-merge, promote a Vercel preview, or invoke production deployment.
- SEO batch PRs use merge commits; squash and rebase are prohibited.
- Only one to three related findings may enter a review batch.
- Google collection runs as `heraklis@evochia.gr` in Apps Script with read-only GSC, GA4 and GTM scopes.
- Do not use a service-account JSON key or store a Google OAuth refresh token in GitHub.
- Do not commit raw crawls, recurring metric rows, Lighthouse JSON, screenshots, raw GTM exports, generated run logs or secrets.
- The repository is private; all scheduled workflows must enforce the configured Actions budget.
- GTM, GA4, GSC, commercial copy, legal copy, pricing and brand changes remain human-only.
- Do not automate scraping of Google search-result HTML.
- Node.js floor is `>=22`.

---

## Plan Set and Execution Order

### Plan 1 — Phase 0/1: Foundation, Google Data Hub and GTM Integrity

File: `docs/superpowers/plans/2026-08-06-evochia-seo-data-hub-gtm.md`

Produces:

- reproducible npm installation with a committed lockfile;
- Phase 0 verification record;
- version-controlled Apps Script source;
- GSC, GA4 and GTM read-only collectors;
- data-as-of and pipeline-health reporting;
- bounded GTM snapshots in owner Drive;
- GitHub finding-summary synchronization through a least-privilege issues token;
- production triggers and baseline verification.

Gate to continue: all Google identifiers and owner permissions are verified; three consecutive scheduled imports complete without duplicate rows or stale-data mislabelling.

### Plan 2 — Phase 2: Repository SEO CI

File: `docs/superpowers/plans/2026-08-06-evochia-repository-seo-ci.md`

Produces:

- site policy configuration;
- static HTML, canonical, hreflang, sitemap, robots, JSON-LD and GTM-ID validators;
- deterministic `middleware.ts` tests;
- a single CLI/report contract;
- read-only pull-request CI.

Gate to continue: the full repository validation command passes locally and in GitHub Actions; at least one fixture proves each rule fails when violated.

### Plan 3 — Phase 3: Production, Preview and Performance Monitoring

File: `docs/superpowers/plans/2026-08-06-evochia-production-monitoring.md`

Produces:

- bounded production crawler;
- daily priority and weekly full modes;
- PageSpeed collection and repeatable regression logic;
- Vercel preview/production checks through deployment events;
- artifact retention and Actions-budget degradation.

Gate to continue: one daily priority run, one full run and one preview deployment run produce valid artifacts within the configured budget.

### Plan 4 — Phase 4: Findings Ledger and Weekly Reporting Inputs

File: `docs/superpowers/plans/2026-08-06-evochia-findings-reporting.md`

Produces:

- stable finding IDs and schema validation;
- GitHub Issue-based lifecycle and deduplication;
- `invalid` terminal state;
- impact/confidence/commercial priority scoring;
- tracking-drift findings from GTM/GA4 changes;
- Sheet summaries and source-specific data-as-of fields.

Gate to continue: repeated identical evidence updates one issue rather than creating a duplicate; false positives remain terminal until human reopening.

### Plan 5 — Phase 5/6: Human-Governed Draft Fixes and Branch Lifecycle

File: `docs/superpowers/plans/2026-08-06-evochia-draft-pr-governance.md`

Produces:

- mandatory `main` ruleset and CODEOWNERS gate;
- allowlisted deterministic fix registry;
- one active draft PR at a time;
- per-finding commits;
- no-merge/no-production workflow boundaries;
- preview validation and post-merge branch synchronization.

Gate to complete v1: a controlled double-slash fixture generates a focused commit on `seo-system`, updates a draft PR, passes preview validation, and cannot update protected `main` without owner review.

---

## Cross-Plan File Map

```text
seo/
├── apps-script/             # Bound Apps Script source and deployment guide
├── cli/                     # Repository, crawl, PageSpeed, findings and fix entry points
├── config/                  # Canonical policy, URLs, exceptions and budget inputs
├── fixes/                   # Allowlisted deterministic patch implementations
├── lib/                     # Focused reusable validation and monitoring modules
└── schemas/                 # Run, finding and report JSON Schemas

tests/seo/                   # Node/tsx tests and fixtures
.github/workflows/           # Isolated SEO validation, monitoring, findings and fix workflows
.github/CODEOWNERS            # Human ownership for SEO-critical paths
docs/seo/                    # Operator runbooks and Phase 0 verification record
docs/superpowers/plans/      # This plan set
```

## Parallel Operating Model

Implementation must proceed at the same time as the existing read-only SEO checks and the established Monday SEO reporting workflow.

### Lane A — Continuous SEO observation

This lane remains active throughout implementation and may run concurrently with all five plans:

- existing Evochia SEO Weekly report every Monday at 09:00 Europe/Athens;
- current public production checks;
- approved GSC and GA4 exports or imports as they become available;
- indexing, canonical, double-slash, availability and priority-page observations;
- later, the scheduled monitoring introduced by Plans 1–4.

Lane A is read-only with respect to site code, `main`, GSC, GA4 and GTM configuration. Its outputs go to the production Sheet, workflow artifacts, findings or review notes—not directly into code commits.

A new Critical or High observation may pause the next implementation commit for review, but it must not bypass finding validation, batch limits or owner approval.

### Lane B — Controlled implementation

Implementation uses the Subagent-Driven workflow:

- multiple agents may inspect independent files, research APIs, write review notes or run read-only checks in parallel;
- tasks with disjoint outputs may be prepared concurrently;
- only one agent may write or commit to `seo-system` at any moment;
- commits are serialized in plan order and reviewed before the next write task;
- no task may modify files that another active task is editing;
- every writer must re-read the current `seo-system` head and working diff immediately before applying changes;
- a shared writer lock named `seo-system-writer` governs all automated commits and draft-PR updates.

### GitHub Actions concurrency

Workflows must use separate concurrency groups so observation does not cancel implementation validation:

```yaml
concurrency:
  group: seo-observation-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Read-only PR validation uses:

```yaml
concurrency:
  group: seo-validation-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

The future write workflow uses the single global writer group:

```yaml
concurrency:
  group: seo-system-writer
  cancel-in-progress: false
```

No scheduled observation workflow may acquire `seo-system-writer`.

### Conflict and promotion rules

- Observation continues while implementation is paused for owner input.
- A failing observation does not mutate code automatically before Phase 5.
- Findings discovered during an active 1–3 finding batch enter the ledger but wait for the next batch unless the owner explicitly replaces the current batch.
- Monitoring runs may read `main`, `seo-system` and Vercel previews, but production conclusions must identify which ref or deployment was observed.
- The Monday report must distinguish production results from preview or implementation findings.

## Execution Rules

- [ ] Execute plans in numeric order.
- [ ] Keep Lane A running while Lane B executes the implementation tasks.
- [ ] Use Subagent-Driven execution for Lane B, with parallel read-only investigation and serialized writes.
- [ ] Complete every plan's gate before starting the next plan's write tasks.
- [ ] Use TDD for pure functions, validators, finding identity and fix implementations.
- [ ] Commit after every independently testable task.
- [ ] Keep write permissions absent until Plan 5.
- [ ] Stop and amend the approved specification before introducing any new production authority, Google write scope, external database or paid provider.
- [ ] Run the complete regression suite before updating the draft PR.

## Final Verification Command Set

The completed system must expose these stable commands:

```bash
npm ci
npm run typecheck
npm run test:unit
npm run test:e2e
npm run seo:validate
npm run seo:crawl:priority -- --base-url=https://www.evochia.gr/
npm run seo:crawl:full -- --base-url=https://www.evochia.gr/
npm run seo:findings:reconcile -- --dry-run
npm run seo:fix:apply -- --finding-id=SEO-PILOT-DOUBLE-SLASH --dry-run
```

Expected final result: every command exits `0`, produces no untracked operational evidence under the repository, and leaves `main` unchanged.