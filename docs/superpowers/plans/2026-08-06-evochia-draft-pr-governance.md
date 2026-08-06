# Evochia Human-Governed Draft PR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable allowlisted deterministic fixes to update the permanent `seo-system` branch and one active draft PR while technically preventing automation from updating `main`, merging, enabling auto-merge, promoting previews or deploying production.

**Architecture:** A ruleset/CODEOWNERS gate is verified before any write workflow is enabled. Fixes are pure, tested transformations selected from a static registry. The workflow commits only to `seo-system`, creates or updates one draft PR, and stops after preview verification. The owner alone merges with a merge commit; a post-merge read-only job verifies production and synchronizes `seo-system` to the approved `main` state.

**Tech Stack:** Node.js 22+, TypeScript/tsx, GitHub Actions, GitHub REST/GraphQL APIs, CODEOWNERS, repository rulesets, Vercel preview checks.

## Global Constraints

- Phase 5 stays disabled until branch protection is independently verified.
- Automation must not be a `main` bypass actor or update allowlist member.
- One active draft PR maximum, always `seo-system -> main`.
- One to three related findings per batch.
- Merge commit required; squash/rebase prohibited.
- No GTM/GA4/GSC, commercial, legal, pricing, brand or editorial automatic changes.

---

### Task 1: Add CODEOWNERS and Governance Configuration

**Files:**
- Create: `.github/CODEOWNERS`
- Create: `seo/config/governance.json`
- Create: `seo/schemas/governance.schema.json`
- Create: `tests/seo/governance-config.test.mjs`

**Interfaces:**
- Produces human owner identity, allowed branch names, maximum batch size, permitted merge method and protected paths.

- [ ] Write a failing test requiring a non-automation human owner and coverage for HTML trees, sitemap, robots, `vercel.json`, `middleware.ts`, JS, workflows and SEO governance paths.
- [ ] Run test; expect FAIL.
- [ ] Implement configuration with `sourceBranch: "seo-system"`, `targetBranch: "main"`, `maxBatchSize: 3`, `mergeMethod: "merge"`.
- [ ] Add CODEOWNERS entries using the verified human GitHub account selected in Phase 0.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 2: Implement Main Ruleset Verification

**Files:**
- Create: `seo/lib/ruleset-verifier.ts`
- Create: `seo/cli/verify-governance.ts`
- Create: `tests/seo/ruleset-verifier.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `verifyGovernance(snapshot, expected): GovernanceVerification` and command `npm run seo:governance:verify`.

- [ ] Write failing fixtures for direct push allowed, missing approval, automation bypass, missing CODEOWNERS review, force-push allowed, auto-merge enabled and wrong production branch.
- [ ] Run; expect FAIL.
- [ ] Implement fail-closed verifier.
- [ ] Add script and dry-run support for a supplied ruleset snapshot.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 3: Define Deterministic Fix Registry

**Files:**
- Create: `seo/fixes/registry.ts`
- Create: `seo/fixes/types.ts`
- Create: `tests/seo/fix-registry.test.ts`

**Interfaces:**
- Produces `getFix(ruleId): DeterministicFix | null`, where `DeterministicFix` exposes `analyze`, `apply`, `verify` and `affectedFiles`.

- [ ] Write failing tests that allow only approved rule IDs and reject GTM, analytics, content, title-strategy and commercial-copy findings.
- [ ] Implement initial allowlist:

```text
SEO-URL-DOUBLE-SLASH
SEO-CANONICAL-MISMATCH
SEO-HREFLANG-RECIPROCAL
SEO-INTERNAL-LINK-BROKEN
SEO-SITEMAP-INCONSISTENT
SEO-JSONLD-SYNTAX
SEO-IMAGE-DIMENSIONS
SEO-ROBOTS-REGRESSION
```

- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 4: Implement Pilot Double-Slash Fix with Red-Green Verification

**Files:**
- Create: `seo/fixes/double-slash.ts`
- Create: `tests/seo/double-slash-fix.test.ts`
- Create: `tests/seo/fixtures/fixes/double-slash/input.html`
- Create: `tests/seo/fixtures/fixes/double-slash/expected.html`

**Interfaces:**
- Produces `doubleSlashFix: DeterministicFix`.

- [ ] Write a failing test proving only internal URL path separators are normalized; preserve `https://`, protocol-relative external URLs and text content.
- [ ] Run; expect FAIL.
- [ ] Implement minimal transformation.
- [ ] Run; expect PASS.
- [ ] Revert implementation temporarily and verify the test fails, then restore and verify PASS.
- [ ] Commit with finding-style message:

```bash
git commit -m "fix(seo): add safe double-slash remediation [SEO-PILOT-DOUBLE-SLASH]"
```

### Task 5: Build Fix Planning and Application CLI

**Files:**
- Create: `seo/cli/apply-fix.ts`
- Create: `seo/lib/fix-batch.ts`
- Create: `tests/seo/fix-batch.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `npm run seo:fix:apply -- --finding-id=<id> --dry-run`.

- [ ] Write tests for max three related findings, dirty worktree refusal, wrong branch refusal, non-allowlisted rule refusal and deterministic patch preview.
- [ ] Implement dry-run default; `--apply` requires verified governance result and current branch `seo-system`.
- [ ] Require tests and `seo:validate` after application.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 6: Implement One-Active-Draft-PR Controller

**Files:**
- Create: `seo/lib/draft-pr.ts`
- Create: `seo/cli/update-draft-pr.ts`
- Create: `tests/seo/draft-pr.test.ts`

**Interfaces:**
- Produces `ensureDraftPr(context): DraftPrResult`.

- [ ] Write mocked API tests for: no existing PR creates draft; one matching draft updates body; multiple matching PRs fail closed; non-draft PR fails closed; wrong head/base fails.
- [ ] PR body must include Problem, Evidence, Change, Validation, Risk and Approval Gate sections.
- [ ] Implement without merge or auto-merge API calls.
- [ ] Add a source scan test that fails if workflow/CLI code references merge or enable-auto-merge endpoints.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 7: Add Dedicated Draft-Fix Workflow

**Files:**
- Create: `.github/workflows/seo-draft-fix.yml`
- Create: `docs/seo/draft-fix-runbook.md`

**Interfaces:**
- Manual dispatch or approved issue command only; no autonomous schedule initially.

- [ ] Configure permissions exactly:

```yaml
permissions:
  contents: write
  pull-requests: write
```

- [ ] Set checkout ref explicitly to `seo-system`; set `persist-credentials: false` until the controlled commit step.
- [ ] Run governance verification before any write.
- [ ] Run dry-run, tests, apply, tests again, SEO validation, commit to `seo-system`, then create/update draft PR.
- [ ] Do not include merge, auto-merge, Vercel deploy or promotion actions.
- [ ] Limit batch input to one to three finding IDs.
- [ ] Validate YAML and commit.

### Task 8: Add Preview Gate and Human Merge Checklist

**Files:**
- Create: `.github/pull_request_template.md`
- Create: `docs/seo/human-merge-checklist.md`
- Modify: `.github/workflows/seo-preview-verify.yml`

- [ ] Add required confirmation that the PR remains draft until all checks pass.
- [ ] Require owner review of per-finding commits and merge-commit method.
- [ ] Verify preview URL only; no promotion.
- [ ] Document explicit owner action to mark ready, approve and merge.
- [ ] Commit.

### Task 9: Implement Post-Merge Verification and Branch Synchronization

**Files:**
- Create: `.github/workflows/seo-post-merge.yml`
- Create: `seo/cli/sync-seo-branch.ts`
- Create: `tests/seo/sync-seo-branch.test.ts`

**Interfaces:**
- Produces synchronization only when `main` merge commit contains previous `seo-system` head as a parent and production verification passes.

- [ ] Write tests for valid merge-commit ancestry, squash merge rejection, diverged branch rejection and failed production verification.
- [ ] Implement read verification first; branch update occurs only to `seo-system`, never `main`.
- [ ] Use a narrowly scoped token that can update `seo-system` but is not allowed by the `main` ruleset.
- [ ] Update findings from `draft-pr` to `deployed`; do not mark `seo-resolved` without later GSC evidence.
- [ ] Re-run; expect PASS.
- [ ] Commit.

### Task 10: Run the Controlled Pilot

**Files:**
- No new production files unless the pilot finding is real and owner-approved.
- Update: `docs/seo/draft-fix-runbook.md` with evidence references.

- [ ] Create or use a controlled fixture finding `SEO-PILOT-DOUBLE-SLASH`.
- [ ] Run governance verification and confirm `main` protection.
- [ ] Run fix workflow and verify one focused commit lands on `seo-system`.
- [ ] Verify exactly one draft PR exists and preview checks pass.
- [ ] Attempt a direct update to `main` with the automation identity and verify GitHub rejects it.
- [ ] Do not merge the pilot without owner approval.
- [ ] Record results and commit the approved permanent decision summary only.

## Plan Gate

Version 1 governance is complete only when:

```text
main direct update by automation: rejected
merge/auto-merge API use: absent
Vercel production credential: absent
active SEO draft PRs: <= 1
batch findings: 1..3
merge method: merge commit
post-merge sync: tested
```

Run the full command set from the master roadmap and confirm `main` is unchanged before owner action.