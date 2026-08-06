import { getConfig } from './Config.ts';

export const REQUIRED_SHEET_NAMES = [
  'Config',
  'Run Log',
  'Pipeline Health',
  'GSC Daily',
  'GSC Pages',
  'GSC Queries',
  'GSC Indexing',
  'GA4 Daily',
  'GA4 Acquisition',
  'GA4 Landing Pages',
  'GA4 Events',
  'GTM Versions',
  'GTM Changes',
  'Findings Summary',
] as const;

export interface WorkbookLike {
  getSheetByName(name: string): unknown | null;
  insertSheet(name: string): unknown;
}

export interface WorkbookSetupResult {
  created: string[];
  existing: string[];
}

export function ensureWorkbookSheets(workbook: WorkbookLike): WorkbookSetupResult {
  const created: string[] = [];
  const existing: string[] = [];

  for (const name of REQUIRED_SHEET_NAMES) {
    if (workbook.getSheetByName(name)) {
      existing.push(name);
      continue;
    }

    workbook.insertSheet(name);
    created.push(name);
  }

  return { created, existing };
}

export function setupWorkbook(): void {
  getConfig();

  const workbook = SpreadsheetApp.getActiveSpreadsheet();
  if (!workbook) {
    throw new Error('The SEO Apps Script project must be bound to a Google Sheet.');
  }

  ensureWorkbookSheets(workbook);
}
