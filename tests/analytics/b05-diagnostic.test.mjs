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
  assert.match(html, /target\.dataLayer/);
  assert.match(html, /target\.CookieConsent/);
  assert.match(html, /typeof target\.gtag/);

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
