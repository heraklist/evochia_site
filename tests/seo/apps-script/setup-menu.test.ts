import assert from 'node:assert/strict';
import test from 'node:test';
import { setupWorkbookFromMenu } from '../../../seo/apps-script/src/Menu.ts';
import { REQUIRED_SHEET_NAMES } from '../../../seo/apps-script/src/Setup.ts';
import type { SeoConfig } from '../../../seo/apps-script/src/Config.ts';

const config: SeoConfig = {
  gscProperty: 'https://www.evochia.gr/',
  ga4AccountId: '388030118',
  ga4PropertyId: '528945896',
  ga4PropertyTimeZone: 'Europe/Athens',
  productionHostname: 'www.evochia.gr',
  gtmPublicContainerId: 'UNVERIFIED',
  gtmAccountId: 'UNVERIFIED',
  gtmContainerId: 'UNVERIFIED',
  sheetId: 'sheet-id',
  driveFolderId: 'UNVERIFIED',
  ownerEmail: 'heraklis@evochia.gr',
  verificationStatus: 'verified',
};

test('setupWorkbookFromMenu initializes the reserved operational metadata block', () => {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const name of ['PropertiesService', 'SpreadsheetApp']) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }

  const writes = new Map<string, unknown[][]>();
  const blankReserved = Array.from({ length: 9 }, () => ['', '', '', '']);
  const configSheet = {
    getRange(a1Notation: string) {
      return {
        getValues: () => a1Notation === 'E1:H9' ? blankReserved.map((row) => [...row]) : [],
        setValues: (values: unknown[][]) => { writes.set(a1Notation, values); },
      };
    },
  };
  const sheets = new Map<string, unknown>(REQUIRED_SHEET_NAMES.map((name) => [name, name === 'Config' ? configSheet : {}]));
  const workbook = {
    getId: () => config.sheetId,
    getSheetByName: (name: string) => sheets.get(name) ?? null,
    insertSheet: (name: string) => {
      const sheet = {};
      sheets.set(name, sheet);
      return sheet;
    },
  };
  const alerts: unknown[][] = [];
  const ui = {
    ButtonSet: { OK: 'OK' },
    alert: (...args: unknown[]) => alerts.push(args),
  };

  Object.defineProperty(globalThis, 'PropertiesService', {
    configurable: true,
    value: {
      getScriptProperties: () => ({ getProperty: () => JSON.stringify(config) }),
    },
  });
  Object.defineProperty(globalThis, 'SpreadsheetApp', {
    configurable: true,
    value: {
      ButtonSet: ui.ButtonSet,
      getUi: () => ui,
      getActiveSpreadsheet: () => workbook,
    },
  });

  try {
    setupWorkbookFromMenu();
    assert.equal(writes.has('E1:F4'), true);
    assert.equal(writes.has('E7:H9'), true);
    assert.deepEqual(writes.get('E7:H9')?.[2], ['MIN_PAGE_IMPRESSIONS', '', 'not calibrated', '']);
    assert.equal(alerts.some((args) => args.some((value) => String(value).includes('Required sheets are present'))), true);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete (globalThis as Record<string, unknown>)[name];
    }
  }
});
