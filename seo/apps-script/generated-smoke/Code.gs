// GENERATED FILE — DO NOT EDIT. Run: npm run seo:build:apps-script
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // seo/apps-script/src/RuntimeCompat.ts
  function calendarDateParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const year = values.get("year");
    const month = values.get("month");
    const day = values.get("day");
    if (!year || !month || !day) {
      throw new Error(`Unable to format date key in timezone: ${timeZone}`);
    }
    return {
      year: Number(year),
      month: Number(month),
      day: Number(day)
    };
  }
  function formatCalendarDate(date, timeZone) {
    const { year, month, day } = calendarDateParts(date, timeZone);
    return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  }
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

  // seo/apps-script/src/GscIndexConfig.ts
  var MAX_INSPECTION_URLS = 25;
  var APPROVED_MONITORED_PATHS = [
    "/en/private-chef/",
    "/en/villa-private-chef/",
    "/en/yacht-private-chef/",
    "/en/athens-private-chef/",
    "/en/greek-islands-private-chef/",
    "/el/private-chef/",
    "/el/villa-private-chef/",
    "/el/yacht-private-chef/",
    "/el/athens-private-chef/",
    "/el/greek-islands-private-chef/",
    "/en/catering/",
    "/en/wedding-catering/",
    "/en/corporate-catering/",
    "/el/catering/",
    "/el/wedding-catering/",
    "/el/corporate-catering/"
  ];
  function expectedMonitoredUrls(productionHostname) {
    return APPROVED_MONITORED_PATHS.map((path) => `https://${productionHostname}${path}`);
  }

  // seo/apps-script/src/Config.ts
  var CONFIG_PROPERTY_KEY = "SEO_GOOGLE_RESOURCES_JSON";
  var ConfigurationError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "ConfigurationError";
    }
  };
  var CAPABILITY_RESOURCES = {
    workbook: ["sheetId"],
    gsc: ["gscProperty"],
    gscIndex: ["gscProperty", "productionHostname", "monitoredUrls"],
    ga4: ["ga4PropertyId", "ga4PropertyTimeZone", "productionHostname"]
  };
  function requiredResources(capabilities) {
    const required = /* @__PURE__ */ new Set();
    for (const capability of capabilities) {
      for (const key of CAPABILITY_RESOURCES[capability]) {
        required.add(key);
      }
    }
    return required;
  }
  function isAbsoluteHttpsUrl(value) {
    return /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(value);
  }
  function sameStringSet(left, right) {
    if (left.length !== right.length) return false;
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    if (leftSet.size !== rightSet.size) return false;
    return left.every((value) => rightSet.has(value)) && right.every((value) => leftSet.has(value));
  }
  function verifyConfig(config, capabilities = ["workbook"]) {
    const errors = [];
    const required = requiredResources(capabilities);
    for (const key of required) {
      const value = config[key];
      if (key === "monitoredUrls") {
        if (!Array.isArray(value)) {
          errors.push("monitoredUrls is required");
        }
        continue;
      }
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
    if (required.has("ga4PropertyTimeZone") && typeof config.ga4PropertyTimeZone === "string" && config.ga4PropertyTimeZone !== "UNVERIFIED" && !isValidIanaTimeZone(config.ga4PropertyTimeZone)) {
      errors.push("ga4PropertyTimeZone must be a valid IANA timezone");
    }
    if (required.has("productionHostname") && typeof config.productionHostname === "string" && config.productionHostname !== "UNVERIFIED" && !isValidHostname(config.productionHostname)) {
      errors.push("productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot");
    }
    if (required.has("ga4PropertyId") && typeof config.ga4PropertyId === "string" && config.ga4PropertyId !== "UNVERIFIED" && !/^\d+$/.test(config.ga4PropertyId)) {
      errors.push("ga4PropertyId must contain digits only");
    }
    if (required.has("monitoredUrls") && Array.isArray(config.monitoredUrls)) {
      const monitoredUrls = config.monitoredUrls;
      if (monitoredUrls.length === 0) {
        errors.push("monitoredUrls must not be empty");
      }
      if (monitoredUrls.length > MAX_INSPECTION_URLS) {
        errors.push(`monitoredUrls must not exceed ${MAX_INSPECTION_URLS} URLs`);
      }
      if (!monitoredUrls.every((value) => typeof value === "string" && isAbsoluteHttpsUrl(value))) {
        errors.push("monitoredUrls must contain only absolute https URLs");
      }
      if (new Set(monitoredUrls).size !== monitoredUrls.length) {
        errors.push("monitoredUrls must contain unique URLs");
      }
      const productionHostname = config.productionHostname;
      const hostnameIsUsable = typeof productionHostname === "string" && productionHostname !== "UNVERIFIED" && isValidHostname(productionHostname);
      if (!hostnameIsUsable) {
        errors.push("monitoredUrls exact-set validation requires a valid productionHostname");
      } else if (monitoredUrls.every((value) => typeof value === "string")) {
        const expected = expectedMonitoredUrls(productionHostname);
        if (!sameStringSet(monitoredUrls, expected)) {
          errors.push("monitoredUrls must exactly match the approved monitored URL set");
        }
      }
    }
    return { ok: errors.length === 0, errors };
  }
  function getConfig(capabilities = ["workbook"]) {
    const raw = PropertiesService.getScriptProperties().getProperty(CONFIG_PROPERTY_KEY);
    if (!raw) {
      throw new ConfigurationError(`Missing Script Property: ${CONFIG_PROPERTY_KEY}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new ConfigurationError(`Invalid JSON in ${CONFIG_PROPERTY_KEY}: ${String(error)}`);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new ConfigurationError("SEO configuration is not verified: configuration payload must be a JSON object");
    }
    const result = verifyConfig(parsed, capabilities);
    if (!result.ok) {
      throw new ConfigurationError(`SEO configuration is not verified: ${result.errors.join("; ")}`);
    }
    return parsed;
  }

  // seo/apps-script/src/Ga4Client.ts
  var Ga4PipelineError = class extends Error {
    constructor(status, responseBody) {
      super(`ga4-data-api request failed with HTTP ${status}`);
      __publicField(this, "status");
      __publicField(this, "responseBody");
      this.name = "Ga4PipelineError";
      this.status = status;
      this.responseBody = responseBody;
    }
  };
  function defaultTransport(url, options) {
    return UrlFetchApp.fetch(url, options);
  }
  function authorizationHeader(accessToken) {
    return {
      Authorization: `Bearer ${accessToken != null ? accessToken : ScriptApp.getOAuthToken()}`
    };
  }
  function parseMetric(value) {
    if (value == null || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function normalizeGa4Response(response2) {
    var _a, _b, _c;
    const dimensionNames = ((_a = response2.dimensionHeaders) != null ? _a : []).map((header) => {
      var _a2;
      return (_a2 = header.name) != null ? _a2 : "";
    });
    const metricNames = ((_b = response2.metricHeaders) != null ? _b : []).map((header) => {
      var _a2;
      return (_a2 = header.name) != null ? _a2 : "";
    });
    return ((_c = response2.rows) != null ? _c : []).map((rawRow) => {
      const row = {};
      dimensionNames.forEach((name, index) => {
        var _a2, _b2;
        if (!name) return;
        const value = (_b2 = (_a2 = rawRow.dimensionValues) == null ? void 0 : _a2[index]) == null ? void 0 : _b2.value;
        row[name] = value == null ? null : value;
      });
      metricNames.forEach((name, index) => {
        var _a2, _b2;
        if (!name) return;
        row[name] = parseMetric((_b2 = (_a2 = rawRow.metricValues) == null ? void 0 : _a2[index]) == null ? void 0 : _b2.value);
      });
      return row;
    });
  }
  function runGa4Report(request) {
    var _a, _b, _c;
    if (!/^properties\/\d+$/.test(request.propertyResource)) {
      throw new Error(`Invalid GA4 property resource: ${request.propertyResource}`);
    }
    const transport = (_a = request.transport) != null ? _a : defaultTransport;
    const pageLimit = (_b = request.pageLimit) != null ? _b : 1e5;
    const rows = [];
    let offset = (_c = request.body.offset) != null ? _c : 0;
    while (true) {
      const body = {
        ...request.body,
        limit: pageLimit,
        offset,
        keepEmptyRows: false
      };
      const response2 = transport(
        `https://analyticsdata.googleapis.com/v1beta/${request.propertyResource}:runReport`,
        {
          method: "post",
          contentType: "application/json",
          headers: authorizationHeader(request.accessToken),
          payload: JSON.stringify(body),
          muteHttpExceptions: true
        }
      );
      const status = response2.getResponseCode();
      const responseBody = response2.getContentText();
      if (status < 200 || status >= 300) {
        throw new Ga4PipelineError(status, responseBody);
      }
      const parsed = responseBody.trim() ? JSON.parse(responseBody) : {};
      const pageRows = normalizeGa4Response(parsed);
      rows.push(...pageRows);
      if (pageRows.length < pageLimit || parsed.rowCount != null && rows.length >= parsed.rowCount) {
        break;
      }
      offset += pageRows.length;
    }
    return rows;
  }

  // seo/apps-script/src/WorkbookIdentity.ts
  function getVerifiedActiveWorkbook(dependencies) {
    var _a, _b;
    const getVerifiedConfig = (_a = dependencies == null ? void 0 : dependencies.getConfig) != null ? _a : (() => getConfig(["workbook"]));
    const getActiveWorkbook = (_b = dependencies == null ? void 0 : dependencies.getActiveWorkbook) != null ? _b : (() => SpreadsheetApp.getActiveSpreadsheet());
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

  // seo/apps-script/src/SheetWriter.ts
  function serializeLiteralCell(value) {
    if (typeof value === "string" && /^[=+\-@]/.test(value)) {
      return `'${value}`;
    }
    return value != null ? value : "";
  }
  function cellPart(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value == null ? "" : String(value);
  }
  function keyPart(value, timeZone) {
    if (value instanceof Date) {
      return formatCalendarDate(value, timeZone);
    }
    return value == null ? "" : String(value);
  }
  function buildCompositeKey(row, keyColumns, timeZone = "UTC") {
    return keyColumns.map((column) => keyPart(row[column], timeZone)).join("");
  }
  function rowsEqual(headers, left, right, keyColumns, timeZone) {
    const keySet = new Set(keyColumns);
    return headers.every((header) => {
      if (keySet.has(header)) {
        return keyPart(left[header], timeZone) === keyPart(right[header], timeZone);
      }
      return cellPart(left[header]) === cellPart(right[header]);
    });
  }
  function mergeRowRecords(headers, existingRows, keyColumns, incomingRows, timeZone = "UTC") {
    for (const key of keyColumns) {
      if (!headers.includes(key)) {
        throw new Error(`Key column is not present in headers: ${key}`);
      }
    }
    const rows = existingRows.map((row) => ({ ...row }));
    const indexes = /* @__PURE__ */ new Map();
    rows.forEach((row, index) => indexes.set(buildCompositeKey(row, keyColumns, timeZone), index));
    const deduplicatedIncoming = /* @__PURE__ */ new Map();
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
        total: rows.length
      }
    };
  }
  function upsertRows(sheetName, keyColumns, incomingRows, dependencies = { getVerifiedActiveWorkbook }) {
    if (incomingRows.length === 0) {
      return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
    }
    const workbook = dependencies.getVerifiedActiveWorkbook();
    const sheet = workbook.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Missing required sheet: ${sheetName}`);
    }
    const existingValues = sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [];
    const existingHeaders = existingValues.length > 0 ? existingValues[0].map(String) : [];
    const incomingHeaders = Object.keys(incomingRows[0]);
    const headers = [...existingHeaders];
    for (const header of incomingHeaders) {
      if (!headers.includes(header)) {
        headers.push(header);
      }
    }
    const existingRows = existingValues.slice(1).map((values) => {
      const row = {};
      headers.forEach((header, index) => {
        var _a;
        row[header] = (_a = values[index]) != null ? _a : null;
      });
      return row;
    });
    const timeZone = workbook.getSpreadsheetTimeZone();
    const merged = mergeRowRecords(headers, existingRows, keyColumns, incomingRows, timeZone);
    const output = [
      headers,
      ...merged.rows.map((row) => headers.map((header) => {
        var _a;
        return (_a = row[header]) != null ? _a : "";
      }))
    ];
    sheet.getRange(1, 1, output.length, headers.length).setValues(
      output.map((row) => row.map(serializeLiteralCell))
    );
    return merged.summary;
  }

  // seo/apps-script/src/Ga4Importer.ts
  function getAvailableGa4Date(now, propertyTimeZone, delayDays = 2) {
    if (!Number.isInteger(delayDays) || delayDays < 0) {
      throw new Error("delayDays must be a non-negative integer");
    }
    let parts;
    try {
      parts = calendarDateParts(now, propertyTimeZone);
    } catch {
      throw new Error("ga4PropertyTimeZone must be a valid IANA timezone");
    }
    const { year, month, day } = parts;
    return new Date(Date.UTC(year, month - 1, day - delayDays)).toISOString().slice(0, 10);
  }
  function reportBody(startDate, endDate, dimensions, metrics) {
    return {
      dateRanges: [{ startDate, endDate }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name }))
    };
  }
  function annotate(rows, dataAsOf, collectedAt) {
    return rows.map((row) => ({ ...row, dataAsOf, collectedAt }));
  }
  function rowString(row, key) {
    const value = row[key];
    return value == null ? "" : String(value);
  }
  function rowNumber(row, key) {
    const value = row[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
  function pageKey(date, hostName, pagePath) {
    return [date, hostName, pagePath].join("");
  }
  function classifyPagePath(pagePath) {
    const language = /^\/en(?:\/|$)/.test(pagePath) ? "en" : /^\/el(?:\/|$)/.test(pagePath) ? "el" : "unknown";
    let comparison = pagePath.replace(/^\/(?:en|el)(?=\/|$)/, "") || "/";
    if (comparison !== "/" && !comparison.endsWith("/")) {
      comparison += "/";
    }
    const taxonomy = [
      ["/wedding-catering/", "wedding_catering"],
      ["/corporate-catering/", "corporate_catering"],
      ["/villa-private-chef/", "villa_private_chef"],
      ["/yacht-private-chef/", "yacht_private_chef"],
      ["/athens-private-chef/", "athens_private_chef"],
      ["/greek-islands-private-chef/", "greek_islands_private_chef"],
      ["/private-chef/", "private_chef"],
      ["/catering/", "catering"],
      ["/menus/", "menus"],
      ["/contact/", "contact"],
      ["/about/", "about"],
      ["/faq/", "faq"],
      ["/lookbook/", "lookbook"],
      ["/privacy/", "privacy"],
      ["/404/", "not_found"]
    ];
    if (comparison === "/") {
      return { language, service: "home" };
    }
    for (const [prefix, service] of taxonomy) {
      if (comparison.startsWith(prefix)) {
        return { language, service };
      }
    }
    return { language, service: "other" };
  }
  function selectPageTitles(rows) {
    const selected = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const key = pageKey(rowString(row, "date"), rowString(row, "hostName"), rowString(row, "pagePath"));
      const title = rowString(row, "pageTitle").trim();
      const views = rowNumber(row, "screenPageViews");
      const current = selected.get(key);
      if (!title) {
        if (!current) selected.set(key, { title: null, views: 0 });
        continue;
      }
      if (!current || current.title == null || views > current.views || views === current.views && title < current.title) {
        selected.set(key, { title, views });
      }
    }
    return new Map([...selected.entries()].map(([key, value]) => [key, value.title]));
  }
  var TRACKING_QUERY_KEYS = /* @__PURE__ */ new Set([
    "gclid",
    "gclsrc",
    "dclid",
    "gbraid",
    "wbraid",
    "gad_source",
    "_gl",
    "srsltid",
    "fbclid",
    "msclkid"
  ]);
  function queryParameterKeys(query) {
    if (!query) return [];
    return query.split("&").filter((part) => part.length > 0).map((part) => {
      const separatorIndex = part.indexOf("=");
      const encodedKey = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
      try {
        return decodeURIComponent(encodedKey.replace(/\+/g, " "));
      } catch {
        return encodedKey;
      }
    });
  }
  function classifyUrlQuality(hostName, pagePathPlusQueryString, productionHostname) {
    const queryIndex = pagePathPlusQueryString.indexOf("?");
    const normalizedPagePath = queryIndex === -1 ? pagePathPlusQueryString : pagePathPlusQueryString.slice(0, queryIndex);
    const query = queryIndex === -1 ? "" : pagePathPlusQueryString.slice(queryIndex + 1);
    let hasTracking = false;
    let hasUnexpected = false;
    for (const key of queryParameterKeys(query)) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.startsWith("utm_") || TRACKING_QUERY_KEYS.has(normalizedKey)) {
        hasTracking = true;
      } else {
        hasUnexpected = true;
      }
    }
    const normalizedHost = hostName.toLowerCase();
    const previewHost = normalizedHost.endsWith(".vercel.app");
    const anomalyTypes = [];
    if (hasTracking) anomalyTypes.push("tracking_query_params");
    if (hasUnexpected) anomalyTypes.push("unexpected_query_params");
    if (normalizedPagePath.includes("//")) anomalyTypes.push("double_slash");
    if (/\.html$/i.test(normalizedPagePath)) anomalyTypes.push("legacy_html");
    if (previewHost) anomalyTypes.push("preview_host");
    if (!previewHost && normalizedHost !== productionHostname) anomalyTypes.push("non_production_host");
    return { normalizedPagePath, anomalyTypes };
  }
  function runGa4Reports(range, dependencies = {}) {
    var _a, _b, _c, _d;
    if (range.verificationStatus !== "verified") {
      throw new Error("GA4 collection requires a verified production configuration");
    }
    if (!/^properties\/\d+$/.test(range.propertyResource)) {
      throw new Error(`Invalid GA4 property resource: ${range.propertyResource}`);
    }
    if (!isValidHostname(range.productionHostname)) {
      throw new Error("productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot");
    }
    const now = (_a = range.now) != null ? _a : /* @__PURE__ */ new Date();
    const defaultDate = getAvailableGa4Date(now, range.ga4PropertyTimeZone, 2);
    const startDate = (_b = range.startDate) != null ? _b : defaultDate;
    const endDate = (_c = range.endDate) != null ? _c : defaultDate;
    const collectedAt = (_d = dependencies.collectedAt) != null ? _d : now.toISOString();
    const common = {
      propertyResource: range.propertyResource,
      accessToken: dependencies.accessToken,
      transport: dependencies.transport
    };
    const daily = runGa4Report({
      ...common,
      body: reportBody(
        startDate,
        endDate,
        ["date", "deviceCategory"],
        ["activeUsers", "newUsers", "sessions", "engagedSessions", "userEngagementDuration", "keyEvents"]
      )
    });
    const acquisition = runGa4Report({
      ...common,
      body: reportBody(
        startDate,
        endDate,
        ["date", "sessionSourceMedium", "sessionDefaultChannelGroup"],
        ["sessions", "engagedSessions", "keyEvents"]
      )
    });
    const landingPages = runGa4Report({
      ...common,
      body: reportBody(
        startDate,
        endDate,
        ["date", "landingPagePlusQueryString", "sessionDefaultChannelGroup", "deviceCategory"],
        ["sessions", "engagedSessions", "keyEvents"]
      )
    });
    const events = runGa4Report({
      ...common,
      body: reportBody(
        startDate,
        endDate,
        ["date", "eventName"],
        ["eventCount", "keyEvents"]
      )
    });
    const pageMetrics = runGa4Report({
      ...common,
      body: reportBody(
        startDate,
        endDate,
        ["date", "hostName", "pagePath"],
        ["screenPageViews", "activeUsers", "sessions", "engagedSessions", "userEngagementDuration", "keyEvents"]
      )
    });
    const pageTitleRows = runGa4Report({
      ...common,
      body: reportBody(
        startDate,
        endDate,
        ["date", "hostName", "pagePath", "pageTitle"],
        ["screenPageViews"]
      )
    });
    const urlQualityRows = runGa4Report({
      ...common,
      body: reportBody(
        startDate,
        endDate,
        ["date", "hostName", "pagePathPlusQueryString"],
        ["screenPageViews", "activeUsers", "sessions"]
      )
    });
    const pageTitles = selectPageTitles(pageTitleRows);
    const pages = pageMetrics.map((row) => {
      var _a2;
      const date = rowString(row, "date");
      const hostName = rowString(row, "hostName");
      const pagePath = rowString(row, "pagePath");
      const classification = classifyPagePath(pagePath);
      return {
        ...row,
        pageTitle: (_a2 = pageTitles.get(pageKey(date, hostName, pagePath))) != null ? _a2 : null,
        ...classification,
        dataAsOf: endDate,
        collectedAt
      };
    });
    const urlQuality = urlQualityRows.flatMap((row) => {
      var _a2;
      const date = rowString(row, "date");
      const hostName = rowString(row, "hostName");
      const rawUrl = rowString(row, "pagePathPlusQueryString");
      const quality = classifyUrlQuality(hostName, rawUrl, range.productionHostname);
      if (quality.anomalyTypes.length === 0) return [];
      return [{
        ...row,
        normalizedPagePath: quality.normalizedPagePath,
        anomalyTypes: quality.anomalyTypes.join(","),
        pageTitle: (_a2 = pageTitles.get(pageKey(date, hostName, quality.normalizedPagePath))) != null ? _a2 : null,
        dataAsOf: endDate,
        collectedAt
      }];
    });
    return {
      dataAsOf: endDate,
      collectedAt,
      daily: annotate(daily, endDate, collectedAt),
      acquisition: annotate(acquisition, endDate, collectedAt),
      landingPages: annotate(landingPages, endDate, collectedAt),
      events: annotate(events, endDate, collectedAt),
      pages,
      urlQuality
    };
  }

  // seo/apps-script/src/GscClient.ts
  var PipelineError = class extends Error {
    constructor(source, status, responseBody) {
      super(`${source} request failed with HTTP ${status}`);
      __publicField(this, "source");
      __publicField(this, "status");
      __publicField(this, "responseBody");
      this.name = "PipelineError";
      this.source = source;
      this.status = status;
      this.responseBody = responseBody;
    }
  };
  function defaultTransport2(url, options) {
    return UrlFetchApp.fetch(url, options);
  }
  function authHeaders(accessToken) {
    const token = accessToken != null ? accessToken : ScriptApp.getOAuthToken();
    return {
      Authorization: `Bearer ${token}`
    };
  }
  function parseJson(response2, source) {
    const status = response2.getResponseCode();
    const body = response2.getContentText();
    if (status < 200 || status >= 300) {
      throw new PipelineError(source, status, body);
    }
    if (!body.trim()) {
      return {};
    }
    return JSON.parse(body);
  }
  function numberOrZero(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
  function normalizeSearchAnalyticsRow(dimensions, raw) {
    var _a, _b, _c, _d, _e, _f;
    const values = /* @__PURE__ */ new Map();
    dimensions.forEach((dimension, index) => {
      var _a2;
      const value = (_a2 = raw.keys) == null ? void 0 : _a2[index];
      values.set(dimension, value == null ? "" : String(value));
    });
    return {
      date: (_a = values.get("date")) != null ? _a : "",
      query: (_b = values.get("query")) != null ? _b : "",
      page: (_c = values.get("page")) != null ? _c : "",
      country: (_d = values.get("country")) != null ? _d : "",
      device: (_e = values.get("device")) != null ? _e : "",
      searchAppearance: (_f = values.get("searchAppearance")) != null ? _f : "",
      clicks: numberOrZero(raw.clicks),
      impressions: numberOrZero(raw.impressions),
      ctr: numberOrZero(raw.ctr),
      position: numberOrZero(raw.position)
    };
  }
  function fetchSearchAnalytics(request) {
    var _a, _b, _c, _d;
    const dimensions = [...request.dimensions];
    const rowLimit = (_a = request.rowLimit) != null ? _a : 25e3;
    const transport = (_b = request.transport) != null ? _b : defaultTransport2;
    const rows = [];
    let startRow = (_c = request.startRow) != null ? _c : 0;
    while (true) {
      const response2 = transport(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(request.siteUrl)}/searchAnalytics/query`,
        {
          method: "post",
          contentType: "application/json",
          headers: authHeaders(request.accessToken),
          payload: JSON.stringify({
            startDate: request.startDate,
            endDate: request.endDate,
            dimensions,
            aggregationType: request.aggregationType,
            rowLimit,
            startRow,
            dataState: "final"
          }),
          muteHttpExceptions: true
        }
      );
      const parsed = parseJson(response2, "gsc-search-analytics");
      const pageRows = (_d = parsed.rows) != null ? _d : [];
      rows.push(...pageRows.map((row) => normalizeSearchAnalyticsRow(dimensions, row)));
      if (pageRows.length < rowLimit) {
        break;
      }
      startRow += pageRows.length;
    }
    return rows;
  }

  // seo/apps-script/src/GscImporter.ts
  var GSC_REPORT_SPECS = [
    {
      id: "daily",
      dimensions: ["date"],
      aggregationType: "byProperty",
      sheetName: "GSC Daily",
      keyColumns: ["date"]
    },
    {
      id: "pages",
      dimensions: ["date", "page"],
      aggregationType: "auto",
      sheetName: "GSC Pages",
      keyColumns: ["date", "page"]
    },
    {
      id: "queries",
      dimensions: ["date", "query"],
      aggregationType: "byProperty",
      sheetName: "GSC Queries",
      keyColumns: ["date", "query"]
    },
    {
      id: "pageQueries",
      dimensions: ["date", "page", "query"],
      aggregationType: "auto",
      sheetName: "GSC Page Queries",
      keyColumns: ["date", "page", "query"]
    }
  ];
  var GSC_TIME_ZONE = "America/Los_Angeles";
  function getAvailableGscDate(now, delayDays = 3) {
    if (!Number.isInteger(delayDays) || delayDays < 0) {
      throw new Error("delayDays must be a non-negative integer");
    }
    const { year, month, day } = calendarDateParts(now, GSC_TIME_ZONE);
    return new Date(Date.UTC(year, month - 1, day - delayDays)).toISOString().slice(0, 10);
  }
  function isIsoCalendarDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  function validateRange(startDate, endDate) {
    if (!isIsoCalendarDate(startDate) || !isIsoCalendarDate(endDate)) {
      throw new Error("GSC range dates must use valid YYYY-MM-DD calendar dates");
    }
    if (startDate > endDate) {
      throw new Error("GSC range startDate must be on or before endDate");
    }
  }
  function deduplicateGscRows(rows, keyColumns) {
    const byKey = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const key = keyColumns.map((column) => {
        var _a;
        return String((_a = row[column]) != null ? _a : "");
      }).join("");
      byKey.set(key, row);
    }
    return [...byKey.values()];
  }
  function importSearchAnalyticsRange(config, startDate, endDate, dependencies = {}) {
    var _a, _b;
    validateRange(startDate, endDate);
    const collectedAt = (_a = dependencies.collectedAt) != null ? _a : (/* @__PURE__ */ new Date()).toISOString();
    const fetchedReports = GSC_REPORT_SPECS.map((spec) => ({
      spec,
      rows: fetchSearchAnalytics({
        siteUrl: config.siteUrl,
        startDate,
        endDate,
        dimensions: spec.dimensions,
        aggregationType: spec.aggregationType,
        transport: dependencies.transport,
        accessToken: dependencies.accessToken
      })
    }));
    const writer = (_b = dependencies.writeRows) != null ? _b : upsertRows;
    const reports = {};
    for (const { spec, rows: fetched } of fetchedReports) {
      const rows = deduplicateGscRows(fetched, spec.keyColumns).map((row) => ({
        ...row,
        dataAsOf: endDate,
        collectedAt
      }));
      reports[spec.id] = {
        fetched: fetched.length,
        write: writer(spec.sheetName, [...spec.keyColumns], rows)
      };
    }
    return { dataAsOf: endDate, collectedAt, reports };
  }
  function importSearchAnalyticsDay(config, now, dependencies = {}) {
    var _a;
    const dataAsOf = getAvailableGscDate(now, 3);
    return importSearchAnalyticsRange(config, dataAsOf, dataAsOf, {
      ...dependencies,
      collectedAt: (_a = dependencies.collectedAt) != null ? _a : now.toISOString()
    });
  }

  // seo/apps-script/smoke/RuntimeSmoke.ts
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }
  function equal(actual, expected, message) {
    assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
  function check(name, assertion) {
    try {
      assertion();
      return { name, ok: true };
    } catch (error) {
      return { name, ok: false, detail: String(error) };
    }
  }
  function response(body, status = 200) {
    return {
      getResponseCode: () => status,
      getContentText: () => typeof body === "string" ? body : JSON.stringify(body)
    };
  }
  function ga4Transport(options = {}) {
    return (_url, request) => {
      if (options.fail) {
        return response('{"error":"synthetic"}', 503);
      }
      const body = JSON.parse(request.payload);
      const dimensions = body.dimensions.map(({ name }) => name);
      const key = dimensions.join(",");
      if (options.sparse) {
        if (key === "date,hostName,pagePath") {
          return response({
            dimensionHeaders: body.dimensions,
            metricHeaders: body.metrics,
            rows: [{
              dimensionValues: [
                { value: "20260805" },
                { value: "www.evochia.gr" },
                { value: "/en/contact/" }
              ],
              metricValues: [
                { value: "1" },
                { value: "1" },
                { value: "1" },
                { value: "1" },
                { value: "12" },
                {}
              ]
            }],
            rowCount: 1
          });
        }
        return response({ dimensionHeaders: body.dimensions, metricHeaders: body.metrics, rows: [], rowCount: 0 });
      }
      if (key === "date,deviceCategory") {
        return response({
          dimensionHeaders: body.dimensions,
          metricHeaders: body.metrics,
          rows: [{
            dimensionValues: [{ value: "20260805" }, { value: "mobile" }],
            metricValues: [{ value: "4" }, { value: "3" }, { value: "5" }, { value: "4" }, { value: "120" }, { value: "1" }]
          }],
          rowCount: 1
        });
      }
      if (key === "date,sessionSourceMedium,sessionDefaultChannelGroup") {
        return response({
          dimensionHeaders: body.dimensions,
          metricHeaders: body.metrics,
          rows: [{
            dimensionValues: [{ value: "20260805" }, { value: "google / organic" }, { value: "Organic Search" }],
            metricValues: [{ value: "5" }, { value: "4" }, { value: "1" }]
          }],
          rowCount: 1
        });
      }
      if (key === "date,landingPagePlusQueryString,sessionDefaultChannelGroup,deviceCategory") {
        return response({
          dimensionHeaders: body.dimensions,
          metricHeaders: body.metrics,
          rows: [{
            dimensionValues: [
              { value: "20260805" },
              { value: "/en/private-chef/" },
              { value: "Organic Search" },
              { value: "desktop" }
            ],
            metricValues: [{ value: "3" }, { value: "2" }, { value: "1" }]
          }],
          rowCount: 1
        });
      }
      if (key === "date,eventName") {
        return response({
          dimensionHeaders: body.dimensions,
          metricHeaders: body.metrics,
          rows: [{
            dimensionValues: [{ value: "20260805" }, { value: "generate_lead" }],
            metricValues: [{ value: "1" }, { value: "1" }]
          }],
          rowCount: 1
        });
      }
      if (key === "date,hostName,pagePath") {
        return response({
          dimensionHeaders: body.dimensions,
          metricHeaders: body.metrics,
          rows: [{
            dimensionValues: [
              { value: "20260805" },
              { value: "www.evochia.gr" },
              { value: "/en/private-chef/" }
            ],
            metricValues: [
              { value: "9" },
              { value: "7" },
              { value: "8" },
              { value: "6" },
              { value: "300" },
              { value: "2" }
            ]
          }],
          rowCount: 1
        });
      }
      if (key === "date,hostName,pagePath,pageTitle") {
        return response({
          dimensionHeaders: body.dimensions,
          metricHeaders: body.metrics,
          rows: [{
            dimensionValues: [
              { value: "20260805" },
              { value: "www.evochia.gr" },
              { value: "/en/private-chef/" },
              { value: "Private Chef Greece" }
            ],
            metricValues: [{ value: "9" }]
          }],
          rowCount: 1
        });
      }
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [
            { value: "20260805" },
            { value: "www.evochia.gr" },
            { value: "/en/private-chef/?utm_source=instagram" }
          ],
          metricValues: [{ value: "3" }, { value: "2" }, { value: "2" }]
        }],
        rowCount: 1
      });
    };
  }
  function gscTransport(options = {}) {
    let call = 0;
    return (_url, request) => {
      call += 1;
      if (options.failOnCall === call) {
        return response('{"error":"synthetic"}', 429);
      }
      if (options.empty) {
        return response({ rows: [] });
      }
      const body = JSON.parse(request.payload);
      const key = body.dimensions.join(",");
      if (key === "date") {
        return response({ rows: [{ keys: ["2026-08-02"], clicks: 5, impressions: 50, ctr: 0.1, position: 4 }] });
      }
      if (key === "date,page") {
        return response({ rows: [{ keys: ["2026-08-02", "https://www.evochia.gr/en/private-chef/"], clicks: 3, impressions: 30, ctr: 0.1, position: 5 }] });
      }
      if (key === "date,query") {
        return response({ rows: [{ keys: ["2026-08-02", "private chef greece"], clicks: 2, impressions: 20, ctr: 0.1, position: 6 }] });
      }
      return response({ rows: [{ keys: ["2026-08-02", "https://www.evochia.gr/en/private-chef/", "private chef greece"], clicks: 2, impressions: 20, ctr: 0.1, position: 6 }] });
    };
  }
  var VERIFIED_CONFIG = {
    gscProperty: "https://www.evochia.gr/",
    ga4AccountId: "388030118",
    ga4PropertyId: "528945896",
    ga4PropertyTimeZone: "Europe/Athens",
    productionHostname: "www.evochia.gr",
    gtmPublicContainerId: "GTM-578JXRXS",
    gtmAccountId: "123456789",
    gtmContainerId: "987654321",
    sheetId: "synthetic-sheet",
    driveFolderId: "synthetic-drive-folder",
    ownerEmail: "heraklis@evochia.gr",
    verificationStatus: "verified"
  };
  function runRuntimeSmoke() {
    const checks = [
      check("athens_calendar_dst", () => {
        const parts = calendarDateParts(/* @__PURE__ */ new Date("2026-11-02T21:30:00Z"), "Europe/Athens");
        equal(parts.year, 2026, "Athens year");
        equal(parts.month, 11, "Athens month");
        equal(parts.day, 2, "Athens day");
      }),
      check("gsc_los_angeles_calendar", () => {
        const parts = calendarDateParts(/* @__PURE__ */ new Date("2026-08-06T05:00:00Z"), "America/Los_Angeles");
        equal(parts.day, 5, "Los Angeles local day");
      }),
      check("url_query_parser", () => {
        const result2 = classifyUrlQuality("www.evochia.gr", "/en/private-chef/?gad_source=1&foo=bar", "www.evochia.gr");
        equal(result2.anomalyTypes.join(","), "tracking_query_params,unexpected_query_params", "query classification");
      }),
      check("page_classification", () => {
        const classified = classifyPagePath("/el/private-chef");
        equal(classified.language, "el", "language");
        equal(classified.service, "private_chef", "service");
      }),
      check("url_quality_classification", () => {
        const classified = classifyUrlQuality("preview-evochia.vercel.app", "/en//private-chef.html?utm_source=instagram", "www.evochia.gr");
        equal(
          classified.anomalyTypes.join(","),
          "tracking_query_params,double_slash,legacy_html,preview_host",
          "URL quality order"
        );
      }),
      check("hostname_validation", () => {
        equal(isValidHostname("www.evochia.gr"), true, "production hostname accepted");
        equal(isValidHostname("https://www.evochia.gr"), false, "scheme rejected");
      }),
      check("config_validation", () => {
        const capabilities = ["workbook", "gsc", "ga4"];
        equal(verifyConfig(VERIFIED_CONFIG, capabilities).ok, true, "synthetic config accepted");
        equal(
          verifyConfig({ ...VERIFIED_CONFIG, productionHostname: "WWW.evochia.gr" }, capabilities).ok,
          false,
          "uppercase hostname rejected"
        );
      }),
      check("ga4_import_assembly", () => {
        const bundle = runGa4Reports(
          {
            propertyResource: "properties/528945896",
            verificationStatus: "verified",
            ga4PropertyTimeZone: "Europe/Athens",
            productionHostname: "www.evochia.gr",
            now: /* @__PURE__ */ new Date("2026-08-06T21:30:00Z")
          },
          {
            accessToken: "synthetic-token",
            collectedAt: "2026-08-06T21:30:00Z",
            transport: ga4Transport()
          }
        );
        equal(bundle.pages.length, 1, "one page row assembled");
        equal(bundle.pages[0].pageTitle, "Private Chef Greece", "page title assembled");
        equal(bundle.urlQuality.length, 1, "one URL-quality anomaly assembled");
      }),
      check("gsc_import_assembly", () => {
        const writes = [];
        const result2 = importSearchAnalyticsDay(
          { siteUrl: "https://www.evochia.gr/", monitoredUrls: [] },
          /* @__PURE__ */ new Date("2026-08-06T05:00:00Z"),
          {
            accessToken: "synthetic-token",
            collectedAt: "2026-08-06T05:00:00Z",
            transport: gscTransport(),
            writeRows: (_sheet, _keys, rows) => {
              writes.push(rows.length);
              return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
            }
          }
        );
        equal(result2.dataAsOf, "2026-08-02", "GSC data-as-of date");
        equal(writes.join(","), "1,1,1,1", "synthetic writer calls");
      }),
      check("sparse_and_error_semantics", () => {
        const sparse = runGa4Reports(
          {
            propertyResource: "properties/528945896",
            verificationStatus: "verified",
            ga4PropertyTimeZone: "Europe/Athens",
            productionHostname: "www.evochia.gr",
            now: /* @__PURE__ */ new Date("2026-08-06T21:30:00Z")
          },
          { accessToken: "synthetic-token", transport: ga4Transport({ sparse: true }) }
        );
        equal(sparse.pages.length, 1, "sparse page remains present");
        equal(sparse.pages[0].pageTitle, null, "missing title remains null");
        equal(sparse.urlQuality.length, 0, "no synthetic URL-quality rows");
        let ga4Failed = false;
        try {
          runGa4Reports(
            {
              propertyResource: "properties/528945896",
              verificationStatus: "verified",
              ga4PropertyTimeZone: "Europe/Athens",
              productionHostname: "www.evochia.gr",
              now: /* @__PURE__ */ new Date("2026-08-06T21:30:00Z")
            },
            { accessToken: "synthetic-token", transport: ga4Transport({ fail: true }) }
          );
        } catch (error) {
          ga4Failed = error instanceof Ga4PipelineError && error.status === 503;
        }
        equal(ga4Failed, true, "GA4 typed error propagates");
        let gscFailed = false;
        try {
          importSearchAnalyticsDay(
            { siteUrl: "https://www.evochia.gr/", monitoredUrls: [] },
            /* @__PURE__ */ new Date("2026-08-06T08:00:00Z"),
            {
              accessToken: "synthetic-token",
              transport: gscTransport({ failOnCall: 2 }),
              writeRows: () => {
                throw new Error("writer must not run before all GSC fetches succeed");
              }
            }
          );
        } catch (error) {
          gscFailed = error instanceof PipelineError && error.status === 429;
        }
        equal(gscFailed, true, "GSC typed error propagates before writes");
      })
    ];
    const result = {
      ok: checks.every((item) => item.ok),
      checks
    };
    if (!result.ok) {
      throw new Error(`Apps Script runtime smoke failed: ${JSON.stringify(result)}`);
    }
    console.log(JSON.stringify(result));
    return result;
  }

  // seo/apps-script/entrypoints/smoke.ts
  var host = globalThis;
  var registry = host.__evochiaAppsScriptEntrypoints__ || {};
  host.__evochiaAppsScriptEntrypoints__ = registry;
  registry.runRuntimeSmoke = runRuntimeSmoke;
})();
function runRuntimeSmoke() {
  return globalThis.__evochiaAppsScriptEntrypoints__.runRuntimeSmoke.apply(this, arguments);
}
