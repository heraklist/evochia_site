import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FRESHNESS_RANGE,
  THRESHOLD_RANGE,
  ensureOperationalMetadata,
  updateOperationalFreshness,
  type OperationalMetadataWorkbook,
} from '../../../seo/apps-script/src/OperationalMetadata.ts';

type Matrix = unknown[][];

function workbook(initial: Matrix = Array.from({ length: 9 }, () => Array(4).fill(''))) {
  let cells = initial.map((row) => [...row]);
  const writes: Array<{ range: string; values: unknown[][] }> = [];

  const configSheet = {
    getRange: (a1: string) => ({
      getValues: () => {
        if (a1 === 'E1:H9') return cells.map((row) => [...row]);
        if (a1 === FRESHNESS_RANGE) return cells.slice(0, 4).map((row) => row.slice(0, 2));
        if (a1 === THRESHOLD_RANGE) return cells.slice(6, 9).map((row) => row.slice(0, 4));
        throw new Error(`unexpected range: ${a1}`);
      },
      setValues: (values: unknown[][]) => {
        writes.push({ range: a1, values: values.map((row) => [...row]) });
        if (a1 === FRESHNESS_RANGE) {
          values.forEach((row, r) => row.forEach((value, c) => { cells[r][c] = value; }));
        } else if (a1 === THRESHOLD_RANGE) {
          values.forEach((row, r) => row.forEach((value, c) => { cells[r + 6][c] = value; }));
        } else {
          throw new Error(`unexpected write range: ${a1}`);
        }
      },
    }),
  };

  const value: OperationalMetadataWorkbook = {
    getSheetByName: (name) => name === 'Config' ? configSheet : null,
  };

  return { value, writes, get cells() { return cells; } };
}

test('initializes only the reserved Config metadata ranges with locked threshold state', () => {
  const fake = workbook();
  ensureOperationalMetadata({ getVerifiedActiveWorkbook: () => fake.value });

  assert.deepEqual(fake.writes, [
    {
      range: 'E1:F4',
      values: [
        ['GSC dataAsOf', ''],
        ['GA4 dataAsOf', ''],
        ['last run', ''],
        ['status', ''],
      ],
    },
    {
      range: 'E7:H9',
      values: [
        ['key', 'value', 'rationale', 'last reviewed'],
        ['VISIBLE_POSITION_MAX', 5, 'high-enough visibility boundary for CTR diagnosis', '2026-08-27'],
        ['MIN_PAGE_IMPRESSIONS', '', 'not calibrated', ''],
      ],
    },
  ]);
});

test('refuses to initialize over unexpected owner content in the reserved cells', () => {
  const initial = Array.from({ length: 9 }, () => Array(4).fill(''));
  initial[4][0] = 'owner note'; // E5, inside inspected reservation E1:H9 but outside our fixed blocks.
  const fake = workbook(initial);

  assert.throws(
    () => ensureOperationalMetadata({ getVerifiedActiveWorkbook: () => fake.value }),
    /unexpected content/i,
  );
  assert.equal(fake.writes.length, 0);
});

test('accepts its own initialized layout and does not rewrite it', () => {
  const fake = workbook();
  ensureOperationalMetadata({ getVerifiedActiveWorkbook: () => fake.value });
  const firstWriteCount = fake.writes.length;
  ensureOperationalMetadata({ getVerifiedActiveWorkbook: () => fake.value });
  assert.equal(fake.writes.length, firstWriteCount);
});

test('freshness advances only successful sources while last run and overall status always update', () => {
  const fake = workbook();
  ensureOperationalMetadata({ getVerifiedActiveWorkbook: () => fake.value });
  updateOperationalFreshness({
    gsc: { success: true, dataAsOf: '2026-08-24' },
    ga4: { success: true, dataAsOf: '2026-08-25' },
    lastRun: '2026-08-27T12:00:00.000Z',
    status: 'SUCCESS',
  }, { getVerifiedActiveWorkbook: () => fake.value });

  updateOperationalFreshness({
    gsc: { success: false },
    ga4: { success: true, dataAsOf: '2026-08-26' },
    lastRun: '2026-08-28T12:00:00.000Z',
    status: 'PARTIAL',
  }, { getVerifiedActiveWorkbook: () => fake.value });

  assert.deepEqual(fake.cells.slice(0, 4).map((row) => row.slice(0, 2)), [
    ['GSC dataAsOf', '2026-08-24'],
    ['GA4 dataAsOf', '2026-08-26'],
    ['last run', '2026-08-28T12:00:00.000Z'],
    ['status', 'PARTIAL'],
  ]);
});
