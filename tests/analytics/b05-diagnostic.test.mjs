import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const site = readFileSync(ROOT + 'js/site.js', 'utf8');
const standaloneProbe = ROOT + 'en/ga-b05-diagnostic.html';

test('B0.5 diagnostic is query-gated on the real site and temporary', () => {
  assert.match(site, /ga_diag/);
  assert.match(site, /URLSearchParams\(window\.location\.search\)/);
  assert.match(site, /get\('ga_diag'\) === '1'/);
  assert.match(site, /B0\.5 diagnostic: remove before merge/i);
  assert.equal(
    existsSync(standaloneProbe),
    false,
    'standalone iframe probe must not remain; Vercel protection can block framed diagnostics',
  );
});

test('B0.5 diagnostic reads real consent, gtag and dataLayer without monkey-patching analytics', () => {
  assert.match(site, /CookieConsent\.acceptedCategory\('analytics'\)/);
  assert.match(site, /typeof gtag/);
  assert.match(site, /window\.dataLayer/);

  assert.doesNotMatch(site, /window\.gtag\s*=\s*function[^;]*B0\.5/i, 'diagnostic must not replace gtag');
  assert.doesNotMatch(site, /dataLayer\.push\s*=\s*function[^;]*B0\.5/i, 'diagnostic must not replace dataLayer.push');
  assert.doesNotMatch(site, /sendBeacon\s*=\s*function[^;]*B0\.5/i, 'diagnostic must not replace sendBeacon');
  assert.doesNotMatch(site, /fetch\s*=\s*function[^;]*B0\.5/i, 'diagnostic must not replace fetch');
});

test('B0.5 diagnostic triggers only one synthetic non-submit input and detects the Evochia custom tuple', () => {
  assert.match(site, /data-ga-b05-run/);
  assert.match(site, /getElementById\('quoteForm'\)/);
  assert.match(site, /querySelector\('input'/);
  assert.match(site, /field\.value = 'x'/);
  assert.match(site, /new Event\('input', \{ bubbles: true \}\)/);

  assert.match(site, /entry\[0\]\s*!==\s*'event'/);
  assert.match(site, /entry\[1\]\s*!==\s*'form_start'/);
  assert.match(site, /payload\.form_id\s*!==\s*'quoteForm'/);
  assert.match(site, /payload\.lead_source\s*!==\s*'quote_form'/);

  const diagnosticStart = site.indexOf('/* B0.5 diagnostic: remove before merge. */');
  assert.notEqual(diagnosticStart, -1, 'diagnostic region must exist');
  const diagnostic = site.slice(diagnosticStart);
  assert.doesNotMatch(diagnostic, /\.submit\s*\(/, 'diagnostic must never submit the lead form');
  assert.doesNotMatch(diagnostic, /requestSubmit\s*\(/, 'diagnostic must never request form submission');
  assert.doesNotMatch(diagnostic, /new FormData\s*\(/, 'diagnostic must never serialize lead data');
});
