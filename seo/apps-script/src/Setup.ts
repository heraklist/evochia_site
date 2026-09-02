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

export const GSC_INDEXING_HEADERS = [
  'Checked At',
  'Run Id',
  'URL',
  'Outcome',
  'Verdict',
  'Coverage State',
  'Robots.txt State',
  'Indexing State',
  'Page Fetch State',
  'Crawled As',
  'Google Canonical',
  'User Canonical',
  'Canonical Match',
  'Last Crawl Time',
  'Sitemap',
  'Referring URLs',
  'Inspection Result Link',
  'Error Class',
  'Error Message',
] as const;

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

export interface GscIndexingSheet {
  getLastRow(): number;
  getDataRange(): { getValues(): unknown[][] };
  getRange(row: number, column: number, numRows: number, numColumns: number): {
    getValues(): unknown[][];
    setValues(values: unknown[][]): void;
  };
}

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
  ensureGscIndexingSchema?: (sheet: GscIndexingSheet) => void;
}

function isGscIndexingSheet(value: unknown): value is GscIndexingSheet {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<GscIndexingSheet>;
  return typeof candidate.getLastRow === 'function'
    && typeof candidate.getDataRange === 'function'
    && typeof candidate.getRange === 'function';
}

function readGscIndexingHeaders(sheet: GscIndexingSheet): string[] {
  if (sheet.getLastRow() === 0) return [];
  const values = sheet
    .getRange(1, 1, 1, GSC_INDEXING_HEADERS.length)
    .getValues();
  const firstRow = values[0] ?? [];
  return firstRow.map((value) => String(value));
}

function assertExactGscIndexingHeaders(headers: string[]): void {
  if (headers.length !== GSC_INDEXING_HEADERS.length) {
    throw new SchemaError(
      `GSC Indexing schema must contain exactly ${GSC_INDEXING_HEADERS.length} columns`,
    );
  }

  for (let index = 0; index < GSC_INDEXING_HEADERS.length; index += 1) {
    if (headers[index] !== GSC_INDEXING_HEADERS[index]) {
      throw new SchemaError(
        `GSC Indexing schema mismatch at column ${index + 1}: expected ${GSC_INDEXING_HEADERS[index]}`,
      );
    }
  }
}

export function validateGscIndexingSchema(sheet: GscIndexingSheet): void {
  const headers = readGscIndexingHeaders(sheet);
  if (headers.length === 0) {
    throw new SchemaError('GSC Indexing schema is not initialized');
  }
  assertExactGscIndexingHeaders(headers);
}

export function ensureGscIndexingSchema(sheet: GscIndexingSheet): void {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, GSC_INDEXING_HEADERS.length).setValues([
      [...GSC_INDEXING_HEADERS],
    ]);
    return;
  }

  validateGscIndexingSchema(sheet);
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
  const workbook = dependencies.getVerifiedActiveWorkbook();
  const setupSheets = dependencies.ensureWorkbookSheets ?? ensureWorkbookSheets;
  const setupGscIndexingSchema = dependencies.ensureGscIndexingSchema ?? ensureGscIndexingSchema;

  setupSheets(workbook);

  const indexingSheet = workbook.getSheetByName('GSC Indexing');
  if (!isGscIndexingSheet(indexingSheet)) {
    throw new SchemaError('GSC Indexing sheet does not expose the required schema range API');
  }
  setupGscIndexingSchema(indexingSheet);
}
