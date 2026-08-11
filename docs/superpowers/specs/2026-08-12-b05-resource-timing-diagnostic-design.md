# B0.5 Resource Timing Diagnostic Design

Date: 2026-08-12
Branch: `seo-system`
PR: #35
Status: owner-approved concept; written-spec review required before implementation

## Purpose

Close as much as possible of the remaining B0.5 boundary after runtime evidence proved:

```text
analytics consent
→ form handler
→ gaEvent()
→ gtag('event', ...)
→ dataLayer
= PASS
```

The only unresolved downstream boundary is:

```text
dataLayer → Google tag / GA4 transport → GA4 collect → GA4 property
```

This diagnostic must not change GTM, GA4, production, the contact-event implementation, or the lead submission path.

## Current evidence

The existing preview-only diagnostic page already proves that one synthetic `input` produces exactly one Evochia custom `form_start` entry with:

```text
event = form_start
form_id = quoteForm
lead_source = quote_form
page_path = /en/contact/
locale = en
page_type = contact
service_intent = lead_capture
```

Therefore no `gaEvent()` or form-handler fix is justified by current evidence.

## Approaches considered

### A. PerformanceResourceTiming inspection — selected

Read the popup contact page's own `performance.getEntriesByType('resource')` before and after the existing synthetic input. Resource Timing includes HTTP(S) resources initiated by `fetch`, XHR, and `sendBeacon`; cross-origin timing detail may be restricted, but the requested resource URL remains observable.

Advantages:
- no monkey-patching;
- no interception of `gtag`, `dataLayer.push`, `fetch`, or `sendBeacon`;
- no second real lead submission;
- no GTM/GA4 configuration write;
- works inside the same page-world popup already used by the diagnostic.

Limitation:
- Resource Timing exposes the request URL, not an arbitrary POST/request body. Therefore absence of `en=form_start` from an observed URL cannot always prove that the event was not transported if a browser/tag implementation batches or puts event data in a request body.

### B. Monkey-patch `fetch` / `sendBeacon` — rejected

Would expose more request payload detail, but changes browser runtime behavior and violates the approved passive-diagnostic constraint.

### C. Tag Assistant / DevTools network — rejected for this environment

Would provide stronger transport evidence, but repeated attempts on the exact preview failed the Tag Assistant handshake and the Work browser does not expose the required network/page-world interface.

## Diagnostic architecture

Only `en/ga-b05-diagnostic.html` and its analytics tests may change for this step. `js/site.js`, consent code, GTM, GA4, Vercel config, middleware routing, and production files remain unchanged.

The diagnostic will add a read-only helper that inspects the contact popup's resource timeline and returns only sanitized GA transport metadata.

### GA collect recognition

A resource is a GA4 collect candidate when:

- its URL hostname is `www.google-analytics.com`, `google-analytics.com`, or a `*.google-analytics.com` regional host; and
- its pathname contains `/g/collect` or ends in `/collect`.

For each candidate the probe may expose only:

```text
host
pathname
measurement_id (tid)
event_name (en)
initiator_type
start_time
```

It must not print the full collect URL or arbitrary query parameters, because those can contain page URLs or other values unnecessary for this diagnostic.

### Baseline

Before the synthetic input, the probe records a snapshot key for every existing GA collect resource. It does not call `performance.clearResourceTimings()` and does not mutate the Performance Timeline.

The existing baseline requirements remain:

```text
analytics_consent = true
gtag_type = function
dataLayer_is_array = true
evochia_custom_form_start_count = 0
```

### Stimulus

Reuse the existing single synthetic interaction:

```text
field.value = 'x'
focus
one bubbling input event
```

No `submit`, `requestSubmit`, `FormData`, Formspree request, or contact navigation is allowed.

### Observation window

After the synthetic input, poll the popup's resource timeline for up to 5 seconds at a short interval. Stop early when a matching GA4 collect URL is observed.

A matching URL requires:

```text
tid = G-2R3S78PTDL
en = form_start
```

The dataLayer result and GA transport result are reported separately.

## Result semantics

The probe must not manufacture a false binary failure from an API that cannot inspect request bodies.

### `GA4_COLLECT_URL_MATCH_PASS`

Use only when a new resource entry is observed after the stimulus and its URL contains both:

```text
tid=G-2R3S78PTDL
en=form_start
```

This proves:

```text
dataLayer → Google tag/transport → GA4 collect request URL = PASS
```

It does not by itself prove GA4 Realtime/DebugView processing.

### `GA4_COLLECT_NEW_REQUEST_NO_FORM_START_MATCH`

Use when one or more new GA collect resource entries appear, but none exposes `tid=G-2R3S78PTDL` plus `en=form_start` in the request URL.

This is evidence that GA transport activity occurred, but it is not a definitive failure because the event may be batched or encoded outside the observable URL.

### `GA4_COLLECT_NOT_OBSERVED`

Use when no new GA collect resource entry appears within the observation window.

This remains unresolved evidence, not a definitive network failure. The next escalation would require a DevTools-capable network surface or explicitly approved transport instrumentation.

### Site boundary

The existing result remains authoritative:

```text
SITE_TO_DATALAYER_PASS
```

if exactly one new Evochia custom `form_start` tuple appears.

## Output schema

The final diagnostic JSON will include at least:

```text
before
after
delta_custom_form_start
site_interpretation
ga_collect_before_count
ga_collect_after_count
new_ga_collect_count
new_ga_collect_sanitized[]
ga_collect_interpretation
observation_window_ms
```

No PII or full GA collect URLs may be emitted.

## Testing

TDD sequence:

1. Add failing analytics tests requiring the resource-timing reader, host/path filtering, sanitized output fields, exact measurement/event matching, and the three conservative result states.
2. Confirm `Site Analytics Validation` fails for the expected missing implementation.
3. Implement the smallest diagnostic-only change.
4. Re-run `Site Analytics Validation` and `SEO Data Hub Validation` to green.
5. Wait for a Vercel preview tied to the exact new SHA and confirm READY metadata before giving the Work mode a URL.

Tests must also assert that the diagnostic still contains no:

```text
window.gtag replacement
dataLayer.push replacement
fetch replacement
sendBeacon replacement
submit()
requestSubmit()
new FormData()
```

## Runtime validation

Work mode will use only the new exact immutable preview. It will:

1. open the diagnostic page;
2. open the same-origin contact target;
3. confirm consent and baseline;
4. run one synthetic input;
5. return the complete sanitized JSON;
6. optionally observe GA4 Realtime as supplemental evidence only.

No Formspree submit is authorized.

## Success criteria

Best-case closure is:

```text
SITE_TO_DATALAYER_PASS
GA4_COLLECT_URL_MATCH_PASS
```

At that point the site and observable GA transport are cleared, and any remaining absence in GA4 UI is downstream reporting/destination processing.

If the collect result is one of the two non-PASS states, B0.5 remains partially unresolved and no repo/GA4/GTM remediation is inferred without stronger transport evidence.

## Cleanup and governance

This diagnostic page, its temporary middleware allowlist, and its B0.5-specific tests are temporary and must be removed before any merge to `main`.

This step authorizes only diagnostic repo changes and the automatically generated preview deployment. It does not authorize:

- production deployment;
- GTM mutation or publish;
- GA4 configuration writes;
- Formspree submission;
- True Basic Consent implementation;
- merge or ready-for-review transition.
