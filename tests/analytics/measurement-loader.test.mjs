import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const COOKIECONSENT_SOURCE = readFileSync(
  join(ROOT, 'js', 'cookieconsent-config.js'),
  'utf8',
).replace(/^import\s+['"]\/js\/cookieconsent\.umd\.js['"];\s*/u, '');
const GTM_URL = 'https://www.googletagmanager.com/gtm.js?id=GTM-578JXRXS';

async function createConsentHarness({
  hostname = 'www.evochia.gr',
  storedAccepted = false,
  liveAccepted = false,
  existingGtmScript = false,
} = {}) {
  const effects = [];
  let accepted = liveAccepted;
  let config;
  const scripts = existingGtmScript ? [{ tagName: 'SCRIPT', src: GTM_URL }] : [];

  const context = {
    Promise,
    CookieConsent: {
      acceptedCategory(category) {
        assert.equal(category, 'analytics');
        return accepted;
      },
      run(nextConfig) {
        config = nextConfig;
      },
    },
    __EVOCHIA_CONSENT_STATE__: {
      storedAnalyticsConsented: () => storedAccepted,
    },
    dataLayer: {
      push(argsLike) {
        effects.push({ type: 'gtag', args: Array.from(argsLike) });
      },
    },
    location: {
      hostname,
      pathname: '/en/',
      reload() {
        effects.push({ type: 'reload' });
      },
    },
    matchMedia: () => ({ matches: false }),
    setTimeout(callback) {
      callback();
      return 1;
    },
    document: {
      cookie: storedAccepted
        ? 'cc_cookie=%7B%22categories%22%3A%5B%22necessary%22%5D%7D'
        : 'cc_cookie=%7B%22categories%22%3A%5B%22necessary%22%2C%22analytics%22%5D%7D',
      readyState: 'complete',
      addEventListener() {},
      querySelector(selector) {
        if (selector.startsWith('link[href=')) return { tagName: 'LINK' };
        if (selector.includes('googletagmanager.com/gtm.js')) return scripts[0] || null;
        return null;
      },
      createElement(tagName) {
        return {
          tagName: tagName.toUpperCase(),
          addEventListener() {},
        };
      },
      head: {
        appendChild(node) {
          if (node.tagName === 'SCRIPT') {
            scripts.push(node);
            effects.push({ type: 'append', src: node.src, async: node.async });
          }
          return node;
        },
      },
    },
  };
  context.window = context;

  runInNewContext(COOKIECONSENT_SOURCE, context, {
    filename: 'js/cookieconsent-config.js',
  });

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.ok(config, 'CookieConsent.run must receive the production configuration');

  return {
    effects,
    config,
    scripts,
    setAccepted(value) {
      accepted = value;
    },
  };
}

function grantedEffect(effect) {
  return effect.type === 'gtag'
    && effect.args[0] === 'consent'
    && effect.args[1] === 'update'
    && effect.args[2]?.analytics_storage === 'granted';
}

function deniedEffect(effect) {
  return effect.type === 'gtag'
    && effect.args[0] === 'consent'
    && effect.args[1] === 'update'
    && effect.args[2]?.analytics_storage === 'denied';
}

test('accepted analytics grants consent before inserting the fixed GTM script', async () => {
  const harness = await createConsentHarness();
  harness.setAccepted(true);

  harness.config.onFirstConsent();

  assert.deepEqual(
    harness.effects.map((effect) => effect.type),
    ['gtag', 'append'],
  );
  assert.equal(grantedEffect(harness.effects[0]), true);
  assert.deepEqual(harness.effects[1], {
    type: 'append',
    src: GTM_URL,
    async: true,
  });
});

test('only the exact normalized production hostname may insert GTM', async (t) => {
  const cases = [
    { hostname: 'www.evochia.gr', want: 1 },
    { hostname: 'WWW.EVOCHIA.GR.', want: 1 },
    { hostname: 'evochia.gr', want: 0 },
    { hostname: 'evil-evochia.gr', want: 0 },
    { hostname: 'evochia.gr.attacker.example', want: 0 },
    { hostname: 'evochia-git-main.vercel.app', want: 0 },
    { hostname: 'localhost', want: 0 },
    { hostname: '127.0.0.1', want: 0 },
  ];

  for (const { hostname, want } of cases) {
    await t.test(hostname, async () => {
      const harness = await createConsentHarness({ hostname });
      harness.setAccepted(true);
      harness.config.onConsent();

      assert.equal(
        harness.effects.filter((effect) => effect.type === 'append').length,
        want,
      );
    });
  }
});

test('stored consent restoration uses the shared parser and initializes GTM once', async () => {
  const harness = await createConsentHarness({
    storedAccepted: true,
    liveAccepted: true,
  });

  harness.config.onConsent();
  harness.config.onFirstConsent();
  harness.config.onChange({ changedCategories: ['analytics'] });

  assert.equal(
    harness.effects.filter((effect) => effect.type === 'append').length,
    1,
  );
  assert.equal(harness.effects.filter(grantedEffect).length, 1);
});

test('repeated accepted callbacks insert GTM only once', async () => {
  const harness = await createConsentHarness();
  harness.setAccepted(true);

  harness.config.onFirstConsent();
  harness.config.onConsent();
  harness.config.onChange({ changedCategories: ['analytics'] });
  harness.config.onConsent();

  assert.equal(
    harness.effects.filter((effect) => effect.type === 'append').length,
    1,
  );
  assert.equal(harness.effects.filter(grantedEffect).length, 1);
});

test('an already-present fixed GTM script is treated as initialized', async () => {
  const harness = await createConsentHarness({ existingGtmScript: true });
  harness.setAccepted(true);

  harness.config.onFirstConsent();
  harness.config.onConsent();

  assert.equal(
    harness.effects.filter((effect) => effect.type === 'append').length,
    0,
  );
});

test('rejection never inserts GTM', async () => {
  const harness = await createConsentHarness();

  harness.config.onFirstConsent();
  harness.config.onConsent();
  harness.config.onChange({ changedCategories: ['analytics'] });

  assert.equal(
    harness.effects.filter((effect) => effect.type === 'append').length,
    0,
  );
});

test('withdrawal updates analytics consent to denied before reload', async () => {
  const harness = await createConsentHarness();
  harness.setAccepted(true);
  harness.config.onConsent();
  harness.setAccepted(false);

  harness.config.onChange({ changedCategories: ['analytics'] });

  const deniedIndex = harness.effects.findIndex(deniedEffect);
  const reloadIndex = harness.effects.findIndex((effect) => effect.type === 'reload');
  assert.notEqual(deniedIndex, -1, 'withdrawal must issue a denied update');
  assert.notEqual(reloadIndex, -1, 'withdrawal must preserve reload behavior');
  assert.ok(deniedIndex < reloadIndex, 'denial must be queued before reload');
});

test('the consent module has no second persisted-cookie parser', () => {
  assert.doesNotMatch(COOKIECONSENT_SOURCE, /document\.cookie|cc_cookie|JSON\.parse/);
});
