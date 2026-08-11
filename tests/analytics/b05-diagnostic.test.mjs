import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const diagnosticPath = ROOT + 'en/ga-b05-diagnostic.html';

test('B0.5 diagnostic remains an unlinked noindex preview-only probe', () => {
  assert.equal(existsSync(diagnosticPath), true);
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow"/i);
  assert.match(html, /B0\.5 diagnostic/i);
  assert.match(html, /remove before merge/i);
});

test('B0.5 diagnostic observes the real contact page through a same-origin popup, not a frame', () => {
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /window\.open\(\s*'\/en\/contact\/\?ga_diag_target=1'/);
  assert.doesNotMatch(html, /<iframe\b/i, 'Vercel protection can block framed diagnostics');
  assert.match(html, /var win = requireTarget\(\)/);
  assert.match(html, /win\.dataLayer/);
  assert.match(html, /win\.CookieConsent/);
  assert.match(html, /typeof win\.gtag/);

  assert.doesNotMatch(html, /window\.gtag\s*=/, 'diagnostic must not replace gtag');
  assert.doesNotMatch(html, /dataLayer\.push\s*=/, 'diagnostic must not replace dataLayer.push');
  assert.doesNotMatch(html, /sendBeacon\s*\(/, 'diagnostic must not intercept or send beacons');
  assert.doesNotMatch(html, /fetch\s*\(/, 'diagnostic must not perform network writes');
});

test('B0.5 diagnostic refuses to stimulate without analytics consent and never submits', () => {
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /analytics_consent/);
  assert.match(html, /CONSENT_NOT_GRANTED/);
  assert.match(html, /getElementById\('quoteForm'\)/);
  assert.match(html, /querySelector\('input'/);
  assert.match(html, /field\.value = 'x'/);
  assert.match(html, /new target\.Event\('input', \{ bubbles: true \}\)/);
  assert.doesNotMatch(html, /\.submit\s*\(/, 'diagnostic must never submit the lead form');
  assert.doesNotMatch(html, /requestSubmit\s*\(/, 'diagnostic must never request form submission');
  assert.doesNotMatch(html, /new FormData\s*\(/, 'diagnostic must never serialize lead data');

  assert.match(html, /entry\[0\]\s*!==\s*'event'/);
  assert.match(html, /entry\[1\]\s*!==\s*'form_start'/);
  assert.match(html, /payload\.form_id\s*!==\s*'quoteForm'/);
  assert.match(html, /payload\.lead_source\s*!==\s*'quote_form'/);
});

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
