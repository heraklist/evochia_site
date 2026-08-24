# Evochia Repository SEO CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, read-only repository SEO validation for every PR and every update to `seo-system`.

**Architecture:** Focused TypeScript validators read the static HTML trees and normative site configuration, then emit one machine-readable report and a human summary. Middleware behaviour is tested separately through direct requests. A dedicated GitHub workflow runs with `contents: read` only.

**Tech Stack:** Node.js 22+, TypeScript, tsx, Node test runner, Cheerio, fast-xml-parser, Playwright, GitHub Actions.

## Global Constraints

- Do not modify the existing manual CodeMaestro workflow.
- CI permissions remain `contents: read` in this plan.
- Normative canonical policy: HTTPS, `www.evochia.gr`, clean URLs, trailing slash.
- Whitelist `Disallow: /_publish_repo/` as intentional.
- Validate GTM ID `GTM-578JXRXS` without changing GTM.

---

### Task 1: Define Site Policy and Report Contracts

**Files:**
- Create: `seo/config/site-policy.json`
- Create: `seo/schemas/seo-run.schema.json`
- Create: `seo/lib/types.ts`
- Create: `tests/seo/site-policy.test.mjs`

**Interfaces:**
- Produces `SitePolicy`, `SeoFinding`, `SeoRunReport`.

- [ ] Write a failing test asserting canonical host, locale roots, priority URLs, expected GTM ID and intentional robots exclusions.
- [ ] Run `node --test tests/seo/site-policy.test.mjs`; expect FAIL.
- [ ] Implement the exact policy values from Revision 2 and validate the JSON shape.
- [ ] Re-run; expect PASS.
- [ ] Commit:

```bash
git add seo/config/site-policy.json seo/schemas/seo-run.schema.json seo/lib/types.ts tests/seo/site-policy.test.mjs
git commit -m "feat(seo): define normative site policy"
```

### Task 2: Build HTML Inventory and Metadata Parser

**Files:**
- Create: `seo/lib/html-inventory.ts`
- Create: `tests/seo/html-inventory.test.ts`
- Create: `tests/seo/fixtures/html/valid.html`
- Create: `tests/seo/fixtures/html/missing-canonical.html`

**Interfaces:**
- Produces `scanHtmlTree(root): PageDocument[]` and `parsePage(path, html): PageDocument`.

- [ ] Write tests for canonical, title, description, H1, hreflang, robots, JSON-LD, internal links, image attributes and GTM ID extraction.
- [ ] Run `npx tsx --test tests/seo/html-inventory.test.ts`; expect FAIL.
- [ ] Implement parser with Cheerio and deterministic path ordering.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 3: Validate Canonicals, Hreflang and Duplicate Metadata

**Files:**
- Create: `seo/lib/validate-pages.ts`
- Create: `tests/seo/validate-pages.test.ts`

**Interfaces:**
- Produces `validatePages(pages, policy): SeoFinding[]`.

- [ ] Add failing fixtures for slashless canonical, non-www canonical, missing reciprocal hreflang, duplicate title and duplicate H1.
- [ ] Run focused tests; expect one finding per violation with stable rule IDs.
- [ ] Implement rules:

```text
SEO-CANONICAL-HOST
SEO-CANONICAL-TRAILING-SLASH
SEO-HREFLANG-RECIPROCAL
SEO-HREFLANG-XDEFAULT
SEO-TITLE-DUPLICATE
SEO-H1-MISSING
SEO-H1-DUPLICATE
SEO-GTM-ID-MISMATCH
```

- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 4: Validate Sitemap, Robots and Internal Links

**Files:**
- Create: `seo/lib/validate-site-files.ts`
- Create: `tests/seo/validate-site-files.test.ts`
- Test: `sitemap.xml`, `robots.txt`, `vercel.json` through fixtures/copies.

**Interfaces:**
- Produces `validateSiteFiles(input, pages, policy): SeoFinding[]`.

- [ ] Write failing tests for sitemap URL absent from source pages, noindex URL in sitemap, broken internal link, double slash and changed robots disallow.
- [ ] Run; expect FAIL.
- [ ] Implement XML/JSON/text parsing and exact whitelist handling.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 5: Validate JSON-LD and Image Technical Metadata

**Files:**
- Create: `seo/lib/validate-structured-data.ts`
- Create: `seo/lib/validate-images.ts`
- Create: `tests/seo/structured-images.test.ts`

**Interfaces:**
- Produces syntax-level schema findings and image findings; no remote schema claims.

- [ ] Write failing tests for invalid JSON-LD, missing `@context`, missing alt, missing width/height and non-existent local image.
- [ ] Run; expect FAIL.
- [ ] Implement deterministic checks only.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 6: Add Middleware Behaviour Tests

**Files:**
- Create: `tests/seo/middleware.test.ts`
- Modify: `middleware.ts` only if minimal exports are needed for testability.

**Interfaces:**
- Tests default export with Request objects.

- [ ] Write tests for known EN/EL routes returning `undefined`, unknown routes returning localized 404, file-extension bypass, double-slash normalization and `X-Robots-Tag: noindex`.
- [ ] Add a comparison test asserting security-sensitive middleware headers remain compatible with `vercel.json` policy.
- [ ] Run `npx tsx --test tests/seo/middleware.test.ts`; expect any current mismatch to FAIL with exact evidence.
- [ ] Do not repair unrelated production behaviour in this task; encode confirmed mismatches as baseline findings unless owner approves a fix batch.
- [ ] Commit tests and documented baseline.

### Task 7: Create Unified Validation CLI

**Files:**
- Create: `seo/cli/validate.ts`
- Create: `seo/lib/report.ts`
- Modify: `package.json`
- Create: `tests/seo/validate-cli.test.ts`

**Interfaces:**
- Produces command `npm run seo:validate` and report `reports/seo/validation.json` at runtime only.

- [ ] Write a failing CLI test that runs against fixtures and asserts exit `1` for High/Critical findings, `0` for clean input.
- [ ] Implement CLI options `--root`, `--policy`, `--json-out`, `--summary-out`.
- [ ] Ensure generated reports remain ignored and are never committed.
- [ ] Add script:

```json
"seo:validate": "tsx seo/cli/validate.ts"
```

- [ ] Run clean repository validation and fixture tests.
- [ ] Commit.

### Task 8: Add Read-Only GitHub Workflow

**Files:**
- Create: `.github/workflows/seo-validation.yml`
- Modify: `package.json` if a combined `ci:seo` script is useful.

**Interfaces:**
- Triggers on PRs to `main` and pushes to `seo-system`.

- [ ] Write the workflow with pinned action SHAs, Node 22, `npm ci`, typecheck, unit tests, SEO validation and Playwright smoke tests.
- [ ] Set:

```yaml
permissions:
  contents: read
```

- [ ] Add concurrency with `cancel-in-progress: true`.
- [ ] Upload reports only on failure or always with bounded retention of 7 days.
- [ ] Validate workflow syntax locally with an available YAML parser.
- [ ] Commit.

## Plan Gate

Run:

```bash
npm ci
npm run typecheck
npm run test:unit
npm run seo:validate
npm run test:e2e
```

Expected: all commands exit `0`; fixture tests demonstrate every validator fails correctly when its rule is violated; workflow has no write permission.