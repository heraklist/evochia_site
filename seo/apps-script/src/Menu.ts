import { getConfig, verifyConfig } from './Config.ts';
import { setupWorkbook } from './Setup.ts';

export function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('Evochia SEO')
    .addItem('Verify configuration', 'verifyConfiguration')
    .addItem('Set up workbook', 'setupWorkbookFromMenu')
    .addToUi();
}

export function verifyConfiguration(): void {
  const ui = SpreadsheetApp.getUi();

  try {
    const config = getConfig();
    const result = verifyConfig(config);
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
    getConfig();
    const result = setupWorkbook();
    ui.alert(
      'Evochia SEO workbook',
      `Created: ${result.created.length}\nAlready present: ${result.existing.length}`,
      ui.ButtonSet.OK,
    );
  } catch (error) {
    ui.alert('Evochia SEO workbook', String(error), ui.ButtonSet.OK);
  }
}
