import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const parentPath = 'en/private-chef.html';
const childPath = 'en/villa-private-chef.html';
const parentHtml = fs.readFileSync(parentPath, 'utf8');
const childHtml = fs.readFileSync(childPath, 'utf8');

function singleMatch(html, regex, label) {
  const matches = [...html.matchAll(regex)];
  assert.equal(matches.length, 1, `expected exactly one ${label}`);
  return matches[0][1].trim();
}

function titleOf(html) {
  return singleMatch(html, /<title>([^<]+)<\/title>/gi, 'title');
}

function descriptionOf(html) {
  return singleMatch(html, /<meta\s+name="description"\s+content="([^"]+)"\s*\/?>/gi, 'meta description');
}

function socialValue(html, property, attribute = 'property') {
  return singleMatch(
    html,
    new RegExp(`<meta\\s+${attribute}="${property}"\\s+content="([^"]+)"\\s*\\/?>`, 'gi'),
    property,
  );
}

function firstServiceSchema(html) {
  const scripts = [...html.matchAll(/<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi)];
  const parsed = scripts.map(([, raw]) => JSON.parse(raw));
  const service = parsed.find((item) => item['@type'] === 'Service');
  assert.ok(service, 'expected Service JSON-LD');
  return service;
}

test('broad private-chef page stays transactional and differentiated without owning villa intent', () => {
  const title = titleOf(parentHtml);
  const description = descriptionOf(parentHtml);
  const service = firstServiceSchema(parentHtml);

  assert.match(title, /private chef in greece/i);
  assert.doesNotMatch(title, /\bvillas?\b/i, 'parent title must not target villa intent');
  assert.doesNotMatch(title, /\byachts?\b/i, 'parent title must not target yacht intent');

  assert.match(description, /^Book a private chef in Greece\b/i, 'parent must retain transactional Book intent');
  assert.doesNotMatch(description, /\bvillas?\b/i, 'parent meta description must not target villa intent');
  assert.doesNotMatch(description, /\byachts?\b/i, 'parent meta description must not target yacht intent');
  assert.match(description, /Mediterranean/i, 'parent description should retain cuisine differentiation');
  assert.match(description, /Nikkei/i, 'parent description should retain Evochia’s distinctive Nikkei signal');
  assert.doesNotMatch(description, /kitchen reset/i, 'premium parent snippet should avoid operational cleaning language');

  assert.doesNotMatch(service.description, /\bvillas?\b/i, 'parent Service schema must not target villa intent');
  assert.doesNotMatch(service.description, /\byachts?\b/i, 'parent Service schema must not target yacht intent');
  assert.equal(socialValue(parentHtml, 'og:description'), description);
  assert.equal(socialValue(parentHtml, 'twitter:description', 'name'), description);

  assert.match(
    parentHtml,
    /<a\s+href="\/en\/villa-private-chef\/"\s+class="landing-link-chip"[^>]*data-el="Βίλα"[^>]*>Villa<\/a>/i,
    'Villa setting chip should remain a parallel setting label in EN and EL',
  );
});

test('villa child owns villa search intent while preserving editorial hospitality voice', () => {
  const title = titleOf(childHtml);
  const description = descriptionOf(childHtml);
  const h1 = singleMatch(childHtml, /<h1\s+class="hero-title"[^>]*>([^<]+)<\/h1>/gi, 'hero H1');
  const heroDescription = singleMatch(childHtml, /<p\s+class="hero-description"[^>]*>([^<]+)<\/p>/gi, 'hero description');
  const service = firstServiceSchema(childHtml);

  assert.match(title, /private chef/i);
  assert.match(title, /villas?/i);
  assert.match(title, /greece/i);
  assert.match(h1, /private chef/i);
  assert.match(h1, /villas?/i);
  assert.match(h1, /greece/i);

  assert.match(description, /^Private chef for villas in Greece\b/i);
  assert.match(description, /privacy|ease/i, 'child snippet should retain villa-specific hospitality language');
  assert.doesNotMatch(description, /kitchen reset/i, 'child snippet should avoid operational cleaning language');
  assert.notEqual(description, descriptionOf(parentHtml), 'parent and child descriptions must remain differentiated');

  assert.match(heroDescription, /hospitality/i, 'visible hero copy should preserve hospitality positioning');
  assert.match(heroDescription, /breakfast/i, 'visible hero copy should retain a concrete sensory/service image');
  assert.match(heroDescription, /candlelit dinner/i, 'visible hero copy should retain a concrete evening image');
  assert.match(heroDescription, /rhythm/i, 'visible hero copy should retain the established villa rhythm language');

  assert.match(service.name, /private chef/i);
  assert.match(service.name, /villas?/i);
  assert.match(service.name, /greece/i);

  assert.equal(socialValue(childHtml, 'og:title'), title);
  assert.equal(socialValue(childHtml, 'twitter:title', 'name'), title);
  assert.equal(socialValue(childHtml, 'og:description'), description);
  assert.equal(socialValue(childHtml, 'twitter:description', 'name'), description);
});

test('pilot keeps the other private-chef settings visible and unchanged', () => {
  assert.match(parentHtml, /href="\/en\/yacht-private-chef\/"[^>]*>Yacht<\/a>/i);
  assert.match(parentHtml, /href="\/en\/athens-private-chef\/"[^>]*>City Residence<\/a>/i);
  assert.match(parentHtml, /href="\/en\/greek-islands-private-chef\/"[^>]*>Island Stay<\/a>/i);
});
