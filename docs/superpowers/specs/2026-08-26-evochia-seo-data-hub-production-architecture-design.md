# Evochia SEO Data Hub Production Architecture Design

**Status:** Draft for owner review

**Scope:** Complete the Evochia SEO Data Hub as one authoritative corporate, bound Google Apps Script production system with layered capabilities for GSC, GA4, GTM, Drive snapshots, operational health, deterministic findings, scheduled jobs, weekly ChatGPT intelligence, and controlled retirement/archive of the legacy personal Apps Script automation.

**Approved design direction:** Layered single-project architecture.

## Context

The repository already contains a deterministic Apps Script build, GAS-specific type/runtime compatibility checks, GSC and GA4 read-only clients/importers, workbook identity checks, setup/menu entrypoints, production/smoke bundle separation, and a real non-production GAS V8 smoke that has passed. The current production bundle is still scaffold-only: it exposes setup/configuration entrypoints but does not yet expose production ingestion orchestration for GSC or GA4, and no GTM/Drive/jobs/triggers implementation exists.

The current production resource verification is also too coupled: setup and workbook verification are blocked unless unrelated future resources such as GTM and Drive are already verified. The existing Data Hub workbook still uses the legacy underscore-named scaffold and is effectively headers-only. A separate legacy personal Apps Script project remains production-capable and must ultimately be retired and archived, not deleted.

This design completes the architecture end to end rather than stopping at a partial activation phase.

## Goals

1. Establish one authoritative production workbook owned by the corporate Google account.
2. Establish one authoritative corporate bound Apps Script production project.
3. Keep one production repository/build path and deterministic deploy artifacts.
4. Implement GSC, GA4, GTM, Drive snapshot, health, findings, orchestration, and trigger capabilities in one layered project.
5. Replace monolithic global resource verification with capability-specific verification while preserving fail-closed common trust boundaries.
6. Migrate the existing Data Hub non-destructively into a canonical schema while preserving a full backup and legacy tabs.
7. Backfill and reconcile production data before automation is enabled.
8. Prevent split-brain scheduling by freezing the legacy personal automation before corporate production triggers are installed.
9. Preserve the legacy personal project and historical Sheet as archival evidence; do not delete them.
10. Make pipeline health and data freshness explicit so missing or stale data is never interpreted as zero.
11. Keep Apps Script deterministic and operational; keep contextual SEO/business reasoning in the ChatGPT intelligence layer.
12. Avoid unnecessary credentials and scopes, including no GitHub token in Apps Script.

## Non-goals

This design does not authorize Google-side production mutation merely by existing. Separate owner approval remains required before any production Apps Script deployment, OAuth scope grant, Script Property write, Sheet rename/create/delete/timezone mutation, Drive folder creation/write, trigger installation/removal, or legacy personal project mutation.

The system will not:

- expose an Apps Script Web App (`doGet`/`doPost`);
- mutate GA4 configuration or data;
- mutate Search Console state, sitemaps, or indexing;
- mutate GTM workspaces, tags, versions, or publishing state;
- introduce Gmail/calendar scopes;
- store OAuth tokens, refresh tokens, GitHub tokens, cookies, or credentials in Sheets or source control;
- make the legacy personal automation an automatic failover;
- fabricate zero values for unavailable, thresholded, stale, or failed data.

## 1. Canonical production topology

The authoritative topology is:

```text
Corporate Google account
└── Evochia SEO Data Hub (authoritative workbook)
    └── Bound production Apps Script
        ├── Core
        ├── GSC capability
        ├── GA4 capability
        ├── GTM capability
        ├── Drive snapshot capability
        ├── Pipeline Health / Run Log
        ├── Findings Summary
        └── Jobs / Triggers / Operator entrypoints
```

The legacy personal Apps Script and its historical spreadsheet remain outside this topology and are eventually marked retired/archival.

## 2. Layered single-project architecture

### Core

Core owns:

- production configuration schema;
- workbook identity verification;
- production hostname verification;
- common date/time helpers;
- shared normalization/error types;
- endpoint allowlisting;
- run identity and lock semantics.

### Capability modules

Each integration has an independent capability boundary:

- `GSC`: Search Analytics and URL Inspection, read-only.
- `GA4`: Data API reports, read-only.
- `GTM`: published container/version inventory, normalization, fingerprinting and semantic change detection, read-only.
- `Drive`: bounded snapshot storage only.
- `Automation`: installation/removal and verification of canonical time-driven triggers.

A temporary failure in one capability must not make unrelated healthy sources unusable.

## 3. Capability-specific configuration and verification

The current all-resources-at-once verification must be replaced by versioned, capability-specific verification.

The production Script Property remains the runtime source of truth, for example `SEO_GOOGLE_RESOURCES_JSON`, with a schema equivalent to:

```text
configVersion
  environment
  owner
  workbook
  site
  gsc
  ga4
  gtm
  drive
  automation
```

Each capability has explicit resource identity and verification state.

Required verification layers:

```text
RESOURCE_IDENTITY_VERIFIED
        ↓
LIVE_ACCESS_VERIFIED
        ↓
CAPABILITY_READY
```

Changing a stored value to `verified` is not sufficient. Production readiness requires a real minimal live access check.

### Common/global blockers

The following remain global hard blockers:

- wrong bound workbook ID;
- unsupported configuration version;
- wrong production environment/owner identity;
- invalid production artifact identity where required by the runbook.

A workbook identity failure must cause zero writes for the entire job.

## 4. OAuth and least-privilege security contract

The final production manifest is intended to contain only the scopes required by the approved complete architecture:

```text
https://www.googleapis.com/auth/spreadsheets.currentonly
https://www.googleapis.com/auth/script.container.ui
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/tagmanager.readonly
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/script.external_request
https://www.googleapis.com/auth/script.scriptapp
```

The implementation plan must verify that every listed scope is actually required by the chosen Google API mechanism and must not silently broaden a scope. If a narrower scope/mechanism can satisfy the approved capability, the narrower option is preferred. Any required deviation from this exact proposed set is an owner review gate before production authorization.

Explicitly prohibited unless separately redesigned and approved:

- broad Drive scope;
- broad spreadsheet scope when `spreadsheets.currentonly` is sufficient;
- GA4 edit/admin mutation scopes;
- GTM edit/publish scopes;
- Search Console write-capable actions;
- Gmail/calendar scopes.

### Endpoint allowlist

Outbound HTTP must be restricted to the approved Google API hosts required by the capability implementation. Dynamic arbitrary hosts sourced from Sheet data are prohibited.

Adding another outbound hostname requires code change, tests, review, and owner approval.

## 5. Canonical workbook and migration

The existing Evochia SEO Data Hub remains the authoritative workbook; no replacement production spreadsheet is created.

Before mutation:

1. create and verify a full Drive backup copy;
2. preserve the original file ID and ownership of the production workbook;
3. archive legacy tabs non-destructively;
4. create canonical tabs idempotently;
5. change the workbook/operator timezone to `Europe/Athens` only under an explicit production mutation gate;
6. preserve GSC's intentional `America/Los_Angeles` source-calendar logic independently;
7. use the verified GA4 property timezone for GA4 source-date semantics.

Legacy records are historical evidence, not source rows to be force-transformed into new grains.

### Canonical tabs

The authoritative schema is:

```text
Config
Run Log
Pipeline Health
GSC Daily
GSC Pages
GSC Queries
GSC Indexing
GA4 Daily
GA4 Acquisition
GA4 Landing Pages
GA4 Events
GA4 Pages
GA4 URL Quality
GTM Versions
GTM Changes
Findings Summary
```

`Config` is an operator-visible mirror/status surface only. Secrets must never be written into workbook cells.

## 6. Production orchestration

The final public Apps Script surface should remain intentionally small and discoverable:

```text
onOpen()
verifyConfiguration()
verifyAllAccess()
setupWorkbookFromMenu()
runInitialBackfill()
runDailyImport()
runWeeklyInspection()
installTriggers()
removeTriggers()
```

Additional internal helpers must not become unnecessary public top-level functions.

### Run model

Each production job gets a unique `runId` and records a run state.

Capability outcomes:

```text
SUCCESS
FAILED
SKIPPED_NOT_READY
SKIPPED_NO_CHANGE
```

Overall outcomes:

```text
SUCCESS
PARTIAL
FAILED
```

`PARTIAL` must never be presented as complete success.

### Fetch-before-write

For each capability:

```text
VERIFY
→ FETCH ALL REQUIRED REMOTE DATA
→ NORMALIZE
→ VALIDATE BUNDLE
→ WRITE
```

Any failure before `WRITE` must produce zero writes for that capability.

The system does not perform global rollback of valid GSC data merely because GA4 or GTM failed. Source integrity and cross-source completeness are separate states.

## 7. Application-level write semantics

Google Sheets does not provide an ACID transaction across multiple tabs. The design therefore promises application-level atomicity, not database transactional guarantees.

Rules:

- collect and validate complete capability bundles before sheet writes begin;
- do not mark a capability successful until all of its required writes finish;
- write idempotently using explicit logical keys/upserts;
- never use blind full-sheet clear/rewrite as the default ingestion strategy;
- preserve formula-injection defenses for text values;
- include `runId`, `dataAsOf`, and collection metadata where useful for reconciliation;
- if a multi-sheet write partially fails, record the capability as `FAILED`, preserve evidence, and do not report the run as complete.

## 8. Concurrency and retry semantics

Production jobs use an Apps Script lock to prevent overlapping writes.

A second overlapping execution must skip cleanly rather than wait indefinitely or run concurrently.

Retries are bounded and only for transient classes such as 429/5xx/backend failures. Authentication, authorization, resource identity, config, and schema failures must not be blindly retried.

No infinite recursion/self-scheduling retry loop is permitted.

## 9. GSC capability

The GSC production capability is read-only and includes:

- Search Analytics property totals;
- page-grain reporting;
- query-grain reporting;
- URL Inspection for an explicit monitored URL allowlist.

It must not submit/delete sitemaps, request indexing, remove URLs, or perform any Search Console mutation.

GSC source-calendar behavior remains `America/Los_Angeles` with the configured finalization lag. Missing/anonymized query rows must not be reverse-engineered into fabricated totals.

## 10. GA4 capability

The GA4 production capability uses read-only reporting only.

Expected canonical outputs:

- Daily;
- Acquisition;
- Landing Pages;
- Events;
- Pages;
- URL Quality.

Report grains remain independent. The system must not add dimensions and then sum incompatible grains to invent property totals.

GA4 report dates use the verified GA4 property timezone and processing lag.

## 11. GTM capability

GTM remains read-only.

The capability reads the currently published production container/version, normalizes the relevant state, and computes a deterministic fingerprint.

```text
published state
→ normalize
→ fingerprint
→ compare with latest verified fingerprint
```

If unchanged:

- record healthy/no-change state;
- do not create a duplicate Drive snapshot;
- do not emit duplicate change rows.

If changed:

- record version metadata;
- compute semantic changes;
- write one bounded Drive snapshot;
- consider the capability failed if the required archival snapshot cannot be completed.

No workspace creation, tag edits, version creation, or publishing is permitted.

## 12. Drive snapshot containment

Drive is used only for approved production snapshot artifacts.

A dedicated snapshot folder is required. The folder identity must be verified before use.

`drive.file` is preferred specifically to constrain file access to files created/opened by the app. The implementation plan must validate the practical behavior of this scope with a bound Apps Script and the chosen dedicated folder workflow before production authorization. If the intended folder workflow cannot be enforced with the proposed scope, stop and request owner review rather than silently upgrading to broad Drive scope.

A live access test should create a harmless temporary verification artifact in the approved destination, verify it, and remove it. Test garbage must not remain.

## 13. Initial baseline/backfill

`runInitialBackfill()` is a distinct production workflow, not a parameterized daily job.

Approved initial baseline:

```text
GSC: 90 finalized source-days
GA4: 90 processed source-days
GTM: current published baseline
GSC URL Inspection: explicit canonical monitored URL set
```

Backfill should be bounded, chunked, idempotent, and resumable from verified checkpoints.

## 14. Reconciliation gates

Successful API calls and successful Sheet writes are not enough. Production data must be reconciled against the corresponding live Google surfaces/semantics.

### GSC

Reconcile comparable property totals and selected page/query samples over finalized ranges. Expected privacy/anonymization effects at query grain are not automatically defects.

### GA4

Reconcile reports only when date range, timezone, dimensions, metrics, and filter semantics match. Different report grains are not expected to sum to identical values.

### GTM

Verify that the normalized snapshot and fingerprint correspond to the currently published production container version and relevant tag/trigger/variable inventory.

### Promotion result

Only after all required capability baselines are reconciled may the system enter `BASELINE_RECONCILED`.

## 15. Manual production verification before triggers

After baseline reconciliation, run the real production `runDailyImport()` manually.

Then run it a second time against the same logical source window to prove idempotency.

Required evidence includes:

- no duplicate logical GSC/GA4 rows;
- no duplicate GTM snapshot when fingerprint is unchanged;
- correct `Pipeline Health`;
- correct `Run Log`;
- correct findings lifecycle behavior;
- no unexpected external calls;
- no unexpected triggers.

Only then can the system become `AUTOMATION_READY`.

## 16. Trigger architecture

Canonical production scheduling:

```text
Daily import: approximately 06:00 Europe/Athens
Weekly inspection: Monday approximately 08:00 Europe/Athens
ChatGPT weekly intelligence: Monday 09:00 Europe/Athens
```

The ChatGPT automation remains separate from Apps Script.

`installTriggers()` must be idempotent. Expected triggers are created once; exact existing canonical triggers cause no duplicate; unexpected/conflicting triggers cause a stop/report.

Trigger installation is forbidden until all required baseline, manual runtime, idempotency, and legacy-freeze gates have passed.

Scheduled automation is not considered verified until at least the first real scheduled daily and weekly executions have been observed and reconciled.

## 17. Run Log and Pipeline Health

`Run Log` is append-oriented operational history. It should record fields equivalent to:

```text
runId
startedAt
finishedAt
job
environment
source
status
dataAsOf
fetchedRows
insertedRows
updatedRows
unchangedRows
errorClass
errorMessage
artifactVersion
```

`Pipeline Health` is current state, not history. It should expose capability status, last attempt/success, actual and expected `dataAsOf`, freshness, consecutive failures, latest run, and bounded error summary.

Source-specific freshness states include:

```text
CURRENT
DELAYED_EXPECTED
STALE
FAILED
NOT_READY
DISABLED
```

Expected source lag is not a failure.

## 18. Findings Summary

`Findings Summary` contains deterministic evidence-derived signals from the canonical Data Hub, not opaque AI judgments and not GitHub API data fetched by Apps Script.

No GitHub token is stored in Apps Script.

Findings use stable identity and lifecycle states:

```text
NEW
ACTIVE
CHANGED
RESOLVED
```

Severity remains deterministic and bounded (`INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), with `CRITICAL` reserved for truly severe operational/integrity conditions.

## 19. Report readiness and ChatGPT intelligence contract

The reporting layer must inspect health before metrics.

Aggregate report states:

```text
REPORT_READY
REPORT_DEGRADED
REPORT_BLOCKED
```

The weekly ChatGPT automation reads, in order:

1. `Pipeline Health`;
2. report readiness;
3. relevant canonical datasets;
4. `Findings Summary`;
5. source-aware date windows;
6. only then analysis and recommendations.

Stale or unavailable data must suppress affected comparisons rather than be converted to zero.

Cross-source comparisons use the latest reconciled common date and equal complete windows.

The weekly report should cover:

- executive data-health/confidence status;
- Search Console performance;
- GA4 site/engagement performance;
- landing-page/service performance;
- query/content opportunities;
- technical/indexing/URL-quality evidence;
- GTM measurement integrity;
- new/changed/resolved findings;
- prioritized actions;
- compact provenance (`dataAsOf`, latest successful run, production artifact version, generated-at time).

Repository/GitHub context may be consulted by ChatGPT through the connected GitHub integration when a technical finding requires code reconciliation. It is not pulled into Apps Script with a secret token.

## 20. Legacy personal Apps Script retirement

The legacy personal project is retired and archived, not deleted.

### Read-only inventory

Before mutation, capture:

- project identity;
- code/manifest hashes;
- OAuth scopes;
- active triggers;
- relevant recent executions;
- target spreadsheet identity;
- last known data activity;
- Script Property names only, never secret values.

Classify it as active or dormant based on evidence, not assumption.

### Cutover order

The legacy system remains untouched while the corporate replacement is built and manually verified.

Cutover order:

```text
Corporate baseline reconciled
+ manual daily pass
+ idempotency pass
↓
final legacy inventory
↓
remove all legacy scheduled triggers
↓
verify legacy trigger count = 0
↓
verify no unexpected legacy execution
↓
LEGACY_FROZEN
↓
install corporate production triggers
```

There must never be two accepted active scheduled Evochia SEO ingestion pipelines.

### Archive state

Preserve:

- legacy project;
- legacy code and manifest;
- historical spreadsheet;
- retirement evidence.

Rename/archive labels may be applied only under explicit owner approval. Underlying IDs are preserved.

### Authorization retirement

After the corporate scheduled system has stabilized, the old personal OAuth authorization should be revoked as a separate owner-approved step. The archived project remains, but manual execution would require fresh authorization.

Any future legacy reactivation is a new explicit owner gate and requires a fresh audit.

## 21. Artifact provenance and deployment

Production code is deployed only from deterministic generated repository artifacts.

```text
GitHub main
→ deterministic build
→ generated Code.gs / appsscript.json
→ recorded artifact hashes
→ production Apps Script
```

Generated production files are never hand-edited.

Before production authorization, repository SHA, generated artifact hashes, manifest, and Google-side saved artifacts must be reconciled. Any unexplained drift is a stop condition.

No Apps Script Web App deployment is part of this architecture.

## 22. Production promotion lifecycle

Canonical lifecycle:

```text
CODE_ACCEPTED
→ PRODUCTION_ARTIFACT_VERIFIED
→ PRODUCTION_PROJECT_BOUND
→ OAUTH_AUTHORIZED
→ RESOURCE_IDENTITIES_VERIFIED
→ LIVE_ACCESS_VERIFIED
→ BASELINE_BACKFILL_COMPLETED
→ BASELINE_RECONCILED
→ MANUAL_DAILY_RUN_VERIFIED
→ IDEMPOTENCY_VERIFIED
→ LEGACY_FROZEN
→ AUTOMATION_READY
→ TRIGGERS_INSTALLED
→ FIRST_SCHEDULED_DAILY_PASS
→ FIRST_SCHEDULED_WEEKLY_PASS
→ AUTOMATED_VERIFIED
→ WEEKLY_CHATGPT_CUTOVER
```

No stage is inferred merely because a prior stage succeeded.

## 23. Rollback topology

Rollback is non-destructive by default.

- Before OAuth: no Google-side state should be changed.
- After deployment but before triggers: restore/replace only with an approved artifact.
- After triggers: remove canonical triggers and return to manual-only operation.
- On major data/schema failure: freeze automation, preserve the current workbook, and use the pre-migration backup for forensic comparison.
- Destructive workbook restoration requires a new owner gate.
- Legacy personal automation is never an automatic failover.

## 24. Testing requirements

Implementation must use strict task-by-task TDD and keep normal repository gates green.

Required test coverage includes at minimum:

- capability-specific config verification;
- common hard blockers and wrong-workbook fail-closed behavior;
- production entrypoint discoverability;
- exact manifest/scope contract checks;
- outbound host allowlisting;
- GSC/GA4 orchestration with synthetic transports;
- GTM normalization/fingerprinting/change semantics;
- Drive snapshot abstraction with synthetic transport/fakes in CI;
- fetch-before-write behavior;
- idempotent composite-key writes;
- multi-sheet partial-write failure reporting;
- pipeline health/freshness computation;
- run status reconciliation;
- deterministic findings lifecycle;
- lock/concurrency behavior;
- bounded retry classification;
- trigger idempotency and conflict detection;
- legacy coexistence gate logic where representable in repository code;
- bundle equivalence and GAS-specific compatibility gates;
- no live Google API calls in CI.

Real Google-side validation remains a separate runtime gate and must never be falsely claimed from CI alone.

## 25. Acceptance criteria / Definition of Done

The architecture is complete only when all relevant gates are PASS:

### Repository

- architecture implemented;
- tests green;
- typecheck green;
- GAS build green;
- bundle equivalence green;
- security validation green.

### Google production

- corporate ownership verified;
- production binding verified;
- exact artifact identity verified;
- exact approved OAuth scopes verified;
- explicit resource identities verified;
- live access verified.

### Data Hub

- full backup verified;
- canonical migration verified;
- legacy tabs/data preserved;
- approved workbook timezone verified.

### GSC / GA4 / GTM

- baselines complete;
- reconciliation complete;
- manual runtime verified;
- GTM snapshot and no-change idempotency verified.

### Operations

- Run Log correct;
- Pipeline Health correct;
- Findings Summary correct;
- failure isolation correct;
- locking/retry behavior correct.

### Automation and legacy

- legacy scheduled triggers = 0 before corporate trigger activation;
- corporate triggers installed exactly once;
- first scheduled daily pass;
- first scheduled weekly pass;
- weekly ChatGPT automation migrated to canonical contract;
- legacy source/history preserved and archived;
- legacy OAuth retirement separately verified after stabilization.

## 26. Final invariants

The completed system must satisfy:

```text
ONE corporate owner
+ ONE authoritative workbook
+ ONE corporate production Apps Script
+ ONE canonical data model
+ ONE scheduled ingestion pipeline
+ ONE ChatGPT intelligence layer
+ ONE archived legacy system
```

And:

```text
No duplicate scheduled pipelines
No guessed production resource identities
No broad unnecessary scopes
No hidden zero fabrication
No uncontrolled outbound endpoints
No production hand edits
No trigger activation before reconciliation
No destructive legacy deletion
No production mutation without the applicable owner gate
```

## 27. Implementation planning boundary

This document is the architectural source of truth once approved by the owner. It does not itself authorize implementation or any Google-side production mutation.

After owner approval of this written spec, the next step is to create a task-by-task implementation plan using the Superpowers planning workflow. That plan must preserve the approval gates and must separate repository implementation from production Google actions so repository work cannot accidentally consume authorization intended for live systems.
