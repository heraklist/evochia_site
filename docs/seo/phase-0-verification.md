# Evochia SEO Phase 0 Verification

**Status:** Pending  
**Owner identity:** `heraklis@evochia.gr`  
**Configuration contract:** `seo/config/google-resources.example.json`  
**Schema:** `seo/schemas/google-resources.schema.json`

## Rules

- Every gate must record a human verifier, UTC timestamp and evidence reference.
- Evidence references may point to an approved Google interface, GitHub setting, Vercel setting, Sheet row or bounded audit artifact.
- Do not copy OAuth tokens, API keys, cookies, service-account JSON or other secrets into this document.
- `verificationStatus` must remain `pending` while any required identifier is `UNVERIFIED` or any gate is incomplete.
- Failure or uncertainty leaves the related collector or automation disabled.

## Verification Record Template

For each gate complete all fields:

```text
Status: pending | verified | failed
Verifier: <human GitHub/Google identity>
Verified at: <YYYY-MM-DDTHH:MM:SSZ>
Evidence: <non-secret reference>
Notes: <bounded factual notes>
```

## External Phase 0 Gates

### Gate 1 — Search Console owner access

Confirm that `heraklis@evochia.gr` has the required read access to the production Search Console property and record the exact property identifier.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 2 — GA4 account and property identity

Confirm that GA4 account `388030118` and property `528945896` are the intended production analytics resources.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 3 — GTM production container identity

Confirm that `GTM-578JXRXS` is the container currently published on `https://www.evochia.gr/`, then record the internal GTM account and container IDs.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 4 — Published GTM to GA4 destination mapping

Confirm that the currently published GTM version sends production analytics to the expected GA4 destination associated with property `528945896`.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 5 — Conversion event mapping

Confirm the intended production conversion actions and their mapping from browser interaction to GTM trigger, GA4 event and GA4 key-event status.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 6 — GitHub `main` ruleset capability

Confirm that the repository plan can enforce the required `main` ruleset without an automation bypass: pull request required, human approval required, required checks, no direct push and no automation actor on a bypass list.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 7 — Human CODEOWNERS identity

Select and record the human GitHub account that will own SEO-critical files. The identity must not be an app or automation actor.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 8 — Repository auto-merge state

Confirm the repository auto-merge setting and ensure the SEO workflow cannot enable or use auto-merge.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 9 — Vercel production authority

Confirm that `main` is the only Vercel production branch and that SEO automation has no credential capable of preview promotion, manual production deployment, domain changes or production environment changes.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 10 — GitHub Actions allowance and SEO budget

Record the current Actions allowance for the private repository and approve an SEO operating budget with warning, downgrade and non-critical-stop thresholds.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

### Gate 11 — Production Sheet and Drive ownership

Confirm the production Google Sheet and the dedicated Drive folder under `heraklis@evochia.gr`, then record their non-secret resource IDs.

- Status: pending
- Verifier:
- Verified at:
- Evidence:
- Notes:

## Final Phase 0 Decision

Phase 0 may be marked verified only when all 11 gates are verified and `seo/config/google-resources.example.json` has been copied to the approved runtime configuration with no `UNVERIFIED` values.

```text
Overall status: pending
Approved by:
Approved at:
Evidence bundle:
```
