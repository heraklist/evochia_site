import { symlink, unlink } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, LOOPBACK_ORIGIN, test } from './fixtures/network.mjs';
import { SERVER_HOST, SERVER_PORT } from './server.mjs';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));

function localServerRequest(pathname, host = `${SERVER_HOST}:${SERVER_PORT}`) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest({
      headers: { Host: host },
      host: SERVER_HOST,
      method: 'GET',
      path: pathname,
      port: SERVER_PORT,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolveRequest({
        body: Buffer.concat(chunks),
        contentType: response.headers['content-type'] ?? '',
        status: response.statusCode,
      }));
    });
    request.on('error', rejectRequest);
    request.end();
  });
}

test('01 critical English route renders the real page', async ({ page }) => {
  await page.goto(`${LOOPBACK_ORIGIN}/en/`);

  await expect(page).toHaveTitle('Evochia | Premium Catering & Private Chef in Greece');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Crafting Extraordinary Culinary Moments');

  const health = await page.evaluate(() => fetch('/__health').then((response) => response.json()));
  expect(health).toEqual({ nodeVersion: 'v22.23.2', status: 'ok' });

  const attackerHost = await localServerRequest('/.git/config', `attacker.example:${SERVER_PORT}`);
  expect(attackerHost.status).toBe(421);
  expect(attackerHost.body.toString('utf8')).not.toContain('[core]');

  for (const disallowedPath of ['/.git/config', '/%2egit/config', '/middleware.ts']) {
    const response = await localServerRequest(disallowedPath);
    expect(response.status, disallowedPath).toBe(404);
  }

  for (const publicPath of ['/en/', '/el/contact/', '/js/site.js', '/css/critical.css', '/assets/logo-42.png']) {
    const response = await localServerRequest(publicPath);
    expect(response.status, publicPath).toBe(200);
  }

  const symlinkPath = resolve(REPOSITORY_ROOT, 'assets', 'e2e-symlink-probe');
  const privateTarget = resolve(REPOSITORY_ROOT, '.git');
  await symlink(privateTarget, symlinkPath, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    const response = await localServerRequest('/assets/e2e-symlink-probe/config');
    expect(response.status).toBe(404);
    expect(response.body.toString('utf8')).not.toContain('[core]');
  } finally {
    await unlink(symlinkPath);
  }
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
