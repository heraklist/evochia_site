# Evochia Production and Performance Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bounded daily/weekly production and preview monitoring with deterministic crawl evidence, PageSpeed trends, Vercel deployment correlation and free-tier degradation controls.

**Architecture:** A Node crawler consumes the normative site policy and emits compact JSON/CSV artifacts. Separate priority and full modes control cost. PageSpeed is preferred for routine measurements; local Lighthouse is optional and repeated only when required for regression confirmation. Vercel deployment URLs are supplied by workflow events or explicit inputs—no production-capable token is stored.

**Tech Stack:** Node.js 22+, TypeScript/tsx, undici/fetch, Cheerio, Playwright, PageSpeed Insights API, GitHub Actions artifacts.

## Global Constraints

- No production deployment or preview promotion.
- Raw evidence stays in bounded Actions artifacts, not the repo.
- Respect configured Actions budget and `cancel-in-progress`.
- A single network or PageSpeed failure cannot produce an automatic fix.

---

### Task 1: Define Monitoring Configuration and Budget

**Files:**
- Create: `seo/config/monitoring.json`
- Create: `seo/schemas/monitoring.schema.json`
- Create: `tests/seo/monitoring-config.test.mjs`

**Interfaces:**
- Produces priority URL list, crawl limits, PageSpeed set, timeout/retry policy and budget thresholds.

- [ ] Write a failing test that requires daily priority URLs for `/en/private-chef/`, `/en/catering/`, Greek equivalents, home pages, sitemap and robots.
- [ ] Require `warningPercent < downgradePercent < stopPercent` and explicit artifact retention.
- [ ] Run test; expect FAIL.
- [ ] Implement example/default config without hard-coding account quota; quota is a Phase 0 input.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 2: Build HTTP Crawl Engine

**Files:**
- Create: `seo/lib/crawler.ts`
- Create: `seo/lib/crawl-normalizer.ts`
- Create: `tests/seo/crawler.test.ts`
- Create: `tests/seo/fixtures/server.mjs`

**Interfaces:**
- Produces `crawlUrl(url, options): CrawlResult`, `crawlSet(urls, options): CrawlReport`.

- [ ] Write failing tests for 200, 301 chain, loop, 404, timeout, canonical, hreflang, robots meta, title/H1 and headers.
- [ ] Run focused tests; expect FAIL.
- [ ] Implement bounded concurrency, retry only for retryable failures and deterministic sorted output.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 3: Add Discovery and Full-Crawl Mode

**Files:**
- Create: `seo/lib/discovery.ts`
- Create: `tests/seo/discovery.test.ts`
- Create: `seo/cli/crawl.ts`
- Modify: `package.json`

**Interfaces:**
- Produces scripts `seo:crawl:priority` and `seo:crawl:full`.

- [ ] Write failing tests for sitemap discovery, internal-link discovery, same-origin restriction, query/hash removal and duplicate URL collapse.
- [ ] Implement priority mode from config and full mode from sitemap plus internal links.
- [ ] Add CLI flags `--base-url`, `--mode`, `--json-out`, `--csv-out`.
- [ ] Verify fixtures and one live dry run against `https://www.evochia.gr/` without writing repo-tracked files.
- [ ] Commit.

### Task 4: Implement Crawl Comparison and Regression Classification

**Files:**
- Create: `seo/lib/crawl-diff.ts`
- Create: `tests/seo/crawl-diff.test.ts`

**Interfaces:**
- Produces `diffCrawls(previous, current): CrawlChange[]`.

- [ ] Write tests for status change, canonical change, missing URL, new URL, title change and transient timeout.
- [ ] Mark deterministic status/canonical regressions High; transient network failures remain observations until repeated.
- [ ] Run tests; expect FAIL then PASS after implementation.
- [ ] Commit.

### Task 5: Implement PageSpeed Collection and Repeatability Rules

**Files:**
- Create: `seo/lib/pagespeed.ts`
- Create: `seo/lib/performance-diff.ts`
- Create: `tests/seo/pagespeed.test.ts`
- Create: `seo/cli/pagespeed.ts`

**Interfaces:**
- Produces `collectPageSpeed(url, strategy): PerformanceSample`, `classifyRegression(samples, baseline, thresholds): PerformanceFinding | null`.

- [ ] Write failing tests for mobile/desktop normalization, missing field data, API error and multi-run regression confirmation.
- [ ] Require at least two confirming samples or a configured severe threshold before blocking.
- [ ] Implement PageSpeed API client with optional API key from secret and anonymous fallback where supported.
- [ ] Run tests; expect PASS.
- [ ] Commit.

### Task 6: Add Vercel Preview and Production Correlation Inputs

**Files:**
- Create: `seo/lib/deployment-context.ts`
- Create: `tests/seo/deployment-context.test.ts`
- Create: `seo/cli/verify-deployment.ts`

**Interfaces:**
- Produces `DeploymentContext { environment, url, deploymentId?, commitSha?, prNumber? }`.

- [ ] Write tests for PR preview URL, production URL and rejection of a request to promote/deploy.
- [ ] Implement verification-only CLI taking event/env inputs.
- [ ] Ensure no Vercel write endpoint or production token is referenced.
- [ ] Commit.

### Task 7: Add Budget-Aware Scheduled Workflows

**Files:**
- Create: `.github/workflows/seo-monitor-daily.yml`
- Create: `.github/workflows/seo-monitor-weekly.yml`
- Create: `.github/workflows/seo-preview-verify.yml`
- Create: `seo/cli/budget.ts`
- Create: `tests/seo/budget.test.ts`

**Interfaces:**
- Daily: priority crawl and lightweight checks.
- Weekly: full crawl and bounded PageSpeed.
- Preview: deployment verification for PR URL.

- [ ] Write failing budget tests for normal, warning, downgrade and stop modes.
- [ ] Implement mode selection from configured monthly budget and recorded workflow duration.
- [ ] Create workflows with read-only permissions, pinned actions, concurrency cancellation and 7-day artifacts.
- [ ] At stop threshold preserve critical availability and PR checks while skipping optional Lighthouse/screenshots/competitor work.
- [ ] Validate YAML and run unit tests.
- [ ] Commit.

### Task 8: Create Monitoring Runbook and Baseline Procedure

**Files:**
- Create: `docs/seo/monitoring-runbook.md`
- Create: `docs/seo/performance-baseline-procedure.md`

- [ ] Document manual baseline capture, artifact names, failure triage, budget adjustment and stale baseline handling.
- [ ] Document that production checks follow an owner merge and never trigger deployment.
- [ ] Run final commands:

```bash
npm run test:unit
npm run seo:crawl:priority -- --base-url=https://www.evochia.gr/
npm run seo:crawl:full -- --base-url=https://www.evochia.gr/
```

- [ ] Confirm outputs are generated only under ignored `reports/seo/`.
- [ ] Commit.

## Plan Gate

One daily priority run, one weekly full run and one preview run must produce schema-valid artifacts within the configured budget. No workflow may contain Vercel production deployment or promotion credentials/actions.