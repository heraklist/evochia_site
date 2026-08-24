// GENERATED FILE — DO NOT EDIT. Run: npm run seo:build:apps-script
"use strict";
(() => {
  // seo/apps-script/src/RuntimeCompat.ts
  function isValidIanaTimeZone(value) {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(/* @__PURE__ */ new Date(0));
      return true;
    } catch {
      return false;
    }
  }
  function isValidHostname(value) {
    return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(value);
  }

  // seo/apps-script/src/Config.ts
  var CONFIG_PROPERTY_KEY = "SEO_GOOGLE_RESOURCES_JSON";
  var RESOURCE_KEYS = [
    "gscProperty",
    "ga4AccountId",
    "ga4PropertyId",
    "ga4PropertyTimeZone",
    "productionHostname",
    "gtmPublicContainerId",
    "gtmAccountId",
    "gtmContainerId",
    "sheetId",
    "driveFolderId"
  ];
  function verifyConfig(config) {
    const errors = [];
    for (const key of RESOURCE_KEYS) {
      const value = config[key];
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(`${key} is required`);
      } else if (value === "UNVERIFIED") {
        errors.push(`${key} is unverified`);
      }
    }
    if (config.ownerEmail !== "heraklis@evochia.gr") {
      errors.push("ownerEmail must be heraklis@evochia.gr");
    }
    if (config.verificationStatus !== "verified") {
      errors.push("verificationStatus must be verified");
    }
    if (typeof config.ga4PropertyTimeZone === "string" && config.ga4PropertyTimeZone !== "UNVERIFIED" && !isValidIanaTimeZone(config.ga4PropertyTimeZone)) {
      errors.push("ga4PropertyTimeZone must be a valid IANA timezone");
    }
    if (typeof config.productionHostname === "string" && config.productionHostname !== "UNVERIFIED" && !isValidHostname(config.productionHostname)) {
      errors.push("productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot");
    }
    if (typeof config.gtmPublicContainerId === "string" && config.gtmPublicContainerId !== "UNVERIFIED" && !/^GTM-[A-Z0-9]+$/.test(config.gtmPublicContainerId)) {
      errors.push("gtmPublicContainerId has an invalid format");
    }
    for (const key of ["ga4AccountId", "ga4PropertyId", "gtmAccountId", "gtmContainerId"]) {
      const value = config[key];
      if (typeof value === "string" && value !== "UNVERIFIED" && !/^\d+$/.test(value)) {
        errors.push(`${key} must contain digits only`);
      }
    }
    return { ok: errors.length === 0, errors };
  }
  function getConfig() {
    const raw = PropertiesService.getScriptProperties().getProperty(CONFIG_PROPERTY_KEY);
    if (!raw) {
      throw new Error(`Missing Script Property: ${CONFIG_PROPERTY_KEY}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON in ${CONFIG_PROPERTY_KEY}: ${String(error)}`);
    }
    const result = verifyConfig(parsed);
    if (!result.ok) {
      throw new Error(`SEO configuration is not verified: ${result.errors.join("; ")}`);
    }
    return parsed;
  }

  // seo/apps-script/src/WorkbookIdentity.ts
  function getVerifiedActiveWorkbook(dependencies) {
    const getVerifiedConfig = dependencies?.getConfig ?? getConfig;
    const getActiveWorkbook = dependencies?.getActiveWorkbook ?? (() => SpreadsheetApp.getActiveSpreadsheet());
    const config = getVerifiedConfig();
    const workbook = getActiveWorkbook();
    if (!workbook) {
      throw new Error("The SEO Apps Script project must be bound to a Google Sheet.");
    }
    if (workbook.getId() !== config.sheetId) {
      throw new Error("The active workbook does not match the configured sheet ID.");
    }
    return workbook;
  }

  // seo/apps-script/src/Setup.ts
  var REQUIRED_SHEET_NAMES = [
    "Config",
    "Run Log",
    "Pipeline Health",
    "GSC Daily",
    "GSC Pages",
    "GSC Queries",
    "GSC Indexing",
    "GA4 Daily",
    "GA4 Acquisition",
    "GA4 Landing Pages",
    "GA4 Events",
    "GA4 Pages",
    "GA4 URL Quality",
    "GTM Versions",
    "GTM Changes",
    "Findings Summary"
  ];
  function ensureWorkbookSheets(workbook) {
    const created = [];
    const existing = [];
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
  function setupWorkbook(dependencies = { getVerifiedActiveWorkbook }) {
    const setupSheets = dependencies.ensureWorkbookSheets ?? ensureWorkbookSheets;
    setupSheets(dependencies.getVerifiedActiveWorkbook());
  }

  // seo/apps-script/src/Menu.ts
  function onOpen() {
    SpreadsheetApp.getUi().createMenu("Evochia SEO").addItem("Verify configuration", "verifyConfiguration").addItem("Set up workbook", "setupWorkbookFromMenu").addToUi();
  }
  function verifyConfiguration() {
    const ui = SpreadsheetApp.getUi();
    try {
      const config = getConfig();
      const result = verifyConfig(config);
      if (!result.ok) {
        ui.alert("Evochia SEO configuration", result.errors.join("\n"), ui.ButtonSet.OK);
        return;
      }
      ui.alert("Evochia SEO configuration", "Configuration contract is verified.", ui.ButtonSet.OK);
    } catch (error) {
      ui.alert("Evochia SEO configuration", String(error), ui.ButtonSet.OK);
    }
  }
  function setupWorkbookFromMenu() {
    const ui = SpreadsheetApp.getUi();
    try {
      setupWorkbook();
      ui.alert(
        "Evochia SEO workbook",
        "Required sheets are present. Re-running setup is safe.",
        ui.ButtonSet.OK
      );
    } catch (error) {
      ui.alert("Evochia SEO workbook", String(error), ui.ButtonSet.OK);
    }
  }

  // seo/apps-script/entrypoints/production.ts
  var gas = globalThis;
  gas.onOpen = onOpen;
  gas.setupWorkbookFromMenu = setupWorkbookFromMenu;
  gas.verifyConfiguration = verifyConfiguration;
})();
