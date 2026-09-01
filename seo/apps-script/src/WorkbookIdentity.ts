import { getConfig, type SeoConfig } from './Config.ts';

export interface WorkbookIdentity {
  getId(): string;
}

export interface WorkbookIdentityDependencies<TWorkbook extends WorkbookIdentity> {
  getConfig: () => Pick<SeoConfig, 'sheetId'>;
  getActiveWorkbook: () => TWorkbook | null;
}

export function getVerifiedActiveWorkbook(): GoogleAppsScript.Spreadsheet.Spreadsheet;
export function getVerifiedActiveWorkbook<TWorkbook extends WorkbookIdentity>(
  dependencies: WorkbookIdentityDependencies<TWorkbook>,
): TWorkbook;
export function getVerifiedActiveWorkbook<TWorkbook extends WorkbookIdentity>(
  dependencies?: WorkbookIdentityDependencies<TWorkbook>,
): TWorkbook | GoogleAppsScript.Spreadsheet.Spreadsheet {
  const getVerifiedConfig = dependencies?.getConfig ?? (() => getConfig(['workbook']));
  const getActiveWorkbook = dependencies?.getActiveWorkbook
    ?? (() => SpreadsheetApp.getActiveSpreadsheet());
  const config = getVerifiedConfig();
  const workbook = getActiveWorkbook();
  if (!workbook) {
    throw new Error('The SEO Apps Script project must be bound to a Google Sheet.');
  }

  if (workbook.getId() !== config.sheetId) {
    throw new Error('The active workbook does not match the configured sheet ID.');
  }

  return workbook;
}
