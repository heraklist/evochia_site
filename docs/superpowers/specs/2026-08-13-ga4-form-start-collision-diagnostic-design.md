# GA4 `form_start` Collision Diagnostic — Design

**Date:** 2026-08-13  
**Branch:** `seo-system`  
**PR:** #35 (draft)  
**Scope:** preview-only diagnostic change; no production, GA4, GTM, Formspree, consent-policy, or deployment-policy mutation.

## 1. Purpose

Establish whether Evochia's custom event name `form_start` is being suppressed, coalesced, or otherwise not transported because it collides with GA4 Enhanced Measurement's automatic `form_start` event.

The current runtime evidence already establishes:

1. Evochia's custom `gtag('event', 'form_start', payload)` reaches `window.dataLayer` with the expected custom parameters.
2. The same user interaction produces exactly one GA4 `/g/collect` request for `en=form_start` containing Enhanced Measurement form parameters such as `form_destination`, `form_length`, and `first_field_*`.
3. That request does not contain Evochia-specific parameters such as `lead_source=quote_form`, `page_type`, or `service_intent`.
4. No second matching collect request appears after an additional observation window.

This design tests the event-name-collision hypothesis with one controlled variable.

## 2. Change Under Test

Change only the Evochia custom event name emitted on first quote-form interaction:

```text
form_start -> quote_form_start
```

The existing payload remains unchanged, including:

```text
form_id=quoteForm
lead_source=quote_form
page_path=/en/contact/
locale=en
page_type=contact
service_intent=lead_capture
```

No change is made to:

- `gaEvent()` behavior;
- consent checks or consent restoration;
- GTM configuration;
- GA4 configuration;
- Enhanced Measurement;
- Formspree submission behavior;
- any other analytics event name;
- production deployment state.

## 3. Repository Surface

Implementation is restricted to:

- `js/site.js`, for the single custom event-name substitution;
- the minimum directly affected analytics tests or diagnostic expectations required to keep repository validation accurate.

No unrelated refactor is permitted in this batch.

## 4. Validation Flow

Use a fresh preview deployment from the updated `seo-system` head. In Chrome DevTools Network:

1. Accept analytics consent.
2. Clear the Network log while preserving the accepted consent state.
3. Filter for `collect`.
4. Interact once with the quote form by entering exactly `x` in the Full Name field.
5. Do not submit the form.
6. Observe for at least 10 seconds.

The automatic Enhanced Measurement `form_start` may still be emitted independently and is not itself a failure.

## 5. Success Criterion

The hypothesis is strongly confirmed if a GA4 transport request or batch is observed with:

```text
en=quote_form_start
ep.form_id=quoteForm
ep.lead_source=quote_form
```

and, where present in the transport representation, the existing Evochia enrichment parameters such as `page_path`, `locale`, `page_type`, and `service_intent`.

A matching `quote_form_start` request demonstrates that the same site event pipeline transports normally after changing only the event name.

## 6. Failure Criterion

If `quote_form_start` is present in `window.dataLayer` but no matching GA4 transport is observed after the same controlled test, the event-name-collision hypothesis is not sufficient and must not be treated as the root cause.

Further diagnosis would then move downstream into Google Tag processing / destination routing without changing unrelated code.

## 7. Safety and Governance

- PR #35 remains draft.
- No merge or ready-for-review transition.
- No production deployment.
- No GTM or GA4 writes.
- No Formspree submission.
- No consent architecture change in this diagnostic batch.
- Any remediation beyond this one-variable experiment requires a separate owner decision after the result is observed.

## 8. Reversion / Follow-up

This experiment does not by itself authorize a permanent analytics taxonomy change.

After validation:

- if `quote_form_start` transports successfully, treat the collision hypothesis as strongly confirmed and separately decide whether to retain the renamed event or adopt another final event name;
- if it does not transport, revert or supersede the diagnostic rename as part of the next approved diagnostic step.

The separate True Basic Consent Mode defect remains outside this experiment and must be handled independently.
