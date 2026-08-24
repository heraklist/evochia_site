import assert from 'node:assert/strict';
import test from 'node:test';
import { getVerifiedActiveWorkbook } from '../../../seo/apps-script/src/WorkbookIdentity.ts';

test('returns the active workbook when its ID exactly matches the verified config', () => {
  const workbook = { getId: () => 'configured-sheet-id' };

  const result = getVerifiedActiveWorkbook({
    getConfig: () => ({ sheetId: 'configured-sheet-id' }),
    getActiveWorkbook: () => workbook,
  });

  assert.equal(result, workbook);
});

test('rejects a missing active workbook', () => {
  assert.throws(
    () => getVerifiedActiveWorkbook({
      getConfig: () => ({ sheetId: 'configured-sheet-id' }),
      getActiveWorkbook: () => null,
    }),
    /must be bound to a Google Sheet/,
  );
});

test('rejects an active workbook whose ID differs from the verified config', () => {
  assert.throws(
    () => getVerifiedActiveWorkbook({
      getConfig: () => ({ sheetId: 'configured-sheet-id' }),
      getActiveWorkbook: () => ({ getId: () => 'different-sheet-id' }),
    }),
    /does not match the configured sheet ID/,
  );
});
