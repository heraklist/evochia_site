import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const site = readFileSync(join(ROOT, 'js', 'site.js'), 'utf8');
const cc = readFileSync(join(ROOT, 'js', 'cookieconsent-config.js'), 'utf8');

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

test('quote_form_start latches only after the event is actually sent', () => {
  assert.match(
    site,
    /if \(gaEvent\('quote_form_start'[\s\S]*?\)\)\s*\{\s*formStartSent = true;/,
    'formStartSent must be set inside the quote_form_start truthy branch',
  );
});

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

test('gaEvent adds the fixed destination to normal non-debug dispatches', () => {
  const { calls, result } = evaluateGaEvent({
    params: { lead_source: 'site' },
    debug: false,
  });

  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].send_to, 'G-2R3S78PTDL');
});

test('gaEvent overrides caller routing without mutating caller params', () => {
  const params = {
    send_to: 'G-CALLER-MUST-NOT-CONTROL',
    lead_source: 'site',
    page_path: '/el/contact/',
    locale: 'el',
    page_type: 'contact',
    service_intent: 'lead_capture',
    custom_dimension: 'preserve-me',
  };
  const originalParams = { ...params };
  const { calls } = evaluateGaEvent({ params });

  assert.equal(calls[0][2].send_to, 'G-2R3S78PTDL');
  assert.deepEqual(params, originalParams);
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
  assert.equal(acceptedCalls.length, 1, 'shared accepted state must issue one consent update');
  assert.equal(acceptedCalls[0][0], 'consent');
  assert.equal(acceptedCalls[0][1], 'update');
  assert.equal(
    acceptedCalls[0][2].analytics_storage,
    'granted',
    'shared accepted state must restore analytics even when the raw cookie fixture disagrees',
  );

  const deniedCalls = evaluateRestoreStoredConsent({
    sharedAccepted: false,
    cookie: storedConsentCookie(['necessary', 'analytics']),
  });
  assert.equal(
    deniedCalls.length,
    0,
    'shared denied state must prevent stale raw-cookie analytics restoration',
  );
});
