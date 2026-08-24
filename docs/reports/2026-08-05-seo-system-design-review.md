# Review & Audit — Evochia Full SEO System Design Spec

**Reviewed document:** `docs/superpowers/specs/2026-08-05-evochia-full-seo-system-design.md`
**Review date:** 2026-08-05
**Reviewer branch:** `claude/evochia-seo-design-review-tz4e6l`
**Method:** Spec claims cross-checked against the actual repository state on `seo-system`.

---

## 1. Verdict

The spec is **well-structured, internally coherent, and safe-by-design**. Its governance model (read-before-write, human-governed production, single working branch, small serial batches, evidence-before-action) is genuinely strong and rare to see stated this clearly. It is approvable as a *design*.

However, it is **not yet implementable as written**: several load-bearing decisions are missing (which runtime authenticates to Google, how "no merge" is technically enforced vs. merely stated as policy), one core system component the site actually uses (**Google Tag Manager**) is invisible to the whole design, and there is an internal tension between "single branch holds everything including evidence" and "clean, independently reviewable fix batches."

Below: what checks out, then prioritized findings.

---

## 2. Factual accuracy vs. repository (verified)

| Spec claim | Repo reality | Status |
|---|---|---|
| Static bilingual site, plain HTML/CSS/vanilla JS, no build pipeline | `en/` + `el/` HTML trees, no framework, `package.json` only has Playwright + http-server | ✅ Accurate |
| `middleware.ts` for routing/404 | Present (6.1 KB) | ✅ Exists (behaviour not audited here) |
| `vercel.json` redirects/headers/canonical | `cleanUrls:true`, `trailingSlash:true`, 301 redirects for slash/slashless + legacy → `/en/…` | ✅ Accurate |
| Canonical policy: HTTPS, `www`, clean URLs, trailing slash, deterministic redirects | Matches `vercel.json` exactly | ✅ Accurate & normative-ready |
| `sitemap.xml`, `robots.txt` present | Both present; sitemap URLs are clean `https://www.evochia.gr/en/…`, **zero** double-slash entries | ✅ Accurate |
| Playwright E2E tests | `test:e2e` scripts + `@playwright/test` | ✅ Accurate |
| hreflang with reciprocity + x-default | `en/index.html` has en/el/x-default alternates + canonical | ✅ Accurate |
| "existing manual CodeMaestro workflow" | `.github/workflows/codemaestro-validation.yml` is `workflow_dispatch`-only, `permissions: contents: read` | ✅ Accurate; Phase 2's "isolated new workflow, don't expand it" is the right call |
| `robots.txt` disallows | `Disallow: /_publish_repo/` only | ✅ (Validator should whitelist this as intentional) |

**Confirmed factual gap:** the site does **not** use direct `gtag` GA4 config. It loads **Google Tag Manager container `GTM-578JXRXS`** (verified in `en/index.html`, present across all `en/*.html`). The spec never mentions GTM. See Finding A.

**Unverifiable from repo (flag for owner):** GA4 property `528945896` / account `388030118`, and Google account `heraklis@evochia.gr`. These are external. Because the GA4 measurement ID lives *inside* the GTM container (not in the repo), nothing in the codebase confirms that property `528945896` is the one wired to this site. Verify before Phase 1.

---

## 3. Prioritized findings

### Finding A — Google Tag Manager is a blind spot in the conversion-integrity pillar (High)

The whole "analytics and conversion integrity" priority (§10 #2), the conversion audit (§6.2), and the correlation "source code to deployed HTML" (§5.2) assume events are observable from the repo and the site's HTML. In reality **the tags, triggers, variables and event definitions live in the GTM container**, which is:

- **not in the repository** (so repo-level validation §6.4 and "source→deployed HTML" correlation cannot see it);
- **changeable outside GitHub/Vercel entirely** (so the GitHub↔Vercel deployment correlation §6.6 will show *no* commit for an event-tracking change that silently breaks a conversion);
- explicitly named as a **non-allowlisted, human-review item** ("analytics event-definition changes", §11) — but the system as designed has **no collector that can even detect** a GTM change to raise that finding.

**Impact:** the spec claims conversion-tracking failure as a *High severity* finding class (§9) and "conversion events have been audited" as a *v1 completion criterion* (§17), yet provides no mechanism to observe the layer where those failures originate.

**Recommendation:** add GTM to §5.1 collectors and §6.6 correlation — at minimum via the GTM container **version history / export** (JSON export of the published container, diffed over time), and treat "measured event fires but definition changed in GTM" as a correlated finding. State explicitly that a change with GA4/GTM effects but **no corresponding commit** is itself a finding.

---

### Finding B — "No service-account JSON keys" vs. "automated daily GSC/GA4 import" is an unresolved contradiction (High)

§16 hard-bans service-account JSON keys, an external server, and Supabase. §5.1/§6.1/§6.2/§8/Phase 1 require **automated, scheduled, headless** daily collection from the GSC and GA4 APIs. These two cannot both be satisfied by GitHub Actions alone, because unattended Google API auth needs *some* long-lived credential:

- A **service-account key** — banned by §16.
- A stored **OAuth refresh token** as a GitHub secret — still a secret, and OAuth refresh tokens for an unverified/"Testing"-status app **expire in 7 days**, which will silently break daily import (exactly the "stale data" failure §14 warns about).

The spec lists "Apps Script" and "Google Sheets" as free-first tools (§2) — and **Apps Script is very likely the intended resolution**, because it runs *as* `heraklis@evochia.gr`, has native Sheets access, has time-driven triggers, and needs **no** JSON key. **But the spec never says this.** §5 (architecture) lists five layers and never assigns a *runtime* to any collector.

**Impact:** the single most important reliability decision in the system (who authenticates to Google and how, without a banned key type) is undefined. As written, the free-first constraint and the automation requirement are in direct conflict.

**Recommendation:** add an explicit **"Runtime & auth"** subsection to §5 stating, per collector, where it runs and how it authenticates. If Apps Script owns GSC/GA4 (recommended), say so and note the auth model (script runs as owner, read-only scopes). If GitHub Actions owns any Google collection, the §16 no-SA-key ban must be reconsidered or replaced with "SA key stored only as an encrypted GitHub secret, never committed."

---

### Finding C — "Automation cannot merge/deploy" is a policy, not an enforced guarantee (High)

§17 promises "automation cannot merge or deploy production" as a completion criterion, and §4.3 forbids merge / enable-auto-merge. But Phase 5 grants the draft-fix workflow **`pull-requests: write`** — and on GitHub, `pull-requests: write` is **sufficient to merge a PR and to enable auto-merge**. So the guarantee rests entirely on the automation *choosing* not to call those endpoints. A prompt-injection via crawled competitor content, a bug, or a modified workflow would not be stopped by the permission model.

**Impact:** the strongest safety claim in the document (§2 #4, §17) is not technically enforced by the design; it is procedural.

**Recommendation:** make **branch protection on `main`** a hard, explicit requirement of the spec (currently only implied):
- required PR review by the owner (a human) with the automation account excluded / covered by CODEOWNERS;
- "Do not allow bypassing"; restrict who can push to `main`;
- ideally the automation account has **no** merge permission on `main` at all.

Also note: Vercel auto-deploys `main` on push, so the *only* real production gate is "who can write to `main`." That gate must be a GitHub branch-protection setting, and the spec should say so as normative, not leave it as an assumption.

---

### Finding D — "Single branch for everything incl. durable evidence" conflicts with "clean, independently reviewable fix batches" (Medium)

§5 (permanent single branch), §7.3 ("Store in repository … durable evidence summaries"), and Phase 1 (indexing log, weekly summary) mean **daily/weekly automation commits data and evidence to `seo-system`**. But §4.4 wants each *fix* to be an isolated, revertible, `findingId`-tagged commit, and there is **one long-lived draft PR `seo-system → main`** (§4.2). Consequence:

- the draft PR diff accumulates evidence/data commits **mixed with** code fixes, so "independently reviewable" and "selective reversion before merge" (§4.4) degrade over time;
- worse, **data/evidence artifacts would flow toward `main`** through that PR, which is almost certainly not intended (evidence belongs in artifacts/Sheet, not production).

Note the internal split already: §7.2 says per-run machine evidence → **GitHub artifacts** (ephemeral, good), but §7.3 says **durable evidence summaries → repository**. That second sink is the leak.

**Recommendation:** clarify the commit taxonomy. Options: (a) keep only *code + tests + rules/schemas + spec* on the `seo-system→main` PR path; keep evidence/data in workflow artifacts + the Sheet, never committed; or (b) if durable evidence must be in-repo, isolate it under a path that is **excluded from the production merge** (e.g. a `.seo-evidence/` dir the merge process drops, or committed only on a separate non-PR ref). Also specify the **merge strategy** (merge-commit, not squash) if per-finding commit isolation must survive into `main`.

---

### Finding E — OAuth scope enforcement of the read-only guarantee (Medium)

§4.3 forbids "write to Search Console/GA4 configuration," "request indexing," "URL removal." Good policy — but the GSC API exposes write scopes (sitemaps submit, URL removal) under the same product. The spec states the *behavioral* rule but does not mandate the *credential-level* enforcement.

**Recommendation:** require **read-only scopes** explicitly (`webmasters.readonly`, `analytics.readonly`) so the "read before write" principle (§2 #2) is enforced by the token itself, not just by intent. This makes Finding C-style accidents impossible for the Google side.

---

### Finding F — Free-tier GitHub Actions minutes are unbudgeted (Medium)

§16 safeguards cover artifact retention, Lighthouse URL limits, and crawl scheduling, but **not Actions compute minutes**. The schedule (§8) stacks: daily priority crawl + daily availability + per-PR validation + post-deploy verification + weekly full crawl + weekly Lighthouse. On a **private** repo the free allowance is 2,000 min/month; a browser-based full crawl + repeated multi-run Lighthouse can consume that quickly, which would break "free-first." (On a **public** repo Actions are unlimited/free — so repo visibility is a load-bearing fact the spec doesn't state.)

**Recommendation:** state repo visibility and, if private, add an Actions-minute budget to §16 (e.g. cap crawl concurrency, prefer PageSpeed Insights API over local Lighthouse where possible, weekly-not-daily full crawl — already partly done).

---

## 4. Smaller issues / nits

- **Findings lifecycle (§5.3):** states cover new→…→accepted-risk, but there is no explicit terminal **`false-positive` / `invalid`** state. Combined with §14 "reappearing findings reopen under the same identity" and "flaky rules are quarantined," a mis-fired rule could reopen indefinitely. Add an `invalid` terminal state.
- **GA4 vs GSC lag consistency (§8):** GSC "3-day delay" and GA4 "2-day delay" mean the Monday report's "current data" (§17) is inherently lagged. The staleness principle (§2 #7) already covers honesty here, but consider stating the report's data-as-of date explicitly.
- **Middleware not in the validation list (§6.4):** `middleware.ts` implements canonical/404 routing that is central to the normative canonical policy, yet §6.4 lists HTML/canonical/hreflang/etc. but not middleware-logic tests. Playwright journeys (§6.4 last bullet) partially cover it; consider naming middleware behaviour explicitly.
- **Vercel preview promotion (Phase 6):** ensure `seo-system` **preview** deployments cannot be promoted to production; only a human merge to `main` should. Worth one explicit sentence.
- **§6.7 "public competitor SERPs sampling":** automated scraping of Google SERPs violates Google ToS and is IP-fragile; "free-first" here carries a compliance/reliability risk the spec should acknowledge (it already hedges on backlink completeness — extend the same honesty to SERP sampling).
- **Terminology:** "user canonical vs Google-selected canonical" (§6.1) is correct GSC vocabulary — good. Keep it.

---

## 5. Summary of recommendations (by priority)

1. **(High)** Add GTM (`GTM-578JXRXS`) as a first-class data source + correlation input; treat "GA4/GTM effect without a commit" as a finding. *(Finding A)*
2. **(High)** Resolve the runtime/auth question: add a per-collector "Runtime & auth" subsection; most likely Apps Script owns GSC/GA4 to satisfy the no-SA-key ban. *(Finding B)*
3. **(High)** Make `main` branch protection a normative requirement so "no autonomous merge/deploy" is *enforced*, not just promised; prefer no merge permission for the automation account. *(Finding C)*
4. **(Medium)** Define the commit taxonomy so evidence/data never rides the `seo-system→main` PR into production; specify merge strategy. *(Finding D)*
5. **(Medium)** Mandate read-only Google OAuth scopes at the credential level. *(Finding E)*
6. **(Medium)** State repo visibility and add an Actions-minute budget to the free-tier safeguards. *(Finding F)*
7. **(Nits)** Add `invalid` lifecycle state; name middleware in validation; acknowledge SERP-sampling ToS/reliability risk; guard against preview→prod promotion.

None of these change the spec's sound governance philosophy — they close the gap between its (excellent) *policy* and its *enforceability + implementability*.
