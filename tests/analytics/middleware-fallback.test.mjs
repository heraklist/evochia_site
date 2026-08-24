import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

import middleware from '../../middleware.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CONSENT_DEFAULT_PATH = join(ROOT, 'js', 'consent-default.js');
const CONSENT_DEFAULT_TAG = '<script src="/js/consent-default.js"></script>';

for (const locale of ['en', 'el']) {
  test(`${locale.toUpperCase()} generated fallback establishes consent before site modules`, async () => {
    const response = middleware(
      new Request(`https://www.evochia.gr/${locale}/definitely-missing/`),
    );
    assert.ok(response, 'localized missing routes must return a generated response');
    assert.equal(response.status, 404);

    const html = await response.text();
    const bootstrapIndex = html.indexOf(CONSENT_DEFAULT_TAG);
    const headEndIndex = html.indexOf('</head>');
    const siteIndex = html.indexOf('<script src="/js/site.js?v=2.5" defer></script>');
    const consentModuleIndex = html.indexOf(
      '<script type="module" src="/js/cookieconsent-config.js"></script>',
    );

    assert.notEqual(bootstrapIndex, -1, 'fallback must load the self-hosted consent default');
    assert.ok(bootstrapIndex < headEndIndex, 'consent default must execute synchronously in <head>');
    assert.ok(bootstrapIndex < siteIndex, 'consent default must precede site.js');
    assert.ok(bootstrapIndex < consentModuleIndex, 'consent default must precede the consent module');
    assert.doesNotMatch(html, /gtm\.start|googletagmanager\.com|GTM-578JXRXS/);

    const csp = response.headers.get('Content-Security-Policy') || '';
    const scriptSrc = csp.split(';').find((directive) => directive.trim().startsWith('script-src '));
    assert.ok(scriptSrc, 'fallback response must define script-src');
    assert.match(scriptSrc, /(?:^|\s)'self'(?:\s|$)/);
    assert.doesNotMatch(scriptSrc, /'unsafe-inline'/);
  });
}

test('the self-hosted synchronous bootstrap queues one four-signal denied default', () => {
  assert.equal(existsSync(CONSENT_DEFAULT_PATH), true, 'consent default asset must exist');
  const source = readFileSync(CONSENT_DEFAULT_PATH, 'utf8');
  const context = {};
  context.window = context;

  runInNewContext(source, context, { filename: 'js/consent-default.js' });

  assert.equal(context.dataLayer.length, 1);
  const [command, mode, settings] = Array.from(context.dataLayer[0]);
  assert.equal(command, 'consent');
  assert.equal(mode, 'default');
  for (const signal of [
    'analytics_storage',
    'ad_storage',
    'ad_user_data',
    'ad_personalization',
  ]) {
    assert.equal(settings[signal], 'denied', `${signal} must default to denied`);
  }
  assert.doesNotMatch(source, /googletagmanager\.com|google-analytics\.com|GTM-/);
});
