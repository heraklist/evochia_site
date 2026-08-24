# Second Review — Evochia Full SEO System Design Revision 2

**Reviewed specification:** `docs/superpowers/specs/2026-08-05-evochia-full-seo-system-design.md`
**Specification revision:** 2
**Review date:** 2026-08-05
**Reviewed branch:** `seo-system`
**Reviewed commit:** `e2d043193a1b98e84f9c504f20a8897b3d0ce08a`
**Previous external review:** `docs/reports/2026-08-05-seo-system-design-review.md`

## 1. Verdict

Revision 2 resolves all six prioritized findings from the first review and incorporates the smaller consistency and governance recommendations.

No unresolved High-severity design blocker was found in this second review.

The specification is now implementable as a design, subject to the explicit Phase 0 verification gates for external Google identities, GitHub ruleset capabilities, Vercel production controls and the current GitHub Actions allowance.

The specification must remain in `pending second review` status until the owner reviews this report and explicitly approves Revision 2. No implementation plan may be authored before that approval.

## 2. Review method

The second review checked:

1. traceability from every first-review finding to a normative specification change;
2. internal consistency between authority, authentication, storage and rollout sections;
3. whether safety claims are technically enforceable or honestly conditional;
4. whether the single permanent branch remains workable after merge;
5. whether recurring evidence can remain outside the production history;
6. whether Google collection can run unattended without a service-account key or GitHub-stored refresh token;
7. whether free-tier assumptions are bounded for a private repository;
8. whether the design still preserves the previously approved business and governance intent.

## 3. Traceability of first-review findings

### A. GTM blind spot — Resolved

Revision 2 makes `GTM-578JXRXS` a first-class external configuration source.

It now requires:

- owner-authorized GTM read-only collection;
- published-version metadata;
- normalized tags, triggers and variables;
- deterministic configuration fingerprints;
- GA4 destination and conversion mapping verification;
- tracking-drift findings for unexplained GTM or GA4 behaviour changes;
- human-only GTM modification and publication.

The conversion-integrity pillar can now observe the layer where the site's analytics definitions actually live.

### B. Runtime and Google authentication contradiction — Resolved

Revision 2 assigns first-party Google collection to a bound Apps Script project running as `heraklis@evochia.gr`.

It explicitly prohibits:

- service-account JSON keys;
- Google OAuth refresh tokens stored in GitHub;
- GitHub-hosted credentials for GSC, GA4 or GTM collection.

GitHub Actions is limited to repository, crawl, performance and findings work. Runtime ownership is no longer ambiguous.

### C. Merge and production safety was policy-only — Resolved conditionally

Revision 2 requires a GitHub ruleset or equivalent branch protection on `main`, including:

- no direct pushes;
- required human PR approval;
- required checks;
- CODEOWNERS review;
- no automation bypass;
- no automation actor on a `main` update allowlist;
- auto-merge disabled;
- no Vercel production-capable credential in SEO automation.

It also states that Phase 5 remains disabled if the repository plan cannot enforce the required controls. The safety guarantee is therefore technically enforceable when the gate passes and explicitly unavailable when it does not.

### D. Evidence mixed into the production PR — Resolved

Revision 2 separates storage by purpose:

- Google Sheet: operational metrics and summaries;
- Google Drive: bounded first-party exports created by Apps Script;
- GitHub Actions artifacts: run evidence;
- repository and PR path: code, tests, rules, configuration, specifications and approved permanent decision records only.

It explicitly bans recurring metrics, raw crawls, Lighthouse JSON, screenshots, raw GTM exports and generated logs from the production PR diff.

### E. Google read-only guarantee was behavioural only — Resolved

Revision 2 requires minimum OAuth scopes, including:

- `webmasters.readonly`;
- `analytics.readonly`;
- `tagmanager.readonly`;
- `spreadsheets.currentonly` where sufficient;
- `drive.file` only for files created or managed by the collector.

Write scopes for GSC, GA4 administration, GTM administration, sitemap submission, URL removal and indexing actions are prohibited.

### F. GitHub Actions budget was undefined — Resolved

Revision 2 records that the repository is private and requires an explicit project Actions budget based on the actual account allowance.

It defines:

- warning, downgrade and non-critical-stop thresholds;
- crawl duration and concurrency limits;
- Lighthouse URL and repetition limits;
- artifact retention;
- `cancel-in-progress` behaviour;
- preservation of critical PR and availability checks;
- Phase 0 verification of the real allowance.

The design does not hard-code a quota that may differ by account or plan.

## 4. Smaller recommendations from the first review

| Recommendation | Revision 2 status |
|---|---|
| Add `invalid` / false-positive lifecycle state | Added as a terminal state with controlled reopening |
| Show report data lag explicitly | Separate `data as of` dates required for GSC, GA4 and GTM |
| Name middleware validation | Explicit routing, locale, 404 and policy-consistency tests required |
| Prevent preview promotion | Explicitly prohibited; SEO workflows may not hold production-capable Vercel credentials |
| Avoid automated Google SERP scraping | Explicitly prohibited; competitor SERP review is manual/owner-reviewed |
| Clarify merge strategy | Merge commits required; squash and rebase prohibited for SEO batch PRs |

## 5. Additional consistency issue found and resolved

The original design described one long-lived draft PR. A merged pull request cannot remain reusable.

Revision 2 correctly changes this to:

- one permanent branch, `seo-system`;
- at most one active SEO draft PR at a time;
- a new draft PR for the next batch after the previous PR is merged or closed;
- synchronization of `seo-system` to the resulting `main` merge commit before the next batch.

This preserves the user's single-branch requirement without relying on an impossible PR lifecycle.

## 6. Internal consistency review

### Branch and merge lifecycle

The required merge-commit strategy is compatible with branch synchronization: after the owner merges `seo-system` into `main`, the resulting merge commit contains the prior `seo-system` head as a parent, allowing `seo-system` to advance to the approved `main` state before the next batch.

### Authentication and storage

The Apps Script runtime, minimum Google scopes, Sheet storage and bounded Drive snapshots are mutually consistent. Routine first-party data does not require GitHub secrets.

### Authority model

The document distinguishes:

- workflow permissions needed to update `seo-system` and its draft PR;
- the protected `main` branch as the actual production authority boundary;
- Vercel production deployment as a consequence only of an approved `main` merge.

### Findings and remediation

GTM and analytics findings can be observed and proposed, but cannot be automatically modified. Deterministic site-code findings remain eligible for bounded draft fixes.

### Free-first operation

The design is free-first rather than falsely claiming unlimited free capacity. It provides degradation rules when the configured Actions budget is approached.

## 7. Remaining Phase 0 verification gates

These are not design defects. They are deliberately unresolved external facts that must be verified before implementation claims can rely on them:

1. `heraklis@evochia.gr` has the necessary read access to the production GSC property.
2. GA4 account `388030118` and property `528945896` are the intended production analytics resources.
3. GTM container `GTM-578JXRXS` is the currently published production container.
4. The published GTM version points to the expected GA4 destination.
5. Production conversion events map to the intended GTM triggers and GA4 events.
6. The GitHub account and repository plan can enforce the required `main` ruleset without automation bypass.
7. The human `CODEOWNERS` identity is selected.
8. Repository auto-merge state is confirmed and remains disabled for this workflow.
9. Vercel Git integration uses `main` as the only production branch and SEO automation has no promotion-capable credential.
10. The current GitHub Actions allowance is measured and an SEO operating budget is selected.
11. The Google Sheet and Drive locations used by Apps Script are confirmed under the production owner account.

Failure of any gate must lead to the fallback already defined by the specification: affected automation remains disabled and the system reports the capability or source as unavailable.

## 8. Residual risks accepted by the design

### External platform dependency

GSC, GA4, GTM, GitHub and Vercel APIs and permission models may change. The specification mitigates this through Phase 0 verification, least privilege and fail-closed rollout gates but cannot eliminate platform dependency.

### Attribution limits

The system may correlate commits, deployments, GTM changes and later SEO results, but cannot guarantee causal ranking attribution. This remains an explicit non-goal.

### Free backlink and rank coverage

Free-first sources cannot provide complete backlink intelligence or reliable continuous independent rank tracking. The specification states this limitation and defers paid providers until a concrete data gap is demonstrated.

### Single permanent working branch

A single branch reduces branch proliferation but requires strict serial batching and synchronization. Revision 2 includes those controls. It intentionally trades parallel fix throughput for simpler governance.

## 9. Second-review conclusion

Revision 2 is coherent, implementable and aligned with the approved governance model.

Second-review result:

```text
High blockers: 0
Medium design blockers: 0
Low design blockers: 0
External Phase 0 verification gates: 11
Implementation plan authorized: NO — pending explicit owner approval of Revision 2
```

The next permitted step is owner review and explicit approval of Revision 2. Only after that approval may the Superpowers writing-plans workflow be invoked.