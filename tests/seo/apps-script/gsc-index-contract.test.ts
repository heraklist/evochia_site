import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { verifyConfig, type SeoConfig } from '../../../seo/apps-script/src/Config.ts';
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
  assert.deepEqual(
    expectedMonitoredUrls('www.evochia.gr'),
    APPROVED_MONITORED_PATHS.map((monitoredPath) => `https://www.evochia.gr${monitoredPath}`),
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
