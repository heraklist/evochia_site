import {
  getConfig,
  type CapabilityKey,
  type SeoConfig,
} from './Config.ts';
import {
  importGa4Reports,
  type Ga4PersistenceResult,
  type Ga4ReportRange,
} from './Ga4Importer.ts';
import {
  fetchSearchAnalytics,
  type GscRow,
  type SearchAnalyticsRequest,
} from './GscClient.ts';
import {
  importSearchAnalyticsDay,
  importSearchAnalyticsRange,
  type GscImportConfig,
  type GscImportDependencies,
  type GscImportResult,
} from './GscImporter.ts';
import {
  updateOperationalFreshness,
  type DailyOverallStatus,
  type OperationalFreshnessInput,
} from './OperationalMetadata.ts';
import {
  upsertRows,
  type RowRecord,
  type WriteSummary,
} from './SheetWriter.ts';
import { getVerifiedActiveWorkbook } from './WorkbookIdentity.ts';

export interface RunLogRow extends RowRecord {
  runId: string;
  startedAt: string;
  finishedAt: string;
  source: 'GSC' | 'GA4';
  sourceStatus: 'SUCCESS' | 'FAILED';
  overallStatus: DailyOverallStatus;
  dataAsOf: string;
  fetchedRows: number;
  insertedRows: number;
  updatedRows: number;
  unchangedRows: number;
  errorClass: string;
  errorMessage: string;
}

interface SourceOutcome {
  source: 'GSC' | 'GA4';
  success: boolean;
  dataAsOf: string;
  fetchedRows: number;
  insertedRows: number;
  updatedRows: number;
  unchangedRows: number;
  errorClass: string;
  errorMessage: string;
}

export interface JobDependencies {
  now?: () => Date;
  createRunId?: () => string;
  getVerifiedActiveWorkbook?: () => unknown;
  getOAuthToken?: () => string;
  getConfig?: (capabilities: readonly CapabilityKey[]) => SeoConfig;
  importGscDay?: (
    config: GscImportConfig,
    now: Date,
    dependencies?: GscImportDependencies,
  ) => GscImportResult;
  importGscRange?: (
    config: GscImportConfig,
    startDate: string,
    endDate: string,
    dependencies?: GscImportDependencies,
  ) => GscImportResult;
  importGa4?: (
    range: Ga4ReportRange,
    dependencies?: Parameters<typeof importGa4Reports>[1],
  ) => Ga4PersistenceResult;
  searchAnalytics?: (request: SearchAnalyticsRequest) => GscRow[];
  writeRows?: (
    sheetName: string,
    keyColumns: string[],
    rows: RowRecord[],
  ) => WriteSummary;
  updateFreshness?: (input: OperationalFreshnessInput) => void;
}

export interface DailyJobResult {
  runId: string;
  status: DailyOverallStatus;
  sources: {
    gsc: SourceOutcome;
    ga4: SourceOutcome;
  };
}

interface DateRangeChunk {
  startDate: string;
  endDate: string;
}

function defaultNow(): Date {
  return new Date();
}

function defaultRunId(): string {
  return Utilities.getUuid();
}

function defaultOAuthToken(): string {
  return ScriptApp.getOAuthToken();
}

function errorDetail(error: unknown): { errorClass: string; errorMessage: string } {
  if (error instanceof Error) {
    return { errorClass: error.name || 'Error', errorMessage: error.message };
  }
  return { errorClass: typeof error, errorMessage: String(error) };
}

function emptyFailure(source: SourceOutcome['source'], error: unknown): SourceOutcome {
  return {
    source,
    success: false,
    dataAsOf: '',
    fetchedRows: 0,
    insertedRows: 0,
    updatedRows: 0,
    unchangedRows: 0,
    ...errorDetail(error),
  };
}

function sumWrites(writes: WriteSummary[]): Pick<SourceOutcome, 'insertedRows' | 'updatedRows' | 'unchangedRows'> {
  return writes.reduce((total, write) => ({
    insertedRows: total.insertedRows + write.inserted,
    updatedRows: total.updatedRows + write.updated,
    unchangedRows: total.unchangedRows + write.unchanged,
  }), { insertedRows: 0, updatedRows: 0, unchangedRows: 0 });
}

function gscOutcome(result: GscImportResult): SourceOutcome {
  const reports = Object.values(result.reports);
  return {
    source: 'GSC',
    success: true,
    dataAsOf: result.dataAsOf,
    fetchedRows: reports.reduce((sum, report) => sum + report.fetched, 0),
    ...sumWrites(reports.map((report) => report.write)),
    errorClass: '',
    errorMessage: '',
  };
}

function ga4Outcome(result: Ga4PersistenceResult): SourceOutcome {
  const fetchedRows = result.bundle.daily.length
    + result.bundle.acquisition.length
    + result.bundle.landingPages.length
    + result.bundle.events.length
    + result.bundle.pages.length
    + result.bundle.urlQuality.length;
  return {
    source: 'GA4',
    success: true,
    dataAsOf: result.bundle.dataAsOf,
    fetchedRows,
    ...sumWrites(Object.values(result.writes)),
    errorClass: '',
    errorMessage: '',
  };
}

function overallStatus(gsc: SourceOutcome, ga4: SourceOutcome): DailyOverallStatus {
  if (gsc.success && ga4.success) return 'SUCCESS';
  if (gsc.success || ga4.success) return 'PARTIAL';
  return 'FAILED';
}

function toRunLogRow(
  outcome: SourceOutcome,
  runId: string,
  startedAt: string,
  finishedAt: string,
  status: DailyOverallStatus,
): RunLogRow {
  return {
    runId,
    startedAt,
    finishedAt,
    source: outcome.source,
    sourceStatus: outcome.success ? 'SUCCESS' : 'FAILED',
    overallStatus: status,
    dataAsOf: outcome.dataAsOf,
    fetchedRows: outcome.fetchedRows,
    insertedRows: outcome.insertedRows,
    updatedRows: outcome.updatedRows,
    unchangedRows: outcome.unchangedRows,
    errorClass: outcome.errorClass,
    errorMessage: outcome.errorMessage,
  };
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function calendarMonthChunks(startDate: string, endDate: string): DateRangeChunk[] {
  const chunks: DateRangeChunk[] = [];
  let cursor = parseIsoDate(startDate);
  const finalDate = parseIsoDate(endDate);

  while (cursor <= finalDate) {
    const monthEnd = new Date(Date.UTC(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + 1,
      0,
    ));
    const chunkEnd = monthEnd < finalDate ? monthEnd : finalDate;
    chunks.push({
      startDate: formatIsoDate(cursor),
      endDate: formatIsoDate(chunkEnd),
    });
    cursor = new Date(Date.UTC(
      chunkEnd.getUTCFullYear(),
      chunkEnd.getUTCMonth(),
      chunkEnd.getUTCDate() + 1,
    ));
  }

  return chunks;
}

export function runDailyImport(dependencies: JobDependencies = {}): DailyJobResult {
  const verifyWorkbook = dependencies.getVerifiedActiveWorkbook ?? (() => getVerifiedActiveWorkbook());
  verifyWorkbook();

  const now = dependencies.now ?? defaultNow;
  const started = now();
  const startedAt = started.toISOString();
  const runId = (dependencies.createRunId ?? defaultRunId)();
  const accessToken = (dependencies.getOAuthToken ?? defaultOAuthToken)();
  const configReader = dependencies.getConfig ?? getConfig;
  const importGsc = dependencies.importGscDay ?? importSearchAnalyticsDay;
  const importGa4 = dependencies.importGa4 ?? importGa4Reports;
  const writer = dependencies.writeRows ?? upsertRows;
  const updateFreshness = dependencies.updateFreshness ?? updateOperationalFreshness;

  let gsc: SourceOutcome;
  try {
    const config = configReader(['gsc']);
    gsc = gscOutcome(importGsc(
      { siteUrl: config.gscProperty, monitoredUrls: [] },
      started,
      { accessToken, collectedAt: startedAt },
    ));
  } catch (error) {
    gsc = emptyFailure('GSC', error);
  }

  let ga4: SourceOutcome;
  try {
    const config = configReader(['ga4']);
    ga4 = ga4Outcome(importGa4({
      propertyResource: `properties/${config.ga4PropertyId}`,
      verificationStatus: config.verificationStatus,
      ga4PropertyTimeZone: config.ga4PropertyTimeZone,
      productionHostname: config.productionHostname,
      now: started,
    }, { accessToken, collectedAt: startedAt }));
  } catch (error) {
    ga4 = emptyFailure('GA4', error);
  }

  const status = overallStatus(gsc, ga4);
  const finishedAt = now().toISOString();
  const rows: RowRecord[] = [
    toRunLogRow(gsc, runId, startedAt, finishedAt, status),
    toRunLogRow(ga4, runId, startedAt, finishedAt, status),
  ];
  writer('Run Log', ['runId', 'source'], rows);
  updateFreshness({
    gsc: { success: gsc.success, dataAsOf: gsc.success ? gsc.dataAsOf : undefined },
    ga4: { success: ga4.success, dataAsOf: ga4.success ? ga4.dataAsOf : undefined },
    lastRun: finishedAt,
    status,
  });

  return { runId, status, sources: { gsc, ga4 } };
}

export function runRangeImport(
  startDate: string,
  endDate: string,
  dependencies: JobDependencies = {},
): GscImportResult {
  const accessToken = (dependencies.getOAuthToken ?? defaultOAuthToken)();
  const config = (dependencies.getConfig ?? getConfig)(['gsc']);
  const importer = dependencies.importGscRange ?? importSearchAnalyticsRange;
  const collectedAt = (dependencies.now ?? defaultNow)().toISOString();
  let result: GscImportResult | undefined;

  for (const chunk of calendarMonthChunks(startDate, endDate)) {
    result = importer(
      { siteUrl: config.gscProperty, monitoredUrls: [] },
      chunk.startDate,
      chunk.endDate,
      { accessToken, collectedAt },
    );
  }

  if (!result) {
    throw new Error('Range import requires at least one calendar date');
  }

  return result;
}

export function measurePageQueryRows(
  startDate: string,
  endDate: string,
  dependencies: JobDependencies = {},
): number {
  const accessToken = (dependencies.getOAuthToken ?? defaultOAuthToken)();
  const config = (dependencies.getConfig ?? getConfig)(['gsc']);
  const searchAnalytics = dependencies.searchAnalytics ?? fetchSearchAnalytics;
  return searchAnalytics({
    siteUrl: config.gscProperty,
    startDate,
    endDate,
    dimensions: ['date', 'page', 'query'],
    aggregationType: 'auto',
    accessToken,
  }).length;
}
