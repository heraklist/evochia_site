# Basic Consent and Preview Isolation Design

**Status:** Owner-approved for repository implementation
**Date:** 2026-08-24
**Parent closure design:** `docs/superpowers/specs/2026-08-24-pr-35-repository-closure-design.md`

## Problem

The current branch places Consent Mode defaults before GTM, but every localized document still loads GTM immediately and contains a GTM `noscript` iframe. That is Advanced Consent behavior and permits Google requests before analytics consent or when JavaScript is disabled. Production measurement can also run on preview hosts because the HTML loader has no exact-host gate.

## Invariants

1. No Google/GTM measurement request is emitted from a non-production host.
2. No Google/GTM measurement request is emitted before analytics consent.
3. Non-analytics site behavior works without analytics consent.
4. Valid stored analytics consent restores measurement once.
5. GTM initializes at most once per document.
6. Site-authored analytics events remain consent-gated.
7. No submitted PII is added to analytics payloads.
8. GA4 remains `G-2R3S78PTDL`.
9. GTM remains `GTM-578JXRXS`.

## Selected design

All localized HTML keeps the inline `dataLayer`, `gtag()` stub, and default-denied Consent Mode call. The immediate GTM loader and the GTM `noscript` iframe are removed.

`js/cookieconsent-config.js` owns dynamic GTM insertion because it already observes stored consent, initial consent, changes, and withdrawal. A small idempotent loader:

- compares normalized `window.location.hostname` with the exact allowlist `['www.evochia.gr']`;
- returns without side effects on every other host;
- records a one-document loading state;
- recognizes an already-present GTM script as initialized;
- issues the analytics consent update to `granted` before appending the GTM script;
- inserts the fixed GTM URL and fixed container ID without accepting caller-provided URLs or identifiers.

Stored-consent restoration uses the existing shared `storedAnalyticsConsented()` function exposed by `site.js`. The CookieConsent callbacks use the library's live accepted-category result. Multiple restoration/callback calls converge on the same one-shot loader.

Withdrawal updates analytics consent to denied and preserves the existing reload behavior. The reload is important: already-loaded third-party JavaScript cannot be reliably unloaded, while the next document will see stored denial and will not insert GTM.

## Host decision

Only `www.evochia.gr` is allowed. Repository canonicals and Apps Script production configuration use that hostname. The apex is not added merely for convenience; its expected role is redirecting to the canonical host. The following remain denied:

- `evochia.gr`
- `evil-evochia.gr`
- `evochia.gr.attacker.example`
- all `*.vercel.app` hosts
- localhost and loopback hosts

Playwright simulates `www.evochia.gr` through a Chromium host-resolver rule that maps it to the local deterministic server. This exercises the exact production allowlist without contacting production.

## Alternatives rejected

- Keeping the inline GTM loader with default-denied Consent Mode: still emits a Google request before consent.
- Host suffix or substring matching: permits look-alike domains.
- Loading GTM on preview with a debug flag: violates the approved no-measurement-on-preview invariant.
- Retaining the GTM `noscript` iframe: no client-side consent control can gate it when JavaScript is disabled.
- Adding a second persisted-cookie parser to the loader: creates divergent consent truth; the existing shared parser remains authoritative.

## Browser test design

The Playwright suite runs only dedicated E2E specs against a Node static-route server. Google/GTM and Formspree routes are registered before navigation and fulfilled or aborted locally. Tests fail if an unexpected request escapes the allowlist.

Required assertions include:

- EN and EL critical routes render and navigate;
- the consent banner works while GTM remains absent before acceptance;
- accepted analytics consent on simulated `www.evochia.gr` attempts one GTM load;
- accepted analytics consent on loopback/preview attempts no GTM load;
- restoration and repeated callbacks do not attempt a second load;
- rejection leaves GTM absent;
- `contact_click`, one-shot `quote_form_start`, and `form_submit_attempt` dispatch only after consent;
- mocked Formspree success produces `generate_lead` and mocked failure produces `form_submit_error`;
- no real Google or Formspree request leaves the browser context.

## Repository contracts

Static analytics contracts enumerate all localized documents and require:

- exactly one default-denied consent bootstrap;
- no immediate `gtm.js` script bootstrap;
- no GTM `noscript` iframe;
- the fixed GA4 and GTM identifiers remain unchanged;
- the loader contains the exact-host and one-shot controls.

> **RETIRED SURFACE (2026-08-24).** The replacement static and browser tests passed, and the temporary B0.5 diagnostic was removed at the final cleanup gate. Historical diagnostic evidence remains only in documents explicitly marked historical or retired.

## Runtime validation boundary

Passing repository browser tests proves repository behavior with intercepted transports. It does not prove the live GTM container, deployed response, GA4 DebugView, Formspree delivery, or `generate_lead` acceptance. Those remain `POST_DEPLOY_RUNTIME_VALIDATION_PENDING` or `OWNER_AUTHORIZATION_REQUIRED`.
