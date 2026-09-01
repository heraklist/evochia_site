import { getVerifiedActiveWorkbook } from './WorkbookIdentity.ts';

export const REQUIRED_SHEET_NAMES = [
  'Config',
  'Run Log',
  'Pipeline Health',
  'GSC Daily',
  'GSC Pages',
  'GSC Queries',
  'GSC Page Queries',
  'GSC Indexing',
  'GA4 Daily',
  'GA4 Acquisition',
  'GA4 Landing Pages',
  'GA4 Events',
  'GA4 Pages',
  'GA4 URL Quality',
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

export interface SetupDependencies {
  getVerifiedActiveWorkbook: () => WorkbookLike;
  ensureWorkbookSheets?: (workbook: WorkbookLike) => WorkbookSetupResult;
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

export function setupWorkbook(dependencies: SetupDependencies = { getVerifiedActiveWorkbook }): void {
  const setupSheets = dependencies.ensureWorkbookSheets ?? ensureWorkbookSheets;
  setupSheets(dependencies.getVerifiedActiveWorkbook());
}
