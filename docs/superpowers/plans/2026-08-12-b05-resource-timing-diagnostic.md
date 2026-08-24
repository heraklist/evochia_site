# B0.5 Resource Timing Diagnostic Implementation Plan

> **HISTORICAL / RETIRED (2026-08-24).** This plan describes a temporary preview diagnostic that has been removed. References below to its page, route, query target, tests, commands, and validation workflow are preserved only as historical evidence and must not be treated as executable instructions.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing preview-only B0.5 probe to observe sanitized GA4 collect resource timing after the proven custom `form_start` dataLayer dispatch, without changing site behavior or analytics transport.

**Architecture:** Keep all runtime diagnostic logic inside `en/ga-b05-diagnostic.html`. Read the contact popup's `performance.getEntriesByType('resource')`, recognize GA4 collect candidates by hostname/path, sanitize each candidate to a narrow metadata shape, snapshot pre-stimulus entries, poll for at most 5 seconds after the existing synthetic input, and report conservative transport states separately from `SITE_TO_DATALAYER_PASS`. No monkey-patching and no changes to `js/site.js`, consent code, middleware, GTM, GA4, or production routes.

**Tech Stack:** Static HTML/vanilla JavaScript, Node.js `node:test`, GitHub Actions, Vercel preview deployments.

## Global Constraints

- Only `en/ga-b05-diagnostic.html` and B0.5 analytics tests may change for runtime implementation.
- Do not modify `js/site.js`, consent code, GTM, GA4, `vercel.json`, or `middleware.ts` in this step.
- Do not replace or wrap `window.gtag`, `dataLayer.push`, `fetch`, or `sendBeacon`.
- Do not call `performance.clearResourceTimings()`.
- Do not submit the quote form, call `requestSubmit()`, create `FormData`, navigate a contact action, or send Formspree traffic.
- Recognize collect candidates only on `google-analytics.com`, `www.google-analytics.com`, or `*.google-analytics.com`, with pathname containing `/g/collect` or ending in `/collect`.
- Expose only sanitized collect metadata: `host`, `pathname`, `measurement_id`, `event_name`, `initiator_type`, `start_time`.
- Never emit the full GA request URL or arbitrary query parameters.
- Exact positive match: `tid=G-2R3S78PTDL` and `en=form_start` on a new post-stimulus resource URL.
- Observation window: maximum 5000 ms; stop early on an exact match.
- Transport result states are exactly `GA4_COLLECT_URL_MATCH_PASS`, `GA4_COLLECT_NEW_REQUEST_NO_FORM_START_MATCH`, and `GA4_COLLECT_NOT_OBSERVED`.
- Non-PASS transport states are unresolved evidence, not proof of network failure.
- No production deploy, merge, ready-for-review transition, GTM/GA4 write, or Formspree submission.

---

### Task 1: Define the resource-timing diagnostic contract with RED tests

**Files:**
- Modify: `tests/analytics/b05-diagnostic.test.mjs`
- Test: `tests/analytics/b05-diagnostic.test.mjs`

**Interfaces:**
- Consumes: existing `en/ga-b05-diagnostic.html` diagnostic page.
- Produces: test contract for `gaCollectEntries(win)`, `gaCollectKey(entry)`, post-stimulus polling, sanitized output, and conservative result states.

- [ ] **Step 1: Add failing structural tests for resource timing and sanitization**

Append tests equivalent to:

```js
test('B0.5 diagnostic reads GA collect candidates from Resource Timing without mutation', () => {
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /performance\.getEntriesByType\('resource'\)/);
  assert.match(html, /google-analytics\.com/);
  assert.match(html, /\/g\/collect/);
  assert.match(html, /searchParams\.get\('tid'\)/);
  assert.match(html, /searchParams\.get\('en'\)/);
  assert.doesNotMatch(html, /clearResourceTimings\s*\(/);
});

test('B0.5 diagnostic exposes only sanitized GA collect metadata', () => {
  const html = readFileSync(diagnosticPath, 'utf8');

  for (const field of ['host', 'pathname', 'measurement_id', 'event_name', 'initiator_type', 'start_time']) {
    assert.match(html, new RegExp(field));
  }
  assert.doesNotMatch(html, /full_url/);
  assert.doesNotMatch(html, /collect_url/);
});

test('B0.5 diagnostic uses conservative GA transport result states', () => {
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /GA4_COLLECT_URL_MATCH_PASS/);
  assert.match(html, /GA4_COLLECT_NEW_REQUEST_NO_FORM_START_MATCH/);
  assert.match(html, /GA4_COLLECT_NOT_OBSERVED/);
  assert.match(html, /G-2R3S78PTDL/);
  assert.match(html, /form_start/);
  assert.match(html, /5000/);
});
```

Keep the existing no-monkey-patch/no-submit assertions intact.

- [ ] **Step 2: Run analytics tests and verify RED**

Run:

```bash
npm run test:analytics
```

Expected: FAIL only in the newly added resource-timing expectations because the current diagnostic page has no `performance.getEntriesByType('resource')` transport reader or GA collect result states.

- [ ] **Step 3: Commit the RED contract**

```bash
git add tests/analytics/b05-diagnostic.test.mjs
git commit -m "test: define B0.5 GA collect diagnostic contract"
```

Expected: `Site Analytics Validation` fails for the missing implementation; unrelated analytics tests remain green.

---

### Task 2: Implement minimal read-only GA collect observation

**Files:**
- Modify: `en/ga-b05-diagnostic.html`
- Test: `tests/analytics/b05-diagnostic.test.mjs`

**Interfaces:**
- Consumes: the contact popup returned by `requireTarget()` and its existing `performance`, `dataLayer`, consent, and form DOM.
- Produces:
  - `gaCollectEntries(win): Array<SanitizedCollect>`
  - `gaCollectKey(entry): string`
  - final JSON fields `ga_collect_before_count`, `ga_collect_after_count`, `new_ga_collect_count`, `new_ga_collect_sanitized`, `ga_collect_interpretation`, `observation_window_ms`.

`SanitizedCollect` logical shape:

```js
{
  host: string,
  pathname: string,
  measurement_id: string | null,
  event_name: string | null,
  initiator_type: string | null,
  start_time: number
}
```

- [ ] **Step 1: Add GA collect parsing helpers**

Inside the existing diagnostic IIFE, before `readState()`, add logic equivalent to:

```js
function isGoogleAnalyticsHost(hostname) {
  return hostname === 'google-analytics.com' ||
    hostname === 'www.google-analytics.com' ||
    hostname.endsWith('.google-analytics.com');
}

function isGaCollectPath(pathname) {
  return pathname.indexOf('/g/collect') !== -1 || pathname.endsWith('/collect');
}

function gaCollectEntries(win) {
  var resources = win.performance && typeof win.performance.getEntriesByType === 'function'
    ? win.performance.getEntriesByType('resource')
    : [];

  return resources.reduce(function (matches, resource) {
    try {
      var url = new win.URL(resource.name);
      if (!isGoogleAnalyticsHost(url.hostname) || !isGaCollectPath(url.pathname)) return matches;

      matches.push({
        host: url.hostname,
        pathname: url.pathname,
        measurement_id: url.searchParams.get('tid'),
        event_name: url.searchParams.get('en'),
        initiator_type: resource.initiatorType || null,
        start_time: resource.startTime
      });
    } catch (error) {
      // Ignore malformed/unreadable resource names without mutating the timeline.
    }
    return matches;
  }, []);
}

function gaCollectKey(entry) {
  return [
    entry.host,
    entry.pathname,
    entry.measurement_id || '',
    entry.event_name || '',
    String(entry.start_time)
  ].join('|');
}
```

Do not include `resource.name` or the full URL in the returned object.

- [ ] **Step 2: Capture the pre-stimulus transport baseline**

In `runSyntheticInput()`, immediately after `before = readState()`, add:

```js
var gaBefore = gaCollectEntries(win);
var gaBeforeKeys = new Set(gaBefore.map(gaCollectKey));
var observationStartedAt = win.performance.now();
```

Keep consent and `gtag_type` guards before dispatching the synthetic event.

- [ ] **Step 3: Poll for a post-stimulus exact collect match for at most 5 seconds**

Replace the single 250 ms final read with a polling function equivalent to:

```js
var observationWindowMs = 5000;
var pollIntervalMs = 250;

function finishObservation() {
  var after = readState();
  var gaAfter = gaCollectEntries(win);
  var newGa = gaAfter.filter(function (entry) {
    return !gaBeforeKeys.has(gaCollectKey(entry));
  });
  var exactMatch = newGa.some(function (entry) {
    return entry.measurement_id === 'G-2R3S78PTDL' && entry.event_name === 'form_start';
  });
  var elapsed = win.performance.now() - observationStartedAt;

  if (!exactMatch && elapsed < observationWindowMs) {
    win.setTimeout(finishObservation, pollIntervalMs);
    return;
  }

  var transportInterpretation = exactMatch
    ? 'GA4_COLLECT_URL_MATCH_PASS'
    : newGa.length > 0
      ? 'GA4_COLLECT_NEW_REQUEST_NO_FORM_START_MATCH'
      : 'GA4_COLLECT_NOT_OBSERVED';

  render('B0.5 synthetic input + GA collect result', {
    before: before,
    after: after,
    delta_custom_form_start:
      after.evochia_custom_form_start_count - before.evochia_custom_form_start_count,
    site_interpretation:
      after.evochia_custom_form_start_count > before.evochia_custom_form_start_count
        ? 'SITE_TO_DATALAYER_PASS'
        : 'SITE_TO_DATALAYER_FAIL',
    ga_collect_before_count: gaBefore.length,
    ga_collect_after_count: gaAfter.length,
    new_ga_collect_count: newGa.length,
    new_ga_collect_sanitized: newGa,
    ga_collect_interpretation: transportInterpretation,
    observation_window_ms: Math.min(Math.round(elapsed), observationWindowMs)
  });
}

win.setTimeout(finishObservation, pollIntervalMs);
```

The exact implementation may normalize the displayed elapsed value, but it must never poll beyond 5000 ms.

- [ ] **Step 4: Run analytics tests and verify GREEN**

Run:

```bash
npm run test:analytics
```

Expected: all analytics tests PASS, including all existing consent, form, PII, and B0.5 assertions.

- [ ] **Step 5: Commit the minimal implementation**

```bash
git add en/ga-b05-diagnostic.html
git commit -m "feat: observe B0.5 GA collect resource timing"
```

---

### Task 3: Full verification and exact preview handoff

**Files:**
- Verify only; no additional runtime files should change.

**Interfaces:**
- Consumes: exact implementation commit SHA.
- Produces: CI evidence and one immutable READY Vercel preview URL for Work mode.

- [ ] **Step 1: Run repository verification**

Run:

```bash
npm run test:analytics
npm run test:unit
npm run seo:test:apps-script
npm run seo:test:apps-script-contracts
npm run typecheck
npm run typecheck:gas
```

Expected: all commands PASS. If repository CI runs a narrower authoritative matrix, do not claim success until the required GitHub Actions workflows for the implementation SHA are both completed successfully.

- [ ] **Step 2: Verify GitHub Actions on the exact implementation SHA**

Required conclusions:

```text
Site Analytics Validation: success
SEO Data Hub Validation: success
```

Do not proceed to runtime handoff while either workflow is queued, in progress, cancelled, or failed.

- [ ] **Step 3: Verify Vercel preview identity**

Find the preview whose metadata has exactly:

```text
branch = seo-system
githubPrId = 35
githubCommitSha = <implementation SHA>
state = READY
target = null
```

Do not use a branch alias if an immutable deployment hostname is available.

- [ ] **Step 4: Perform a read-only availability check of the diagnostic route**

Check:

```text
/en/ga-b05-diagnostic/
```

Expected: diagnostic page, not localized 404. No interaction or submit is needed for this availability check.

- [ ] **Step 5: Hand off to Work mode**

The Work-mode protocol must require:

```text
analytics_consent: true
gtag_type: function
dataLayer_is_array: true
evochia_custom_form_start_count: 0
```

Then exactly one `Run one synthetic input`, followed by capture of:

```text
delta_custom_form_start
site_interpretation
ga_collect_before_count
ga_collect_after_count
new_ga_collect_count
new_ga_collect_sanitized
ga_collect_interpretation
observation_window_ms
```

Interpretation rules:

```text
SITE_TO_DATALAYER_PASS + GA4_COLLECT_URL_MATCH_PASS
=> site custom dispatch and observable GA4 collect URL delivery pass; remaining GA4 UI absence is downstream reporting/destination processing.

SITE_TO_DATALAYER_PASS + GA4_COLLECT_NEW_REQUEST_NO_FORM_START_MATCH
=> GA transport activity observed, but exact custom-event transport remains unresolved because Resource Timing cannot inspect arbitrary request bodies/batching.

SITE_TO_DATALAYER_PASS + GA4_COLLECT_NOT_OBSERVED
=> Resource Timing did not observe a new collect in the window; do not infer a network failure without stronger tooling.
```

No Formspree submit or GTM/GA4 write is authorized.

---

## Plan Self-Review

- Spec coverage: resource recognition, sanitization, pre/post snapshot, 5-second bounded polling, exact `tid`/`en` match, conservative result states, no PII/full URL, no monkey-patching, no submit, CI, preview identity, and Work-mode handoff are all covered.
- Placeholder scan: no TBD/TODO/future implementation placeholders remain.
- Interface consistency: output field names and result-state names match the approved design spec exactly.
