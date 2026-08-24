import {
  expect,
  LOOPBACK_ORIGIN,
  PRODUCTION_ORIGIN,
  test,
} from './fixtures/network.mjs';

const GTM_URL = 'https://www.googletagmanager.com/gtm.js?id=GTM-578JXRXS';

async function dataLayerConsentCommands(page) {
  return page.evaluate(() => window.dataLayer
    .filter((entry) => entry && entry[0] === 'consent')
    .map((entry) => ({ command: entry[1], params: { ...entry[2] } })));
}

async function acceptAnalytics(page) {
  const dialog = page.locator('#cc-main .cm[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Accept all' }).click();
  await expect(dialog).toBeHidden();
}

function validStoredConsentCookie() {
  const timestamp = '2026-08-24T00:00:00.000Z';
  return encodeURIComponent(JSON.stringify({
    categories: ['necessary', 'analytics'],
    consentId: '00000000-0000-4000-8000-000000000009',
    consentTimestamp: timestamp,
    data: null,
    languageCode: 'en',
    lastConsentTimestamp: timestamp,
    revision: 0,
    services: {},
  }));
}

test('05 production-host page emits no Google request before analytics consent', async ({ page, network }) => {
  await page.goto(`${PRODUCTION_ORIGIN}/en/contact/`);
  await expect(page.locator('#cc-main .cm[role="dialog"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__EVOCHIA_COOKIECONSENT_BOOTED__)).toBe(true);

  expect(network.googleRequests).toHaveLength(0);
  expect(network.gtmRequests).toHaveLength(0);
  await expect(page.locator('script[src*="googletagmanager.com/gtm.js"]')).toHaveCount(0);

  const commands = await dataLayerConsentCommands(page);
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({
    command: 'default',
    params: {
      ad_personalization: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      analytics_storage: 'denied',
    },
  });
});

test('06 exact www host makes one locally fulfilled GTM attempt after acceptance', async ({ page, network }) => {
  network.expectGtmRequest();
  await page.goto(`${PRODUCTION_ORIGIN}/en/contact/`);
  await acceptAnalytics(page);

  await expect.poll(() => network.gtmRequests.length).toBe(1);
  expect(network.googleRequests).toHaveLength(1);
  expect(network.gtmRequests[0]).toMatchObject({
    hostname: 'www.googletagmanager.com',
    method: 'GET',
    pathname: '/gtm.js',
    url: GTM_URL,
  });
  await expect(page.locator(`script[src="${GTM_URL}"]`)).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__EVOCHIA_INTERCEPTED_GTM_EXECUTIONS__)).toBe(1);

  const commands = await dataLayerConsentCommands(page);
  expect(commands.map((entry) => entry.command)).toEqual(['default', 'update']);
  expect(commands[1].params.analytics_storage).toBe('granted');
});

test('07 accepted analytics on loopback preview emits zero Google requests', async ({ page, network }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);
  await acceptAnalytics(page);

  expect(network.googleRequests).toHaveLength(0);
  expect(network.gtmRequests).toHaveLength(0);
  await expect(page.locator('script[src*="googletagmanager.com/gtm.js"]')).toHaveCount(0);

  const commands = await dataLayerConsentCommands(page);
  expect(commands).toHaveLength(1);
  expect(commands[0].params.analytics_storage).toBe('denied');
});

test('08 repeated accepted consent commands keep GTM one-shot per document', async ({ page, network }) => {
  network.expectGtmRequest();
  await page.goto(`${PRODUCTION_ORIGIN}/en/contact/`);
  await acceptAnalytics(page);
  await expect.poll(() => network.gtmRequests.length).toBe(1);

  await page.evaluate(() => {
    window.CookieConsent.acceptCategory('all');
    window.CookieConsent.acceptCategory('all');
  });

  expect(network.gtmRequests).toHaveLength(1);
  expect(network.googleRequests).toHaveLength(1);
  await expect(page.locator(`script[src="${GTM_URL}"]`)).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__EVOCHIA_INTERCEPTED_GTM_EXECUTIONS__)).toBe(1);
});

test('09 valid stored analytics consent restores GTM exactly once without a banner', async ({ context, page, network }) => {
  network.expectGtmRequest();
  await context.addCookies([{
    domain: 'www.evochia.gr',
    expires: Math.floor(Date.now() / 1000) + 3_600,
    name: 'cc_cookie',
    path: '/',
    sameSite: 'Lax',
    secure: false,
    value: validStoredConsentCookie(),
  }]);

  await page.goto(`${PRODUCTION_ORIGIN}/en/contact/`);

  await expect.poll(() => network.gtmRequests.length).toBe(1);
  expect(network.googleRequests).toHaveLength(1);
  await expect(page.locator('#cc-main .cm[role="dialog"]')).toBeHidden();
  await expect(page.locator(`script[src="${GTM_URL}"]`)).toHaveCount(1);

  const commands = await dataLayerConsentCommands(page);
  expect(commands.map((entry) => entry.command)).toEqual(['default', 'update']);
  expect(commands[1].params.analytics_storage).toBe('granted');
});
