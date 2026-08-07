import {
  fetchSearchAnalytics,
  fetchUrlInspection,
  type GscAggregationType,
  type GscDimension,
  type GscRow,
  type HttpTransport,
  type InspectionRow,
} from './GscClient.ts';
import { upsertRows, type RowRecord, type WriteSummary } from './SheetWriter.ts';

export const GSC_KEY_COLUMNS = [
  'date',
  'query',
  'page',
  'country',
  'device',
  'searchAppearance',
] as const;

export type GscReportId = 'daily' | 'pages' | 'queries';

export interface GscReportSpec {
  id: GscReportId;
  dimensions: readonly GscDimension[];
  aggregationType: GscAggregationType;
  sheetName: 'GSC Daily' | 'GSC Pages' | 'GSC Queries';
  keyColumns: readonly string[];
}

export const GSC_REPORT_SPECS = [
  {
    id: 'daily',
    dimensions: ['date'],
    aggregationType: 'byProperty',
    sheetName: 'GSC Daily',
    keyColumns: ['date'],
  },
  {
    id: 'pages',
    dimensions: ['date', 'page'],
    aggregationType: 'auto',
    sheetName: 'GSC Pages',
    keyColumns: ['date', 'page'],
  },
  {
    id: 'queries',
    dimensions: ['date', 'query'],
    aggregationType: 'byProperty',
    sheetName: 'GSC Queries',
    keyColumns: ['date', 'query'],
  },
] as const satisfies readonly GscReportSpec[];

export const GSC_TIME_ZONE = 'America/Los_Angeles';

export interface GscImportConfig {
  siteUrl: string;
  monitoredUrls: string[];
}

export interface GscImportResult {
  dataAsOf: string;
  collectedAt: string;
  fetched: number;
  write: WriteSummary;
}

export interface GscImportDependencies {
  transport?: HttpTransport;
  accessToken?: string;
  collectedAt?: string;
  writeRows?: (
    sheetName: string,
    keyColumns: string[],
    rows: RowRecord[],
  ) => WriteSummary;
}

function calendarDateParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
  };
}

export function getAvailableGscDate(now: Date, delayDays = 3): string {
  if (!Number.isInteger(delayDays) || delayDays < 0) {
    throw new Error('delayDays must be a non-negative integer');
  }

  const { year, month, day } = calendarDateParts(now, GSC_TIME_ZONE);
  return new Date(Date.UTC(year, month - 1, day - delayDays))
    .toISOString()
    .slice(0, 10);
}

export function deduplicateGscRows(rows: GscRow[]): GscRow[] {
  const byKey = new Map<string, GscRow>();
  for (const row of rows) {
    const key = GSC_KEY_COLUMNS.map((column) => String(row[column] ?? '')).join('\u001f');
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

export function importSearchAnalyticsDay(
  config: GscImportConfig,
  now: Date,
  dependencies: GscImportDependencies = {},
): GscImportResult {
  const dataAsOf = getAvailableGscDate(now, 3);
  const collectedAt = dependencies.collectedAt ?? now.toISOString();
  const fetched = fetchSearchAnalytics({
    siteUrl: config.siteUrl,
    startDate: dataAsOf,
    endDate: dataAsOf,
    dimensions: [...GSC_KEY_COLUMNS],
    aggregationType: 'auto',
    transport: dependencies.transport,
    accessToken: dependencies.accessToken,
  });
  const rows = deduplicateGscRows(fetched).map((row) => ({
    ...row,
    dataAsOf,
    collectedAt,
  }));
  const writer = dependencies.writeRows ?? upsertRows;
  const write = writer('GSC Daily', [...GSC_KEY_COLUMNS], rows as RowRecord[]);

  return {
    dataAsOf,
    collectedAt,
    fetched: fetched.length,
    write,
  };
}

export function inspectMonitoredUrls(
  config: GscImportConfig,
  requestedUrls: string[],
  dependencies: {
    transport?: HttpTransport;
    accessToken?: string;
    inspectedAt?: string;
  } = {},
): InspectionRow[] {
  const allowed = new Set(config.monitoredUrls);
  for (const url of requestedUrls) {
    if (!allowed.has(url)) {
      throw new Error(`URL Inspection request is outside the monitored allowlist: ${url}`);
    }
  }

  return requestedUrls.map((url) => fetchUrlInspection({
    siteUrl: config.siteUrl,
    inspectionUrl: url,
    transport: dependencies.transport,
    accessToken: dependencies.accessToken,
    inspectedAt: dependencies.inspectedAt,
  }));
}
