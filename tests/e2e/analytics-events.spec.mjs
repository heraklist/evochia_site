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
});

async function fillValidQuoteForm(page) {
  await page.locator('#qf-name').fill(quoteFixture.name);
  await page.locator('#qf-email').fill(quoteFixture.email);
  await page.locator('#qf-event').selectOption(quoteFixture.event);
  await page.locator('#qf-guests').fill(quoteFixture.guests);
  await page.locator('#qf-location').fill(quoteFixture.location);
}

function namedEvents(events, name) {
  return events.filter((event) => event.name === name);
}

test('10 contact_click is consent-gated and carries no contact PII', async ({ page }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);

  await clickWithoutNavigation(page, '#main a[href^="tel:"]');
  expect(namedEvents(await dataLayerEvents(page), 'contact_click')).toHaveLength(0);

  await acceptAnalytics(page);
  await clickWithoutNavigation(page, '#main a[href^="tel:"]');

  const contactEvents = namedEvents(await dataLayerEvents(page), 'contact_click');
  expect(contactEvents).toHaveLength(1);
  expect(contactEvents[0].params).toMatchObject({
    contact_method: 'phone',
    lead_source: 'site',
    locale: 'en',
    page_path: '/en/contact/',
    page_type: 'contact',
    send_to: 'G-2R3S78PTDL',
    service_intent: 'lead_capture',
  });
  expect(contactEvents[0].params).not.toHaveProperty('link_text');
  expect(contactEvents[0].params).not.toHaveProperty('link_url');
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
  expect(startEvents[0].params).toMatchObject({
    form_id: 'quoteForm',
    lead_source: 'quote_form',
    send_to: 'G-2R3S78PTDL',
  });
});

test('12 valid submit dispatches one form_submit_attempt to the fixed destination', async ({ page, network }) => {
  network.setFormspreeResponse({ status: 422, body: { errors: [{ message: 'fixture rejection' }] } });
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);
  await acceptAnalytics(page);
  await fillValidQuoteForm(page);

  await page.locator('#quoteForm button[type="submit"]').click();
  await expect.poll(() => network.formspreeRequests.length).toBe(1);

  const attemptEvents = namedEvents(await dataLayerEvents(page), 'form_submit_attempt');
  expect(attemptEvents).toHaveLength(1);
  expect(attemptEvents[0].params).toMatchObject({
    event_type: 'wedding',
    form_id: 'quoteForm',
    lead_source: 'quote_form',
    send_to: 'G-2R3S78PTDL',
  });
});

test('13 locally mocked Formspree 200 dispatches generate_lead without PII', async ({ page, network }) => {
  network.setFormspreeResponse({ status: 200, body: { ok: true } });
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
  expect(namedEvents(events, 'generate_lead')[0].params).toMatchObject({
    event_type: 'wedding',
    form_id: 'quoteForm',
    lead_source: 'quote_form',
    send_to: 'G-2R3S78PTDL',
  });

  const serializedEvents = JSON.stringify(events);
  for (const piiValue of [quoteFixture.name, quoteFixture.email, quoteFixture.location]) {
    expect(serializedEvents).not.toContain(piiValue);
  }
});

test('14 locally mocked Formspree failure dispatches form_submit_error and no lead', async ({ page, network }) => {
  network.setFormspreeResponse({ status: 500, body: { error: 'fixture failure' } });
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
  expect(namedEvents(events, 'form_submit_error')[0].params).toMatchObject({
    event_type: 'wedding',
    form_id: 'quoteForm',
    lead_source: 'quote_form',
    locale: 'el',
    send_to: 'G-2R3S78PTDL',
  });
});

test('15 all Google and Formspree transports stay local while unknown external traffic aborts', async ({ page, network }) => {
  const isolationProbeUrl = 'https://example.invalid/e2e-isolation-probe';
  network.expectBlockedExternalRequest(isolationProbeUrl);
  network.setFormspreeResponse({ status: 202, body: { fixture: 'local-only' } });

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

  const probeFailure = await page.evaluate(async (url) => {
    try {
      await fetch(url);
      return null;
    } catch (error) {
      return error.name;
    }
  }, isolationProbeUrl);

  expect(probeFailure).toBe('TypeError');
  expect(network.googleRequests).toHaveLength(1);
  expect(network.gtmRequests).toHaveLength(1);
  expect(network.formspreeRequests).toHaveLength(1);
  expect(network.unexpectedExternalRequests).toHaveLength(1);
  expect(network.escapedExternalRequests).toHaveLength(0);
});
