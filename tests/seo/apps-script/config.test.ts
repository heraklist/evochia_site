import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { verifyConfig, type SeoConfig } from '../../../seo/apps-script/src/Config.ts';
import { verifyConfiguration } from '../../../seo/apps-script/src/Menu.ts';
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

function withAppsScriptGlobals<T>(
  config: SeoConfig,
  workbook: { getId(): string } | null,
  run: (alerts: unknown[][]) => T,
): T {
  const originalPropertiesService = Object.getOwnPropertyDescriptor(globalThis, 'PropertiesService');
  const originalSpreadsheetApp = Object.getOwnPropertyDescriptor(globalThis, 'SpreadsheetApp');
  const alerts: unknown[][] = [];
  const ui = {
    ButtonSet: { OK: 'OK' },
    alert: (...args: unknown[]) => {
      alerts.push(args);
    },
  };

  Object.defineProperty(globalThis, 'PropertiesService', {
    configurable: true,
    value: {
      getScriptProperties: () => ({
        getProperty: () => JSON.stringify(config),
      }),
    },
  });
  Object.defineProperty(globalThis, 'SpreadsheetApp', {
    configurable: true,
    value: {
      ButtonSet: { OK: 'OK' },
      getUi: () => ui,
      getActiveSpreadsheet: () => workbook,
    },
  });

  try {
    return run(alerts);
  } finally {
    if (originalPropertiesService) {
      Object.defineProperty(globalThis, 'PropertiesService', originalPropertiesService);
    } else {
      delete (globalThis as Record<string, unknown>).PropertiesService;
    }
    if (originalSpreadsheetApp) {
      Object.defineProperty(globalThis, 'SpreadsheetApp', originalSpreadsheetApp);
    } else {
      delete (globalThis as Record<string, unknown>).SpreadsheetApp;
    }
  }
}

test('rejects pending verification status for every capability', () => {
  for (const capabilities of [['workbook'], ['gsc'], ['ga4']] as const) {
    const result = verifyConfig({ ...verifiedConfig, verificationStatus: 'pending' }, capabilities);
    assert.equal(result.ok, false);
    assert.equal(result.errors.includes('verificationStatus must be verified'), true);
  }
});

test('workbook capability ignores unresolved future GTM and Drive resources', () => {
  const result = verifyConfig({
    ...verifiedConfig,
    gtmAccountId: 'UNVERIFIED',
    gtmContainerId: 'UNVERIFIED',
    gtmPublicContainerId: 'UNVERIFIED',
    driveFolderId: 'UNVERIFIED',
  }, ['workbook']);

  assert.deepEqual(result, { ok: true, errors: [] });
});

test('GSC capability requires only the verified Search Console property resource', () => {
  const missing = verifyConfig({
    ...verifiedConfig,
    gscProperty: 'UNVERIFIED',
    gtmAccountId: 'UNVERIFIED',
    driveFolderId: 'UNVERIFIED',
  }, ['gsc']);
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.includes('gscProperty is unverified'), true);
  assert.equal(missing.errors.some((error) => error.includes('gtmAccountId')), false);
  assert.equal(missing.errors.some((error) => error.includes('driveFolderId')), false);
});

test('GA4 capability requires property, timezone, and production hostname only', () => {
  const missing = verifyConfig({
    ...verifiedConfig,
    ga4PropertyId: 'UNVERIFIED',
    ga4PropertyTimeZone: 'UNVERIFIED',
    productionHostname: 'UNVERIFIED',
    gtmAccountId: 'UNVERIFIED',
    driveFolderId: 'UNVERIFIED',
  }, ['ga4']);
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.includes('ga4PropertyId is unverified'), true);
  assert.equal(missing.errors.includes('ga4PropertyTimeZone is unverified'), true);
  assert.equal(missing.errors.includes('productionHostname is unverified'), true);
  assert.equal(missing.errors.some((error) => error.includes('gtmAccountId')), false);
  assert.equal(missing.errors.some((error) => error.includes('driveFolderId')), false);

  const invalidTimezone = verifyConfig({
    ...verifiedConfig,
    ga4PropertyTimeZone: 'Athens/GMT+3',
  }, ['ga4']);
  assert.equal(invalidTimezone.ok, false);
  assert.equal(invalidTimezone.errors.includes('ga4PropertyTimeZone must be a valid IANA timezone'), true);

  for (const hostname of ['https://www.evochia.gr', 'www.evochia.gr/path', 'www.evochia.gr:443', 'www.evochia.gr.']) {
    const invalidHostname = verifyConfig({
      ...verifiedConfig,
      productionHostname: hostname,
    }, ['ga4']);
    assert.equal(invalidHostname.ok, false, hostname);
    assert.equal(invalidHostname.errors.includes('productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot'), true);
  }
});

test('combined V1 verification accepts unresolved resources outside workbook, GSC, and GA4', () => {
  assert.deepEqual(verifyConfig({
    ...verifiedConfig,
    gtmPublicContainerId: 'UNVERIFIED',
    gtmAccountId: 'UNVERIFIED',
    gtmContainerId: 'UNVERIFIED',
    driveFolderId: 'UNVERIFIED',
  }, ['workbook', 'gsc', 'ga4']), { ok: true, errors: [] });
});

test('default active workbook verification requests workbook capability only', () => {
  const workbook = { getId: () => verifiedConfig.sheetId };
  const config = {
    ...verifiedConfig,
    gtmAccountId: 'UNVERIFIED',
    gtmContainerId: 'UNVERIFIED',
    driveFolderId: 'UNVERIFIED',
  } as SeoConfig;

  withAppsScriptGlobals(config, workbook, () => {
    assert.equal(getVerifiedActiveWorkbook(), workbook);
  });
});

test('menu configuration verification checks the complete V1 capability set without GTM or Drive blockers', () => {
  const config = {
    ...verifiedConfig,
    gtmPublicContainerId: 'UNVERIFIED',
    gtmAccountId: 'UNVERIFIED',
    gtmContainerId: 'UNVERIFIED',
    driveFolderId: 'UNVERIFIED',
  } as SeoConfig;

  withAppsScriptGlobals(config, { getId: () => config.sheetId }, (alerts) => {
    verifyConfiguration();
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0][1], 'Configuration contract is verified.');
  });
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

test('manifest contains exactly the approved V1 least-privilege scopes', () => {
  const manifest = JSON.parse(fs.readFileSync('seo/apps-script/appsscript.json', 'utf8'));
  assert.deepEqual(manifest.oauthScopes, [
    'https://www.googleapis.com/auth/spreadsheets.currentonly',
    'https://www.googleapis.com/auth/script.container.ui',
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/script.external_request',
  ]);
});
