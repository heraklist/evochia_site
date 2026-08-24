import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import middleware from '../../middleware.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const RETIRED_DIAGNOSTIC_PAGE = 'en/ga-b05-diagnostic.html';
const RETIRED_DIAGNOSTIC_ROUTE = '/en/ga-b05-diagnostic/';
const EXPECTED_PUBLIC_PAGES = [
  'el/404.html',
  'el/about.html',
  'el/athens-private-chef.html',
  'el/catering.html',
  'el/contact.html',
  'el/corporate-catering.html',
  'el/faq.html',
  'el/greek-islands-private-chef.html',
  'el/index.html',
  'el/lookbook.html',
  'el/menus.html',
  'el/privacy.html',
  'el/private-chef.html',
  'el/villa-private-chef.html',
  'el/wedding-catering.html',
  'el/yacht-private-chef.html',
  'en/404.html',
  'en/about.html',
  'en/athens-private-chef.html',
  'en/catering.html',
  'en/contact.html',
  'en/corporate-catering.html',
  'en/faq.html',
  'en/greek-islands-private-chef.html',
  'en/index.html',
  'en/lookbook.html',
  'en/menus.html',
  'en/privacy.html',
  'en/private-chef.html',
  'en/villa-private-chef.html',
  'en/wedding-catering.html',
  'en/yacht-private-chef.html',
];

function localizedHtmlFiles() {
  const files = [];
  for (const dir of ['en', 'el']) {
    for (const filename of readdirSync(join(ROOT, dir))) {
      if (filename.endsWith('.html')) files.push(`${dir}/${filename}`);
    }
  }
  return files.sort();
}

const publicPages = localizedHtmlFiles();

function productionExecutableFiles() {
  return [
    'middleware.ts',
    ...publicPages,
    ...readdirSync(join(ROOT, 'js'))
      .filter((filename) => filename.endsWith('.js'))
      .map((filename) => `js/${filename}`),
  ];
}

test('the retired B0.5 diagnostic has no file, route, or executable probe surface', async () => {
  const response = middleware(
    new Request(`https://www.evochia.gr${RETIRED_DIAGNOSTIC_ROUTE}`),
  );
  const executableReferences = productionExecutableFiles().filter((file) =>
    /ga-b05-diagnostic|ga_diag_target|B0\.5 diagnostic/i.test(
      readFileSync(join(ROOT, file), 'utf8'),
    ),
  );

  assert.deepEqual(
    {
      diagnosticFileExists: existsSync(join(ROOT, RETIRED_DIAGNOSTIC_PAGE)),
      diagnosticRouteStatus: response?.status ?? null,
      executableReferences,
    },
    {
      diagnosticFileExists: false,
      diagnosticRouteStatus: 404,
      executableReferences: [],
    },
  );
});

test('the public localized HTML inventory is exactly the approved 32 pages', () => {
  assert.equal(publicPages.length, 32);
  assert.deepEqual(publicPages, EXPECTED_PUBLIC_PAGES);
});

for (const file of publicPages) {
  const html = readFileSync(join(ROOT, file), 'utf8');

  test(`${file}: keeps exactly one inline Consent Mode default`, () => {
    const matches = html.match(/gtag\('consent'\s*,\s*'default'/g) || [];
    assert.equal(matches.length, 1, `expected exactly 1 consent default, found ${matches.length}`);
    assert.match(
      html,
      /<script>\s*window\.dataLayer=window\.dataLayer\|\|\[\];function gtag\(\)\{dataLayer\.push\(arguments\);\}gtag\('consent','default'/,
      'the default-denied dataLayer/gtag stub must remain inline in <head>',
    );
  });

  test(`${file}: defaults all four consent signals to denied`, () => {
    const block = (html.match(/gtag\('consent'\s*,\s*'default'\s*,\s*\{[^}]*\}/) || [''])[0];
    assert.ok(block, 'consent default object not found');
    for (const signal of [
      'analytics_storage',
      'ad_storage',
      'ad_user_data',
      'ad_personalization',
    ]) {
      assert.match(
        block,
        new RegExp(`'${signal}'\\s*:\\s*'denied'`),
        `${signal} must default to 'denied'`,
      );
    }
  });

  test(`${file}: has no static GTM loader or GTM noscript iframe`, () => {
    assert.doesNotMatch(html, /gtm\.start|event:\s*['"]gtm\.js['"]/);
    assert.doesNotMatch(html, /googletagmanager\.com\/(?:gtm\.js|ns\.html)/);
    assert.doesNotMatch(html, /GTM-578JXRXS/);
  });
}
