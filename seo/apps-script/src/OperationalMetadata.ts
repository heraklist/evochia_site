import { getVerifiedActiveWorkbook } from './WorkbookIdentity.ts';

export const FRESHNESS_RANGE = 'E1:F4';
export const THRESHOLD_RANGE = 'E7:H9';
const RESERVED_RANGE = 'E1:H9';

export type DailyOverallStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

interface MetadataRange {
  getValues(): unknown[][];
  setValues(values: unknown[][]): void;
}

interface MetadataSheet {
  getRange(a1Notation: string): MetadataRange;
}

export interface OperationalMetadataWorkbook {
  getSheetByName(name: string): MetadataSheet | null;
}

export interface OperationalMetadataDependencies {
  getVerifiedActiveWorkbook: () => OperationalMetadataWorkbook;
}

export interface OperationalFreshnessInput {
  gsc: { success: boolean; dataAsOf?: string };
  ga4: { success: boolean; dataAsOf?: string };
  lastRun: string;
  status: DailyOverallStatus;
}

const FRESHNESS_LABELS = [
  'GSC dataAsOf',
  'GA4 dataAsOf',
  'last run',
  'status',
] as const;

const INITIAL_FRESHNESS = FRESHNESS_LABELS.map((label) => [label, '']);
const INITIAL_THRESHOLDS: unknown[][] = [
  ['key', 'value', 'rationale', 'last reviewed'],
  ['VISIBLE_POSITION_MAX', 5, 'high-enough visibility boundary for CTR diagnosis', '2026-08-27'],
  ['MIN_PAGE_IMPRESSIONS', '', 'not calibrated', ''],
];

function isBlank(value: unknown): boolean {
  return value == null || value === '';
}

function configSheet(workbook: OperationalMetadataWorkbook): MetadataSheet {
  const sheet = workbook.getSheetByName('Config');
  if (!sheet) throw new Error('Missing required sheet: Config');
  return sheet;
}

function isCompletelyBlank(values: unknown[][]): boolean {
  return values.every((row) => row.every(isBlank));
}

function assertManagedLayout(values: unknown[][]): void {
  if (values.length < 9 || values.some((row) => row.length < 4)) {
    throw new Error('Config operational metadata reservation has an unexpected shape');
  }

  for (let index = 0; index < FRESHNESS_LABELS.length; index += 1) {
    if (values[index][0] !== FRESHNESS_LABELS[index]) {
      throw new Error('Config operational metadata contains unexpected content');
    }
    if (!isBlank(values[index][2]) || !isBlank(values[index][3])) {
      throw new Error('Config operational metadata contains unexpected content');
    }
  }

  for (const rowIndex of [4, 5]) {
    if (!values[rowIndex].every(isBlank)) {
      throw new Error('Config operational metadata contains unexpected content');
    }
  }

  const header = ['key', 'value', 'rationale', 'last reviewed'];
  if (!header.every((value, index) => values[6][index] === value)) {
    throw new Error('Config operational metadata contains unexpected content');
  }
  if (values[7][0] !== 'VISIBLE_POSITION_MAX' || values[8][0] !== 'MIN_PAGE_IMPRESSIONS') {
    throw new Error('Config operational metadata contains unexpected content');
  }
}

export function ensureOperationalMetadata(
  dependencies: OperationalMetadataDependencies = {
    getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook(),
  },
): void {
  const sheet = configSheet(dependencies.getVerifiedActiveWorkbook());
  const reserved = sheet.getRange(RESERVED_RANGE).getValues();

  if (isCompletelyBlank(reserved)) {
    sheet.getRange(FRESHNESS_RANGE).setValues(INITIAL_FRESHNESS.map((row) => [...row]));
    sheet.getRange(THRESHOLD_RANGE).setValues(INITIAL_THRESHOLDS.map((row) => [...row]));
    return;
  }

  assertManagedLayout(reserved);
}

export function updateOperationalFreshness(
  input: OperationalFreshnessInput,
  dependencies: OperationalMetadataDependencies = {
    getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook(),
  },
): void {
  const workbook = dependencies.getVerifiedActiveWorkbook();
  ensureOperationalMetadata({ getVerifiedActiveWorkbook: () => workbook });
  const sheet = configSheet(workbook);
  const existing = sheet.getRange(FRESHNESS_RANGE).getValues();

  if (input.gsc.success && !input.gsc.dataAsOf) {
    throw new Error('Successful GSC freshness update requires dataAsOf');
  }
  if (input.ga4.success && !input.ga4.dataAsOf) {
    throw new Error('Successful GA4 freshness update requires dataAsOf');
  }

  const gscDataAsOf = input.gsc.success ? input.gsc.dataAsOf : existing[0]?.[1] ?? '';
  const ga4DataAsOf = input.ga4.success ? input.ga4.dataAsOf : existing[1]?.[1] ?? '';

  sheet.getRange(FRESHNESS_RANGE).setValues([
    ['GSC dataAsOf', gscDataAsOf ?? ''],
    ['GA4 dataAsOf', ga4DataAsOf ?? ''],
    ['last run', input.lastRun],
    ['status', input.status],
  ]);
}
