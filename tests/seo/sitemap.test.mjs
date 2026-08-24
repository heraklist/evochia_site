import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const siteUrl = 'https://www.evochia.gr';
const privacyPages = [
  { locale: 'en', otherLocale: 'el' },
  { locale: 'el', otherLocale: 'en' },
];

function getAttribute(html, tag, attribute, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagMatch = html.match(new RegExp(`<${tag}[^>]*${attribute}="${escapedValue}"[^>]*>`, 'i'));
  return tagMatch?.[0] ?? '';
}

function parseSitemapEntries(xml) {
  return [...xml.matchAll(/<url>\s*([\s\S]*?)\s*<\/url>/g)].map(([, block]) => ({
    loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1],
    alternates: Object.fromEntries(
      [...block.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)]
        .map(([, hreflang, href]) => [hreflang, href]),
    ),
  }));
}

test('privacy pages remain noindex, self-canonical, and cross-linked', () => {
  for (const { locale, otherLocale } of privacyPages) {
    const page = fs.readFileSync(`${locale}/privacy.html`, 'utf8');
    const canonical = getAttribute(page, 'link', 'rel', 'canonical');
    const languageSwitch = getAttribute(page, 'a', 'class', 'lang-switch');

    assert.match(page, /<meta name="robots" content="noindex">/i);
    assert.match(canonical, new RegExp(`href="${siteUrl}/${locale}/privacy/"`));
    assert.match(languageSwitch, new RegExp(`href="/${otherLocale}/privacy/"`));
  }
});

test('sitemap contains exactly 28 indexable URLs and excludes privacy pages', () => {
  const entries = parseSitemapEntries(fs.readFileSync('sitemap.xml', 'utf8'));
  const locations = entries.map(({ loc }) => loc);

  assert.equal(entries.length, 28);
  assert.equal(locations.includes(`${siteUrl}/en/privacy/`), false);
  assert.equal(locations.includes(`${siteUrl}/el/privacy/`), false);
});

test('every sitemap URL has reciprocal EN, EL, and x-default alternates', () => {
  const entries = parseSitemapEntries(fs.readFileSync('sitemap.xml', 'utf8'));
  const entryByLocation = new Map(entries.map((entry) => [entry.loc, entry]));

  for (const entry of entries) {
    const locale = entry.loc.includes('/en/') ? 'en' : 'el';
    const otherLocale = locale === 'en' ? 'el' : 'en';
    const otherLocation = entry.loc.replace(`/${locale}/`, `/${otherLocale}/`);
    const englishLocation = locale === 'en' ? entry.loc : otherLocation;
    const reciprocalEntry = entryByLocation.get(otherLocation);

    assert.equal(entry.alternates[locale], entry.loc);
    assert.equal(entry.alternates[otherLocale], otherLocation);
    assert.equal(entry.alternates['x-default'], englishLocation);
    assert.ok(reciprocalEntry, `missing reciprocal sitemap entry for ${entry.loc}`);
    assert.deepEqual(reciprocalEntry.alternates, entry.alternates);
  }
});
