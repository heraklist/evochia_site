# GA4 Custom Event Routing Remediation — Design

**Date:** 2026-08-14
**Branch:** `seo-system`
**PR:** #35 (draft)
**Status:** approved design, not yet approved for implementation
**Supersedes:** the earlier `form_start` collision-only diagnostic design previously stored at this path.

## 1. Purpose

Repair Evochia's site-authored GA4 custom-event transport without changing GA4 or GTM configuration, while preventing a known naming collision with Enhanced Measurement.

The earlier hypothesis that the missing transport was caused primarily by the custom event name `form_start` is superseded. Controlled browser evidence showed the same failure for the non-colliding custom event `contact_click`, and a same-session A/B probe isolated explicit destination routing as the discriminating factor:

```text
gtag('event', 'evochia_route_probe_no_target', {...})
-> no GA4 /g/collect observed

gtag('event', 'evochia_route_probe', {
  send_to: 'G-2R3S78PTDL',
  ...
})
-> GA4 /g/collect PASS
```

The read-only GA4/GTM root-cause review further established that the GA4 destination association is valid, the destination is loaded in runtime, and published GTM v7 does not provide a separate GA4 Event-tag route for Evochia's custom events. The working root cause is therefore the current GTM-deployed Google-tag architecture having no on-page `gtag('config', 'G-2R3S78PTDL')` command to populate the page-level default target group used by site-authored `gtag('event', ...)` commands without `send_to`.

## 2. Verified Repository Preconditions

At the current `seo-system` branch state:

- `gaEvent(name, params)` is the sole direct caller of `gtag('event', ...)` in `js/site.js`.
- `gaEvent()` returns before dispatch when `analyticsConsented()` is false.
- `gaEvent()` already normalizes missing/non-object `params` to `{}`.
- `gaEvent()` already clones caller parameters with `Object.assign({}, params)`, so callers are not mutated.
- All six current custom-event call sites pass through `gaEvent()`:
  - `contact_click`
  - `cta_click`
  - `form_start`
  - `form_submit_attempt`
  - `generate_lead`
  - `form_submit_error`
- `form_start` fires once on the first meaningful quote-form interaction and latches only after `gaEvent()` returns true.

These properties are design constraints and must remain true after remediation.

## 3. Selected Remediation

### 3.1 Explicit GA4 destination in `gaEvent()`

Every event dispatched by `gaEvent()` will receive the Evochia GA4 Measurement ID as an unconditional routing invariant.

Use a single in-file constant for the measurement ID in `js/site.js`:

```text
G-2R3S78PTDL
```

No new build-time environment variable is introduced in this batch; changing the build/configuration surface is unnecessary for this focused remediation.

Inside `gaEvent()`, after the existing payload clone and all current enrichment (`page_path`, `locale`, `page_type`, `service_intent`, optional `debug_mode`), set:

```text
payload.send_to = GA4_MEASUREMENT_ID
```

as the final payload write immediately before:

```text
gtag('event', name, payload)
```

The assignment is unconditional. Callers must not control routing by placing `send_to` inside their parameter bag.

### 3.2 No destination override extension point

This batch intentionally provides no per-event destination override.

Rationale:

- Evochia currently has one GA4 destination for these events.
- No current call site supplies `send_to`.
- Permitting a caller-supplied destination would reintroduce a silent routing-failure surface into the helper whose purpose is to guarantee correct routing.
- If multi-destination routing is required later, it must be designed explicitly rather than smuggled through the event-data object.

### 3.3 Rename the site-authored quote-form start event

In the same remediation batch, rename only the custom quote-form event:

```text
form_start -> quote_form_start
```

This rename is no longer a transport experiment. It is a taxonomy/deduplication measure.

Enhanced Measurement Form Interactions remains enabled. Its automatic `form_start` continues to represent Google's generic form-interaction signal, while `quote_form_start` represents Evochia's quote-form-specific funnel event with lead attribution parameters.

Doing the rename in the same batch avoids intentionally sending a newly repaired custom `form_start` into GA4 under the same name as the automatic Enhanced Measurement `form_start`.

## 4. Alternatives Rejected

### 4.1 GTM-side custom-event routing

Do not add GA4 Event tags or Custom Event triggers in GTM in this batch.

Reasons:

- The site-level `send_to` route has already passed a controlled runtime A/B probe.
- Published GTM v7 currently has no competing GA4 Event route, keeping duplication risk low.
- GTM-side routing would introduce a second source of analytics routing logic and require a GTM publish.
- Whether the present gtag-style pushes are surfaced to GTM exactly as needed for a generic Custom Event route has not been required to prove the selected fix.

This can be revisited only if Evochia later needs deliberate multi-destination/fan-out behavior.

### 4.2 Add on-page `gtag('config', 'G-2R3S78PTDL')`

Do not add a page-level GA4 config command.

The GA4 destination association itself is not broken, and a second config path would create ordering/duplicate-configuration risk against the existing GTM-deployed Google tag.

### 4.3 Disable Enhanced Measurement Form Interactions

Do not disable Enhanced Measurement to avoid the `form_start` name collision.

The selected design preserves the automatic Google form signals and instead gives Evochia's business-specific quote-form start a distinct name.

## 5. Repository Surface

Implementation is intentionally narrow:

- `js/site.js`
  - define/use one GA4 Measurement ID constant for routing;
  - assign `payload.send_to` unconditionally immediately before dispatch;
  - rename the custom `form_start` call to `quote_form_start`.
- directly affected analytics tests/fixtures/expectations only.
- this design/spec and later implementation-plan documentation as required by the repository workflow.

No unrelated refactor is permitted.

## 6. Consent Boundary

The routing remediation must not alter the existing `analyticsConsented()` gate.

Because `gaEvent()` returns before `gtag('event', ...)` when analytics consent is absent, adding `send_to` inside the post-gate helper does not create new pre-consent Evochia custom-event calls.

The independently observed pre-consent GA4 `page_view` remains a separate defect in the base Google Tag / Consent Mode architecture. It is outside this routing batch and must not be treated as fixed by the custom-event remediation.

A separate consent-ordering concern also remains for returning visitors: the persisted consent state may become visible to site code before Google consent state has been updated. That concern belongs to the True Basic consent workstream, not to this routing change.

## 7. Validation Requirements

Validation must occur on an approved preview deployment before any production action.

For preview validation, `window.__GA_DEBUG__ = true` may be set manually before the tested interaction so the existing helper adds `debug_mode=true`; this does not require a code change.

### 7.1 Blocking transport validation

Use `contact_click` first because it does not collide with an Enhanced Measurement event name.

A single user interaction must produce exactly one matching GA4 collect with:

```text
tid=G-2R3S78PTDL
en=contact_click
```

and the expected Evochia event parameters, including the relevant contact/lead parameters and enrichment.

The same request must also establish:

- `send_to` is consumed as routing and is not emitted as an `ep.send_to` event parameter;
- exactly one custom `contact_click` collect is produced for the interaction;
- client/session identifiers remain continuous with the page view from the same load.

### 7.2 Negative consent validation

Before analytics consent, triggering a site interaction that would ordinarily call `gaEvent()` must produce no Evochia custom-event collect.

This assertion is specifically about custom events. The separately known pre-consent base `page_view` defect may still be present and does not invalidate this routing test.

### 7.3 `quote_form_start` separation

After consent, first meaningful interaction with the quote form must show distinct semantics:

- the site-authored event transports as `quote_form_start` with Evochia attribution parameters;
- Enhanced Measurement may independently emit its automatic `form_start` with Google form parameters;
- the two signals must not share the same event name.

No form submission is required for this validation.

### 7.4 GA4 acceptance / DebugView

For the non-submitting validation path, confirm the selected custom event in both Network and GA4 DebugView where available:

- Network proves browser transport and request contents;
- DebugView proves GA4 acceptance/visibility.

### 7.5 `generate_lead` end-to-end gate

A true `generate_lead` end-to-end validation requires a successful real form submission to Formspree.

That action is explicitly **not authorized by this design approval**. It may be executed only after separate, immediate owner approval immediately before the submission test.

Without that approval, validation must stop before any Formspree submission.

## 8. Success Criteria

The routing remediation is validated only when all non-submission blocking checks pass:

1. `contact_click` produces exactly one routed GA4 collect to `G-2R3S78PTDL` with expected parameters.
2. `send_to` is not emitted as an event parameter.
3. session/client continuity is preserved.
4. no Evochia custom event is transported before analytics consent.
5. the quote-form custom start transports as `quote_form_start`, while automatic Enhanced Measurement `form_start` remains distinct.
6. GA4 DebugView confirms acceptance for the tested custom event where available.

`generate_lead` remains a separately gated end-to-end check until Formspree submission is explicitly approved.

## 9. Safety and Governance

- PR #35 remains the permanent draft PR from `seo-system` to `main`.
- No second PR.
- No merge, ready-for-review transition, auto-merge, or production deployment.
- No GA4 or GTM write/configuration change.
- No GTM publish.
- No on-page `gtag('config')` addition.
- No disabling Enhanced Measurement.
- No consent architecture change in this batch.
- No Formspree submission without separate immediate owner approval.
- One writer; implementation changes must be small, sequential, tested, and CI-verified.

## 10. Superseded Diagnostic Conclusion

The old collision-only experiment is formally superseded.

Renaming `form_start` alone could not have diagnosed the actual transport defect because an event without a default target would still have had no route after the rename. The controlled explicit-`send_to` A/B probe provided the discriminating evidence instead.

The rename survives only as the permanent taxonomy decision `quote_form_start`, paired with the routing remediation.

## 11. Next Workflow Gate

This document records the reviewed design only. It does not authorize implementation.

After spec self-review, the owner must review and approve this written spec. Only then may the workflow proceed to an implementation plan. No code change, preview deployment, or external write occurs before that gate.