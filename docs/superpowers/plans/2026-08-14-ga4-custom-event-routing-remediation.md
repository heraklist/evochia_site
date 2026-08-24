# GA4 Custom Event Routing Remediation Implementation Plan

> **HISTORICAL IMPLEMENTATION RECORD / DIAGNOSTIC RETIRED (2026-08-24).** The permanent routing change was implemented in commit `a606aaf`; the temporary B0.5 diagnostic references below were retired after replacement coverage passed. This plan remains evidence of the approved workflow, not current execution instruction. The lead status remains `LEAD_METRIC_E2E_NOT_VALIDATED`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every Evochia-authored GA4 custom event explicitly to `G-2R3S78PTDL`, rename the business-specific `form_start` event to `quote_form_start`, and prove the shared transport path without overstating validation of the lead business metric.

**Architecture:** Keep the remediation inside the existing `gaEvent(name, params)` boundary in `js/site.js`. Clone and enrich the payload exactly as today, then unconditionally assign the single in-file GA4 destination as the final payload write immediately before dispatch; callers cannot override it. Rename the quote-form start taxonomy at every executable/diagnostic call site, preserve the consent and one-shot latch behavior, and validate repository behavior first, browser transport second, and the real Formspree-backed lead metric only behind a separate immediate owner approval.

**Tech Stack:** Static vanilla JavaScript, Node.js 22.23.2, `node:test`, GitHub Actions, Vercel preview deployments, browser Network inspection, GA4 DebugView.

## Global Constraints

- Work only on the existing `seo-system` branch and permanent draft PR #35 (`seo-system` -> `main`).
- No second PR, merge, ready-for-review transition, auto-merge, or production deployment.
- No GA4 or GTM write/configuration change, GTM publish, new GA4 Event tag, on-page `gtag('config')`, or Enhanced Measurement change.
- No consent architecture change. Preserve the existing `analyticsConsented()` early-return boundary and the known separate pre-consent base `page_view` defect.
- No new dependency, build-time environment variable, or unrelated refactor.
- Use exactly one in-file destination constant with value `G-2R3S78PTDL`.
- `payload.send_to = GA4_MEASUREMENT_ID` must be unconditional, must override any caller-supplied `send_to`, and must be the final payload write after `page_path`, `locale`, `page_type`, `service_intent`, and optional `debug_mode` enrichment and immediately before `gtag('event', name, payload)`.
- Preserve caller immutability: `gaEvent()` must continue to clone an object parameter bag and must not add `send_to` to the caller's object.
- Rename every executable Evochia-authored `gaEvent('form_start', ...)` call site to `gaEvent('quote_form_start', ...)`; do not rename or suppress Google's automatic Enhanced Measurement `form_start`.
- Preserve the quote-form one-shot rule: the latch changes only after `gaEvent('quote_form_start', ...)` returns `true`.
- No Formspree submission, `requestSubmit()`, direct `.submit()`, production lead creation, or deliberate failure stimulation without separate immediate owner approval.
- Rollback before production is structural: because PR #35 remains draft and this batch permits no merge or production deploy, any failed implementation or preview validation leaves the current production site unchanged; rollback consists of reverting the batch commits on `seo-system` before any later production approval.
- Preview validation sends real hits to the production GA4 property. `window.__GA_DEBUG__ = true` makes those hits identifiable in DebugView; it does not exclude them from the property dataset.

## Known GA4 Reporting Consequences

- `form_start` is currently marked as a GA4 key event. After the rename, that key event is fed only by Google's automatic Enhanced Measurement `form_start`; Evochia's `quote_form_start` is not a key event in this batch. A resulting change in the existing `form_start` key-event count is expected and is not, by itself, evidence that routing regressed.
- `cta_click` is also currently marked as a GA4 key event and begins transporting for the first time through this remediation. Its key-event counts may move materially from the deployment boundary onward. That discontinuity is expected and must be annotated in later reporting; changing key-event configuration remains outside this batch.

## Explicit Risk Acceptance and Validation Vocabulary

This batch intentionally activates transport for all six Evochia-authored events through one shared helper:

```text
contact_click
cta_click
quote_form_start
form_submit_attempt
form_submit_error
generate_lead
```

Only `contact_click` and `quote_form_start` are blocking browser-transport validations in the non-submitting path. This is an explicit accepted risk: all six events share the same `gaEvent()` routing implementation, the automated contract exercises that helper for every event name, and the browser proves the shared route with two safe representative interactions. The remaining event-specific business triggers are not each validated separately in this batch.

Use these status terms exactly:

```text
TRANSPORT_VALIDATED
```

means the automated contract and all non-submission blocking browser checks pass for the shared route, including `contact_click`, `quote_form_start`, consent gating, single-collect behavior, parameter enrichment, routing consumption, and client/session continuity.

```text
LEAD_METRIC_E2E_VALIDATED
```

means a separately approved real Formspree submission succeeds end-to-end and produces the expected single `generate_lead` transport/GA4 acceptance evidence.

Until the second status is earned, the remediation must be reported as `TRANSPORT_VALIDATED; LEAD_METRIC_E2E_NOT_VALIDATED`. This means the routing defect is remediated, but Evochia still does not have a validated lead count/business metric.

DebugView is an observational inventory, not six independent validations. Record every event name as one of:

```text
seen
stimulated-but-not-seen
not-stimulated
```

Before submit approval, submit-only events must be `not-stimulated`, not failures. If an authorized interaction was stimulated but its name is absent, stop and investigate before claiming the relevant gate.

---

### Task 1: Lock the shared routing and complete taxonomy contract with RED tests

**Files:**
- Modify: `tests/analytics/site-events.test.mjs`
- Modify: `tests/analytics/b05-diagnostic.test.mjs`
- Test: `tests/analytics/site-events.test.mjs`
- Test: `tests/analytics/b05-diagnostic.test.mjs`

**Interfaces:**
- Consumes: current `js/site.js`, `en/ga-b05-diagnostic.html`, existing consent helpers, and the existing quote-form latch.
- Produces: an executable contract for `GA4_MEASUREMENT_ID`, `gaEvent(name, params)`, the exact six-event call-site inventory, the `quote_form_start` latch, and the renamed preview diagnostic vocabulary.

- [ ] **Step 1: Verify and record the current call-site cardinality before encoding it**

Run against the unmodified Task 1 baseline:

```bash
rg -n "\bgaEvent\(" js/site.js
```

Expected: one `function gaEvent(...)` declaration and exactly six literal invocations, one each for:

```text
contact_click
cta_click
form_start
form_submit_attempt
generate_lead
form_submit_error
```

If the observed baseline differs, stop before writing the cardinality assertion and reconcile the plan with the actual call sites. Do not turn a pre-existing second legitimate handler into a false RED failure.

- [ ] **Step 2: Add a focused `gaEvent()` evaluation harness**

In `tests/analytics/site-events.test.mjs`, add these helpers after `storedConsentCookie(...)`:

```js
function gaEventRegion() {
  const startMarker = '/* GA4 helper.';
  const endMarker = '/* Nav visible */';
  const start = site.indexOf(startMarker);
  const end = site.indexOf(endMarker, start);
  assert.ok(start !== -1 && end !== -1, 'GA4 helper region must exist');
  return site.slice(start, end);
}

function evaluateGaEvent({
  name = 'contact_click',
  params = {},
  consented = true,
  debug = false,
} = {}) {
  const calls = [];
  const context = {
    window: {
      location: { pathname: '/en/contact/' },
      __GA_DEBUG__: debug,
    },
    lang: 'en',
    analyticsConsented: () => consented,
    getPageType: () => 'contact',
    getServiceIntent: () => 'lead_capture',
    gtag: (...args) => calls.push(args),
    inputName: name,
    inputParams: params,
    result: null,
  };

  runInNewContext(
    `${gaEventRegion()}\nresult = gaEvent(inputName, inputParams);`,
    context,
  );
  return { calls, result: context.result };
}
```

- [ ] **Step 3: Add failing routing, ordering, override, debug-default, and consent assertions**

Append these tests to `tests/analytics/site-events.test.mjs`:

```js
test('gaEvent adds the fixed GA4 destination after enrichment and immediately before dispatch', () => {
  const helper = gaEventRegion();
  assert.match(helper, /var GA4_MEASUREMENT_ID = 'G-2R3S78PTDL';/);

  const enrichmentMarkers = [
    'if (!payload.page_path)',
    'if (!payload.locale)',
    'if (!payload.page_type)',
    'if (!payload.service_intent)',
    'if (window.__GA_DEBUG__ === true)',
  ];
  const routingIndex = helper.indexOf('payload.send_to = GA4_MEASUREMENT_ID;');
  const dispatchIndex = helper.indexOf("gtag('event', name, payload);");

  assert.ok(routingIndex !== -1, 'fixed destination assignment must exist');
  for (const marker of enrichmentMarkers) {
    assert.ok(
      helper.indexOf(marker) < routingIndex,
      `${marker} must execute before destination assignment`,
    );
  }
  assert.ok(routingIndex < dispatchIndex, 'destination assignment must precede dispatch');
  assert.equal(
    helper.slice(routingIndex, dispatchIndex).trim(),
    'payload.send_to = GA4_MEASUREMENT_ID;',
    'no payload write may occur between routing assignment and dispatch',
  );
});

test('gaEvent routes every current event name through the same fixed destination', () => {
  const names = [
    'contact_click',
    'cta_click',
    'quote_form_start',
    'form_submit_attempt',
    'form_submit_error',
    'generate_lead',
  ];

  for (const name of names) {
    const { calls, result } = evaluateGaEvent({
      name,
      params: { lead_source: 'test' },
      debug: true,
    });
    assert.equal(result, true, `${name} must report dispatch`);
    assert.equal(calls.length, 1, `${name} must dispatch once`);
    assert.equal(calls[0][0], 'event');
    assert.equal(calls[0][1], name);
    assert.equal(calls[0][2].send_to, 'G-2R3S78PTDL');
    assert.equal(calls[0][2].page_path, '/en/contact/');
    assert.equal(calls[0][2].locale, 'en');
    assert.equal(calls[0][2].page_type, 'contact');
    assert.equal(calls[0][2].service_intent, 'lead_capture');
    assert.equal(calls[0][2].debug_mode, true);
  }
});

test('gaEvent overrides caller routing without mutating caller params', () => {
  const params = {
    send_to: 'G-CALLER-MUST-NOT-CONTROL',
    lead_source: 'site',
  };
  const { calls } = evaluateGaEvent({ params });

  assert.equal(calls[0][2].send_to, 'G-2R3S78PTDL');
  assert.equal(params.send_to, 'G-CALLER-MUST-NOT-CONTROL');
  assert.equal(Object.prototype.hasOwnProperty.call(params, 'page_path'), false);
});

test('gaEvent omits debug_mode unless the explicit debug flag is true', () => {
  const { calls } = evaluateGaEvent({ debug: false });
  assert.equal(
    Object.prototype.hasOwnProperty.call(calls[0][2], 'debug_mode'),
    false,
  );
});

test('gaEvent still performs no custom dispatch before analytics consent', () => {
  const { calls, result } = evaluateGaEvent({ consented: false });
  assert.equal(result, false);
  assert.equal(calls.length, 0);
});
```

- [ ] **Step 4: Replace the old form-start latch assertion and add a complete executable call-site inventory**

Replace the existing `form_start latches only after the event is actually sent` test with:

```js
test('quote_form_start latches only after the event is actually sent', () => {
  assert.match(
    site,
    /if \(gaEvent\('quote_form_start'[\s\S]*?\)\)\s*\{\s*formStartSent = true;/,
    'formStartSent must be set inside the quote_form_start truthy branch',
  );
});

test('site-authored analytics call sites use the complete six-event taxonomy', () => {
  const invocations = Array.from(site.matchAll(/\bgaEvent\(\s*([^,\n)]+)/g))
    .filter((match) => site.slice(Math.max(0, match.index - 9), match.index) !== 'function ');
  const names = invocations.map((match) => {
    const firstArgument = match[1].trim();
    const literal = firstArgument.match(/^(['"])([^'"]+)\1$/);
    assert.ok(literal, `gaEvent name must be a string literal, found: ${firstArgument}`);
    return literal[2];
  });
  assert.deepEqual(names.sort(), [
    'contact_click',
    'cta_click',
    'form_submit_attempt',
    'form_submit_error',
    'generate_lead',
    'quote_form_start',
  ].sort());
  assert.doesNotMatch(
    site,
    /gaEvent\(\s*(['"])form_start\1/,
    'no Evochia-authored form_start call site may remain',
  );
});
```

This inventory intentionally examines every `gaEvent(...)` invocation in `js/site.js`, not only the contact-page interaction block. It accepts single- or double-quoted literal names, rejects dynamic names such as `gaEvent(nameVar, ...)`, and fails if any extra or duplicate invocation changes the verified one-per-event cardinality.

- [ ] **Step 5: Update the diagnostic test contract to the permanent event name**

In `tests/analytics/b05-diagnostic.test.mjs`, replace the old site-event matching assertions with:

```js
assert.match(html, /entry\[0\]\s*!==\s*'event'/);
assert.match(html, /entry\[1\]\s*!==\s*'quote_form_start'/);
assert.match(html, /payload\.form_id\s*!==\s*'quoteForm'/);
assert.match(html, /payload\.lead_source\s*!==\s*'quote_form'/);
```

Replace the transport-state test with:

```js
test('B0.5 diagnostic uses the permanent quote_form_start transport vocabulary', () => {
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /GA4_COLLECT_URL_MATCH_PASS/);
  assert.match(html, /GA4_COLLECT_NEW_REQUEST_NO_QUOTE_FORM_START_MATCH/);
  assert.match(html, /GA4_COLLECT_NOT_OBSERVED/);
  assert.match(html, /G-2R3S78PTDL/);
  assert.match(html, /quote_form_start/);
  assert.match(html, /evochia_quote_form_start_count/);
  assert.match(html, /delta_quote_form_start/);
  assert.doesNotMatch(html, /entry\[1\]\s*!==\s*'form_start'/);
  assert.match(html, /5000/);
});
```

Keep all existing no-monkey-patch, sanitized-resource, consent, and no-submit assertions intact.

- [ ] **Step 6: Run the focused contract and verify RED**

Run:

```bash
node --test tests/analytics/site-events.test.mjs tests/analytics/b05-diagnostic.test.mjs
```

Expected: FAIL in the new destination/ordering tests, six-event taxonomy test, renamed latch test, and diagnostic vocabulary test. The new debug-default test already passes against the baseline and remains a regression guard; the overall task is still RED for the missing remediation. Existing consent, PII, `generate_lead` success-branch, resource-sanitization, and no-submit tests remain green.

- [ ] **Step 7: Commit the RED contract**

```bash
git add tests/analytics/site-events.test.mjs tests/analytics/b05-diagnostic.test.mjs
git commit -m "test: define GA4 custom event routing contract"
```

Expected: `Site Analytics Validation` is RED only because the implementation has not yet been applied.

---

### Task 2: Implement the fixed destination and rename every affected runtime/diagnostic reference

**Files:**
- Modify: `js/site.js`
- Modify: `en/ga-b05-diagnostic.html`
- Test: `tests/analytics/site-events.test.mjs`
- Test: `tests/analytics/b05-diagnostic.test.mjs`

**Interfaces:**
- Consumes: the Task 1 contract and existing `analyticsConsented()`, `getPageType(pathname)`, and `getServiceIntent(pageType)` helpers.
- Produces: `GA4_MEASUREMENT_ID: 'G-2R3S78PTDL'`; `gaEvent(name, params): boolean` with invariant routing; site-authored `quote_form_start`; a preview diagnostic that observes `quote_form_start` without submitting.

- [ ] **Step 1: Capture the old helper and require a semantic diff before editing**

Before changing `js/site.js`, save the exact baseline helper region in the Task 2 report and inspect the eventual diff with:

```bash
git diff --word-diff=plain HEAD -- js/site.js
git diff -U25 HEAD -- js/site.js
```

The only permitted semantic changes inside the helper region are:

```text
add var GA4_MEASUREMENT_ID = 'G-2R3S78PTDL'
add payload.send_to = GA4_MEASUREMENT_ID after all existing enrichment and immediately before dispatch
```

All existing guards, payload cloning, enrichment, optional debug behavior, dispatch return value, comments, and ordering otherwise remain intact. Make a surgical insertion into the existing helper; do not replace the block wholesale. If the baseline helper contains behavior not represented in the plan, stop and report it before editing.

- [ ] **Step 2: Add the constant and final routing assignment at the required position**

In `js/site.js`, preserve the current GA4 helper and make only the two additions shown in this resulting structure:

```js
  /* GA4 helper. Returns true only when the event is actually dispatched, so
     callers can gate one-shot flags on real delivery (not on a dropped,
     pre-consent call). */
  var GA4_MEASUREMENT_ID = 'G-2R3S78PTDL';

  function gaEvent(name, params) {
    if (typeof gtag !== 'function') return false;
    if (!analyticsConsented()) return false;
    var payload = params && typeof params === 'object' ? Object.assign({}, params) : {};
    var currentPath = window.location.pathname;
    var pageType = getPageType(currentPath);
    if (!payload.page_path) payload.page_path = currentPath;
    if (!payload.locale) payload.locale = lang;
    if (!payload.page_type) payload.page_type = pageType;
    if (!payload.service_intent) payload.service_intent = getServiceIntent(pageType);
    if (window.__GA_DEBUG__ === true) payload.debug_mode = true;
    payload.send_to = GA4_MEASUREMENT_ID;
    gtag('event', name, payload);
    return true;
  }
```

Do not move the destination assignment above enrichment. Do not use conditional assignment such as `if (!payload.send_to)`. Do not read the Measurement ID from a caller parameter.

- [ ] **Step 3: Rename the real quote-form call site and preserve latch semantics**

In `js/site.js`, change the quote-form block to:

```js
    /* quote_form_start: fire once on the first meaningful interaction */
    var formStartSent = false;
    var sendFormStart = function () {
      if (formStartSent) return;
      /* Only latch the flag once the event was actually dispatched. If the
         visitor interacts before accepting analytics, gaEvent() returns false
         and we retry on the next interaction after consent is granted. */
      if (gaEvent('quote_form_start', {
        form_id: 'quoteForm',
        lead_source: 'quote_form'
      })) {
        formStartSent = true;
      }
    };
```

Keep both existing `focusin` and `input` listeners bound to `sendFormStart`. Do not change the submit handler or any of the other five event names.

- [ ] **Step 4: Rename the preview diagnostic's event-specific identifiers**

In `en/ga-b05-diagnostic.html`, make these exact semantic replacements:

```text
customFormStartEntries                  -> customQuoteFormStartEntries
entry[1] !== 'form_start'               -> entry[1] !== 'quote_form_start'
event: 'form_start'                     -> event: 'quote_form_start'
evochia_custom_form_start_count         -> evochia_quote_form_start_count
evochia_custom_form_start               -> evochia_quote_form_start
entry.event_name === 'form_start'       -> entry.event_name === 'quote_form_start'
GA4_COLLECT_NEW_REQUEST_NO_FORM_START_MATCH
                                        -> GA4_COLLECT_NEW_REQUEST_NO_QUOTE_FORM_START_MATCH
delta_custom_form_start                 -> delta_quote_form_start
```

Update the surrounding local variable/function references so the diagnostic still executes. Preserve the 5000 ms maximum observation window, exact `tid=G-2R3S78PTDL` match, resource sanitization, consent block, same-origin popup, and no-submit behavior.

- [ ] **Step 5: Inspect the helper diff and prove no baseline behavior was removed**

Run the two diff commands from Step 1 against the Task 1 head. Expected: within the helper region the diff shows only the Measurement ID constant and final `send_to` assignment. The separate approved taxonomy diff changes `form_start` to `quote_form_start`; diagnostic-only renames remain confined to `en/ga-b05-diagnostic.html`. Copy the relevant diff evidence into the Task 2 report before committing.

- [ ] **Step 6: Run focused analytics tests and verify GREEN**

Run:

```bash
node --test tests/analytics/site-events.test.mjs tests/analytics/b05-diagnostic.test.mjs
```

Expected: PASS. The routing-order test proves assignment occurs after all enrichment; the dynamic six-name test proves the shared helper supplies the fixed destination; the call-site inventory proves no executable Evochia `form_start` remains.

- [ ] **Step 7: Run the complete analytics suite**

Run:

```bash
npm run test:analytics
```

Expected: all analytics tests PASS, including consent restoration, PII protection, B0.5 route, no-submit safeguards, `generate_lead` success-branch placement, and the new routing/taxonomy contract.

- [ ] **Step 8: Commit the implementation**

```bash
git add js/site.js en/ga-b05-diagnostic.html
git commit -m "fix: route Evochia GA4 custom events explicitly"
```

The implementation commit activates routing for all six events. This is the accepted shared-code-path risk recorded above; do not describe only the two browser-tested events as the entire activated scope.

---

### Task 3: Verify repository integrity, CI, and the exact preview identity

**Files:**
- Verify: `js/site.js`
- Verify: `en/ga-b05-diagnostic.html`
- Verify: `tests/analytics/*.test.mjs`
- Verify: draft PR #35 and its exact-head checks/deployment metadata.

**Interfaces:**
- Consumes: the Task 2 implementation SHA.
- Produces: full local test evidence, exact-head CI evidence, and one immutable READY preview URL; no production action.

- [ ] **Step 1: Audit executable event names and changed-file scope**

Run:

```bash
rg -n "gaEvent\(\s*['\"](form_start|quote_form_start|contact_click|cta_click|form_submit_attempt|form_submit_error|generate_lead)" js en el tests
rg -n "form_start|quote_form_start" docs
git diff --check
git status --short
```

Expected:

```text
js/site.js contains exactly one quote_form_start call and no form_start call.
js/site.js contains exactly one call for each of the other five event names.
Any form_start remaining in the searched paths belongs only to explicit negative assertions or explanatory references to Google's automatic event, never an Evochia gaEvent(...) call.
Every `docs/` match is classified as one of: current design/plan terminology, an explicit reference to Google's automatic `form_start`, or immutable historical diagnostic evidence. Update any current operational document that incorrectly describes Evochia's authored event as `form_start`; do not mass-rewrite historical evidence.
git diff --check exits 0.
Only the approved implementation-plan, analytics tests, js/site.js, and B0.5 diagnostic files changed in this batch.
```

- [ ] **Step 2: Run the full repository validation matrix**

Run:

```bash
npm run test:analytics
npm run test:unit
npm run seo:test:apps-script
npm run seo:test:apps-script-contracts
npm run typecheck
npm run typecheck:gas
```

Expected: every command exits 0. Do not claim repository verification from a partial run.

- [ ] **Step 3: Verify draft-PR governance on the exact implementation head**

Confirm:

```text
repository = heraklist/evochia_site
PR = #35
state = open
draft = true
head = seo-system
base = main
head SHA = <Task 2 implementation SHA>
```

Expected: no second PR, review-state transition, merge, or production deployment occurred.

- [ ] **Step 4: Verify exact-head CI**

Required conclusion:

```text
Site Analytics Validation = success on <Task 2 implementation SHA>
```

Any other required PR check that runs for this SHA must also complete successfully. If `SEO Data Hub Validation` is path-filtered and does not run, record `not triggered`; do not invent a success conclusion. Do not proceed while a required check is queued, in progress, cancelled, or failed.

- [ ] **Step 5: Resolve one immutable READY Vercel preview**

Use only a deployment whose metadata is exactly:

```text
branch = seo-system
githubPrId = 35
githubCommitSha = <Task 2 implementation SHA>
state = READY
target = null
```

Record the immutable deployment hostname. Do not use a branch alias when the immutable hostname is available, and do not promote it to production.

- [ ] **Step 6: Check preview route availability without stimulating events**

Read-only check:

```text
/en/contact/
/en/ga-b05-diagnostic/
```

Expected: both return their intended pages, not a localized 404. No form input, contact navigation, or submit is part of this availability step.

---

### Task 4: Perform blocking non-submission browser validation and DebugView inventory

**Files:**
- Runtime validation only; no repository or GA4/GTM configuration write.

**Interfaces:**
- Consumes: the immutable READY preview from Task 3.
- Produces: Network evidence for `contact_click` and `quote_form_start`, negative-consent evidence, DebugView acceptance/inventory, and the status `TRANSPORT_VALIDATED` or an exact blocker report.

- [ ] **Step 1: Prove negative custom-event consent behavior on a fresh preview session**

Open `/en/contact/` in a fresh browser context with analytics consent not granted. Open Network capture, focus the first quote-form input, and type one character. Do not submit.

Expected during the observation window:

```text
No GA collect with en=quote_form_start.
No other Evochia custom-event collect caused by the interaction.
```

The known pre-consent base `page_view` may still occur and must be recorded separately; it neither passes nor fails this custom-event gate.

- [ ] **Step 2: Validate one post-consent `contact_click` collect**

In an analytics-consented preview session, set in the target page console before the interaction:

```js
window.__GA_DEBUG__ = true;
```

Capture the page's `page_view` request identifiers, then perform exactly one contact-link interaction. Filter Network requests for `google-analytics.com` collect traffic and `en=contact_click`.

Expected exactly once:

```text
tid = G-2R3S78PTDL
en = contact_click
ep.contact_method = the selected link's method
ep.lead_source = site
ep.page_path = the preview contact path
ep.locale = en
ep.page_type = contact
ep.service_intent = lead_capture
debug_mode = true (transport encoding may use the GA4 debug parameter form)
```

Also assert:

```text
No ep.send_to parameter is present.
The contact event cid matches the same-load page_view cid.
The contact event sid matches the same-load page_view sid.
No second contact_click collect is produced by the single interaction.
```

If the selected contact element is also a styled CTA and naturally emits `cta_click`, record that event in the DebugView inventory; do not count it as a duplicate `contact_click`.

- [ ] **Step 3: Validate the renamed quote-form event and separation from Enhanced Measurement**

On a newly loaded analytics-consented `/en/contact/` page, set `window.__GA_DEBUG__ = true`, preserve Network capture, then focus the first quote-form input and type one character. Do not submit.

Expected:

```text
Exactly one Evochia collect with tid=G-2R3S78PTDL and en=quote_form_start.
The custom collect carries form_id=quoteForm and lead_source=quote_form plus page enrichment.
No ep.send_to parameter is present.
Its cid and sid remain continuous with the same-load page_view.
A second focus/input does not produce a second quote_form_start collect.
Any automatic Enhanced Measurement form_start remains named form_start and is distinct from quote_form_start.
```

Run the updated B0.5 synthetic-input diagnostic only if a second clean page load is needed for sanitized evidence. Its PASS condition is a new resource entry with `tid=G-2R3S78PTDL` and `en=quote_form_start`; it must never submit.

- [ ] **Step 4: Confirm GA4 acceptance and inventory all six names in DebugView**

In GA4 DebugView, confirm acceptance of the two blocking custom events stimulated above:

```text
contact_click = seen
quote_form_start = seen
```

Create this complete evidence table from the same validation window:

| Event name | Stimulus status | DebugView status | Interpretation |
|---|---|---|---|
| `contact_click` | stimulated | `seen` or `stimulated-but-not-seen` | Blocking |
| `cta_click` | stimulated only if the chosen element naturally emitted it; otherwise not-stimulated | record actual state | Observational |
| `quote_form_start` | stimulated | `seen` or `stimulated-but-not-seen` | Blocking |
| `form_submit_attempt` | not-stimulated | record any unexpected appearance | Submit-gated |
| `form_submit_error` | not-stimulated | record any unexpected appearance | Failure-path, not forced |
| `generate_lead` | not-stimulated | record any unexpected appearance | Business-metric gate |

If either blocking event is `stimulated-but-not-seen`, do not claim `TRANSPORT_VALIDATED`, even if Network transport passed. If a submit-only name appears without a submit, stop and investigate unexpected/duplicate instrumentation.

- [ ] **Step 5: Classify the remediation without overstating the lead metric**

If Steps 1-4 pass, record exactly:

```text
Custom-event routing: TRANSPORT_VALIDATED
Lead business metric: LEAD_METRIC_E2E_NOT_VALIDATED
Reason: no owner-authorized successful Formspree submission was performed
Activated scope: six shared-helper events
Blocking browser validation: contact_click and quote_form_start
```

Include the exact preview URL, commit SHA, Network evidence summary, DebugView table, known pre-consent `page_view` observation, and confirmation that no production/GA4/GTM/Formspree write occurred.

---

### Task 5: Execute the separately gated `generate_lead` end-to-end check only after immediate owner approval

**Files:**
- Runtime validation only; no repository or GA4/GTM configuration write.

**Interfaces:**
- Consumes: `TRANSPORT_VALIDATED` evidence and separate immediate owner approval for one real Formspree submission using agreed non-sensitive test data.
- Produces: `LEAD_METRIC_E2E_VALIDATED` evidence, or a precise failure classification without retries that could create duplicate leads.

- [ ] **Step 1: Stop and obtain immediate owner approval**

Before entering or submitting form data, present the exact immutable preview URL, explain that the action will create one real Formspree submission, state the agreed test identity/content, and request approval for exactly one submission.

Expected if approval is absent:

```text
Task 5 remains unexecuted.
Final status remains TRANSPORT_VALIDATED; LEAD_METRIC_E2E_NOT_VALIDATED.
```

Do not infer approval from design approval, plan approval, preview approval, or earlier conversations.

- [ ] **Step 2: Submit exactly once after approval**

In a fresh analytics-consented preview session, set:

```js
window.__GA_DEBUG__ = true;
```

Complete the quote form with the owner-approved non-sensitive test values and use the normal UI submit control exactly once. Do not call `.submit()`, `requestSubmit()`, `fetch()`, or `FormData` manually. Do not retry automatically.

Expected application behavior:

```text
One Formspree request returns a successful response.
The success UI is shown.
The form resets only after success.
```

- [ ] **Step 3: Verify the submit-path events without forcing the error path**

Expected Network evidence:

```text
Exactly one en=form_submit_attempt collect routed to tid=G-2R3S78PTDL.
Exactly one en=generate_lead collect routed to tid=G-2R3S78PTDL after the successful Formspree response.
Both contain form_id=quoteForm, lead_source=quote_form, event_type, and normal page enrichment.
Neither contains ep.send_to.
Both preserve the page-load cid and sid.
```

Do not deliberately cause a failed submission to exercise `form_submit_error`. Record it as `not-stimulated` under the accepted shared-code-path risk.

- [ ] **Step 4: Confirm DebugView acceptance and classify the business metric**

Expected:

```text
form_submit_attempt = seen
generate_lead = seen
form_submit_error = not-stimulated
```

Only if the Formspree success, exactly-one `generate_lead` Network evidence, and DebugView acceptance all pass, record:

```text
Custom-event routing: TRANSPORT_VALIDATED
Lead business metric: LEAD_METRIC_E2E_VALIDATED
```

If Formspree succeeds but `generate_lead` is absent, record `LEAD_METRIC_E2E_FAILED_AFTER_FORMSPREE_SUCCESS` and stop before any retry. If Formspree does not succeed, record `LEAD_METRIC_E2E_NOT_REACHED`; do not use a submission failure to claim the lead metric is tested.

---

## Plan Self-Review

- Spec coverage: fixed destination, final-write ordering after enrichment, caller override rejection, caller immutability, consent boundary, all six helper events, complete `form_start` call-site rename, quote-form latch, diagnostic update, no GA4/GTM/config change, preview-only validation, session continuity, `send_to` consumption, DebugView acceptance, and the owner-gated Formspree check are each mapped to an explicit task.
- Explicit risk: the plan states that six events activate while two receive blocking non-submit browser validation; automated coverage exercises all six through the shared helper, and DebugView records names without pretending untriggered events failed or passed.
- Review changes: Task 1 verifies real call-site cardinality before freezing it, accepts both quote styles, rejects dynamic event names, and proves `debug_mode` is absent by default; Task 2 requires a surgical semantic diff of the helper before and after editing.
- Validation vocabulary: `TRANSPORT_VALIDATED` is separated from `LEAD_METRIC_E2E_VALIDATED`; without an approved successful submit, the handoff explicitly says Evochia still lacks a validated lead count.
- Assignment order: Task 1 tests and Task 2 implementation both require routing assignment after all enrichment and immediately before dispatch.
- Rename coverage: Task 1 inventories every `gaEvent(...)` invocation in `js/site.js`, accepts either quote style, and rejects dynamic names; Task 2 updates the real call, diagnostic semantics, and tests; Task 3 repeats a repository-wide executable-name audit.
- Operational consequences: rollback before production, production-property preview pollution, the changed meaning of the existing `form_start` key event, the newly transported `cta_click` key event, and `docs/` drift classification are all explicit.
- Placeholder scan: no deferred implementation placeholder or unspecified error-handling instruction remains.
- Interface consistency: the event list, destination constant, diagnostic field names, status terms, and exact Measurement ID are consistent across all tasks.
