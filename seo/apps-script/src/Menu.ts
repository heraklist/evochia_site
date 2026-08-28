import { getConfig, verifyConfig } from './Config.ts';
import { measurePageQueryRows, runRangeImport } from './Jobs.ts';
import { ensureOperationalMetadata } from './OperationalMetadata.ts';
import { setupWorkbook } from './Setup.ts';

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function promptText(
  ui: GoogleAppsScript.Base.Ui,
  title: string,
  message: string,
): string | null {
  const response = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  return response.getResponseText().trim();
}

export function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('Evochia SEO')
    .addItem('Verify configuration', 'verifyConfiguration')
    .addItem('Set up workbook', 'setupWorkbookFromMenu')
    .addSeparator()
    .addItem('Run daily import', 'runDailyImport')
    .addItem('Run range import', 'runRangeImportFromMenu')
    .addToUi();
}

export function verifyConfiguration(): void {
  const ui = SpreadsheetApp.getUi();

  try {
    const capabilities = ['workbook', 'gsc', 'ga4'] as const;
    const config = getConfig(capabilities);
    const result = verifyConfig(config, capabilities);
    if (!result.ok) {
      ui.alert('Evochia SEO configuration', result.errors.join('\n'), ui.ButtonSet.OK);
      return;
    }

    ui.alert('Evochia SEO configuration', 'Configuration contract is verified.', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('Evochia SEO configuration', String(error), ui.ButtonSet.OK);
  }
}

export function setupWorkbookFromMenu(): void {
  const ui = SpreadsheetApp.getUi();

  try {
    setupWorkbook();
    ensureOperationalMetadata();
    ui.alert(
      'Evochia SEO workbook',
      'Required sheets are present. Re-running setup is safe.',
      ui.ButtonSet.OK,
    );
  } catch (error) {
    ui.alert('Evochia SEO workbook', String(error), ui.ButtonSet.OK);
  }
}

export function runRangeImportFromMenu(): void {
  const ui = SpreadsheetApp.getUi();

  try {
    const startDate = promptText(ui, 'Evochia SEO range', 'Start date (YYYY-MM-DD)');
    if (startDate == null) return;
    const endDate = promptText(ui, 'Evochia SEO range', 'End date (YYYY-MM-DD)');
    if (endDate == null) return;

    if (!isIsoCalendarDate(startDate) || !isIsoCalendarDate(endDate) || startDate > endDate) {
      throw new Error('Range requires valid YYYY-MM-DD dates with startDate <= endDate');
    }

    const mode = promptText(
      ui,
      'Evochia SEO range',
      'Mode: enter exactly "Measure only" or "Import range"',
    );
    if (mode == null) return;

    if (mode === 'Measure only') {
      const count = measurePageQueryRows(startDate, endDate);
      ui.alert('Evochia SEO range', `GSC Page Queries rows: ${count}`, ui.ButtonSet.OK);
      return;
    }

    if (mode === 'Import range') {
      const result = runRangeImport(startDate, endDate);
      ui.alert(
        'Evochia SEO range',
        `GSC range import complete through ${result.dataAsOf}.`,
        ui.ButtonSet.OK,
      );
      return;
    }

    throw new Error('Mode must be exactly "Measure only" or "Import range"');
  } catch (error) {
    ui.alert('Evochia SEO range', String(error), ui.ButtonSet.OK);
  }
}
