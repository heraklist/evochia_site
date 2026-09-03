import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ConfigurationError,
  getConfig,
  verifyConfig,
  type SeoConfig,
} from '../../../seo/apps-script/src/Config.ts';
import {
  APPROVED_MONITORED_PATHS,
  MAX_INSPECTION_URLS,
  expectedMonitoredUrls,
} from '../../../seo/apps-script/src/GscIndexConfig.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const baseConfig: SeoConfig = {
  gscProperty: 'https://www.evochia.gr/',
  ga4AccountId: '388030118',
  ga4PropertyId: '528945896',
  ga4PropertyTimeZone: 'Europe/Athens',
  productionHostname: 'www.evochia.gr',
  gtmPublicContainerId: 'GTM-578JXRXS',
  gtmAccountId: '123456789',
  gtmContainerId: '987654321',
  sheetId: 'sheet-resource-id',
  driveFolderId: 'drive-folder-resource-id',
  ownerEmail: 'heraklis@evochia.gr',
  verificationStatus: 'verified',
};

test('gscIndex capability is isolated from canonical GSC configuration', () => {
  const withoutMonitoredUrls = { ...baseConfig } as Partial<SeoConfig>;
  delete withoutMonitoredUrls.monitoredUrls;

  assert.deepEqual(verifyConfig(withoutMonitoredUrls, ['gsc']), {
    ok: true,
    errors: [],
  });

  const gscIndexResult = verifyConfig(withoutMonitoredUrls, ['gscIndex']);
  assert.equal(gscIndexResult.ok, false);
  assert.equal(gscIndexResult.errors.includes('monitoredUrls is required'), true);
});

test('approved monitored paths are fixed, bounded, unique, and resolve from repo root', () => {
  assert.equal(APPROVED_MONITORED_PATHS.length, 16);
  assert.equal(new Set(APPROVED_MONITORED_PATHS).size, APPROVED_MONITORED_PATHS.length);
  assert.ok(APPROVED_MONITORED_PATHS.length <= MAX_INSPECTION_URLS);

  for (const monitoredPath of APPROVED_MONITORED_PATHS) {
    const relativeFile = monitoredPath.replace(/^\//, '').replace(/\/$/, '.html');
    const absoluteFile = path.join(repoRoot, relativeFile);
    assert.equal(fs.existsSync(absoluteFile), true, `${monitoredPath} must resolve to ${relativeFile}`);
  }
});

test('expected monitored URLs compose host plus approved paths without rewriting', () => {
  const expected = expectedMonitoredUrls('www.evochia.gr');

  assert.equal(expected[0], 'https://www.evochia.gr/en/private-chef/');
  assert.equal(expected.at(-1), 'https://www.evochia.gr/el/corporate-catering/');
  assert.equal(expected.length, APPROVED_MONITORED_PATHS.length);
});

test('gscIndex exact-set validation is order-independent', () => {
  const exact = expectedMonitoredUrls(baseConfig.productionHostname);
  const reversed = [...exact].reverse();

  assert.deepEqual(verifyConfig({ ...baseConfig, monitoredUrls: reversed }, ['gscIndex']), {
    ok: true,
    errors: [],
  });
});

test('gscIndex exact-set validation detects duplicate-plus-missing sets independently', () => {
  const exact = expectedMonitoredUrls(baseConfig.productionHostname);
  const duplicatePlusMissing = [...exact];
  duplicatePlusMissing[duplicatePlusMissing.length - 1] = exact[0];

  const result = verifyConfig({ ...baseConfig, monitoredUrls: duplicatePlusMissing }, ['gscIndex']);
  assert.equal(result.ok, false);
  assert.equal(result.errors.includes('monitoredUrls must contain unique URLs'), true);
  assert.equal(result.errors.includes('monitoredUrls must exactly match the approved monitored URL set'), true);
});

test('gscIndex rejects an empty monitored URL list and enforces the defensive cap', () => {
  const emptyResult = verifyConfig({ ...baseConfig, monitoredUrls: [] }, ['gscIndex']);
  assert.equal(emptyResult.ok, false);
  assert.equal(emptyResult.errors.includes('monitoredUrls must not be empty'), true);

  const overCap = Array.from(
    { length: MAX_INSPECTION_URLS + 1 },
    (_, index) => `https://www.evochia.gr/inspection-test-${index}/`,
  );
  const overCapResult = verifyConfig({ ...baseConfig, monitoredUrls: overCap }, ['gscIndex']);
  assert.equal(overCapResult.ok, false);
  assert.equal(
    overCapResult.errors.includes(`monitoredUrls must not exceed ${MAX_INSPECTION_URLS} URLs`),
    true,
  );
});

test('gscIndex reports when exact-set composition cannot use an invalid production hostname', () => {
  const exact = expectedMonitoredUrls(baseConfig.productionHostname);
  const result = verifyConfig({
    ...baseConfig,
    productionHostname: 'WWW.evochia.gr',
    monitoredUrls: exact,
  }, ['gscIndex']);

  assert.equal(result.ok, false);
  assert.equal(
    result.errors.includes('productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot'),
    true,
  );
  assert.equal(
    result.errors.includes('monitoredUrls exact-set validation requires a valid productionHostname'),
    true,
  );
});

test('gscIndex capability rejects malformed or non-exact monitored URL sets without affecting gsc', () => {
  const exact = expectedMonitoredUrls(baseConfig.productionHostname);

  assert.deepEqual(verifyConfig({ ...baseConfig, monitoredUrls: exact }, ['gscIndex']), {
    ok: true,
    errors: [],
  });

  const malformed = [
    ...exact.slice(0, -1),
    'http://www.evochia.gr/el/corporate-catering/',
  ];
  const malformedResult = verifyConfig({ ...baseConfig, monitoredUrls: malformed }, ['gscIndex']);
  assert.equal(malformedResult.ok, false);

  const missingOneResult = verifyConfig({ ...baseConfig, monitoredUrls: exact.slice(0, -1) }, ['gscIndex']);
  assert.equal(missingOneResult.ok, false);

  assert.deepEqual(verifyConfig({ ...baseConfig, monitoredUrls: malformed }, ['gsc']), {
    ok: true,
    errors: [],
  });
});

test('getConfig rejects a null Script Property payload with a typed configuration error', () => {
  const originalPropertiesService = Object.getOwnPropertyDescriptor(globalThis, 'PropertiesService');

  Object.defineProperty(globalThis, 'PropertiesService', {
    configurable: true,
    value: {
      getScriptProperties: () => ({
        getProperty: () => 'null',
      }),
    },
  });

  try {
    assert.throws(
      () => getConfig(['gsc']),
      (error: unknown) => error instanceof ConfigurationError
        && /SEO configuration is not verified: configuration payload must be a JSON object/.test(error.message),
    );
  } finally {
    if (originalPropertiesService) {
      Object.defineProperty(globalThis, 'PropertiesService', originalPropertiesService);
    } else {
      delete (globalThis as Record<string, unknown>).PropertiesService;
    }
  }
});
