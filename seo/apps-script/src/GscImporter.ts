import {
  fetchSearchAnalytics,
  fetchUrlInspection,
  type ArrayField,
  type GscAggregationType,
  type GscDimension,
  type GscRow,
  type HttpTransport,
  type ProviderInspectionResult,
  type ScalarField,
} from './GscClient.ts';
import { calendarDateParts } from './RuntimeCompat.ts';
import { upsertRows, type RowRecord, type WriteSummary } from './SheetWriter.ts';

export type GscReportId = 'daily' | 'pages' | 'queries' | 'pageQueries';
export type CanonicalMatch = 'MATCH' | 'MISMATCH' | 'NOT_COMPARABLE';

export interface GscReportSpec {
  id: GscReportId;
  dimensions: readonly GscDimension[];
  aggregationType: GscAggregationType;
  sheetName: 'GSC Daily' | 'GSC Pages' | 'GSC Queries' | 'GSC Page Queries';
  keyColumns: readonly string[];
}

export interface InspectedSnapshot {
  runId: string;
  checkedAt: string;
  url: string;
  outcome: 'INSPECTED';
  verdict: ScalarField;
  coverageState: ScalarField;
  robotsTxtState: ScalarField;
  indexingState: ScalarField;
  pageFetchState: ScalarField;
  crawledAs: ScalarField;
  googleCanonical: ScalarField;
  userCanonical: ScalarField;
  canonicalMatch: CanonicalMatch;
  lastCrawlTime: ScalarField;
  sitemap: ArrayField;
  referringUrls: ArrayField;
  inspectionResultLink: ScalarField;
}

export interface FailedInspectionSnapshot {
  runId: string;
  checkedAt: string;
  url: string;
  outcome: 'REQUEST_FAILED';
  canonicalMatch: 'NOT_COMPARABLE';
  errorClass: string;
  errorMessage: string;
}

export type InspectionSnapshot = InspectedSnapshot | FailedInspectionSnapshot;

export interface InspectionBatchConfig {
  runId: string;
  checkedAt: string;
  siteUrl: string;
  monitoredUrls: string[];
}

export interface InspectionBatchDependencies {
  transport?: HttpTransport;
  accessToken?: string;
  writeRows?: (
    sheetName: string,
    keyColumns: string[],
    rows: RowRecord[],
  ) => WriteSummary;
}

export interface InspectionBatchResult {
  snapshots: InspectionSnapshot[];
  inspectedCount: number;
  failedCount: number;
  write: WriteSummary;
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
  {
    id: 'pageQueries',
    dimensions: ['date', 'page', 'query'],
    aggregationType: 'auto',
    sheetName: 'GSC Page Queries',
    keyColumns: ['date', 'page', 'query'],
  },
] as const satisfies readonly GscReportSpec[];

export const GSC_TIME_ZONE = 'America/Los_Angeles';

export interface GscImportConfig {
  siteUrl: string;
  monitoredUrls: string[];
}

export interface GscReportImportResult {
  fetched: number;
  write: WriteSummary;
}

export interface GscImportResult {
  dataAsOf: string;
  collectedAt: string;
  reports: Record<GscReportId, GscReportImportResult>;
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

function normalizeCanonicalUrl(value: string): string | null {
  const fragmentIndex = value.indexOf('#');
  const withoutFragment = fragmentIndex === -1 ? value : value.slice(0, fragmentIndex);
  const match = /^(https?):\/\/([^/?#]+)(.*)$/i.exec(withoutFragment);
  if (!match) return null;

  const protocol = match[1];
  const authority = match[2];
  const remainder = match[3];
  if (authority.includes('@')) return null;

  const authorityMatch = /^([^:]+)(?::(\d+))?$/.exec(authority);
  if (!authorityMatch) return null;

  const hostname = authorityMatch[1].toLowerCase();
  let port = authorityMatch[2] ?? '';
  const protocolForPort = protocol.toLowerCase();
  if (
    (protocolForPort === 'https' && port === '443')
    || (protocolForPort === 'http' && port === '80')
  ) {
    port = '';
  }

  return `${protocolForPort}://${hostname}${port ? `:${port}` : ''}${remainder}`;
}

export function canonicalMatch(
  userCanonical: ScalarField,
  googleCanonical: ScalarField,
): CanonicalMatch {
  if (userCanonical.state !== 'VALUE' || googleCanonical.state !== 'VALUE') {
    return 'NOT_COMPARABLE';
  }

  const normalizedUser = normalizeCanonicalUrl(userCanonical.value);
  const normalizedGoogle = normalizeCanonicalUrl(googleCanonical.value);
  if (normalizedUser === null || normalizedGoogle === null) {
    return 'NOT_COMPARABLE';
  }

  return normalizedUser === normalizedGoogle ? 'MATCH' : 'MISMATCH';
}

function flattenScalar(field: ScalarField): string {
  return field.state === 'VALUE' ? field.value : 'NOT_RETURNED';
}

function flattenArray(field: ArrayField): string {
  if (field.state === 'VALUE') return JSON.stringify(field.value);
  if (field.state === 'EMPTY') return '[]';
  return 'NOT_RETURNED';
}

export function flattenInspectionSnapshot(snapshot: InspectionSnapshot): RowRecord {
  if (snapshot.outcome === 'REQUEST_FAILED') {
    return {
      'Checked At': snapshot.checkedAt,
      'Run Id': snapshot.runId,
      URL: snapshot.url,
      Outcome: snapshot.outcome,
      Verdict: '',
      'Coverage State': '',
      'Robots.txt State': '',
      'Indexing State': '',
      'Page Fetch State': '',
      'Crawled As': '',
      'Google Canonical': '',
      'User Canonical': '',
      'Canonical Match': snapshot.canonicalMatch,
      'Last Crawl Time': '',
      Sitemap: '',
      'Referring URLs': '',
      'Inspection Result Link': '',
      'Error Class': snapshot.errorClass,
      'Error Message': snapshot.errorMessage,
    };
  }

  return {
    'Checked At': snapshot.checkedAt,
    'Run Id': snapshot.runId,
    URL: snapshot.url,
    Outcome: snapshot.outcome,
    Verdict: flattenScalar(snapshot.verdict),
    'Coverage State': flattenScalar(snapshot.coverageState),
    'Robots.txt State': flattenScalar(snapshot.robotsTxtState),
    'Indexing State': flattenScalar(snapshot.indexingState),
    'Page Fetch State': flattenScalar(snapshot.pageFetchState),
    'Crawled As': flattenScalar(snapshot.crawledAs),
    'Google Canonical': flattenScalar(snapshot.googleCanonical),
    'User Canonical': flattenScalar(snapshot.userCanonical),
    'Canonical Match': snapshot.canonicalMatch,
    'Last Crawl Time': flattenScalar(snapshot.lastCrawlTime),
    Sitemap: flattenArray(snapshot.sitemap),
    'Referring URLs': flattenArray(snapshot.referringUrls),
    'Inspection Result Link': flattenScalar(snapshot.inspectionResultLink),
    'Error Class': '',
    'Error Message': '',
  };
}

function toInspectedSnapshot(
  runId: string,
  checkedAt: string,
  result: ProviderInspectionResult,
): InspectedSnapshot {
  return {
    runId,
    checkedAt,
    url: result.url,
    outcome: 'INSPECTED',
    verdict: result.verdict,
    coverageState: result.coverageState,
    robotsTxtState: result.robotsTxtState,
    indexingState: result.indexingState,
    pageFetchState: result.pageFetchState,
    crawledAs: result.crawledAs,
    googleCanonical: result.googleCanonical,
    userCanonical: result.userCanonical,
    canonicalMatch: canonicalMatch(result.userCanonical, result.googleCanonical),
    lastCrawlTime: result.lastCrawlTime,
    sitemap: result.sitemap,
    referringUrls: result.referringUrls,
    inspectionResultLink: result.inspectionResultLink,
  };
}

function toFailedSnapshot(
  runId: string,
  checkedAt: string,
  url: string,
  error: unknown,
): FailedInspectionSnapshot {
  if (error instanceof Error) {
    return {
      runId,
      checkedAt,
      url,
      outcome: 'REQUEST_FAILED',
      canonicalMatch: 'NOT_COMPARABLE',
      errorClass: error.name || 'Error',
      errorMessage: error.message,
    };
  }

  return {
    runId,
    checkedAt,
    url,
    outcome: 'REQUEST_FAILED',
    canonicalMatch: 'NOT_COMPARABLE',
    errorClass: 'UnknownError',
    errorMessage: String(error),
  };
}

export function collectAndPersistInspectionSnapshots(
  config: InspectionBatchConfig,
  dependencies: InspectionBatchDependencies = {},
): InspectionBatchResult {
  const snapshots: InspectionSnapshot[] = [];

  for (const url of config.monitoredUrls) {
    try {
      const result = fetchUrlInspection({
        siteUrl: config.siteUrl,
        inspectionUrl: url,
        accessToken: dependencies.accessToken,
        transport: dependencies.transport,
        inspectedAt: config.checkedAt,
      });
      snapshots.push(toInspectedSnapshot(config.runId, config.checkedAt, result));
    } catch (error) {
      snapshots.push(toFailedSnapshot(config.runId, config.checkedAt, url, error));
    }
  }

  const rows = snapshots.map(flattenInspectionSnapshot);
  const writer = dependencies.writeRows ?? upsertRows;
  const write = writer('GSC Indexing', ['Run Id', 'URL'], rows);
  const failedCount = snapshots.filter((snapshot) => snapshot.outcome === 'REQUEST_FAILED').length;

  return {
    snapshots,
    inspectedCount: snapshots.length - failedCount,
    failedCount,
    write,
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

function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function validateRange(startDate: string, endDate: string): void {
  if (!isIsoCalendarDate(startDate) || !isIsoCalendarDate(endDate)) {
    throw new Error('GSC range dates must use valid YYYY-MM-DD calendar dates');
  }
  if (startDate > endDate) {
    throw new Error('GSC range startDate must be on or before endDate');
  }
}

export function deduplicateGscRows(
  rows: GscRow[],
  keyColumns: readonly string[],
): GscRow[] {
  const byKey = new Map<string, GscRow>();
  for (const row of rows) {
    const key = keyColumns
      .map((column) => String(row[column as keyof GscRow] ?? ''))
      .join('\u001f');
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

export function importSearchAnalyticsRange(
  config: GscImportConfig,
  startDate: string,
  endDate: string,
  dependencies: GscImportDependencies = {},
): GscImportResult {
  validateRange(startDate, endDate);
  const collectedAt = dependencies.collectedAt ?? new Date().toISOString();

  const fetchedReports = GSC_REPORT_SPECS.map((spec) => ({
    spec,
    rows: fetchSearchAnalytics({
      siteUrl: config.siteUrl,
      startDate,
      endDate,
      dimensions: spec.dimensions,
      aggregationType: spec.aggregationType,
      transport: dependencies.transport,
      accessToken: dependencies.accessToken,
    }),
  }));

  const writer = dependencies.writeRows ?? upsertRows;
  const reports = {} as Record<GscReportId, GscReportImportResult>;

  for (const { spec, rows: fetched } of fetchedReports) {
    const rows = deduplicateGscRows(fetched, spec.keyColumns).map((row) => ({
      ...row,
      dataAsOf: endDate,
      collectedAt,
    }));

    reports[spec.id] = {
      fetched: fetched.length,
      write: writer(spec.sheetName, [...spec.keyColumns], rows as RowRecord[]),
    };
  }

  return { dataAsOf: endDate, collectedAt, reports };
}

export function importSearchAnalyticsDay(
  config: GscImportConfig,
  now: Date,
  dependencies: GscImportDependencies = {},
): GscImportResult {
  const dataAsOf = getAvailableGscDate(now, 3);
  return importSearchAnalyticsRange(config, dataAsOf, dataAsOf, {
    ...dependencies,
    collectedAt: dependencies.collectedAt ?? now.toISOString(),
  });
}

export function inspectMonitoredUrls(
  config: GscImportConfig,
  requestedUrls: string[],
  dependencies: {
    transport?: HttpTransport;
    accessToken?: string;
    inspectedAt: string;
  },
): ProviderInspectionResult[] {
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
