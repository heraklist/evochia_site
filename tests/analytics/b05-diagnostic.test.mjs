import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const diagnosticPath = ROOT + 'en/ga-b05-diagnostic.html';

test('B0.5 diagnostic page exists as an unlinked noindex preview-only probe', () => {
  assert.equal(
    existsSync(diagnosticPath),
    true,
    'diagnostic page must exist before the B0.5 runtime boundary can be observed',
  );

  const html = readFileSync(diagnosticPath, 'utf8');
  assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow"/i);
  assert.match(html, /B0\.5 diagnostic/i);
  assert.match(html, /remove before merge/i);
});

test('B0.5 diagnostic observes the real contact page without monkey-patching analytics', () => {
  assert.equal(existsSync(diagnosticPath), true);
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /src="\/en\/contact\/\?ga_diag_target=1"/);
  assert.match(html, /frame\.contentWindow/);
  assert.match(html, /win\.dataLayer/);
  assert.match(html, /win\.CookieConsent/);
  assert.match(html, /typeof win\.gtag/);

  assert.doesNotMatch(html, /window\.gtag\s*=/, 'diagnostic must not replace gtag');
  assert.doesNotMatch(html, /dataLayer\.push\s*=/, 'diagnostic must not replace dataLayer.push');
  assert.doesNotMatch(html, /sendBeacon\s*\(/, 'diagnostic must not intercept or send beacons');
  assert.doesNotMatch(html, /fetch\s*\(/, 'diagnostic must not perform network writes');
});

test('B0.5 diagnostic uses a synthetic non-submit interaction and detects the Evochia custom tuple', () => {
  assert.equal(existsSync(diagnosticPath), true);
  const html = readFileSync(diagnosticPath, 'utf8');

  assert.match(html, /getElementById\('quoteForm'\)/);
  assert.match(html, /querySelector\('input'/);
  assert.match(html, /field\.value = 'x'/);
  assert.match(
    html,
    /new win\.Event\('input', \{ bubbles: true \}\)/,
    'synthetic event must be created in the embedded page realm',
  );
  assert.doesNotMatch(html, /\.submit\s*\(/, 'diagnostic must never submit the lead form');
  assert.doesNotMatch(html, /requestSubmit\s*\(/, 'diagnostic must never request form submission');

  assert.match(html, /entry\[0\]\s*!==\s*'event'/);
  assert.match(html, /entry\[1\]\s*!==\s*'form_start'/);
  assert.match(html, /payload\.form_id\s*!==\s*'quoteForm'/);
  assert.match(html, /payload\.lead_source\s*!==\s*'quote_form'/);
});
