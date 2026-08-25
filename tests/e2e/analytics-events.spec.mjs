import {
  expect,
  LOOPBACK_ORIGIN,
  PRODUCTION_ORIGIN,
  test,
} from './fixtures/network.mjs';

async function acceptAnalytics(page) {
  const dialog = page.locator('#cc-main .cm[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^(Accept all|Αποδοχή όλων)$/ }).click();
  await expect(dialog).toBeHidden();
}

async function dataLayerEvents(page) {
  return page.evaluate(() => window.dataLayer
    .filter((entry) => entry && entry[0] === 'event')
    .map((entry) => ({ name: entry[1], params: { ...entry[2] } })));
}

async function clickWithoutNavigation(page, selector) {
  await page.locator(selector).evaluate((element) => {
    element.addEventListener('click', (event) => event.preventDefault(), { once: true });
    element.click();
  });
}

const quoteFixture = Object.freeze({
  email: 'browser-e2e@example.invalid',
  event: 'wedding',
  guests: '12',
  location: 'Athens test venue',
  name: 'Browser E2E Guest',
  phone: '+30 690 000 0009',
});

const sensitiveValues = Object.freeze([
  quoteFixture.name,
  quoteFixture.email,
  quoteFixture.location,
  quoteFixture.phone,
  'info@evochia.gr',
  '+30 693 117 0245',
  '+306931170245',
  '306931170245',
]);

const privacyEventNames = new Set([
  'contact_click',
  'form_submit_attempt',
  'form_submit_error',
  'generate_lead',
  'quote_form_start',
]);

async function fillValidQuoteForm(page) {
  await page.locator('#qf-name').fill(quoteFixture.name);
  await page.locator('#qf-email').fill(quoteFixture.email);
  await page.locator('#qf-phone').fill(quoteFixture.phone);
  await page.locator('#qf-event').selectOption(quoteFixture.event);
  await page.locator('#qf-guests').fill(quoteFixture.guests);
  await page.locator('#qf-location').fill(quoteFixture.location);
}

function namedEvents(events, name) {
  return events.filter((event) => event.name === name);
}

function expectedContext(locale) {
  return {
    locale,
    page_path: `/${locale}/contact/`,
    page_type: 'contact',
    send_to: 'G-2R3S78PTDL',
    service_intent: 'lead_capture',
  };
}

function expectExactPrivacyEvent(event, locale) {
  const context = expectedContext(locale);
  if (event.name === 'contact_click') {
    expect(event.params).toEqual({
      contact_method: 'phone',
      lead_source: 'site',
      ...context,
    });
    return;
  }

  if (event.name === 'quote_form_start') {
    expect(event.params).toEqual({
      form_id: 'quoteForm',
      lead_source: 'quote_form',
      ...context,
    });
    return;
  }

  expect(['form_submit_attempt', 'form_submit_error', 'generate_lead']).toContain(event.name);
  expect(event.params).toEqual({
    event_type: quoteFixture.event,
    form_id: 'quoteForm',
    lead_source: 'quote_form',
    ...context,
  });
}

function expectPrivacyPayloadsAreExactAndPiiFree(events, locale) {
  const privacyEvents = events.filter((event) => privacyEventNames.has(event.name));
  for (const event of privacyEvents) {
    expectExactPrivacyEvent(event, locale);
    const serialized = JSON.stringify(event.params).toLowerCase();
    const serializedDigits = serialized.replace(/\D/g, '');
    for (const sensitiveValue of sensitiveValues) {
      expect(serialized).not.toContain(sensitiveValue.toLowerCase());
      const sensitiveDigits = sensitiveValue.replace(/\D/g, '');
      if (sensitiveDigits.length >= 7) {
        expect(serializedDigits).not.toContain(sensitiveDigits);
      }
    }
  }
  return privacyEvents;
}

test('10 contact_click is consent-gated and carries no contact PII', async ({ page }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);

  await clickWithoutNavigation(page, '#main a[href^="tel:"]');
  expect(namedEvents(await dataLayerEvents(page), 'contact_click')).toHaveLength(0);

  await acceptAnalytics(page);
  await clickWithoutNavigation(page, '#main a[href^="tel:"]');

  const contactEvents = namedEvents(await dataLayerEvents(page), 'contact_click');
  expect(contactEvents).toHaveLength(1);
  expectPrivacyPayloadsAreExactAndPiiFree(await dataLayerEvents(page), 'en');
});

test('11 quote_form_start retries after consent then latches exactly once', async ({ page }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);

  await page.locator('#qf-name').fill('B');
  expect(namedEvents(await dataLayerEvents(page), 'quote_form_start')).toHaveLength(0);

  await acceptAnalytics(page);
  await page.locator('#qf-name').fill('Browser');
  await page.locator('#qf-email').fill('browser@example.invalid');
  await page.locator('#qf-name').fill('Browser E2E');

  const startEvents = namedEvents(await dataLayerEvents(page), 'quote_form_start');
  expect(startEvents).toHaveLength(1);
  expectPrivacyPayloadsAreExactAndPiiFree(await dataLayerEvents(page), 'en');
});

test('12 valid submit dispatches one form_submit_attempt to the fixed destination', async ({ page, network }) => {
  network.expectFormspreeRequest({ status: 422, body: { errors: [{ message: 'fixture rejection' }] } });
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);
  await acceptAnalytics(page);
  await fillValidQuoteForm(page);

  await page.locator('#quoteForm button[type="submit"]').click();
  await expect.poll(() => network.formspreeRequests.length).toBe(1);

  const events = await dataLayerEvents(page);
  const attemptEvents = namedEvents(events, 'form_submit_attempt');
  expect(attemptEvents).toHaveLength(1);
  expectPrivacyPayloadsAreExactAndPiiFree(events, 'en');
});

test('13 locally mocked Formspree 200 dispatches generate_lead without PII', async ({ page, network }) => {
  network.expectFormspreeRequest({ status: 200, body: { ok: true } });
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);
  await acceptAnalytics(page);
  await fillValidQuoteForm(page);

  await page.locator('#quoteForm button[type="submit"]').click();
  await expect(page.locator('#form-status')).toHaveClass(/success/);
  await expect(page.locator('#form-status')).toContainText("Thank you! We'll be in touch soon.");

  expect(network.formspreeRequests).toHaveLength(1);
  const events = await dataLayerEvents(page);
  expect(namedEvents(events, 'form_submit_attempt')).toHaveLength(1);
  expect(namedEvents(events, 'generate_lead')).toHaveLength(1);
  expect(namedEvents(events, 'form_submit_error')).toHaveLength(0);
  expectPrivacyPayloadsAreExactAndPiiFree(events, 'en');
});

test('14 locally mocked Formspree failure dispatches form_submit_error and no lead', async ({ page, network }) => {
  network.expectFormspreeRequest({ status: 500, body: { error: 'fixture failure' } });
  await page.goto(`${LOOPBACK_ORIGIN}/el/contact/`);
  await acceptAnalytics(page);
  await fillValidQuoteForm(page);

  await page.locator('#quoteForm button[type="submit"]').click();
  await expect(page.locator('#form-status')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#form-status')).toHaveClass(/error/);
  await expect(page.locator('#form-status')).toContainText('Κάτι πήγε στραβά');

  expect(network.formspreeRequests).toHaveLength(1);
  const events = await dataLayerEvents(page);
  expect(namedEvents(events, 'form_submit_attempt')).toHaveLength(1);
  expect(namedEvents(events, 'form_submit_error')).toHaveLength(1);
  expect(namedEvents(events, 'generate_lead')).toHaveLength(0);
  expectPrivacyPayloadsAreExactAndPiiFree(events, 'el');
});

test('15 returning mobile consent permits a pre-boot event and live revocation blocks the next event', async ({ page, network }) => {
  const now = new Date().toISOString();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{
    domain: '.www.evochia.gr',
    name: 'cc_cookie',
    path: '/',
    value: JSON.stringify({
      categories: ['necessary', 'analytics'],
      consentId: 'e2e-returning-mobile-consent',
      consentTimestamp: now,
      lastConsentTimestamp: now,
      languageCode: 'en',
      services: {},
    }),
  }]);
  network.expectGtmRequest();

  await page.goto(`${PRODUCTION_ORIGIN}/en/contact/`);
  await expect.poll(() => network.gtmRequests.length).toBe(1);
  expect(await page.evaluate(() => window.CookieConsent.validConsent())).toBe(false);

  await clickWithoutNavigation(page, '#main a[href^="tel:"]');
  const preBootEvents = await dataLayerEvents(page);
  expect(namedEvents(preBootEvents, 'contact_click')).toHaveLength(1);
  expectPrivacyPayloadsAreExactAndPiiFree(preBootEvents, 'en');

  await expect.poll(() => page.evaluate(() => window.CookieConsent.validConsent())).toBe(true);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.evaluate(() => window.CookieConsent.acceptCategory([])),
  ]);

  const consentCookies = (await page.context().cookies())
    .filter((cookie) => cookie.name === 'cc_cookie');
  expect(consentCookies).toHaveLength(1);
  expect(JSON.parse(decodeURIComponent(consentCookies[0].value)).categories).toEqual(['necessary']);

  await clickWithoutNavigation(page, '#main a[href^="tel:"]');
  expect(namedEvents(await dataLayerEvents(page), 'contact_click')).toHaveLength(0);
});

test('16 exact provider requests stay local while unregistered providers and WebRTC egress are denied', async ({ page, network }) => {
  const isolationProbeUrl = 'https://example.invalid/e2e-isolation-probe';
  const googleProbeUrl = 'https://www.google-analytics.com/g/collect?v=2';
  const formspreeProbeUrl = 'https://formspree.io/f/not-allowed';
  const isolationSocketUrl = 'wss://example.invalid/e2e-isolation-socket';
  network.expectBlockedExternalRequest(isolationProbeUrl);
  network.expectBlockedExternalRequest(googleProbeUrl);
  network.expectBlockedExternalRequest(formspreeProbeUrl);
  network.expectBlockedExternalWebSocket(isolationSocketUrl);
  network.expectGtmRequest();
  network.expectFormspreeRequest({ status: 202, body: { fixture: 'local-only' } });

  await page.goto(`${PRODUCTION_ORIGIN}/en/contact/`);
  await acceptAnalytics(page);
  await expect.poll(() => network.gtmRequests.length).toBe(1);

  const formspreeStatus = await page.evaluate(async () => {
    const response = await fetch('https://formspree.io/f/xwvngybk', {
      body: new URLSearchParams({ fixture: 'network-isolation' }),
      method: 'POST',
    });
    return response.status;
  });
  expect(formspreeStatus).toBe(202);

  const probeFailures = await page.evaluate(async (urls) => Promise.all(urls.map(async (url) => {
    try {
      await fetch(url);
      return null;
    } catch (error) {
      return error.name;
    }
  })), [isolationProbeUrl, googleProbeUrl, formspreeProbeUrl]);

  expect(probeFailures).toEqual(['TypeError', 'TypeError', 'TypeError']);

  const socketResult = await page.evaluate((url) => new Promise((resolve) => {
    const socket = new WebSocket(url);
    let opened = false;
    socket.addEventListener('open', () => { opened = true; });
    socket.addEventListener('error', () => {});
    socket.addEventListener('close', (event) => {
      resolve({ code: event.code, opened, reason: event.reason });
    }, { once: true });
  }), isolationSocketUrl);

  expect(socketResult).toEqual({
    code: 1008,
    opened: false,
    reason: 'Blocked by E2E network isolation',
  });
  const webRtcProbe = await page.evaluate(async () => {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    const candidates = [];
    connection.addEventListener('icecandidate', (event) => {
      if (event.candidate) candidates.push(event.candidate.candidate);
    });
    connection.createDataChannel('isolation-probe');
    await connection.setLocalDescription(await connection.createOffer());
    await new Promise((resolve) => {
      if (connection.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 2_000);
      connection.addEventListener('icegatheringstatechange', () => {
        if (connection.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    connection.close();
    return candidates;
  });
  expect(webRtcProbe.filter((candidate) => / typ (srflx|relay)\b/.test(candidate))).toEqual([]);
  expect(network.googleRequests).toHaveLength(2);
  expect(network.gtmRequests).toHaveLength(1);
  expect(network.formspreeRequests).toHaveLength(1);
  expect(network.unexpectedExternalRequests).toHaveLength(3);
  expect(network.escapedExternalRequests).toHaveLength(0);
  expect(network.externalWebSockets).toHaveLength(1);
  expect(network.closedExternalWebSockets).toHaveLength(1);
  expect(network.connectedExternalWebSockets).toHaveLength(0);
});
