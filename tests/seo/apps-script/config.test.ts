import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { verifyConfig, type SeoConfig } from '../../../seo/apps-script/src/Config.ts';
import {
  ensureWorkbookSheets,
  REQUIRED_SHEET_NAMES,
  setupWorkbook,
  type WorkbookLike,
} from '../../../seo/apps-script/src/Setup.ts';
import { getVerifiedActiveWorkbook, type WorkbookIdentity } from '../../../seo/apps-script/src/WorkbookIdentity.ts';

const verifiedConfig = {
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
} as unknown as SeoConfig;

test('rejects unverified production identifiers', () => {
  const result = verifyConfig({ verificationStatus: 'pending' });
  assert.equal(result.ok, false);
  assert.equal(result.errors.includes('verificationStatus must be verified'), true);
});

test('rejects verified status while a resource remains unresolved', () => {
  const result = verifyConfig({
    ...verifiedConfig,
    gtmAccountId: 'UNVERIFIED',
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.includes('gtmAccountId is unverified'), true);
});

test('requires a verified GA4 property timezone and production hostname', () => {
  const missing = verifyConfig({
    ...verifiedConfig,
    ga4PropertyTimeZone: 'UNVERIFIED',
    productionHostname: 'UNVERIFIED',
  } as Partial<SeoConfig>);
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.includes('ga4PropertyTimeZone is unverified'), true);
  assert.equal(missing.errors.includes('productionHostname is unverified'), true);

  const invalidTimezone = verifyConfig({
    ...verifiedConfig,
    ga4PropertyTimeZone: 'Athens/GMT+3',
  } as Partial<SeoConfig>);
  assert.equal(invalidTimezone.ok, false);
  assert.equal(invalidTimezone.errors.includes('ga4PropertyTimeZone must be a valid IANA timezone'), true);

  for (const hostname of ['https://www.evochia.gr', 'www.evochia.gr/path', 'www.evochia.gr:443', 'www.evochia.gr.']) {
    const invalidHostname = verifyConfig({
      ...verifiedConfig,
      productionHostname: hostname,
    } as Partial<SeoConfig>);
    assert.equal(invalidHostname.ok, false, hostname);
    assert.equal(invalidHostname.errors.includes('productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot'), true);
  }
});

test('accepts a complete verified production configuration', () => {
  assert.deepEqual(verifyConfig(verifiedConfig), { ok: true, errors: [] });
});

test('creates every required sheet once and is idempotent', () => {
  assert.equal(REQUIRED_SHEET_NAMES.includes('GA4 Pages'), true);
  assert.equal(REQUIRED_SHEET_NAMES.includes('GA4 URL Quality'), true);

  const sheets = new Set<string>(['Config']);
  const workbook: WorkbookLike = {
    getSheetByName(name) {
      return sheets.has(name) ? { name } : null;
    },
    insertSheet(name) {
      sheets.add(name);
      return { name };
    },
  };

  const first = ensureWorkbookSheets(workbook);
  assert.deepEqual(first.existing, ['Config']);
  assert.equal(first.created.length, REQUIRED_SHEET_NAMES.length - 1);

  const second = ensureWorkbookSheets(workbook);
  assert.deepEqual(second.created, []);
  assert.deepEqual(second.existing, [...REQUIRED_SHEET_NAMES]);
});

test('setup rejects a missing workbook before any sheet lookup or insertion', () => {
  let sheetLookups = 0;
  let sheetInsertions = 0;

  assert.throws(
    () => setupWorkbook({
      getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook<WorkbookLike & WorkbookIdentity>({
        getConfig: () => ({ sheetId: 'configured-sheet-id' }),
        getActiveWorkbook: () => null,
      }),
      ensureWorkbookSheets: (workbook) => {
        sheetLookups += 1;
        workbook.getSheetByName('Config');
        sheetInsertions += 1;
        workbook.insertSheet('Config');
        return { created: [], existing: [] };
      },
    }),
    /bound to a Google Sheet/,
  );
  assert.equal(sheetLookups, 0);
  assert.equal(sheetInsertions, 0);
});

test('setup rejects a mismatched workbook before any sheet lookup or insertion', () => {
  let sheetLookups = 0;
  let sheetInsertions = 0;
  const workbook = {
    getId: () => 'different-sheet-id',
    getSheetByName: () => {
      sheetLookups += 1;
      return null;
    },
    insertSheet: () => {
      sheetInsertions += 1;
      return {};
    },
  };

  assert.throws(
    () => setupWorkbook({
      getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook({
        getConfig: () => ({ sheetId: 'configured-sheet-id' }),
        getActiveWorkbook: () => workbook,
      }),
    }),
    /does not match the configured sheet ID/,
  );
  assert.equal(sheetLookups, 0);
  assert.equal(sheetInsertions, 0);
});

test('manifest contains only the approved least-privilege scopes', () => {
  const manifest = JSON.parse(fs.readFileSync('seo/apps-script/appsscript.json', 'utf8'));
  assert.deepEqual(manifest.oauthScopes, [
    'https://www.googleapis.com/auth/spreadsheets.currentonly',
    'https://www.googleapis.com/auth/script.container.ui',
  ]);
});
