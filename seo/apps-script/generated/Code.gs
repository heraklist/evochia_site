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
  function normalizeGa4Response(response) {
    var _a, _b, _c;
    const dimensionNames = ((_a = response.dimensionHeaders) != null ? _a : []).map((header) => {
      var _a2;
      return (_a2 = header.name) != null ? _a2 : "";
    });
    const metricNames = ((_b = response.metricHeaders) != null ? _b : []).map((header) => {
      var _a2;
      return (_a2 = header.name) != null ? _a2 : "";
    });
    return ((_c = response.rows) != null ? _c : []).map((rawRow) => {
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
      const response = transport(
        `https://analyticsdata.googleapis.com/v1beta/${request.propertyResource}:runReport`,
        {
          method: "post",
          contentType: "application/json",
          headers: authorizationHeader(request.accessToken),
          payload: JSON.stringify(body),
          muteHttpExceptions: true
        }
      );
      const status = response.getResponseCode();
      const responseBody = response.getContentText();
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
  var GA4_REPORT_SPECS = [
    {
      id: "daily",
      sheetName: "GA4 Daily",
      keyColumns: ["date", "deviceCategory"]
    },
    {
      id: "acquisition",
      sheetName: "GA4 Acquisition",
      keyColumns: ["date", "sessionSourceMedium", "sessionDefaultChannelGroup"]
    },
    {
      id: "landingPages",
      sheetName: "GA4 Landing Pages",
      keyColumns: [
        "date",
        "landingPagePlusQueryString",
        "sessionDefaultChannelGroup",
        "deviceCategory"
      ]
    },
    {
      id: "events",
      sheetName: "GA4 Events",
      keyColumns: ["date", "eventName"]
    },
    {
      id: "pages",
      sheetName: "GA4 Pages",
      keyColumns: ["date", "hostName", "pagePath"]
    },
    {
      id: "urlQuality",
      sheetName: "GA4 URL Quality",
      keyColumns: ["date", "hostName", "pagePathPlusQueryString"]
    }
  ];
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
  function importGa4Reports(range, dependencies = {}) {
    var _a;
    const bundle = runGa4Reports(range, dependencies);
    const writer = (_a = dependencies.writeRows) != null ? _a : upsertRows;
    const writes = {};
    for (const spec of GA4_REPORT_SPECS) {
      writes[spec.id] = writer(
        spec.sheetName,
        [...spec.keyColumns],
        bundle[spec.id]
      );
    }
    return { bundle, writes };
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
  var MalformedInspectionResponse = class extends Error {
    constructor(message) {
      super(message);
      this.name = "MalformedInspectionResponse";
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
  function parseJson(response, source) {
    const status = response.getResponseCode();
    const body = response.getContentText();
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
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }
  function scalarField(object, key) {
    if (!hasOwn(object, key)) {
      return { state: "NOT_RETURNED" };
    }
    const value = object[key];
    if (typeof value !== "string") {
      throw new MalformedInspectionResponse(`${key} must be a string`);
    }
    return { state: "VALUE", value };
  }
  function arrayField(object, key) {
    if (!hasOwn(object, key)) {
      return { state: "NOT_RETURNED" };
    }
    const value = object[key];
    if (!Array.isArray(value)) {
      throw new MalformedInspectionResponse(`${key} must be an array`);
    }
    if (!value.every((item) => typeof item === "string")) {
      throw new MalformedInspectionResponse(`${key} must contain only strings`);
    }
    if (value.length === 0) {
      return { state: "EMPTY" };
    }
    return { state: "VALUE", value: [...value] };
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
      const response = transport(
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
      const parsed = parseJson(response, "gsc-search-analytics");
      const pageRows = (_d = parsed.rows) != null ? _d : [];
      rows.push(...pageRows.map((row) => normalizeSearchAnalyticsRow(dimensions, row)));
      if (pageRows.length < rowLimit) {
        break;
      }
      startRow += pageRows.length;
    }
    return rows;
  }
  function fetchUrlInspection(request) {
    var _a, _b;
    const transport = (_a = request.transport) != null ? _a : defaultTransport2;
    const response = transport(
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      {
        method: "post",
        contentType: "application/json",
        headers: authHeaders(request.accessToken),
        payload: JSON.stringify({
          inspectionUrl: request.inspectionUrl,
          siteUrl: request.siteUrl,
          languageCode: (_b = request.languageCode) != null ? _b : "en-US"
        }),
        muteHttpExceptions: true
      }
    );
    const parsed = parseJson(response, "gsc-url-inspection");
    if (!isRecord(parsed) || !hasOwn(parsed, "inspectionResult")) {
      throw new MalformedInspectionResponse("inspectionResult is required");
    }
    const inspectionResult = parsed.inspectionResult;
    if (!isRecord(inspectionResult)) {
      throw new MalformedInspectionResponse("inspectionResult must be an object");
    }
    if (!hasOwn(inspectionResult, "indexStatusResult")) {
      throw new MalformedInspectionResponse("indexStatusResult is required");
    }
    const indexStatusResult = inspectionResult.indexStatusResult;
    if (!isRecord(indexStatusResult)) {
      throw new MalformedInspectionResponse("indexStatusResult must be an object");
    }
    return {
      url: request.inspectionUrl,
      verdict: scalarField(indexStatusResult, "verdict"),
      coverageState: scalarField(indexStatusResult, "coverageState"),
      robotsTxtState: scalarField(indexStatusResult, "robotsTxtState"),
      indexingState: scalarField(indexStatusResult, "indexingState"),
      pageFetchState: scalarField(indexStatusResult, "pageFetchState"),
      crawledAs: scalarField(indexStatusResult, "crawledAs"),
      userCanonical: scalarField(indexStatusResult, "userCanonical"),
      googleCanonical: scalarField(indexStatusResult, "googleCanonical"),
      lastCrawlTime: scalarField(indexStatusResult, "lastCrawlTime"),
      sitemap: arrayField(indexStatusResult, "sitemap"),
      referringUrls: arrayField(indexStatusResult, "referringUrls"),
      inspectionResultLink: scalarField(inspectionResult, "inspectionResultLink"),
      inspectedAt: request.inspectedAt
    };
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
  function normalizeCanonicalUrl(value) {
    var _a;
    const fragmentIndex = value.indexOf("#");
    const withoutFragment = fragmentIndex === -1 ? value : value.slice(0, fragmentIndex);
    const match = /^(https?):\/\/([^/?#]+)(.*)$/i.exec(withoutFragment);
    if (!match) return null;
    const protocol = match[1];
    const authority = match[2];
    const remainder = match[3];
    if (authority.includes("@")) return null;
    const authorityMatch = /^([^:]+)(?::(\d+))?$/.exec(authority);
    if (!authorityMatch) return null;
    const hostname = authorityMatch[1].toLowerCase();
    let port = (_a = authorityMatch[2]) != null ? _a : "";
    const protocolForPort = protocol.toLowerCase();
    if (protocolForPort === "https" && port === "443" || protocolForPort === "http" && port === "80") {
      port = "";
    }
    return `${protocolForPort}://${hostname}${port ? `:${port}` : ""}${remainder}`;
  }
  function canonicalMatch(userCanonical, googleCanonical) {
    if (userCanonical.state !== "VALUE" || googleCanonical.state !== "VALUE") {
      return "NOT_COMPARABLE";
    }
    const normalizedUser = normalizeCanonicalUrl(userCanonical.value);
    const normalizedGoogle = normalizeCanonicalUrl(googleCanonical.value);
    if (normalizedUser === null || normalizedGoogle === null) {
      return "NOT_COMPARABLE";
    }
    return normalizedUser === normalizedGoogle ? "MATCH" : "MISMATCH";
  }
  function flattenScalar(field) {
    return field.state === "VALUE" ? field.value : "NOT_RETURNED";
  }
  function flattenArray(field) {
    if (field.state === "VALUE") return JSON.stringify(field.value);
    if (field.state === "EMPTY") return "[]";
    return "NOT_RETURNED";
  }
  function flattenInspectionSnapshot(snapshot) {
    if (snapshot.outcome === "REQUEST_FAILED") {
      return {
        "Checked At": snapshot.checkedAt,
        "Run Id": snapshot.runId,
        URL: snapshot.url,
        Outcome: snapshot.outcome,
        Verdict: "",
        "Coverage State": "",
        "Robots.txt State": "",
        "Indexing State": "",
        "Page Fetch State": "",
        "Crawled As": "",
        "Google Canonical": "",
        "User Canonical": "",
        "Canonical Match": snapshot.canonicalMatch,
        "Last Crawl Time": "",
        Sitemap: "",
        "Referring URLs": "",
        "Inspection Result Link": "",
        "Error Class": snapshot.errorClass,
        "Error Message": snapshot.errorMessage
      };
    }
    return {
      "Checked At": snapshot.checkedAt,
      "Run Id": snapshot.runId,
      URL: snapshot.url,
      Outcome: snapshot.outcome,
      Verdict: flattenScalar(snapshot.verdict),
      "Coverage State": flattenScalar(snapshot.coverageState),
      "Robots.txt State": flattenScalar(snapshot.robotsTxtState),
      "Indexing State": flattenScalar(snapshot.indexingState),
      "Page Fetch State": flattenScalar(snapshot.pageFetchState),
      "Crawled As": flattenScalar(snapshot.crawledAs),
      "Google Canonical": flattenScalar(snapshot.googleCanonical),
      "User Canonical": flattenScalar(snapshot.userCanonical),
      "Canonical Match": snapshot.canonicalMatch,
      "Last Crawl Time": flattenScalar(snapshot.lastCrawlTime),
      Sitemap: flattenArray(snapshot.sitemap),
      "Referring URLs": flattenArray(snapshot.referringUrls),
      "Inspection Result Link": flattenScalar(snapshot.inspectionResultLink),
      "Error Class": "",
      "Error Message": ""
    };
  }
  function toInspectedSnapshot(runId, checkedAt, result) {
    return {
      runId,
      checkedAt,
      url: result.url,
      outcome: "INSPECTED",
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
      inspectionResultLink: result.inspectionResultLink
    };
  }
  function toFailedSnapshot(runId, checkedAt, url, error) {
    if (error instanceof Error) {
      return {
        runId,
        checkedAt,
        url,
        outcome: "REQUEST_FAILED",
        canonicalMatch: "NOT_COMPARABLE",
        errorClass: error.name || "Error",
        errorMessage: error.message
      };
    }
    return {
      runId,
      checkedAt,
      url,
      outcome: "REQUEST_FAILED",
      canonicalMatch: "NOT_COMPARABLE",
      errorClass: "UnknownError",
      errorMessage: String(error)
    };
  }
  function collectAndPersistInspectionSnapshots(config, dependencies = {}) {
    var _a;
    const snapshots = [];
    for (const url of config.monitoredUrls) {
      try {
        const result = fetchUrlInspection({
          siteUrl: config.siteUrl,
          inspectionUrl: url,
          accessToken: dependencies.accessToken,
          transport: dependencies.transport,
          inspectedAt: config.checkedAt
        });
        snapshots.push(toInspectedSnapshot(config.runId, config.checkedAt, result));
      } catch (error) {
        snapshots.push(toFailedSnapshot(config.runId, config.checkedAt, url, error));
      }
    }
    const rows = snapshots.map(flattenInspectionSnapshot);
    const writer = (_a = dependencies.writeRows) != null ? _a : upsertRows;
    const write = writer("GSC Indexing", ["Run Id", "URL"], rows);
    const failedCount = snapshots.filter((snapshot) => snapshot.outcome === "REQUEST_FAILED").length;
    return {
      snapshots,
      inspectedCount: snapshots.length - failedCount,
      failedCount,
      write
    };
  }
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

  // seo/apps-script/src/OperationalMetadata.ts
  var FRESHNESS_RANGE = "E1:F4";
  var THRESHOLD_RANGE = "E7:H9";
  var RESERVED_RANGE = "E1:H9";
  var FRESHNESS_LABELS = [
    "GSC dataAsOf",
    "GA4 dataAsOf",
    "last run",
    "status"
  ];
  var INITIAL_FRESHNESS = FRESHNESS_LABELS.map((label) => [label, ""]);
  var INITIAL_THRESHOLDS = [
    ["key", "value", "rationale", "last reviewed"],
    ["VISIBLE_POSITION_MAX", 5, "high-enough visibility boundary for CTR diagnosis", "2026-08-27"],
    ["MIN_PAGE_IMPRESSIONS", "", "not calibrated", ""]
  ];
  function isBlank(value) {
    return value == null || value === "";
  }
  function configSheet(workbook) {
    const sheet = workbook.getSheetByName("Config");
    if (!sheet) throw new Error("Missing required sheet: Config");
    return sheet;
  }
  function isCompletelyBlank(values) {
    return values.every((row) => row.every(isBlank));
  }
  function assertManagedLayout(values) {
    if (values.length < 9 || values.some((row) => row.length < 4)) {
      throw new Error("Config operational metadata reservation has an unexpected shape");
    }
    for (let index = 0; index < FRESHNESS_LABELS.length; index += 1) {
      if (values[index][0] !== FRESHNESS_LABELS[index]) {
        throw new Error("Config operational metadata contains unexpected content");
      }
      if (!isBlank(values[index][2]) || !isBlank(values[index][3])) {
        throw new Error("Config operational metadata contains unexpected content");
      }
    }
    for (const rowIndex of [4, 5]) {
      if (!values[rowIndex].every(isBlank)) {
        throw new Error("Config operational metadata contains unexpected content");
      }
    }
    const header = ["key", "value", "rationale", "last reviewed"];
    if (!header.every((value, index) => values[6][index] === value)) {
      throw new Error("Config operational metadata contains unexpected content");
    }
    if (values[7][0] !== "VISIBLE_POSITION_MAX" || values[8][0] !== "MIN_PAGE_IMPRESSIONS") {
      throw new Error("Config operational metadata contains unexpected content");
    }
  }
  function ensureOperationalMetadata(dependencies = {
    getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook()
  }) {
    const sheet = configSheet(dependencies.getVerifiedActiveWorkbook());
    const reserved = sheet.getRange(RESERVED_RANGE).getValues();
    if (isCompletelyBlank(reserved)) {
      sheet.getRange(FRESHNESS_RANGE).setValues(INITIAL_FRESHNESS.map((row) => [...row]));
      sheet.getRange(THRESHOLD_RANGE).setValues(INITIAL_THRESHOLDS.map((row) => [...row]));
      return;
    }
    assertManagedLayout(reserved);
  }
  function updateOperationalFreshness(input, dependencies = {
    getVerifiedActiveWorkbook: () => getVerifiedActiveWorkbook()
  }) {
    var _a, _b, _c, _d;
    const workbook = dependencies.getVerifiedActiveWorkbook();
    ensureOperationalMetadata({ getVerifiedActiveWorkbook: () => workbook });
    const sheet = configSheet(workbook);
    const existing = sheet.getRange(FRESHNESS_RANGE).getValues();
    if (input.gsc.success && !input.gsc.dataAsOf) {
      throw new Error("Successful GSC freshness update requires dataAsOf");
    }
    if (input.ga4.success && !input.ga4.dataAsOf) {
      throw new Error("Successful GA4 freshness update requires dataAsOf");
    }
    const gscDataAsOf = input.gsc.success ? input.gsc.dataAsOf : (_b = (_a = existing[0]) == null ? void 0 : _a[1]) != null ? _b : "";
    const ga4DataAsOf = input.ga4.success ? input.ga4.dataAsOf : (_d = (_c = existing[1]) == null ? void 0 : _c[1]) != null ? _d : "";
    sheet.getRange(FRESHNESS_RANGE).setValues([
      ["GSC dataAsOf", gscDataAsOf != null ? gscDataAsOf : ""],
      ["GA4 dataAsOf", ga4DataAsOf != null ? ga4DataAsOf : ""],
      ["last run", input.lastRun],
      ["status", input.status]
    ]);
  }

  // seo/apps-script/src/Setup.ts
  var REQUIRED_SHEET_NAMES = [
    "Config",
    "Run Log",
    "Pipeline Health",
    "GSC Daily",
    "GSC Pages",
    "GSC Queries",
    "GSC Page Queries",
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
  var GSC_INDEXING_HEADERS = [
    "Checked At",
    "Run Id",
    "URL",
    "Outcome",
    "Verdict",
    "Coverage State",
    "Robots.txt State",
    "Indexing State",
    "Page Fetch State",
    "Crawled As",
    "Google Canonical",
    "User Canonical",
    "Canonical Match",
    "Last Crawl Time",
    "Sitemap",
    "Referring URLs",
    "Inspection Result Link",
    "Error Class",
    "Error Message"
  ];
  var SchemaError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "SchemaError";
    }
  };
  function isGscIndexingSheet(value) {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value;
    return typeof candidate.getLastRow === "function" && typeof candidate.getRange === "function";
  }
  function readGscIndexingHeaders(sheet) {
    var _a;
    if (sheet.getLastRow() === 0) return [];
    try {
      const values = sheet.getRange(1, 1, 1, GSC_INDEXING_HEADERS.length).getValues();
      const firstRow = (_a = values[0]) != null ? _a : [];
      return firstRow.map((value) => String(value));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new SchemaError(`Unable to read GSC Indexing canonical headers: ${detail}`);
    }
  }
  function assertExactGscIndexingHeaders(headers) {
    if (headers.length !== GSC_INDEXING_HEADERS.length) {
      throw new SchemaError(
        `GSC Indexing schema must contain exactly ${GSC_INDEXING_HEADERS.length} columns`
      );
    }
    for (let index = 0; index < GSC_INDEXING_HEADERS.length; index += 1) {
      if (headers[index] !== GSC_INDEXING_HEADERS[index]) {
        throw new SchemaError(
          `GSC Indexing schema mismatch at column ${index + 1}: expected ${GSC_INDEXING_HEADERS[index]}`
        );
      }
    }
  }
  function validateGscIndexingSchema(sheet) {
    const headers = readGscIndexingHeaders(sheet);
    if (headers.length === 0) {
      throw new SchemaError("GSC Indexing schema is not initialized");
    }
    assertExactGscIndexingHeaders(headers);
  }
  function ensureGscIndexingSchema(sheet) {
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, GSC_INDEXING_HEADERS.length).setValues([
        [...GSC_INDEXING_HEADERS]
      ]);
      return;
    }
    validateGscIndexingSchema(sheet);
  }
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
    var _a, _b;
    const workbook = dependencies.getVerifiedActiveWorkbook();
    const setupSheets = (_a = dependencies.ensureWorkbookSheets) != null ? _a : ensureWorkbookSheets;
    const setupGscIndexingSchema = (_b = dependencies.ensureGscIndexingSchema) != null ? _b : ensureGscIndexingSchema;
    setupSheets(workbook);
    const indexingSheet = workbook.getSheetByName("GSC Indexing");
    if (!isGscIndexingSheet(indexingSheet)) {
      throw new SchemaError("GSC Indexing sheet does not expose the required schema range API");
    }
    setupGscIndexingSchema(indexingSheet);
  }

  // seo/apps-script/src/Jobs.ts
  function defaultNow() {
    return /* @__PURE__ */ new Date();
  }
  function defaultNowMs() {
    return Date.now();
  }
  function defaultRunId() {
    return Utilities.getUuid();
  }
  function defaultOAuthToken() {
    return ScriptApp.getOAuthToken();
  }
  function errorDetail(error) {
    if (error instanceof Error) {
      return { errorClass: error.name || "Error", errorMessage: error.message };
    }
    return { errorClass: typeof error, errorMessage: String(error) };
  }
  function emptyFailure(source, error) {
    return {
      source,
      success: false,
      dataAsOf: "",
      fetchedRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      unchangedRows: 0,
      ...errorDetail(error)
    };
  }
  function sumWrites(writes) {
    return writes.reduce((total, write) => ({
      insertedRows: total.insertedRows + write.inserted,
      updatedRows: total.updatedRows + write.updated,
      unchangedRows: total.unchangedRows + write.unchanged
    }), { insertedRows: 0, updatedRows: 0, unchangedRows: 0 });
  }
  function gscOutcome(result) {
    const reports = Object.values(result.reports);
    return {
      source: "GSC",
      success: true,
      dataAsOf: result.dataAsOf,
      fetchedRows: reports.reduce((sum, report) => sum + report.fetched, 0),
      ...sumWrites(reports.map((report) => report.write)),
      errorClass: "",
      errorMessage: ""
    };
  }
  function ga4Outcome(result) {
    const fetchedRows = result.bundle.daily.length + result.bundle.acquisition.length + result.bundle.landingPages.length + result.bundle.events.length + result.bundle.pages.length + result.bundle.urlQuality.length;
    return {
      source: "GA4",
      success: true,
      dataAsOf: result.bundle.dataAsOf,
      fetchedRows,
      ...sumWrites(Object.values(result.writes)),
      errorClass: "",
      errorMessage: ""
    };
  }
  function gscIndexOutcome(result) {
    const expectedCount = APPROVED_MONITORED_PATHS.length;
    const persistedRowCount = result.write.inserted + result.write.updated + result.write.unchanged;
    const complete = result.inspectedCount === expectedCount && result.failedCount === 0 && persistedRowCount === expectedCount;
    if (complete) {
      return {
        source: "GSC_INDEX",
        success: true,
        dataAsOf: "",
        fetchedRows: result.inspectedCount,
        insertedRows: result.write.inserted,
        updatedRows: result.write.updated,
        unchangedRows: result.write.unchanged,
        errorClass: "",
        errorMessage: ""
      };
    }
    const errorClass = result.failedCount > 0 ? "InspectionBatchFailure" : "InspectionPersistenceIncomplete";
    const errorMessage = result.failedCount > 0 ? `${result.failedCount} of ${expectedCount} URL inspections failed; see GSC Indexing rows for details` : `GSC Indexing persisted ${persistedRowCount} of ${expectedCount} expected telemetry rows`;
    return {
      source: "GSC_INDEX",
      success: false,
      dataAsOf: "",
      fetchedRows: result.inspectedCount,
      insertedRows: result.write.inserted,
      updatedRows: result.write.updated,
      unchangedRows: result.write.unchanged,
      errorClass,
      errorMessage
    };
  }
  function overallStatus(gsc, ga4) {
    if (gsc.success && ga4.success) return "SUCCESS";
    if (gsc.success || ga4.success) return "PARTIAL";
    return "FAILED";
  }
  function toRunLogRow(outcome, runId, startedAt, finishedAt, status, stageDurationMs) {
    const row = {
      runId,
      startedAt,
      finishedAt,
      source: outcome.source,
      sourceStatus: outcome.success ? "SUCCESS" : "FAILED",
      overallStatus: status,
      dataAsOf: outcome.dataAsOf,
      fetchedRows: outcome.fetchedRows,
      insertedRows: outcome.insertedRows,
      updatedRows: outcome.updatedRows,
      unchangedRows: outcome.unchangedRows,
      errorClass: outcome.errorClass,
      errorMessage: outcome.errorMessage
    };
    if (stageDurationMs !== void 0) {
      row.stageDurationMs = stageDurationMs;
    }
    return row;
  }
  function preflightPlaceholderOutcome() {
    return {
      source: "GSC_INDEX",
      success: false,
      dataAsOf: "",
      fetchedRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      unchangedRows: 0,
      errorClass: "InspectionStageIncomplete",
      errorMessage: "GSC_INDEX stage did not reach a completed snapshot state"
    };
  }
  function defaultValidateGscIndexingPreflight(workbook) {
    if (typeof workbook !== "object" || workbook === null) {
      throw new SchemaError("Verified workbook is unavailable for GSC Indexing preflight");
    }
    const getSheetByName = workbook.getSheetByName;
    if (typeof getSheetByName !== "function") {
      throw new SchemaError("Verified workbook does not expose getSheetByName for GSC Indexing preflight");
    }
    const sheet = getSheetByName.call(workbook, "GSC Indexing");
    if (!sheet || typeof sheet.getLastRow !== "function" || typeof sheet.getRange !== "function") {
      throw new SchemaError("GSC Indexing sheet does not expose the required schema range API");
    }
    validateGscIndexingSchema(sheet);
  }
  function parseIsoDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  function formatIsoDate(value) {
    return value.toISOString().slice(0, 10);
  }
  function calendarMonthChunks(startDate, endDate) {
    const chunks = [];
    let cursor = parseIsoDate(startDate);
    const finalDate = parseIsoDate(endDate);
    while (cursor <= finalDate) {
      const monthEnd = new Date(Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth() + 1,
        0
      ));
      const chunkEnd = monthEnd < finalDate ? monthEnd : finalDate;
      chunks.push({
        startDate: formatIsoDate(cursor),
        endDate: formatIsoDate(chunkEnd)
      });
      cursor = new Date(Date.UTC(
        chunkEnd.getUTCFullYear(),
        chunkEnd.getUTCMonth(),
        chunkEnd.getUTCDate() + 1
      ));
    }
    return chunks;
  }
  function runDailyImport(dependencies = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const verifyWorkbook = (_a = dependencies.getVerifiedActiveWorkbook) != null ? _a : (() => getVerifiedActiveWorkbook());
    const workbook = verifyWorkbook();
    const now = (_b = dependencies.now) != null ? _b : defaultNow;
    const nowMs = (_c = dependencies.nowMs) != null ? _c : defaultNowMs;
    const started = now();
    const startedAt = started.toISOString();
    const runId = ((_d = dependencies.createRunId) != null ? _d : defaultRunId)();
    const accessToken = ((_e = dependencies.getOAuthToken) != null ? _e : defaultOAuthToken)();
    const configReader = (_f = dependencies.getConfig) != null ? _f : getConfig;
    const importGsc = (_g = dependencies.importGscDay) != null ? _g : importSearchAnalyticsDay;
    const importGa4 = (_h = dependencies.importGa4) != null ? _h : importGa4Reports;
    const collectGscIndex = (_i = dependencies.collectGscIndexSnapshots) != null ? _i : collectAndPersistInspectionSnapshots;
    const validateGscIndexingPreflight = (_j = dependencies.validateGscIndexingPreflight) != null ? _j : defaultValidateGscIndexingPreflight;
    const writer = (_k = dependencies.writeRows) != null ? _k : upsertRows;
    const updateFreshness = (_l = dependencies.updateFreshness) != null ? _l : updateOperationalFreshness;
    let gsc;
    try {
      const config = configReader(["gsc"]);
      gsc = gscOutcome(importGsc(
        { siteUrl: config.gscProperty, monitoredUrls: [] },
        started,
        { accessToken, collectedAt: startedAt }
      ));
    } catch (error) {
      gsc = emptyFailure("GSC", error);
    }
    let ga4;
    try {
      const config = configReader(["ga4"]);
      ga4 = ga4Outcome(importGa4({
        propertyResource: `properties/${config.ga4PropertyId}`,
        verificationStatus: config.verificationStatus,
        ga4PropertyTimeZone: config.ga4PropertyTimeZone,
        productionHostname: config.productionHostname,
        now: started
      }, { accessToken, collectedAt: startedAt }));
    } catch (error) {
      ga4 = emptyFailure("GA4", error);
    }
    const status = overallStatus(gsc, ga4);
    const canonicalFinishedAt = now().toISOString();
    writer("Run Log", ["runId", "source"], [
      toRunLogRow(gsc, runId, startedAt, canonicalFinishedAt, status),
      toRunLogRow(ga4, runId, startedAt, canonicalFinishedAt, status)
    ]);
    updateFreshness({
      gsc: { success: gsc.success, dataAsOf: gsc.success ? gsc.dataAsOf : void 0 },
      ga4: { success: ga4.success, dataAsOf: ga4.success ? ga4.dataAsOf : void 0 },
      lastRun: canonicalFinishedAt,
      status
    });
    const gscIndexStartedMs = nowMs();
    let gscIndex;
    try {
      writer("Run Log", ["runId", "source"], [
        toRunLogRow(
          preflightPlaceholderOutcome(),
          runId,
          startedAt,
          canonicalFinishedAt,
          status,
          ""
        )
      ]);
      const config = configReader(["gscIndex"]);
      if (!Array.isArray(config.monitoredUrls)) {
        throw new Error("gscIndex configuration did not provide monitoredUrls after validation");
      }
      validateGscIndexingPreflight(workbook);
      const batch = collectGscIndex({
        runId,
        checkedAt: startedAt,
        siteUrl: config.gscProperty,
        monitoredUrls: config.monitoredUrls
      }, {
        accessToken,
        writeRows: writer
      });
      gscIndex = gscIndexOutcome(batch);
    } catch (error) {
      gscIndex = emptyFailure("GSC_INDEX", error);
    }
    const stageDurationMs = Math.max(0, nowMs() - gscIndexStartedMs);
    const gscIndexFinishedAt = now().toISOString();
    writer("Run Log", ["runId", "source"], [
      toRunLogRow(
        gscIndex,
        runId,
        startedAt,
        gscIndexFinishedAt,
        status,
        stageDurationMs
      )
    ]);
    return { runId, status, sources: { gsc, ga4, gscIndex } };
  }
  function runRangeImport(startDate, endDate, dependencies = {}) {
    var _a, _b, _c, _d;
    const accessToken = ((_a = dependencies.getOAuthToken) != null ? _a : defaultOAuthToken)();
    const config = ((_b = dependencies.getConfig) != null ? _b : getConfig)(["gsc"]);
    const importer = (_c = dependencies.importGscRange) != null ? _c : importSearchAnalyticsRange;
    const collectedAt = ((_d = dependencies.now) != null ? _d : defaultNow)().toISOString();
    let result;
    for (const chunk of calendarMonthChunks(startDate, endDate)) {
      result = importer(
        { siteUrl: config.gscProperty, monitoredUrls: [] },
        chunk.startDate,
        chunk.endDate,
        { accessToken, collectedAt }
      );
    }
    if (!result) {
      throw new Error("Range import requires at least one calendar date");
    }
    return result;
  }
  function measurePageQueryRows(startDate, endDate, dependencies = {}) {
    var _a, _b, _c;
    const accessToken = ((_a = dependencies.getOAuthToken) != null ? _a : defaultOAuthToken)();
    const config = ((_b = dependencies.getConfig) != null ? _b : getConfig)(["gsc"]);
    const searchAnalytics = (_c = dependencies.searchAnalytics) != null ? _c : fetchSearchAnalytics;
    return searchAnalytics({
      siteUrl: config.gscProperty,
      startDate,
      endDate,
      dimensions: ["date", "page", "query"],
      aggregationType: "auto",
      accessToken
    }).length;
  }

  // seo/apps-script/src/Menu.ts
  var GSC_INDEXING_SCHEMA_RECOVERY_URL = "https://github.com/heraklist/evochia_site/blob/main/docs/seo/seo-data-hub-production-runbook.md#canonical-sheet-and-schema-ownership";
  function isIsoCalendarDate2(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  function promptText(ui, title, message) {
    const response = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() !== ui.Button.OK) return null;
    return response.getResponseText().trim();
  }
  function onOpen() {
    SpreadsheetApp.getUi().createMenu("Evochia SEO").addItem("Verify configuration", "verifyConfiguration").addItem("Set up workbook", "setupWorkbookFromMenu").addSeparator().addItem("Run daily import", "runDailyImport").addItem("Run range import", "runRangeImportFromMenu").addToUi();
  }
  function verifyConfiguration() {
    const ui = SpreadsheetApp.getUi();
    try {
      const capabilities = ["workbook", "gsc", "ga4"];
      const config = getConfig(capabilities);
      const result = verifyConfig(config, capabilities);
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
      ensureOperationalMetadata();
      ui.alert(
        "Evochia SEO workbook",
        "Required sheets are present. Re-running setup is safe.",
        ui.ButtonSet.OK
      );
    } catch (error) {
      const detail = error instanceof SchemaError ? `${String(error)}
Recovery: ${GSC_INDEXING_SCHEMA_RECOVERY_URL}` : String(error);
      ui.alert("Evochia SEO workbook", detail, ui.ButtonSet.OK);
    }
  }
  function runRangeImportFromMenu() {
    const ui = SpreadsheetApp.getUi();
    try {
      const startDate = promptText(ui, "Evochia SEO range", "Start date (YYYY-MM-DD)");
      if (startDate == null) return;
      const endDate = promptText(ui, "Evochia SEO range", "End date (YYYY-MM-DD)");
      if (endDate == null) return;
      if (!isIsoCalendarDate2(startDate) || !isIsoCalendarDate2(endDate) || startDate > endDate) {
        throw new Error("Range requires valid YYYY-MM-DD dates with startDate <= endDate");
      }
      const mode = promptText(
        ui,
        "Evochia SEO range",
        'Mode: enter exactly "Measure only" or "Import range"'
      );
      if (mode == null) return;
      if (mode === "Measure only") {
        const count = measurePageQueryRows(startDate, endDate);
        ui.alert("Evochia SEO range", `GSC Page Queries rows: ${count}`, ui.ButtonSet.OK);
        return;
      }
      if (mode === "Import range") {
        const result = runRangeImport(startDate, endDate);
        ui.alert(
          "Evochia SEO range",
          `GSC range import complete through ${result.dataAsOf}.`,
          ui.ButtonSet.OK
        );
        return;
      }
      throw new Error('Mode must be exactly "Measure only" or "Import range"');
    } catch (error) {
      ui.alert("Evochia SEO range", String(error), ui.ButtonSet.OK);
    }
  }

  // seo/apps-script/entrypoints/production.ts
  function runDailyImport2() {
    return runDailyImport();
  }
  var host = globalThis;
  var registry = host.__evochiaAppsScriptEntrypoints__ || {};
  host.__evochiaAppsScriptEntrypoints__ = registry;
  registry.onOpen = onOpen;
  registry.setupWorkbookFromMenu = setupWorkbookFromMenu;
  registry.verifyConfiguration = verifyConfiguration;
  registry.runDailyImport = runDailyImport2;
  registry.runRangeImportFromMenu = runRangeImportFromMenu;
})();
function onOpen() {
  return globalThis.__evochiaAppsScriptEntrypoints__.onOpen.apply(this, arguments);
}
function setupWorkbookFromMenu() {
  return globalThis.__evochiaAppsScriptEntrypoints__.setupWorkbookFromMenu.apply(this, arguments);
}
function verifyConfiguration() {
  return globalThis.__evochiaAppsScriptEntrypoints__.verifyConfiguration.apply(this, arguments);
}
function runDailyImport() {
  return globalThis.__evochiaAppsScriptEntrypoints__.runDailyImport.apply(this, arguments);
}
function runRangeImportFromMenu() {
  return globalThis.__evochiaAppsScriptEntrypoints__.runRangeImportFromMenu.apply(this, arguments);
}
