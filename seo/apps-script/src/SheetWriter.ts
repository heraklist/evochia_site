import { formatCalendarDate } from './RuntimeCompat.ts';
import { getVerifiedActiveWorkbook } from './WorkbookIdentity.ts';

export type CellValue = string | number | boolean | Date | null;
export type RowRecord = Record<string, CellValue>;

export interface WriteSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  total: number;
}

export interface MergeResult {
  rows: RowRecord[];
  summary: WriteSummary;
}

export interface SheetWriterSheet {
  getLastRow(): number;
  getDataRange(): { getValues(): CellValue[][] };
  getRange(row: number, column: number, numRows: number, numColumns: number): {
    setValues(values: Exclude<CellValue, null>[][]): void;
  };
}

export interface SheetWriterWorkbook {
  getSheetByName(name: string): SheetWriterSheet | null;
  getSpreadsheetTimeZone(): string;
}

export interface SheetWriterDependencies {
  getVerifiedActiveWorkbook: () => SheetWriterWorkbook;
}

export function serializeLiteralCell(value: CellValue): Exclude<CellValue, null> {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value ?? '';
}

function cellPart(value: CellValue | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value == null ? '' : String(value);
}

function keyPart(value: CellValue | undefined, timeZone: string): string {
  if (value instanceof Date) {
    return formatCalendarDate(value, timeZone);
  }
  return value == null ? '' : String(value);
}

export function buildCompositeKey(
  row: RowRecord,
  keyColumns: string[],
  timeZone = 'UTC',
): string {
  return keyColumns.map((column) => keyPart(row[column], timeZone)).join('\u001f');
}

function rowsEqual(
  headers: string[],
  left: RowRecord,
  right: RowRecord,
  keyColumns: string[],
  timeZone: string,
): boolean {
  const keySet = new Set(keyColumns);
  return headers.every((header) => {
    if (keySet.has(header)) {
      return keyPart(left[header], timeZone) === keyPart(right[header], timeZone);
    }
    return cellPart(left[header]) === cellPart(right[header]);
  });
}

export function mergeRowRecords(
  headers: string[],
  existingRows: RowRecord[],
  keyColumns: string[],
  incomingRows: RowRecord[],
  timeZone = 'UTC',
): MergeResult {
  for (const key of keyColumns) {
    if (!headers.includes(key)) {
      throw new Error(`Key column is not present in headers: ${key}`);
    }
  }

  const rows = existingRows.map((row) => ({ ...row }));
  const indexes = new Map<string, number>();
  rows.forEach((row, index) => indexes.set(buildCompositeKey(row, keyColumns, timeZone), index));

  const deduplicatedIncoming = new Map<string, RowRecord>();
  for (const row of incomingRows) {
    deduplicatedIncoming.set(buildCompositeKey(row, keyColumns, timeZone), { ...row });
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const [key, incoming] of deduplicatedIncoming) {
    const existingIndex = indexes.get(key);
    if (existingIndex == null) {
      indexes.set(key, rows.length);
      rows.push(incoming);
      inserted += 1;
      continue;
    }

    if (rowsEqual(headers, rows[existingIndex], incoming, keyColumns, timeZone)) {
      unchanged += 1;
      continue;
    }

    rows[existingIndex] = incoming;
    updated += 1;
  }

  return {
    rows,
    summary: {
      inserted,
      updated,
      unchanged,
      total: rows.length,
    },
  };
}

export function upsertRows(
  sheetName: string,
  keyColumns: string[],
  incomingRows: RowRecord[],
  dependencies: SheetWriterDependencies = { getVerifiedActiveWorkbook },
): WriteSummary {
  if (incomingRows.length === 0) {
    return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
  }

  const workbook = dependencies.getVerifiedActiveWorkbook();
  const sheet = workbook.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Missing required sheet: ${sheetName}`);
  }

  const existingValues = sheet.getLastRow() > 0
    ? sheet.getDataRange().getValues()
    : [];
  const existingHeaders = existingValues.length > 0
    ? existingValues[0].map(String)
    : [];
  const incomingHeaders = Object.keys(incomingRows[0]);
  const headers = [...existingHeaders];
  for (const header of incomingHeaders) {
    if (!headers.includes(header)) {
      headers.push(header);
    }
  }

  const existingRows: RowRecord[] = existingValues.slice(1).map((values) => {
    const row: RowRecord = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] as CellValue | undefined) ?? null;
    });
    return row;
  });

  const timeZone = workbook.getSpreadsheetTimeZone();
  const merged = mergeRowRecords(headers, existingRows, keyColumns, incomingRows, timeZone);
  const output = [
    headers,
    ...merged.rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];

  sheet.getRange(1, 1, output.length, headers.length).setValues(
    output.map((row) => row.map(serializeLiteralCell)),
  );
  return merged.summary;
}
