# Evochia SEO Data Hub — M3–M7 Reporting & Decision Layer Design

**Status:** Owner-approved architecture; design specification pending final owner review  
**Date:** 2026-08-31  
**Baseline:** `main` @ `af546229608eb47b47074036af2449c58b4b6d8f`  
**Relationship to V1:** Extends the canonical Evochia SEO Data Hub V1 architecture without changing its source-of-truth GSC/GA4 ingestion contracts.

## 1. Purpose

The Evochia SEO Data Hub V1 established trustworthy canonical GSC and GA4 persistence, deterministic keys, freshness metadata, one production scheduler, and bounded operational logging. M3–M7 were intentionally frozen, not deleted, until a recurring decision could not be made reliably without them.

That requirement now exists. The recurring Monday SEO briefing must reliably report weekly progress, ranking and traffic movement, indexing/canonical state, technical regressions, FAQ implementation, unresolved blockers, verified completed fixes, and one next highest-impact action. A downstream consumer must not need to reconstruct raw schemas or infer whether an empty compatibility tab means zero, missing, stale, or broken reporting.

M3–M7 therefore return as a **Reporting & Decision Layer** above canonical V1.

> **Product rule:** Canonical V1 data remains authoritative. M3–M7 materialize deterministic reporting, diagnostics, lifecycle state, and prioritization from canonical evidence. The Monday briefing explains that state; it is not the decision engine.

---

# 2. Architectural choice

## Selected approach — integrated but modular Apps Script

The existing bound Apps Script project remains the production runtime. M3–M7 are implemented as separate testable modules invoked by the existing orchestrator.

Rejected alternatives:

1. **Separate reporting Apps Script project:** stronger physical isolation but introduces a second deployment/config/scheduler/synchronization boundary.
2. **Sheet-formula-centric reporting:** easier to inspect manually but weaker versioning, testability, timezone control, and fail-closed behavior.

```text
Google APIs / production site
          ↓
Canonical V1 source layer
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

The orchestrator coordinates modules; it does not contain their business logic.

---

# 3. Authoritative M3–M7 mapping

- **M3 — Reporting API Materialization**  
  `GSC_Daily`, `GA4_Daily`, `GA4_Landing`, `Run_Log`
- **M4 — Weekly Performance Intelligence**  
  `Weekly_Summary`
- **M5 — Search Query Movement Intelligence**  
  `GSC_Query_Movement`
- **M6 — Site Verification & Diagnostics**  
  canonical `GSC Indexing` + reporting `GSC_Index`, plus `Technical_Checks`, `FAQ_Checks`
- **M7 — Findings & Decision Prioritization**  
  canonical `Findings Summary` lifecycle + bounded decision projection into `Weekly_Summary`

The underscore tab names are a stable **Reporting API / compatibility contract** for downstream consumers. They are not a second raw GSC/GA4 database.

---

# 4. Source-of-truth boundary

Canonical V1 tabs remain authoritative for GSC/GA4:

- `GSC Daily`
- `GSC Pages`
- `GSC Queries`
- `GSC Page Queries`
- `GA4 Daily`
- `GA4 Acquisition`
- `GA4 Landing Pages`
- `GA4 Events`
- `GA4 Pages`
- `GA4 URL Quality`
- `Run Log`
- `Config`

M6 indexing adds canonical diagnostic persistence in the already-existing `GSC Indexing` tab. `GSC_Index` is the stable reporting projection of that canonical inspection history.

M7 authoritative lifecycle state is stored in `Findings Summary`.

`Technical_Checks` and `FAQ_Checks` are deterministic diagnostic history tables. They are not raw GSC/GA4 ingestion targets and do not duplicate canonical analytics history.

No M3–M7 path may independently persist a second canonical copy of GSC/GA4 data merely to populate reporting tabs.

Every derived reporting output must distinguish:

- **Data Through:** authoritative source/evidence freshness boundary.
- **Generated At:** reporting materialization timestamp.

A headers-only reporting tab is never evidence that canonical source data is absent.

---

# 5. Scheduling and orchestration

## Hybrid model

Exactly one production time-driven trigger remains authorized.

The existing daily orchestrator performs:

1. canonical GSC/GA4 ingestion;
2. canonical freshness and `Run Log` update;
3. M3 daily materialization;
4. if the weekly cycle is due, M4–M7 processing.

No second Monday trigger is added.

## Cadence

### Daily after ingestion

- `GSC_Daily`
- `GA4_Daily`
- `GA4_Landing`
- `Run_Log`

### Weekly

The weekly cycle is due on the **Monday daily production run**, after canonical ingestion and before the Monday briefing is expected to consume the reporting layer.

It refreshes:

- `Weekly_Summary`
- `GSC_Query_Movement`
- canonical `GSC Indexing` and reporting `GSC_Index`
- `Technical_Checks`
- `FAQ_Checks`
- M7 findings and priority decision

Weekly periods themselves are based on finalized source dates, not the wall-clock Monday date.

### Manual/on-demand

Priority URLs may be rechecked without waiting for Monday:

- URL inspection;
- technical validation;
- FAQ validation;
- M7 verification refresh.

Manual runs use the same schemas and logical keys as scheduled runs.

---

# 6. Failure domains

Canonical ingestion and downstream reporting/diagnostics are separate failure domains.

## Ingestion status

V1 semantics remain exact:

```text
GSC success + GA4 success = SUCCESS
exactly one source succeeds = PARTIAL
both sources fail = FAILED
```

## Reporting / diagnostics status

Derived stages use:

- `SUCCESS`
- `PARTIAL`
- `FAILED`
- `STALE`

A downstream diagnostic failure must not convert successful canonical ingestion into failed ingestion.

Checker execution and SEO verdict are distinct:

```text
Status = SUCCESS, Pass = FALSE
```

means the checker worked and found a defect.

```text
Status = ERROR, Pass = UNKNOWN
```

means insufficient evidence for an SEO verdict.

---

# 7. Retention model

Use **mixed historical retention**, not latest-state-only.

- `GSC_Daily`, `GA4_Daily`, `GA4_Landing`: rolling derived history from canonical history.
- `Weekly_Summary`: historical finalized weekly snapshots.
- `GSC_Query_Movement`: historical snapshots by page/query/current-window-end.
- `GSC Indexing` / `GSC_Index`: historical URL inspection snapshots.
- `Technical_Checks`: historical check-type/URL snapshots.
- `FAQ_Checks`: historical URL snapshots.
- `Run_Log`: compact derived run history.
- `Findings Summary`: stable lifecycle history with reopen semantics.

Rerunning the same logical period/check uses deterministic keys and must update the same snapshot rather than create duplicates.

---

# M3 — Reporting API Materialization

# 8. `GSC_Daily`

## Schema

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

## Rules

- `PROPERTY` rows come only from canonical `GSC Daily`.
- Page rows come from canonical `GSC Pages`.
- Never sum page rows and label them property totals.
- Missing/unavailable is not zero.
- Same date/scope reruns are idempotent.

## Scope policy

Always include:

- `PROPERTY`
- `/en/private-chef/`
- `/en/catering/`
- `/el/private-chef/`
- `/el/catering/`

Specialized child pages are included dynamically when they have current-period data, previous-period data, or an active M7 finding.

---

# 9. `GA4_Daily`

## Schema

| Column | Meaning |
| --- | --- |
| `Date` | finalized GA4 date |
| `Scope` | initially `PROPERTY` |
| `Sessions` | total sessions |
| `Organic Sessions` | Organic Search sessions |
| `Active Users` | nullable compatibility field; only populated from an authoritative property-grain unique-user source |
| `New Users` | nullable compatibility field; only populated from an authoritative property-grain unique-user source |
| `Engaged Sessions` | engaged sessions |
| `Engagement Rate` | engaged sessions / sessions |
| `Key Events` | key events |
| `Data Through` | authoritative GA4 `dataAsOf` |
| `Generated At` | materialization timestamp |

**Logical key:** `Date + Scope`

`Organic Sessions` is derived only from canonical `GA4 Acquisition` where `sessionDefaultChannelGroup = Organic Search`.

Canonical `GA4 Daily` is currently device-grain. Active/new users must **not** be summed across device categories because cross-device uniqueness is not guaranteed. Until a canonical property-grain unique-user source exists, these compatibility fields remain unavailable/null rather than fabricated.

Sessions, engaged sessions, and key events may be aggregated only where the underlying canonical dimensions are mutually exclusive for the metric being combined.

---

# 10. `GA4_Landing`

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

Active/new-user fields are not exposed unless the canonical landing-page grain is explicitly extended to provide them safely.

---

# 11. `Run_Log`

One compact row per canonical ingestion run.

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

# 12. Finalized-window semantics

Each source uses its own authoritative finalized endpoint:

```text
Current End   = latest authoritative Data Through
Current Start = Current End - 6 days
Previous End   = Current Start - 1 day
Previous Start = Previous End - 6 days
```

GSC and GA4 may have different finalized endpoints. GA4 is not artificially truncated to the GSC lag.

No `TODAY()`-based reporting window is permitted.

---

# 13. `Weekly_Summary`

## Schema

| Column | Meaning |
| --- | --- |
| `Source` | `GSC`, `GA4`, `TECHNICAL`, `INDEXING`, `FAQ`, `DECISION` |
| `Scope` | `PROPERTY`, page path, or diagnostic scope |
| `Metric` | canonical metric ID |
| `Current Start` | current window start |
| `Current End` | current window end |
| `Previous Start` | previous window start |
| `Previous End` | previous window end |
| `Current Value` | numeric or bounded decision/status value, depending on metric |
| `Previous Value` | nullable previous value |
| `Absolute Change` | nullable numeric change |
| `Percent Change` | nullable percentage |
| `Direction` | `UP`, `DOWN`, `FLAT`, `NEW`, `LOST`, `NA` |
| `Interpretation` | `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `CONTEXT_REQUIRED` |
| `Period Status` | `COMPLETE`, `INCOMPLETE`, `UNAVAILABLE`, `NA` |
| `Data Through` | authoritative source freshness |
| `Generated At` | materialization timestamp |

**Logical key:** `Source + Scope + Metric + Current End`

Decision/status rows use `Direction = NA`, nullable change fields, and `Period Status = NA` when a numeric WoW comparison is not meaningful.

## Aggregation rules

### GSC

```text
Clicks       = SUM(clicks)
Impressions  = SUM(impressions)
CTR          = SUM(clicks) / SUM(impressions)
Avg Position = SUM(position × impressions) / SUM(impressions)
```

Never average daily CTRs or simple-average daily positions.

### GA4

Safe additive metrics may be summed. Engagement rate is recomputed as:

```text
SUM(engagedSessions) / SUM(sessions)
```

`Active Users` and `New Users` are **not** valid weekly sums from device-grain/daily unique-user rows and are excluded from authoritative M4 WoW totals unless canonical property-period support is added later.

## Missing-data rules

- `0` means authoritative zero.
- missing evidence means unavailable/null.
- incomplete finalized windows use `Period Status = INCOMPLETE` and are not valid WoW comparisons.
- previous `0`, current `>0` => `Percent Change = null`, `Direction = NEW`.
- previous `>0`, current `0` => `Direction = LOST`.
- never emit infinite percentage change.

## Page-scope eligibility

Always-on commercial scopes remain included. Specialized pages are included when they have current data, previous data, or an active `OPEN`/`VERIFYING` finding.

---

# M5 — Search Query Movement Intelligence

# 14. `GSC_Query_Movement`

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

## Movement classes

- `NEW`
- `LOST`
- `GAINING`
- `DECLINING`
- `STABLE`
- `LOW_SIGNAL`

Low-volume noise must not be called a meaningful gain/loss solely because position changed sharply.

## Confidence bands

These are M5 evidence bands, not the M1/M2 page-level threshold:

- `HIGH`: at least 30 impressions in current or previous window.
- `MEDIUM`: 10–29.
- `LOW`: 1–9.

Low-confidence rows remain in history but cannot independently become the highest-impact action.

## Signals

Initial deterministic signal taxonomy:

- `RANKING_OPPORTUNITY`
- `CTR_OPPORTUNITY`
- `INTENT_LANDING_MISMATCH`
- `POSSIBLE_CANNIBALIZATION`
- `SPECIALIZED_PAGE_EMERGENCE`
- `VISIBILITY_LOSS`
- `BRANDED`

### CTR guard

CTR opportunity requires the locked visibility/volume contract, including `VISIBLE_POSITION_MAX = 5` and approved page eligibility logic. Deeply ranked pages are not diagnosed as CTR problems.

### Intent/landing mismatch

Use controlled intent-family configuration, not AI guessing. Each family can define a dedicated expected page and parent hub.

A mismatch is a candidate until corroborating M6 indexing/live evidence allows M7 to verify it.

### Cannibalization

`POSSIBLE_CANNIBALIZATION` requires the same observed query to appear on at least two indexable Evochia pages with meaningful impressions in the same period. Similar source keywords are insufficient.

## Privacy/truncation guardrail

`GSC_Query_Movement` represents only the visible Search Console page-query subset.

Absence of a query row is not proof of zero property demand. This table must not be used for property totals, market share, or complete demand estimates.

---

# M6 — Site Verification & Diagnostics

# 15. Core evidence separation

Two evidence channels remain permanently distinct:

1. **Google stored/indexing state** — URL Inspection evidence Google knows about the URL.
2. **Live technical state** — what production serves now.

A live technical pass does not mean indexed. A stored indexing problem does not automatically prove a current live technical defect.

---

# 16. Canonical `GSC Indexing` and reporting `GSC_Index`

## Data flow

```text
URL Inspection API
      ↓
canonical GSC Indexing
      ↓
reporting GSC_Index
```

The inspection module fetches the authoritative provider result, persists the canonical snapshot in `GSC Indexing`, then materializes the stable reporting schema in `GSC_Index`.

## Reporting schema

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
| `User Canonical` | user canonical reported by Google |
| `Canonical Match` | `TRUE`, `FALSE`, `UNKNOWN` |
| `Last Crawl Time` | stored last crawl |
| `Sitemaps` | known sitemap references |
| `Referring URLs` | known referring URLs when returned |
| `Inspection Status` | `SUCCESS`, `ERROR`, `UNAVAILABLE` |
| `Error` | bounded error evidence |
| `Data Through` | inspection snapshot date |
| `Generated At` | materialization timestamp |

**Logical key:** `Check Date + URL`

`GSC_Index` must never describe an inspection as a live URL test.

---

# 17. `Technical_Checks`

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

## Check families

- `INDEXABLE_PAGE`: HTTP 200, expected self-canonical, no unintended `noindex`.
- `INTENTIONAL_REDIRECT`: expected redirect status/destination; an intentional 301 is a pass.
- `DOUBLE_SLASH`: deterministic malformed-route samples normalize to the approved canonical route.
- `CANONICAL`: explicit live canonical verification.

No recursive crawler, arbitrary malformed-URL generation, or unbounded link discovery.

Hreflang remains primarily protected by repository page-integrity CI until recurring production evidence proves a separate live M6 check is required.

---

# 18. `FAQ_Checks`

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

Basic validation means parseable JSON-LD with appropriate `FAQPage`, `mainEntity`, question, and accepted-answer structures. It does not claim Google rich-result eligibility or appearance.

---

# 19. M6 coverage

## GSC indexing

Weekly: all currently indexable URLs in the canonical sitemap inventory.

## Technical checks

Weekly:

- all indexable sitemap URLs;
- approved intentional legacy redirects;
- deterministic double-slash cases.

## FAQ checks

Only pages explicitly expected to contain FAQPage markup.

Do not maintain a second hardcoded full-site URL inventory when canonical sitemap/route sources already exist.

---

# 20. Retry and runtime protection

Retry at most once for transient 429, 5xx, or transport failures.

Do not retry deterministic SEO outcomes such as 404, wrong canonical, `noindex`, malformed FAQ JSON-LD, or redirect mismatch.

One URL failure does not abort the remaining sweep.

M6 must preserve Apps Script execution headroom:

- bounded inventory;
- no recursive crawl;
- no unlimited retries;
- time-budget awareness;
- deterministic continuation/resume if the weekly sweep cannot safely complete;
- canonical daily ingestion has higher operational priority than diagnostics.

M6 may emit evidence such as:

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

# 21. Authoritative lifecycle store

Use canonical `Findings Summary`.

| Column | Meaning |
| --- | --- |
| `Finding ID` | stable deterministic identifier |
| `Finding Type` | canonical class |
| `Scope` | URL, intent/query family, or property |
| `Subject` | compact human-readable target |
| `Status` | lifecycle status |
| `Severity` | technical/business severity |
| `Impact` | expected SEO/business impact |
| `Confidence` | evidence confidence |
| `Priority Score` | derived ordering aid, not product truth |
| `First Detected At` | first evidence |
| `Last Observed At` | latest supporting evidence |
| `Verification Due At` | nullable verification target |
| `Resolved At` | nullable resolution timestamp |
| `Evidence Source` | M4, M5, or M6 |
| `Evidence Key` | deterministic source reference |
| `Recommended Action` | bounded action |
| `Resolution Criteria` | exact closure condition |
| `Notes` | compact context |
| `Updated At` | state update timestamp |

---

# 22. Stable identity and deduplication

The same underlying problem refreshes one finding instead of generating a new one every week.

Examples:

```text
INDEX_NOT_INDEXED|/en/villa-private-chef/
```

```text
INTENT_LANDING_MISMATCH|/en/private-chef/|villa-private-chef
```

Cluster-level problems use controlled intent-family identity rather than one finding per spelling variant.

---

# 23. Lifecycle

```text
OPEN → IN_PROGRESS → VERIFYING → RESOLVED
```

Additional transitions:

```text
OPEN / IN_PROGRESS → DISMISSED
RESOLVED → REOPENED
```

- `OPEN`: verified actionable problem/opportunity exists.
- `IN_PROGRESS`: remediation work has actually begun.
- `VERIFYING`: implementation/deployment occurred; authoritative outcome evidence is pending.
- `RESOLVED`: exact resolution criteria verified.
- `DISMISSED`: false positive, intentional behavior, or explicit no-action decision; reason required.
- `REOPENED`: the same condition returns after resolution.

A merge/deployment alone never resolves an SEO finding.

## Automated transition boundary

The system may automatically perform only deterministic evidence transitions:

- qualifying evidence → `OPEN`;
- repeated evidence → refresh active finding;
- `VERIFYING` → `RESOLVED` when exact criteria pass;
- `RESOLVED` → `REOPENED` when the same condition returns.

It must not automatically set:

- `OPEN → IN_PROGRESS`;
- `OPEN/IN_PROGRESS → DISMISSED`;

unless an explicit owner action or deterministic intentional-condition contract exists.

---

# 24. Initial finding taxonomy

## Indexing

- `INDEX_UNKNOWN`
- `INDEX_NOT_INDEXED`
- `INDEX_CRAWLED_NOT_INDEXED`
- `GOOGLE_USER_CANONICAL_MISMATCH`

## Technical

- `LIVE_CANONICAL_MISMATCH`
- `UNEXPECTED_NOINDEX`
- `HTTP_FAILURE`
- `REDIRECT_MISMATCH`
- `DOUBLE_SLASH_FAILURE`

## Structured data

- `FAQ_MISSING`
- `FAQ_INVALID`

## Search performance

- `VISIBILITY_LOSS`
- `RANKING_OPPORTUNITY`
- `CTR_OPPORTUNITY`
- `INTENT_LANDING_MISMATCH`
- `POSSIBLE_CANNIBALIZATION`

Do not add speculative categories without recurring decision need.

---

# 25. Resolution criteria

Resolution is finding-specific.

Examples:

- `INDEX_NOT_INDEXED`: authoritative index evidence shows indexed/eligible indexed state.
- `GOOGLE_USER_CANONICAL_MISMATCH`: Google-selected canonical equals expected canonical.
- `LIVE_CANONICAL_MISMATCH`: live canonical check passes.
- `REDIRECT_MISMATCH`: expected redirect status/destination pass.
- `FAQ_MISSING` / `FAQ_INVALID`: FAQ exists and basic structure passes.
- `INTENT_LANDING_MISMATCH`: dedicated page is indexed and gains meaningful matching-intent visibility, or owner explicitly consolidates/dismisses the intent.
- `RANKING_OPPORTUNITY`: target threshold reached, opportunity materially decays, or owner dismisses.

M6-dependent findings cannot be newly resolved from stale M6 evidence.

---

# 26. Severity, impact, confidence

These are separate dimensions.

## Severity

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`

## Impact

- `VERY_HIGH`
- `HIGH`
- `MEDIUM`
- `LOW`

Impact may use deterministic inputs such as commercial page class, impressions, organic sessions, key events, and active strategic intent.

## Confidence

- `HIGH`
- `MEDIUM`
- `LOW`

A live 404 is high-confidence evidence; a one-impression query movement is low-confidence evidence.

---

# 27. Priority model

No opaque AI/ML ranking and no sitewide “SEO score”.

Use deterministic lexicographic tiers.

## Tier 1 — hard blockers

1. sitewide/indexability blocker;
2. commercial-page technical blocker;
3. commercial-page indexing blocker.

## Tier 2 — verified landing/intent failures

4. high-confidence intent/landing mismatch;
5. verified canonical/index-selection problem;
6. meaningful visibility loss.

## Tier 3 — growth opportunities

7. high-confidence ranking opportunity;
8. eligible CTR opportunity;
9. GA4 engagement/conversion opportunity when source support exists.

## Tier 4 — maintenance

10. FAQ/structured-data issue;
11. low-volume/low-confidence signal.

Within a tier:

```text
Impact → Confidence → Severity → observed volume → oldest unresolved finding
```

A numeric `Priority Score` may exist as an internal derived sorting/debugging representation, but it is not a global SEO-health metric.

---

# 28. Single next highest-impact action

M7 selects exactly one eligible finding when evidence is sufficient.

The decision projection provides:

- `Finding ID`
- `Finding Type`
- `Scope`
- `Why Now`
- `Recommended Action`
- `Evidence`
- `Resolution Criteria`

The language layer may explain this deterministic choice but must not substitute another finding by free-form preference.

If evidence is insufficient:

```text
Decision status = INSUFFICIENT_EVIDENCE
```

Do not guess.

---

# 29. Verified completed fixes

The Monday briefing may call a fix **completed** only when its finding transitions to `RESOLVED` during the reporting period.

A deployed change awaiting authoritative evidence is reported separately as `VERIFYING` / implemented but awaiting verification.

---

# 30. M7 decision projection into `Weekly_Summary`

M7 writes bounded decision-state rows such as:

- `HIGHEST_PRIORITY_FINDING`
- `OPEN_BLOCKERS`
- `VERIFYING_FINDINGS`
- `RESOLVED_FINDINGS`

The complete lifecycle record remains in `Findings Summary`.

Decision rows use non-numeric `Current Value` where appropriate, with numeric change fields null, `Direction = NA`, and `Period Status = NA`.

---

# Product / consumer contract

# 31. Monday briefing behavior

Primary reporting read surface:

- `Weekly_Summary`
- `GSC_Query_Movement`
- `GSC_Index`
- `Technical_Checks`
- `FAQ_Checks`
- `GSC_Daily`
- `GA4_Daily`
- `GA4_Landing`
- `Run_Log`

If a reporting tab is empty, stale, or inconsistent, a trusted consumer must verify canonical V1 evidence before reporting the metric as unavailable.

Recommended briefing instruction:

> Use `Weekly_Summary`, `GSC_Query_Movement`, `GSC_Index`, `Technical_Checks`, `FAQ_Checks`, `GSC_Daily`, `GA4_Daily`, `GA4_Landing`, and `Run_Log` as the primary reporting layer. If any reporting tab is empty, stale, or inconsistent, verify against the canonical V1 source tabs `GSC Daily`, `GSC Pages`, `GSC Page Queries`, `GA4 Daily`, `GA4 Acquisition`, `GA4 Landing Pages`, `Run Log`, `Config`, and canonical diagnostic/lifecycle state where applicable before reporting data as unavailable. Never interpret a headers-only reporting tab as proof that canonical source data has no rows. Do not invent metrics; clearly identify missing, stale, incomplete, or unauthorized data.

The briefing summarizes validated decision state; it does not recompute the authoritative M7 priority engine.

---

# 32. Product transparency requirements

Every consumer-facing result must distinguish:

- authoritative zero;
- missing/unavailable;
- incomplete finalized window;
- stale reporting materialization;
- failed source ingestion;
- successful checker that found a defect;
- checker failure with unknown verdict;
- implemented remediation awaiting verification;
- verified resolution.

These distinctions are product behavior, not implementation details.

---

# Non-goals and controls

# 33. Explicit exclusions

This design does **not** authorize:

- a second raw GSC/GA4 database;
- a second scheduled trigger;
- recursive crawling;
- arbitrary malformed-URL generation;
- unlimited retries;
- AI-selected priority outside the deterministic M7 contract;
- a global 0–100 SEO score;
- treating visible Search Console query rows as the complete query universe;
- treating live fetchability as proof of Google indexation;
- treating merge/deployment as proof of SEO resolution;
- claiming FAQ rich-result eligibility from basic JSON-LD checks;
- fabricating data for missing dates or unsupported metrics.

# 34. OAuth and external-surface policy

Reuse minimum existing capabilities where possible. Any implementation-plan proposal requiring a new OAuth scope or external service is a separate explicit owner-approval gate.

No scope expansion is implicit in this design.

---

# Acceptance criteria

# 35. Product acceptance

Implementation is accepted only when:

1. Canonical V1 remains the only raw GSC/GA4 source of truth.
2. All nine reporting tabs are populated through the new deterministic reporting/diagnostic contracts rather than stale legacy logic.
3. `GSC_Index` is projected from canonical `GSC Indexing`, not a bypass path.
4. `Data Through` and `Generated At` independently expose source and reporting freshness.
5. Same-period/check reruns create no duplicate logical snapshots.
6. Weekly comparisons use complete finalized 7-day windows per source.
7. `Weekly_Summary` explicitly distinguishes `COMPLETE`, `INCOMPLETE`, `UNAVAILABLE`, and non-period decision rows.
8. GSC property totals never come from summed page-grain rows.
9. Unsafe GA4 unique-user aggregation is never fabricated from device-grain data.
10. M5 preserves the Search Console privacy/truncation caveat.
11. Stored Google index state and live technical state remain separate evidence channels.
12. Intentional redirects are evaluated against their intended contract rather than automatically treated as defects.
13. M6 failures cannot overwrite/mislabel successful canonical ingestion.
14. Findings have stable IDs and deterministic lifecycle transitions.
15. `RESOLVED` requires exact authoritative verification criteria.
16. Exactly one deterministic highest-priority action is selected when sufficient evidence exists; otherwise `INSUFFICIENT_EVIDENCE` is emitted.
17. The Monday briefing distinguishes verified completed fixes from implemented-but-awaiting-verification work.
18. Headers-only/stale reporting tabs cannot produce a false canonical-data-missing conclusion without fallback verification.
19. The single-trigger operational model remains intact unless a later owner-approved design changes it.
20. The Monday weekly cycle finishes or reports its explicit partial/stale state before the briefing consumes it; it must never silently reuse an old weekly snapshot as current.

# 36. Engineering acceptance

The implementation plan must require:

- TDD for each materializer, diagnostic parser, lifecycle transition, and priority rule;
- exact schema/column contract tests;
- logical-key/idempotency tests;
- failure/mutation tests for missing, stale, incomplete, partial, and retry states;
- no live network calls in CI; synthetic transports/fixtures only;
- preservation of existing V1 ingestion, security, page-integrity, and browser gates;
- runtime-budget protection for weekly M6 diagnostics;
- deterministic continuation/resume behavior for bounded weekly diagnostics if necessary;
- safe activation/migration of current headers-only underscore tabs without losing retained historical content;
- production verification before the Monday briefing is allowed to treat M3–M7 as authoritative.

---

# 37. Activation boundary

This design is intentionally separate from PR #40.

Implementation begins only after:

1. this design receives final owner review/approval;
2. a detailed implementation plan is written and reviewed;
3. implementation starts on a separate branch/PR after the current V1 PR gate is closed, or after an explicit owner authorization that changes that sequencing.

The retained-history horizon question in PR #40 does not invalidate this design, but M3–M7 work must not silently contaminate or bypass the V1 merge gate.
