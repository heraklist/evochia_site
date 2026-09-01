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

test('broad private-chef page delegates villa intent while retaining transactional intent', () => {
  const title = titleOf(parentHtml);
  const description = descriptionOf(parentHtml);
  const service = firstServiceSchema(parentHtml);

  assert.doesNotMatch(title, /\bvillas?\b/i, 'parent title must not target villa intent');
  assert.doesNotMatch(description, /\bvillas?\b/i, 'parent meta description must not target villa intent');
  assert.doesNotMatch(service.description, /\bvillas?\b/i, 'parent Service schema description must not target villa intent');
  assert.match(description, /^Book a private chef in Greece\b/i, 'parent must retain transactional Book intent');
  assert.equal(socialValue(parentHtml, 'og:description'), description);
  assert.equal(socialValue(parentHtml, 'twitter:description', 'name'), description);
  assert.equal(service.description, description);
  assert.match(
    parentHtml,
    /<a\s+href="\/en\/villa-private-chef\/"\s+class="landing-link-chip"[^>]*>Private Chef for Villas<\/a>/i,
    'parent must use a descriptive Villa child anchor',
  );
});

test('villa child owns the explicit villa-private-chef search intent', () => {
  const expectedTitle = 'Private Chef for Villas in Greece | Evochia';
  const expectedH1 = 'Private Chef for Villas in Greece';
  const title = titleOf(childHtml);
  const description = descriptionOf(childHtml);
  const h1 = singleMatch(childHtml, /<h1\s+class="hero-title"[^>]*>([^<]+)<\/h1>/gi, 'hero H1');
  const service = firstServiceSchema(childHtml);

  assert.equal(title, expectedTitle);
  assert.equal(h1, expectedH1);
  assert.match(description, /^Private chef for villas in Greece,/i);
  assert.equal(service.name, expectedH1);

  assert.equal(socialValue(childHtml, 'og:title'), title);
  assert.equal(socialValue(childHtml, 'twitter:title', 'name'), title);
  assert.equal(socialValue(childHtml, 'og:description'), description);
  assert.equal(socialValue(childHtml, 'twitter:description', 'name'), description);
});

test('pilot leaves non-villa child anchors unchanged', () => {
  assert.match(parentHtml, /href="\/en\/yacht-private-chef\/"[^>]*>Yacht<\/a>/i);
  assert.match(parentHtml, /href="\/en\/athens-private-chef\/"[^>]*>City Residence<\/a>/i);
  assert.match(parentHtml, /href="\/en\/greek-islands-private-chef\/"[^>]*>Island Stay<\/a>/i);
});
