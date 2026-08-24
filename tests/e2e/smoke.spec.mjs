import { expect, LOOPBACK_ORIGIN, test } from './fixtures/network.mjs';

test('01 critical English route renders the real page', async ({ page }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/`);

  await expect(page).toHaveTitle('Evochia | Premium Catering & Private Chef in Greece');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Crafting Extraordinary Culinary Moments');

  const health = await page.evaluate(() => fetch('/__health').then((response) => response.json()));
  expect(health).toEqual({ nodeVersion: 'v22.23.2', status: 'ok' });
});

test('02 critical Greek route renders the real page', async ({ page }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/el/`);

  await expect(page).toHaveTitle('Evochia | Catering & Private Chef στην Ελλάδα');
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Δημιουργώντας εξαιρετικές γαστρονομικές στιγμές');
});

test('03 language and primary navigation preserve clean localized routes', async ({ page }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/`);
  await page.getByRole('button', { name: 'Reject all' }).click();

  await page.locator('a.lang-switch').click();
  await expect(page).toHaveURL(`${LOOPBACK_ORIGIN}/el/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');

  await page.locator('#navLinks').getByRole('link', { name: 'Σχετικά' }).click();
  await expect(page).toHaveURL(`${LOOPBACK_ORIGIN}/el/about/`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Με οδηγό την τέχνη, με πυξίδα τη γεύση');
});

test('04 consent banner rejection persists necessary-only consent and keeps GTM absent', async ({ page, network }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/contact/`);

  const dialog = page.locator('#cc-main .cm[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText('We use cookies');
  await dialog.getByRole('button', { name: 'Reject all' }).click();
  await expect(dialog).toBeHidden();

  const consentCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'cc_cookie');
  expect(JSON.parse(decodeURIComponent(consentCookie.value)).categories).toEqual(['necessary']);
  expect(network.gtmRequests).toHaveLength(0);
  await expect(page.locator('script[src*="googletagmanager.com/gtm.js"]')).toHaveCount(0);
});
