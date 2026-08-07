import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const ROOT = new URL('../../', import.meta.url).pathname;
const site = readFileSync(ROOT + 'js/site.js', 'utf8');
const cc = readFileSync(ROOT + 'js/cookieconsent-config.js', 'utf8');

function analyticsConsentRegion() {
  const startMarker = 'function storedAnalyticsConsented() {';
  const endMarker = '/* GA4 helper.';
  const start = site.indexOf(startMarker);
  const end = site.indexOf(endMarker, start);
  assert.ok(start !== -1 && end !== -1, 'analytics consent helper region must exist');
  return site.slice(start, end);
}

function evaluateAnalyticsConsented({ cookie = '', cookieConsent } = {}) {
  const context = {
    document: { cookie },
    result: null,
  };
  if (cookieConsent !== undefined) {
    context.CookieConsent = cookieConsent;
  }

  runInNewContext(
    `${analyticsConsentRegion()}\nresult = analyticsConsented();`,
    context,
  );
  return context.result;
}

function storedConsentCookie(categories) {
  return 'cc_cookie=' + encodeURIComponent(JSON.stringify({ categories }));
}

test('site.js guards against double initialization', () => {
  assert.match(site, /if \(window\.__EVOCHIA_SITE_INIT__\) return;/);
});

test('analytics consent behavior handles pre-boot state and live withdrawal', () => {
  assert.equal(
    evaluateAnalyticsConsented({
      cookie: storedConsentCookie(['necessary', 'analytics']),
    }),
    true,
    'returning analytics-consented visitors must be allowed before CookieConsent boots',
  );

  assert.equal(
    evaluateAnalyticsConsented({
      cookie: storedConsentCookie(['necessary']),
    }),
    false,
    'pre-boot visitors without analytics consent must remain denied',
  );

  assert.equal(
    evaluateAnalyticsConsented({
      cookie: storedConsentCookie(['necessary', 'analytics']),
      cookieConsent: {
        acceptedCategory: (category) => category === 'analytics' ? false : false,
      },
    }),
    false,
    'once CookieConsent is live, withdrawal must override stale persisted consent',
  );
});

test('gaEvent is gated on analytics consent (no dispatch before consent)', () => {
  assert.match(
    site,
    /function gaEvent\([^)]*\)\s*\{[\s\S]*?if \(!analyticsConsented\(\)\) return false;/,
    'gaEvent must bail out (return false) before analytics consent'
  );
});

test('gaEvent reports real dispatch so one-shot flags can trust it', () => {
  assert.match(site, /gtag\('event', name, payload\);\s*return true;/);
});

test('form_start latches only after the event is actually sent', () => {
  assert.match(
    site,
    /if \(gaEvent\('form_start'[\s\S]*?\)\)\s*\{\s*formStartSent = true;/,
    'formStartSent must be set inside the gaEvent(...) truthy branch, not before'
  );
});

test('generate_lead is emitted only inside the successful (res.ok) branch', () => {
  const okIdx = site.indexOf('if (res.ok)');
  const leadIdx = site.indexOf("gaEvent('generate_lead'");
  const throwIdx = site.indexOf("throw new Error('Server error')");
  assert.ok(okIdx !== -1 && leadIdx !== -1 && throwIdx !== -1, 'expected markers present');
  assert.ok(
    okIdx < leadIdx && leadIdx < throwIdx,
    'generate_lead must sit within the res.ok success branch'
  );
});

test('form_submit_error is emitted on submission failure', () => {
  assert.match(site, /gaEvent\('form_submit_error'/);
});

test('contact_click never sends PII (no link_url/link_text on contact links)', () => {
  const obj = (site.match(/gaEvent\('contact_click'\s*,\s*\{[^}]*\}/) || [''])[0];
  assert.ok(obj, 'contact_click emission object not found');
  assert.doesNotMatch(obj, /link_url/, 'contact_click must not include link_url (PII)');
  assert.doesNotMatch(obj, /link_text/, 'contact_click must not include link_text (PII)');
  assert.match(obj, /contact_method/, 'contact_click should send contact_method');
});

test('cta_click does not attach link_url for contact-scheme links', () => {
  assert.match(
    site,
    /if \(!contactMethod\) ctaParams\.link_url = href;/,
    'cta_click must only attach link_url for non-contact links'
  );
});

test('cookieconsent module only updates consent (no late default)', () => {
  assert.doesNotMatch(
    cc,
    /gtag\(\s*'consent'\s*,\s*'default'/,
    'the module must not (re)apply a consent default; that lives inline in <head>'
  );
  assert.match(
    cc,
    /gtag\('consent',\s*'update'/,
    'the module must still issue consent updates'
  );
});

test('stored consent is restored immediately, before the delayed banner boot', () => {
  const restoreIdx = cc.indexOf('restoreStoredConsent();');
  const scheduleIdx = cc.indexOf('scheduleCookieConsentBoot();');
  assert.ok(restoreIdx !== -1, 'restoreStoredConsent() must be invoked');
  assert.ok(scheduleIdx !== -1, 'scheduleCookieConsentBoot() must be invoked');
  assert.ok(
    restoreIdx < scheduleIdx,
    'consent restoration must run before (and independently of) the banner boot'
  );
  assert.match(
    cc,
    /categories\.indexOf\('analytics'\) > -1[\s\S]*?'analytics_storage': 'granted'/,
    'a returning analytics-consented visitor must be restored to granted'
  );
});