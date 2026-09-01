import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const SITE_URL = 'https://www.evochia.gr';
const LOCALES = ['en', 'el'];
const NON_INDEXABLE_FILES = new Set(['404.html', 'privacy.html']);

function routeFor(locale, fileName) {
  return fileName === 'index.html'
    ? `/${locale}/`
    : `/${locale}/${fileName.replace(/\.html$/, '')}/`;
}

function pageInventory() {
  return LOCALES.flatMap((locale) =>
    fs.readdirSync(locale)
      .filter((fileName) => fileName.endsWith('.html'))
      .sort()
      .map((fileName) => ({
        locale,
        fileName,
        filePath: path.join(locale, fileName),
        route: routeFor(locale, fileName),
        indexable: !NON_INDEXABLE_FILES.has(fileName),
      })),
  );
}

function parseSitemapEntries(xml) {
  return [...xml.matchAll(/<url>\s*([\s\S]*?)\s*<\/url>/g)].map(([, block]) => ({
    loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '',
    alternates: Object.fromEntries(
      [...block.matchAll(/<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g)]
        .map(([, hreflang, href]) => [hreflang, href]),
    ),
  }));
}

function extractMiddlewareRoutes(source, constantName) {
  const block = source.match(new RegExp(`const ${constantName} = new Set\\(\\[([\\s\\S]*?)\\]\\);`))?.[1] ?? '';
  return [...block.matchAll(/'([^']+)'/g)].map(([, route]) => route).sort();
}

function getSingleMatch(html, regex, label, filePath) {
  const matches = [...html.matchAll(regex)];
  assert.equal(matches.length, 1, `${filePath}: expected exactly one ${label}`);
  return matches[0][1];
}

test('filesystem, sitemap, and middleware stay in parity', () => {
  const inventory = pageInventory();
  const sitemap = parseSitemapEntries(fs.readFileSync('sitemap.xml', 'utf8'));
  const middleware = fs.readFileSync('middleware.ts', 'utf8');

  const expectedIndexableUrls = inventory
    .filter(({ indexable }) => indexable)
    .map(({ route }) => `${SITE_URL}${route}`)
    .sort();
  const actualSitemapUrls = sitemap.map(({ loc }) => loc).sort();
  assert.deepEqual(actualSitemapUrls, expectedIndexableUrls);

  for (const locale of LOCALES) {
    const expectedRoutes = inventory
      .filter((page) => page.locale === locale)
      .map(({ route }) => route)
      .sort();
    const actualRoutes = extractMiddlewareRoutes(
      middleware,
      locale === 'en' ? 'EN_ROUTES' : 'EL_ROUTES',
    );
    assert.deepEqual(actualRoutes, expectedRoutes, `${locale}: middleware route inventory drifted from disk`);
  }
});

test('every indexable page has self-canonical and reciprocal hreflang metadata', () => {
  for (const page of pageInventory().filter(({ indexable }) => indexable)) {
    const html = fs.readFileSync(page.filePath, 'utf8');
    const ownUrl = `${SITE_URL}${page.route}`;
    const otherLocale = page.locale === 'en' ? 'el' : 'en';
    const otherRoute = page.route.replace(`/${page.locale}/`, `/${otherLocale}/`);
    const otherUrl = `${SITE_URL}${otherRoute}`;
    const englishUrl = page.locale === 'en' ? ownUrl : otherUrl;

    assert.match(html, /<meta\s+name="robots"\s+content="index,\s*follow"\s*\/?>/i, `${page.filePath}: indexable page must be index,follow`);
    assert.match(html, new RegExp(`<link\\s+rel="canonical"\\s+href="${ownUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*\\/?>`, 'i'));
    assert.match(html, new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${page.locale}"\\s+href="${ownUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*\\/?>`, 'i'));
    assert.match(html, new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${otherLocale}"\\s+href="${otherUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*\\/?>`, 'i'));
    assert.match(html, new RegExp(`<link\\s+rel="alternate"\\s+hreflang="x-default"\\s+href="${englishUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*\\/?>`, 'i'));

    const title = getSingleMatch(html, /<title>([^<]+)<\/title>/gi, 'title', page.filePath).trim();
    const description = getSingleMatch(html, /<meta\s+name="description"\s+content="([^"]+)"\s*\/?>/gi, 'meta description', page.filePath).trim();
    assert.ok(title.length > 0 && title.length <= 60, `${page.filePath}: title length ${title.length} is outside 1–60`);
    assert.ok(description.length >= 50 && description.length <= 180, `${page.filePath}: description length ${description.length} is outside 50–180`);
  }
});

test('sitemap uses reciprocal language clusters and no unverified lastmod dates', () => {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  assert.doesNotMatch(xml, /<lastmod>/i, 'sitemap lastmod must be omitted unless backed by material-content timestamps');

  const entries = parseSitemapEntries(xml);
  const entryByLocation = new Map(entries.map((entry) => [entry.loc, entry]));
  for (const entry of entries) {
    const locale = entry.loc.includes('/en/') ? 'en' : 'el';
    const otherLocale = locale === 'en' ? 'el' : 'en';
    const otherLocation = entry.loc.replace(`/${locale}/`, `/${otherLocale}/`);
    const englishLocation = locale === 'en' ? entry.loc : otherLocation;
    assert.equal(entry.alternates[locale], entry.loc);
    assert.equal(entry.alternates[otherLocale], otherLocation);
    assert.equal(entry.alternates['x-default'], englishLocation);
    assert.deepEqual(entryByLocation.get(otherLocation)?.alternates, entry.alternates);
  }
});

test('page-integrity validation runs for content and routing changes', () => {
  const workflow = fs.readFileSync('.github/workflows/page-integrity-validation.yml', 'utf8');
  for (const requiredPath of ['en/**', 'el/**', 'middleware.ts', 'sitemap.xml']) {
    assert.match(workflow, new RegExp(`- ${requiredPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `workflow must watch ${requiredPath}`);
  }
  assert.match(workflow, /run: npm run test:unit/);
  assert.match(workflow, /persist-credentials: false/);
});
