# Evochia SEO Data Hub — M3–M7 Reporting & Decision Layer Design

**Status:** Owner-approved architecture; design specification pending final owner review  
**Date:** 2026-08-31  
**Baseline:** `main` @ `af546229608eb47b47074036af2449c58b4b6d8f`  
**Relationship to V1:** Extends the canonical Evochia SEO Data Hub V1 architecture without changing its source-of-truth ingestion contracts.

## 1. Purpose

The Evochia SEO Data Hub V1 established trustworthy canonical GSC and GA4 persistence, deterministic keys, freshness metadata, one production scheduler, and bounded operational logging. M3–M7 were intentionally frozen, not deleted, until recurring decisions required them.

That requirement now exists: the recurring Monday SEO briefing must reliably report weekly progress, ranking and traffic movement, indexing/canonical state, technical regressions, FAQ implementation, unresolved blockers, verified completed fixes, and one next highest-impact action. A reporting consumer must not need to reconstruct raw source schemas or infer whether an empty legacy tab means “zero”, “missing”, or “stale”.

M3–M7 therefore return as a **Reporting & Decision Layer** above the canonical V1 source layer.

The central product rule is:

> Canonical V1 tabs remain the only source of truth. M3–M7 materialize deterministic reporting, diagnostics, lifecycle state, and prioritization from those sources. The Monday briefing is a consumer of that decision state, not the decision engine itself.

## 2. Architectural choice

### Selected approach: integrated but modular Apps Script materialization

The existing bound Apps Script project remains the production runtime. M3–M7 are implemented as separate, testable modules invoked by the existing orchestrator.

Rejected alternatives:

1. **Separate reporting Apps Script project:** stronger physical isolation, but adds deployment/config/scheduler complexity and a second synchronization boundary.
2. **Sheet-formula-centric reporting:** easier to inspect manually, but weaker versioning/testing, more timezone/formula drift, and less reliable exact contracts.

### Logical architecture

```text
Google APIs / production site
          ↓
Canonical V1 ingestion
          ↓
     M3 Reporting API
          ↓
 ┌────────┴─────────┐
 ↓                  ↓
M4 Weekly           M5 Query
Performance         Intelligence
 └────────┬─────────┘
          ↓
 M6 Verification
 Index / Technical / FAQ
          ↓
 M7 Findings Lifecycle
 + Priority Engine
          ↓
Weekly_Summary decision projection
          ↓
Monday SEO briefing
```

The orchestrator coordinates stages but does not contain their business logic.

## 3. Locked M3–M7 mapping

- **M3 — Reporting API Materialization**  
  `GSC_Daily`, `GA4_Daily`, `GA4_Landing`, `Run_Log`
- **M4 — Weekly Performance Intelligence**  
  `Weekly_Summary`
- **M5 — Search Query Movement Intelligence**  
  `GSC_Query_Movement`
- **M6 — Site Verification & Diagnostics**  
  `GSC_Index`, `Technical_Checks`, `FAQ_Checks`
- **M7 — Findings & Decision Prioritization**  
  `Findings Summary` lifecycle plus bounded decision projection into `Weekly_Summary`

The underscore tab names are now a **stable Reporting API contract** for downstream consumers. They are not raw ingestion targets.

## 4. Source-of-truth boundary

Canonical V1 tabs with spaces remain authoritative:

- `GSC Daily`
- `GSC Pages`
- `GSC Queries`
- `GSC Page Queries`
- `GSC Indexing`
- `GA4 Daily`
- `GA4 Acquisition`
- `GA4 Landing Pages`
- `GA4 Events`
- `GA4 Pages`
- `GA4 URL Quality`
- `Run Log`
- `Config`
- `Findings Summary`

No M3–M7 path may independently re-fetch and persist a second copy of canonical GSC/GA4 history merely to populate reporting tabs.

Every reporting projection must preserve the distinction between:

- **Data Through:** the authoritative source freshness boundary.
- **Generated At:** the time the derived/reporting materialization was produced.

A headers-only reporting tab is never evidence that canonical source data is absent.

## 5. Scheduling model

### Hybrid model

One production time-driven trigger remains authorized.

The existing daily orchestrator performs:

1. canonical GSC/GA4 ingestion;
2. canonical freshness / `Run Log` updates;
3. M3 daily materialization;
4. if the weekly cycle is due, M4–M7 processing.

No second Monday trigger is introduced.

### Cadence

**Daily after ingestion**
- `GSC_Daily`
- `GA4_Daily`
- `GA4_Landing`
- `Run_Log`

**Weekly on the due cycle**
- `Weekly_Summary`
- `GSC_Query_Movement`
- `GSC_Index`
- `Technical_Checks`
- `FAQ_Checks`
- M7 findings refresh and priority selection

**Manual/on-demand**
- priority URL index inspection;
- technical recheck;
- FAQ recheck;
- M7 verification refresh.

Manual runs use the same contracts and logical keys as scheduled runs.

## 6. Failure domains

Canonical ingestion and downstream reporting/diagnostics are separate failure domains.

### Ingestion status

Exact V1 semantics remain:

```text
GSC success + GA4 success = SUCCESS
exactly one source succeeds = PARTIAL
both sources fail = FAILED
```

### Reporting / diagnostics status

Derived stages use:

- `SUCCESS`
- `PARTIAL`
- `FAILED`
- `STALE`

A downstream diagnostic failure must not convert a successful canonical import into a failed ingestion run.

A checker execution status and an SEO verdict are distinct:

```text
Status = SUCCESS, Pass = FALSE
```

means the checker succeeded and found a real defect.

```text
Status = ERROR, Pass = UNKNOWN
```

means insufficient evidence for a verdict.

## 7. Retention model

Use **mixed historical retention**, not latest-state-only.

- `GSC_Daily`, `GA4_Daily`, `GA4_Landing`: rolling reporting history materialized from canonical history.
- `Weekly_Summary`: one historical snapshot per finalized weekly period.
- `GSC_Query_Movement`: one historical snapshot per page/query/current-window-end.
- `GSC_Index`: historical snapshots per URL/check date.
- `Technical_Checks`: historical snapshots per check type/URL/check date.
- `FAQ_Checks`: historical snapshots per URL/check date.
- `Run_Log`: compact derived history.
- `Findings Summary`: stable lifecycle history with reopen semantics.

Every rerunnable dataset uses a deterministic logical key so rerunning the same logical period/check updates the existing snapshot instead of creating duplicates.

---

# M3 — Reporting API Materialization

## 8. `GSC_Daily`

### Purpose

Compact daily GSC reporting view for the property and commercially relevant page scopes.

### Schema

| Column | Meaning |
| --- | --- |
| `Date` | finalized GSC date |
| `Scope` | `PROPERTY` or normalized page path |
| `Clicks` | clicks |
| `Impressions` | impressions |
| `CTR` | clicks / impressions |
| `Average Position` | impression-weighted position |
| `Data Through` | authoritative GSC `dataAsOf` |
| `Generated At` | materialization timestamp |

**Logical key:** `Date + Scope`

### Rules

- `PROPERTY` rows come only from canonical `GSC Daily`.
- Page rows come from canonical `GSC Pages`.
- Never sum page rows and label the result as a property total.
- Missing/unavailable is not zero.
- Re-running the same date/scope is idempotent.

### Scope policy

Always include:

- `PROPERTY`
- `/en/private-chef/`
- `/en/catering/`
- `/el/private-chef/`
- `/el/catering/`

Specialized child pages are included dynamically when they have current/previous-period source data or an active M7 finding.

## 9. `GA4_Daily`

### Schema

| Column | Meaning |
| --- | --- |
| `Date` | finalized GA4 date |
| `Scope` | initially `PROPERTY` |
| `Sessions` | total sessions |
| `Organic Sessions` | sessions where canonical channel group is `Organic Search` |
| `Active Users` | source-supported active users |
| `New Users` | source-supported new users |
| `Engaged Sessions` | engaged sessions |
| `Engagement Rate` | engaged sessions / sessions |
| `Key Events` | key events |
| `Data Through` | authoritative GA4 `dataAsOf` |
| `Generated At` | materialization timestamp |

**Logical key:** `Date + Scope`

`Organic Sessions` is derived only from canonical `GA4 Acquisition` with `sessionDefaultChannelGroup = Organic Search`. No heuristic channel matching is permitted.

Any metric that cannot be safely reconstructed from the canonical stored grains remains unavailable until the canonical contract is explicitly extended.

## 10. `GA4_Landing`

### Schema

| Column | Meaning |
| --- | --- |
| `Date` | finalized GA4 date |
| `Landing Page` | normalized landing path |
| `Channel Group` | canonical channel group |
| `Sessions` | sessions |
| `Engaged Sessions` | engaged sessions |
| `Engagement Rate` | engaged sessions / sessions |
| `Key Events` | key events |
| `Data Through` | authoritative GA4 `dataAsOf` |
| `Generated At` | materialization timestamp |

**Logical key:** `Date + Landing Page + Channel Group`

Do not expose active/new-user fields unless the canonical landing-page grain itself supplies them safely.

## 11. `Run_Log`

### Purpose

One compact row per ingestion run so downstream consumers do not need to join the two canonical source rows themselves.

### Schema

| Column | Meaning |
| --- | --- |
| `Run ID` | canonical run ID |
| `Started At` | run start |
| `Finished At` | run finish |
| `GSC Status` | `SUCCESS` / `FAILED` |
| `GSC Data Through` | finalized GSC date |
| `GA4 Status` | `SUCCESS` / `FAILED` |
| `GA4 Data Through` | finalized GA4 date |
| `Ingestion Status` | `SUCCESS` / `PARTIAL` / `FAILED` |
| `Reporting Status` | `SUCCESS` / `PARTIAL` / `FAILED` / `STALE` |
| `Generated At` | projection timestamp |
| `Message` | bounded diagnostic summary |

**Logical key:** `Run ID`

---

# M4 — Weekly Performance Intelligence

## 12. Finalized-window semantics

Each source uses its own authoritative finalized endpoint.

```text
Current End   = latest authoritative Data Through
Current Start = Current End - 6 days
Previous End   = Current Start - 1 day
Previous Start = Previous End - 6 days
```

GSC and GA4 may have different finalized endpoints. GA4 is not artificially truncated to the GSC lag.

No `TODAY()`-based weekly calculation is permitted.

## 13. `Weekly_Summary`

### Schema

| Column | Meaning |
| --- | --- |
| `Source` | `GSC`, `GA4`, `TECHNICAL`, `INDEXING`, `FAQ`, `DECISION` |
| `Scope` | `PROPERTY`, page path, or diagnostic scope |
| `Metric` | canonical metric ID |
| `Current Start` | current finalized-window start |
| `Current End` | current finalized-window end |
| `Previous Start` | previous-window start |
| `Previous End` | previous-window end |
| `Current Value` | current metric |
| `Previous Value` | previous metric |
| `Absolute Change` | current - previous |
| `Percent Change` | nullable percentage |
| `Direction` | `UP`, `DOWN`, `FLAT`, `NEW`, `LOST`, `NA` |
| `Interpretation` | `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `CONTEXT_REQUIRED` |
| `Data Through` | authoritative source freshness |
| `Generated At` | materialization timestamp |

**Logical key:** `Source + Scope + Metric + Current End`

### Aggregation rules

GSC:

```text
Clicks      = SUM(clicks)
Impressions = SUM(impressions)
CTR         = SUM(clicks) / SUM(impressions)
Avg Position = SUM(position × impressions) / SUM(impressions)
```

Do not average daily CTR values or use a simple average of daily positions.

GA4 additive metrics are summed. Engagement rate is recomputed as `SUM(engagedSessions) / SUM(sessions)`.

Metrics that are not mathematically safe to reconstruct from stored grains remain unavailable.

### Direction vs interpretation

Direction is numeric; interpretation is semantic.

A position change from 15.2 to 10.4 is numerically `DOWN` but semantically `POSITIVE`.

### Missing-data rules

- `0` means authoritative zero.
- missing evidence means unavailable/null.
- incomplete finalized windows are `INCOMPLETE`, not valid WoW comparisons.
- previous `0`, current `>0` => `Percent Change = null`, `Direction = NEW`.
- previous `>0`, current `0` => `Direction = LOST`.
- never emit infinite percentage change.

### Page-scope eligibility

Always-on commercial scopes remain included. Specialized pages are included if they have current-period data, previous-period data, or an active `OPEN`/`VERIFYING` finding.

---

# M5 — Search Query Movement Intelligence

## 14. `GSC_Query_Movement`

### Schema

| Column | Meaning |
| --- | --- |
| `Page` | normalized landing page |
| `Query` | observed GSC query |
| `Current Start` | current window start |
| `Current End` | current window end |
| `Current Clicks` | current clicks |
| `Current Impressions` | current impressions |
| `Current CTR` | current weighted CTR |
| `Current Position` | current impression-weighted position |
| `Previous Start` | previous window start |
| `Previous End` | previous window end |
| `Previous Clicks` | previous clicks |
| `Previous Impressions` | previous impressions |
| `Previous CTR` | previous weighted CTR |
| `Previous Position` | previous weighted position |
| `Clicks Change` | current - previous |
| `Impressions Change` | current - previous |
| `Position Improvement` | previous position - current position |
| `Movement` | movement class |
| `Signal` | deterministic SEO signal |
| `Confidence` | `HIGH`, `MEDIUM`, `LOW` |
| `Data Through` | GSC finalized endpoint |
| `Generated At` | materialization timestamp |

**Logical key:** `Page + Query + Current End`

## 15. Movement classes

- `NEW`
- `LOST`
- `GAINING`
- `DECLINING`
- `STABLE`
- `LOW_SIGNAL`

Low-volume noise must not be labeled as meaningful gain/loss solely because position changed sharply on one or a few impressions.

## 16. Confidence bands

These are M5 evidence bands, not the M1/M2 page-level threshold:

- `HIGH`: at least 30 impressions in current or previous window.
- `MEDIUM`: 10–29.
- `LOW`: 1–9.

Low-confidence rows remain in history but cannot independently become the highest-impact action.

## 17. Deterministic signals

Initial signal taxonomy:

- `RANKING_OPPORTUNITY`
- `CTR_OPPORTUNITY`
- `INTENT_LANDING_MISMATCH`
- `POSSIBLE_CANNIBALIZATION`
- `SPECIALIZED_PAGE_EMERGENCE`
- `VISIBILITY_LOSS`
- `BRANDED`

### CTR opportunity guard

A CTR opportunity requires the locked visibility and volume contract, including `VISIBLE_POSITION_MAX = 5` and the approved page-level eligibility logic. M5 must not diagnose a CTR problem for deeply ranked pages.

### Intent/landing mismatch

Use controlled intent-family configuration, not AI guessing. Each intent family can define an expected dedicated page and parent hub.

A mismatch begins as a candidate and requires corroborating M6 evidence before becoming a verified M7 finding.

### Cannibalization

`POSSIBLE_CANNIBALIZATION` requires the same observed query to appear on at least two indexable Evochia pages with meaningful impressions in the same period. Similar keywords in source content are insufficient.

## 18. Privacy/truncation guardrail

`GSC_Query_Movement` represents only the visible Search Console page-query subset.

Absence of a query row is not proof of zero property demand. The system must not use this table for property totals, market share, or complete demand estimates.

A `LOST` signal based on very small historical volume remains low confidence unless corroborated.

---

# M6 — Site Verification & Diagnostics

## 19. Core semantic separation

Two evidence channels remain permanently distinct:

1. **Google stored/indexing state** — what URL Inspection reports Google knows about the URL.
2. **Live technical state** — what the production site returns now.

A live technical pass does not mean indexed. A stored Google index problem does not automatically mean a live technical defect.

## 20. `GSC_Index`

### Source

Google URL Inspection API / stored Google index state.

### Schema

| Column | Meaning |
| --- | --- |
| `Check Date` | logical snapshot date |
| `Checked At` | execution timestamp |
| `URL` | inspected canonical URL |
| `Verdict` | API verdict |
| `Coverage State` | coverage/index state |
| `Robots.txt State` | stored robots state |
| `Indexing State` | stored indexing state |
| `Page Fetch State` | recorded fetch state |
| `Google Canonical` | Google-selected canonical |
| `User Canonical` | declared canonical reported by Google |
| `Canonical Match` | `TRUE`, `FALSE`, `UNKNOWN` |
| `Last Crawl Time` | stored last crawl |
| `Sitemaps` | known sitemap references |
| `Referring URLs` | known referring URLs when returned |
| `Inspection Status` | `SUCCESS`, `ERROR`, `UNAVAILABLE` |
| `Error` | bounded error evidence |
| `Data Through` | snapshot date |
| `Generated At` | materialization timestamp |

**Logical key:** `Check Date + URL`

`GSC_Index` must never label a result as a live URL test.

## 21. `Technical_Checks`

### Schema

| Column | Meaning |
| --- | --- |
| `Check Date` | logical snapshot date |
| `Checked At` | execution timestamp |
| `Check Type` | deterministic check ID |
| `URL` | requested URL |
| `HTTP Status` | response status |
| `Redirect Location` | redirect target when applicable |
| `Final URL` | final URL after approved chain |
| `Canonical Found` | extracted canonical |
| `Expected Canonical` | route contract canonical |
| `Canonical Match` | `TRUE`, `FALSE`, `UNKNOWN` |
| `Robots Meta` | live index/follow state |
| `Expected Result` | explicit contract |
| `Pass` | `TRUE`, `FALSE`, `UNKNOWN` |
| `Status` | `SUCCESS`, `ERROR`, `UNAVAILABLE` |
| `Notes` | bounded evidence |
| `Generated At` | timestamp |

**Logical key:** `Check Date + Check Type + URL`

### Check families

- `INDEXABLE_PAGE`: HTTP 200, expected self-canonical, no unintended `noindex`.
- `INTENTIONAL_REDIRECT`: expected redirect status and destination; an intentional 301 is a pass.
- `DOUBLE_SLASH`: deterministic malformed-route samples must normalize to the approved canonical route.
- `CANONICAL`: explicit live canonical verification.

No recursive crawler, arbitrary malformed-URL generation, or unbounded link discovery.

Hreflang remains protected primarily by repository page-integrity CI unless recurring production evidence proves a need for a separate live M6 contract.

## 22. `FAQ_Checks`

### Schema

| Column | Meaning |
| --- | --- |
| `Check Date` | snapshot date |
| `Checked At` | execution timestamp |
| `URL` | expected FAQ-bearing URL |
| `FAQPage Found` | `TRUE` / `FALSE` |
| `Question Count` | parsed count |
| `Basic Structure Valid` | `TRUE`, `FALSE`, `UNKNOWN` |
| `Status` | `SUCCESS`, `ERROR`, `UNAVAILABLE` |
| `Notes` | bounded evidence |
| `Generated At` | timestamp |

**Logical key:** `Check Date + URL`

Basic validation means parseable JSON-LD with an appropriate `FAQPage` structure, `mainEntity`, questions, and accepted answers. It does not claim eligibility for or appearance of a Google rich result.

## 23. Coverage policy

### `GSC_Index`

Weekly: all currently indexable URLs in the canonical sitemap inventory.

### `Technical_Checks`

Weekly:
- all indexable sitemap URLs;
- approved intentional legacy redirects;
- deterministic double-slash cases.

### `FAQ_Checks`

Only pages explicitly expected to contain FAQPage markup.

No second hardcoded copy of the full site route inventory is permitted when canonical sitemap/route sources already exist.

## 24. Retry and runtime protection

Retry at most once for transient failures such as 429, 5xx, or transport errors.

Do not retry deterministic SEO outcomes such as 404, wrong canonical, `noindex`, malformed FAQ JSON-LD, or redirect mismatch.

One URL failure does not abort the remaining sweep.

M6 must preserve Apps Script execution headroom:

- bounded URL inventory;
- no recursive crawl;
- no unlimited retry;
- time-budget awareness;
- deterministic continuation/resume if the weekly sweep cannot safely complete;
- canonical daily ingestion always has higher operational priority than diagnostics.

## 25. M6 evidence classes

M6 may emit evidence classes such as:

- `INDEX_NOT_INDEXED`
- `GOOGLE_USER_CANONICAL_MISMATCH`
- `LIVE_CANONICAL_MISMATCH`
- `UNEXPECTED_NOINDEX`
- `HTTP_FAILURE`
- `REDIRECT_MISMATCH`
- `DOUBLE_SLASH_FAILURE`
- `FAQ_MISSING`
- `FAQ_INVALID`

M6 does not decide global priority.

---

# M7 — Findings & Decision Prioritization

## 26. Authoritative lifecycle store

Use the existing canonical `Findings Summary` tab as the authoritative M7 state store.

### Schema

| Column | Meaning |
| --- | --- |
| `Finding ID` | stable deterministic identifier |
| `Finding Type` | canonical class |
| `Scope` | URL, query family, or property |
| `Subject` | compact human-readable target |
| `Status` | lifecycle status |
| `Severity` | technical/business severity |
| `Impact` | expected SEO/business impact |
| `Confidence` | evidence confidence |
| `Priority Score` | derived ordering aid, not product truth |
| `First Detected At` | first supporting evidence |
| `Last Observed At` | latest supporting evidence |
| `Verification Due At` | nullable verification target |
| `Resolved At` | nullable resolution timestamp |
| `Evidence Source` | M4, M5, or M6 |
| `Evidence Key` | deterministic source reference |
| `Recommended Action` | bounded action |
| `Resolution Criteria` | exact closure condition |
| `Notes` | compact context |
| `Updated At` | state update timestamp |

## 27. Stable identity and deduplication

The same underlying problem must refresh one finding instead of generating a new issue every week.

Examples:

```text
INDEX_NOT_INDEXED|/en/villa-private-chef/
```

or for a cluster-level query problem:

```text
INTENT_LANDING_MISMATCH|/en/private-chef/|villa-private-chef
```

Use controlled intent-family identity rather than one finding per spelling variant.

## 28. Lifecycle

```text
OPEN → IN_PROGRESS → VERIFYING → RESOLVED
```

Alternative transitions:

```text
OPEN / IN_PROGRESS → DISMISSED
RESOLVED → REOPENED
```

### Semantics

- `OPEN`: verified actionable problem/opportunity exists.
- `IN_PROGRESS`: remediation work has actually begun.
- `VERIFYING`: implementation/deployment occurred; authoritative outcome evidence is pending.
- `RESOLVED`: exact resolution criteria are verified in production/authoritative evidence.
- `DISMISSED`: false positive, intentional behavior, or explicit no-action decision; reason required.
- `REOPENED`: the same deterministic defect/opportunity condition returned after resolution.

A merge or deployment alone is never sufficient to mark an SEO finding resolved.

## 29. Automated transition boundary

The system may automatically perform only evidence-driven transitions that are deterministic:

- new qualifying evidence → `OPEN`;
- repeated evidence → refresh existing `OPEN`/active finding;
- `VERIFYING` → `RESOLVED` when exact resolution criteria pass;
- `RESOLVED` → `REOPENED` when the same verified condition reappears.

The system must not automatically set:

- `OPEN → IN_PROGRESS`;
- `OPEN/IN_PROGRESS → DISMISSED`;

unless an explicit owner action or deterministic intentional-condition contract exists.

## 30. Initial finding taxonomy

### Indexing
- `INDEX_UNKNOWN`
- `INDEX_NOT_INDEXED`
- `INDEX_CRAWLED_NOT_INDEXED`
- `GOOGLE_USER_CANONICAL_MISMATCH`

### Technical
- `LIVE_CANONICAL_MISMATCH`
- `UNEXPECTED_NOINDEX`
- `HTTP_FAILURE`
- `REDIRECT_MISMATCH`
- `DOUBLE_SLASH_FAILURE`

### Structured data
- `FAQ_MISSING`
- `FAQ_INVALID`

### Search performance
- `VISIBILITY_LOSS`
- `RANKING_OPPORTUNITY`
- `CTR_OPPORTUNITY`
- `INTENT_LANDING_MISMATCH`
- `POSSIBLE_CANNIBALIZATION`

Do not add speculative future categories without a recurring decision need.

## 31. Resolution criteria

Resolution is finding-specific.

Examples:

- `INDEX_NOT_INDEXED`: authoritative index evidence shows indexed/eligible indexed state.
- `GOOGLE_USER_CANONICAL_MISMATCH`: Google-selected canonical equals expected canonical.
- `LIVE_CANONICAL_MISMATCH`: live technical canonical check passes.
- `REDIRECT_MISMATCH`: expected redirect status and destination pass.
- `FAQ_MISSING` / `FAQ_INVALID`: FAQ present and basic structure passes.
- `INTENT_LANDING_MISMATCH`: dedicated page is indexed and begins receiving meaningful matching-intent visibility, or the owner explicitly consolidates/dismisses the dedicated intent.
- `RANKING_OPPORTUNITY`: target threshold reached, opportunity materially decays, or owner dismisses.

M6-dependent findings cannot be newly resolved from stale M6 evidence.

## 32. Severity, impact, confidence

These are separate dimensions.

### Severity
- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`

### Impact
- `VERY_HIGH`
- `HIGH`
- `MEDIUM`
- `LOW`

Impact may use deterministic factors such as commercial page class, impressions, organic sessions, key events, and active strategic intent.

### Confidence
- `HIGH`
- `MEDIUM`
- `LOW`

Examples: a live 404 is high-confidence evidence; a one-impression query movement is low confidence.

## 33. Priority model

Do not use opaque AI/ML ranking or a sitewide “SEO score”.

Use deterministic lexicographic priority tiers.

### Tier 1 — hard blockers
1. sitewide/indexability blocker;
2. commercial-page technical blocker;
3. commercial-page indexing blocker.

### Tier 2 — verified landing/intent failures
4. high-confidence intent/landing mismatch;
5. verified canonical/index-selection problem;
6. meaningful visibility loss.

### Tier 3 — growth opportunities
7. high-confidence ranking opportunity;
8. eligible CTR opportunity;
9. GA4 engagement/conversion opportunity when source support exists.

### Tier 4 — maintenance
10. FAQ/structured-data issue;
11. low-volume or low-confidence signal.

Within the same tier, order by:

```text
Impact → Confidence → Severity → observed volume → oldest unresolved finding
```

A numeric `Priority Score` may exist as a derived sorting/debugging representation, but it is not the authoritative product meaning and must not be reported as a global SEO health score.

## 34. Single next highest-impact action

M7 selects exactly one eligible finding when evidence is sufficient.

The decision projection must provide:

- `Finding ID`
- `Finding Type`
- `Scope`
- `Why Now`
- `Recommended Action`
- `Evidence`
- `Resolution Criteria`

The language layer may explain the deterministic choice, but it must not substitute another finding based on free-form preference.

If no finding has sufficient evidence, emit:

```text
Decision status = INSUFFICIENT_EVIDENCE
```

Do not guess.

## 35. Verified completed fixes

The Monday briefing may call a fix “completed” only when the underlying finding transitioned to `RESOLVED` during the reporting period.

A deployed change awaiting authoritative evidence is reported separately as `VERIFYING` / implemented but awaiting verification.

## 36. `Weekly_Summary` decision projection

M7 writes bounded decision-state rows into `Weekly_Summary`, for example:

- `HIGHEST_PRIORITY_FINDING`
- `OPEN_BLOCKERS`
- `VERIFYING_FINDINGS`
- `RESOLVED_FINDINGS`

The full finding record remains in `Findings Summary`.

---

# Product and consumer contract

## 37. Monday briefing behavior

The reporting tabs remain the primary read surface:

- `Weekly_Summary`
- `GSC_Query_Movement`
- `GSC_Index`
- `Technical_Checks`
- `FAQ_Checks`
- `GSC_Daily`
- `GA4_Daily`
- `GA4_Landing`
- `Run_Log`

If a reporting tab is empty, stale, or inconsistent, a trusted consumer must verify against canonical V1 tabs before reporting data as unavailable.

A recommended briefing instruction is:

> Use `Weekly_Summary`, `GSC_Query_Movement`, `GSC_Index`, `Technical_Checks`, `FAQ_Checks`, `GSC_Daily`, `GA4_Daily`, `GA4_Landing`, and `Run_Log` as the primary reporting layer. If any reporting tab is empty, stale, or inconsistent, verify against the canonical V1 source tabs `GSC Daily`, `GSC Pages`, `GSC Page Queries`, `GA4 Daily`, `GA4 Acquisition`, `GA4 Landing Pages`, `Run Log`, and `Config` before reporting data as unavailable. Never interpret a headers-only reporting tab as proof that the canonical source has no data. Do not invent metrics; clearly identify missing, stale, incomplete, or unauthorized data.

The briefing summarizes and explains validated decision state; it does not recompute the authoritative priority engine.

## 38. Product transparency requirements

Every consumer-facing result must preserve enough evidence to distinguish:

- authoritative zero;
- missing/unavailable;
- incomplete finalized window;
- stale materialization;
- failed source ingestion;
- successful checker that found a defect;
- checker failure with unknown verdict;
- implemented remediation awaiting verification;
- verified resolution.

These distinctions are product behavior, not implementation details.

---

# Non-goals

## 39. Explicit exclusions

This design does **not** authorize:

- a second raw GSC/GA4 ingestion database;
- a second scheduled trigger;
- recursive site crawling;
- arbitrary malformed-URL generation;
- unlimited retries;
- AI-generated priority outside the deterministic M7 model;
- a sitewide 0–100 SEO score;
- treating Search Console visible query rows as the complete query universe;
- treating live fetchability as proof of Google indexation;
- treating a merge/deployment as proof of SEO resolution;
- claiming FAQ rich-result eligibility from basic JSON-LD structure checks;
- fabricating data for missing dates or missing metrics.

## 40. OAuth and external-surface policy

M3–M7 should reuse the minimum capabilities already available where possible. Any implementation-plan proposal that requires an additional OAuth scope or external service must call it out explicitly as a separate owner approval gate before implementation.

No scope expansion is implicit in this design.

---

# Acceptance criteria

## 41. Product acceptance

The design is successfully implemented only when all of the following are true:

1. Canonical V1 tabs remain the only raw GSC/GA4 source of truth.
2. The nine reporting tabs are populated through deterministic materialization/diagnostics rather than stale legacy logic.
3. `Data Through` and `Generated At` make source freshness and reporting freshness independently visible.
4. Re-running the same logical period/check does not create duplicate snapshots.
5. Weekly comparisons use complete finalized 7-day windows per source.
6. GSC property totals are never derived by summing page-grain data.
7. M5 explicitly preserves the Search Console privacy/truncation caveat.
8. Stored Google index state and live technical state remain separate evidence channels.
9. Intentional redirects are evaluated against their intended redirect contract, not automatically treated as defects.
10. M6 failures cannot overwrite or mislabel successful canonical ingestion.
11. Findings have stable identities and deterministic lifecycle transitions.
12. `RESOLVED` requires exact authoritative verification criteria.
13. One deterministic highest-priority action is selected when sufficient evidence exists; otherwise the system emits `INSUFFICIENT_EVIDENCE`.
14. The Monday briefing can distinguish completed verified fixes from implemented-but-awaiting-verification work.
15. A headers-only or stale reporting tab cannot cause a false “canonical data missing” conclusion without fallback verification.
16. The existing single-trigger operational model remains intact unless a later owner-approved design explicitly changes it.

## 42. Engineering acceptance

The implementation plan must require:

- TDD for every new materializer, diagnostic parser, lifecycle transition, and priority rule;
- exact schema/column contract tests for all reporting tabs;
- deterministic logical-key/idempotency tests;
- mutation/failure tests for missing data, stale data, partial diagnostics, and retry boundaries;
- no network calls in CI; use synthetic transports/fixtures;
- preservation of existing V1 ingestion, security, page-integrity, and browser gates;
- runtime-budget tests/design guards for M6 weekly diagnostics;
- a migration/activation step that handles the currently headers-only underscore tabs without losing any retained historical content;
- a production verification run before the Monday briefing is allowed to treat M3–M7 as authoritative.

## 43. Activation boundary

This design is intentionally separate from PR #40.

Implementation begins only after:

1. this design specification receives final owner review/approval;
2. the detailed implementation plan is written and reviewed;
3. the implementation work is started on a separate branch/PR after the current V1 PR gate is closed or otherwise explicitly authorized by the owner.

The current retained-history horizon question for PR #40 does not invalidate this design, but M3–M7 implementation must not silently contaminate or bypass the V1 merge gate.
