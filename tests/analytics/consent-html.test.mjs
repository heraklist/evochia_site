import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Repo root, resolved relative to this test file. */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function htmlFiles() {
  const out = [];
  for (const dir of ['en', 'el']) {
    for (const f of readdirSync(join(ROOT, dir))) {
      if (f.endsWith('.html')) out.push(join(dir, f));
    }
  }
  return out;
}

/* Only pages that actually load the GTM container are instrumented. */
const instrumented = htmlFiles().filter((f) =>
  readFileSync(join(ROOT, f), 'utf8').includes('GTM-578JXRXS')
);

test('every EN/EL page pair is instrumented (>= 32 pages)', () => {
  assert.ok(
    instrumented.length >= 32,
    `expected >= 32 instrumented pages, found ${instrumented.length}`
  );
});

for (const f of instrumented) {
  const html = readFileSync(join(ROOT, f), 'utf8');

  test(`${f}: exactly one Consent Mode default`, () => {
    const matches = html.match(/gtag\('consent'\s*,\s*'default'/g) || [];
    assert.equal(
      matches.length,
      1,
      `expected exactly 1 consent default, found ${matches.length}`
    );
  });

  test(`${f}: Consent Mode default runs before the GTM container`, () => {
    const consentIdx = html.search(/gtag\('consent'\s*,\s*'default'/);
    const gtmIdx = html.indexOf('GTM-578JXRXS');
    assert.ok(consentIdx !== -1, 'consent default not found');
    assert.ok(gtmIdx !== -1, 'GTM snippet not found');
    assert.ok(
      consentIdx < gtmIdx,
      'the consent default must appear before the GTM container loads'
    );
  });

  test(`${f}: all four consent signals default to denied`, () => {
    const block = (html.match(/gtag\('consent'\s*,\s*'default'\s*,\s*\{[^}]*\}/) || [''])[0];
    assert.ok(block, 'consent default object not found');
    for (const signal of [
      'analytics_storage',
      'ad_storage',
      'ad_user_data',
      'ad_personalization'
    ]) {
      assert.match(
        block,
        new RegExp(`'${signal}'\\s*:\\s*'denied'`),
        `${signal} must default to 'denied'`
      );
    }
  });
}
