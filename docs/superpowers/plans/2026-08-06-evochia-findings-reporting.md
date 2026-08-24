# Evochia Findings Ledger and Reporting Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stable findings ledger with deterministic identities, lifecycle enforcement, deduplication, tracking-drift reconciliation and Sheet-ready summaries for the Monday SEO report.

**Architecture:** GitHub Issues are the authoritative external ledger for actionable findings. Machine evidence is normalized into a canonical finding candidate, hashed into a stable ID, reconciled against existing labeled issues and exported as compact JSON for Apps Script to read. Operational evidence remains in artifacts; the issue contains only bounded evidence references and summaries.

**Tech Stack:** Node.js 22+, TypeScript/tsx, JSON Schema, GitHub REST API, GitHub Issues, Apps Script issue-summary reader.

## Global Constraints

- GitHub Issues are not allowed to modify site code.
- `invalid` is terminal unless a human explicitly reopens based on new evidence.
- Low-confidence strategy opportunities do not generate automated patches.
- Never embed raw unbounded crawl/API payloads in issues.

---

### Task 1: Define Finding Schema and State Machine

**Files:**
- Create: `seo/schemas/finding.schema.json`
- Create: `seo/lib/finding-types.ts`
- Create: `seo/lib/finding-state.ts`
- Create: `tests/seo/finding-state.test.ts`

**Interfaces:**
- Produces `FindingCandidate`, `FindingRecord`, `FindingState` and `transitionFinding(current, event)`.

- [ ] Write failing tests for all legal transitions:

```text
new -> confirmed -> proposed -> draft-pr -> deployed -> seo-resolved
new|confirmed -> observed-resolved
new|confirmed|proposed -> accepted-risk
new|confirmed|proposed -> invalid
invalid -> confirmed only with humanReopen=true and newEvidenceDigest
```

- [ ] Run tests; expect FAIL.
- [ ] Implement exhaustive state transition logic that rejects unspecified transitions.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 2: Implement Stable Finding Identity

**Files:**
- Create: `seo/lib/finding-id.ts`
- Create: `tests/seo/finding-id.test.ts`

**Interfaces:**
- Produces `buildFindingId(candidate): string` and `buildEvidenceDigest(candidate): string`.

- [ ] Write failing tests proving reordered URLs/files/evidence fields produce the same ID.
- [ ] Identity input must include rule ID, normalized affected object set and scope—not timestamps, transient messages or ranking values.
- [ ] Implement canonical JSON and SHA-256 identifier with prefix `SEO-`.
- [ ] Re-run tests; expect PASS.
- [ ] Commit.

### Task 3: Implement Severity, Confidence and Priority Scoring

**Files:**
- Create: `seo/lib/finding-score.ts`
- Create: `tests/seo/finding-score.test.ts`

**Interfaces:**
- Produces `scoreFinding(input): FindingPriority`.

- [ ] Write failing tests for indexing/canonical, tracking integrity, commercial priority pages, low-traffic cosmetic issues and ambiguous opportunities.
- [ ] Implement bounded numeric factors for impact, confidence, affected traffic, commercial relevance and effort, preserving the conceptual formula from the spec.
- [ ] Return both score and factor explanation.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 4: Build GitHub Issue Renderer and Parser

**Files:**
- Create: `seo/lib/finding-issue.ts`
- Create: `tests/seo/finding-issue.test.ts`

**Interfaces:**
- Produces `renderFindingIssue(record): { title, body, labels }` and `parseFindingIssue(issue): FindingRecord`.

- [ ] Write tests for title format `[SEO-XXXX] Rule summary`, machine-readable metadata block, bounded evidence references, state label and severity/confidence labels.
- [ ] Ensure body excludes raw payloads and escapes external content.
- [ ] Implement parser round-trip.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 5: Implement Issue Reconciliation and Deduplication

**Files:**
- Create: `seo/lib/github-findings.ts`
- Create: `seo/cli/reconcile-findings.ts`
- Create: `tests/seo/github-findings.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces command `npm run seo:findings:reconcile -- --dry-run`.

- [ ] Write mocked API tests: create new issue, update matching issue, do not duplicate, close observed-resolved, refuse automatic reopen of invalid.
- [ ] Run; expect FAIL.
- [ ] Implement dry-run by default; write mode requires explicit `--apply` and token with issues-only permission.
- [ ] Add script:

```json
"seo:findings:reconcile": "tsx seo/cli/reconcile-findings.ts"
```

- [ ] Re-run tests; expect PASS.
- [ ] Commit.

### Task 6: Reconcile GTM and GA4 Tracking Drift

**Files:**
- Create: `seo/lib/tracking-drift.ts`
- Create: `tests/seo/tracking-drift.test.ts`

**Interfaces:**
- Produces `detectTrackingDrift(gtmVersions, ga4Events, changeRecords): FindingCandidate[]`.

- [ ] Write failing tests for: authorized GTM change, unexplained GTM publication, GA4 event disappearance after GTM change, GA4 change without repo/GTM explanation.
- [ ] Implement with configurable windows and no causal overclaiming.
- [ ] Findings must state correlation, not guaranteed causation.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 7: Export Compact Sheet Summary

**Files:**
- Create: `seo/lib/finding-summary.ts`
- Create: `seo/cli/export-finding-summary.ts`
- Create: `tests/seo/finding-summary.test.ts`

**Interfaces:**
- Produces compact rows: `findingId`, state, severity, confidence, priority, category, title, firstSeen, lastSeen, issueUrl, dataAsOf.

- [ ] Write failing tests for stable order and omission of raw evidence.
- [ ] Implement JSON export consumable by the Apps Script GitHub client.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 8: Add Advisory Findings Workflow

**Files:**
- Create: `.github/workflows/seo-findings.yml`
- Create: `docs/seo/findings-runbook.md`

- [ ] Configure scheduled/manual workflow with `contents: read`, `issues: write`, no `pull-requests: write` and no code checkout write token persistence.
- [ ] Download/consume bounded monitoring artifacts or rerun deterministic analysis.
- [ ] Run reconciliation first in dry-run summary, then apply only after schema validation.
- [ ] Document human state changes, `invalid` handling, accepted-risk review and evidence retention.
- [ ] Validate YAML and commit.

## Plan Gate

Run:

```bash
npm run test:unit
npm run seo:findings:reconcile -- --dry-run
```

Expected: repeated identical candidates map to one finding; `invalid` cannot reopen automatically; summary contains explicit data-as-of fields and no raw evidence.