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

function evaluateAnalyticsConsentContext({ cookie = '', cookieConsent } = {}) {
  const context = {
    window: {},
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
  return context;
}

function evaluateAnalyticsConsented(options = {}) {
  return evaluateAnalyticsConsentContext(options).result;
}

function storedConsentCookie(categories) {
  return 'cc_cookie=' + encodeURIComponent(JSON.stringify({ categories }));
}

function restoreStoredConsentRegion() {
  const startMarker = 'function restoreStoredConsent() {';
  const endMarker = 'function updateGtagConsent() {';
  const start = cc.indexOf(startMarker);
  const end = cc.indexOf(endMarker, start);
  assert.ok(start !== -1 && end !== -1, 'stored consent restoration region must exist');
  return cc.slice(start, end);
}

function evaluateRestoreStoredConsent({ sharedAccepted, cookie }) {
  const gtagCalls = [];
  const gtag = (...args) => gtagCalls.push(args);
  const context = {
    window: {
      __EVOCHIA_CONSENT_STATE__: {
        storedAnalyticsConsented: () => sharedAccepted,
      },
      gtag,
    },
    document: { cookie },
    gtag,
    ensureAnalyticsScript: () => {},
  };

  runInNewContext(
    `${restoreStoredConsentRegion()}\nrestoreStoredConsent();`,
    context,
  );
  return gtagCalls;
}

function clickTrackingRegion() {
  const startMarker = '/* GA4 click tracking: contact actions and CTA clicks */';
  const endMarker = "var quoteForm = document.getElementById('quoteForm');";
  const start = site.indexOf(startMarker);
  const end = site.indexOf(endMarker, start);
  assert.ok(start !== -1 && end !== -1, 'GA4 click tracking region must exist');
  return site.slice(start, end);
}

function evaluateTrackedClick({ href, text, classes = [] }) {
  let clickHandler = null;
  const events = [];
  const context = {
    document: {
      addEventListener: (type, handler) => {
        if (type === 'click') clickHandler = handler;
      },
    },
    gaEvent: (name, params) => {
      events.push({ name, params });
      return true;
    },
  };

  runInNewContext(clickTrackingRegion(), context);
  assert.equal(typeof clickHandler, 'function', 'click tracking handler must register');

  const classSet = new Set(classes);
  const element = {
    tagName: 'A',
    textContent: text,
    getAttribute: (name) => name === 'href' ? href : null,
    classList: {
      contains: (name) => classSet.has(name),
    },
  };

  clickHandler({
    target: {
      closest: () => element,
    },
  });

  return events;
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

test('site exposes the persisted analytics consent helper as the shared source', () => {
  const context = evaluateAnalyticsConsentContext({
    cookie: storedConsentCookie(['necessary', 'analytics']),
  });
  const helper = context.window.__EVOCHIA_CONSENT_STATE__?.storedAnalyticsConsented;

  assert.equal(typeof helper, 'function', 'cookie consent module needs the shared stored-consent helper');
  assert.equal(helper(), true);
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

test('contact-scheme CTA never sends link URL or visible text to GA4', () => {
  const events = evaluateTrackedClick({
    href: 'tel:+306931170245',
    text: '+30 693 117 0245',
    classes: ['btn-primary'],
  });
  const contact = events.find((event) => event.name === 'contact_click');
  const cta = events.find((event) => event.name === 'cta_click');

  assert.ok(contact, 'contact CTA must still emit contact_click');
  assert.ok(cta, 'contact CTA may still emit cta_click for CTA performance');
  assert.equal(Object.prototype.hasOwnProperty.call(cta.params, 'link_url'), false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(cta.params, 'link_text'),
    false,
    'contact CTA visible text can contain phone/email PII and must not be sent',
  );
});

test('non-contact CTA keeps useful link URL and visible text metadata', () => {
  const events = evaluateTrackedClick({
    href: '/en/contact/',
    text: 'Plan your event',
    classes: ['btn-primary'],
  });
  const cta = events.find((event) => event.name === 'cta_click');

  assert.ok(cta, 'non-contact CTA must emit cta_click');
  assert.equal(cta.params.link_url, '/en/contact/');
  assert.equal(cta.params.link_text, 'Plan your event');
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
});

test('cookieconsent restoration uses the shared stored-consent source, not its own cookie parser', () => {
  const acceptedCalls = evaluateRestoreStoredConsent({
    sharedAccepted: true,
    cookie: storedConsentCookie(['necessary']),
  });
  assert.deepEqual(
    acceptedCalls,
    [['consent', 'update', { analytics_storage: 'granted' }]],
    'shared accepted state must restore analytics even when the raw cookie fixture disagrees',
  );

  const deniedCalls = evaluateRestoreStoredConsent({
    sharedAccepted: false,
    cookie: storedConsentCookie(['necessary', 'analytics']),
  });
  assert.deepEqual(
    deniedCalls,
    [],
    'shared denied state must prevent stale raw-cookie analytics restoration',
  );
});