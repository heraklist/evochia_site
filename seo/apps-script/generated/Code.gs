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

  // seo/apps-script/src/Config.ts
  var CONFIG_PROPERTY_KEY = "SEO_GOOGLE_RESOURCES_JSON";
  var CAPABILITY_RESOURCES = {
    workbook: ["sheetId"],
    gsc: ["gscProperty"],
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
  function verifyConfig(config, capabilities = ["workbook"]) {
    const errors = [];
    const required = requiredResources(capabilities);
    for (const key of required) {
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
    if (required.has("ga4PropertyTimeZone") && typeof config.ga4PropertyTimeZone === "string" && config.ga4PropertyTimeZone !== "UNVERIFIED" && !isValidIanaTimeZone(config.ga4PropertyTimeZone)) {
      errors.push("ga4PropertyTimeZone must be a valid IANA timezone");
    }
    if (required.has("productionHostname") && typeof config.productionHostname === "string" && config.productionHostname !== "UNVERIFIED" && !isValidHostname(config.productionHostname)) {
      errors.push("productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot");
    }
    if (required.has("ga4PropertyId") && typeof config.ga4PropertyId === "string" && config.ga4PropertyId !== "UNVERIFIED" && !/^\d+$/.test(config.ga4PropertyId)) {
      errors.push("ga4PropertyId must contain digits only");
    }
    return { ok: errors.length === 0, errors };
  }
  function getConfig(capabilities = ["workbook"]) {
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
    const result = verifyConfig(parsed, capabilities);
    if (!result.ok) {
      throw new Error(`SEO configuration is not verified: ${result.errors.join("; ")}`);
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

  // seo/apps-script/src/Jobs.ts
  function defaultNow() {
    return /* @__PURE__ */ new Date();
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
  function overallStatus(gsc, ga4) {
    if (gsc.success && ga4.success) return "SUCCESS";
    if (gsc.success || ga4.success) return "PARTIAL";
    return "FAILED";
  }
  function toRunLogRow(outcome, runId, startedAt, finishedAt, status) {
    return {
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const verifyWorkbook = (_a = dependencies.getVerifiedActiveWorkbook) != null ? _a : (() => getVerifiedActiveWorkbook());
    verifyWorkbook();
    const now = (_b = dependencies.now) != null ? _b : defaultNow;
    const started = now();
    const startedAt = started.toISOString();
    const runId = ((_c = dependencies.createRunId) != null ? _c : defaultRunId)();
    const accessToken = ((_d = dependencies.getOAuthToken) != null ? _d : defaultOAuthToken)();
    const configReader = (_e = dependencies.getConfig) != null ? _e : getConfig;
    const importGsc = (_f = dependencies.importGscDay) != null ? _f : importSearchAnalyticsDay;
    const importGa4 = (_g = dependencies.importGa4) != null ? _g : importGa4Reports;
    const writer = (_h = dependencies.writeRows) != null ? _h : upsertRows;
    const updateFreshness = (_i = dependencies.updateFreshness) != null ? _i : updateOperationalFreshness;
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
    const finishedAt = now().toISOString();
    const rows = [
      toRunLogRow(gsc, runId, startedAt, finishedAt, status),
      toRunLogRow(ga4, runId, startedAt, finishedAt, status)
    ];
    writer("Run Log", ["runId", "source"], rows);
    updateFreshness({
      gsc: { success: gsc.success, dataAsOf: gsc.success ? gsc.dataAsOf : void 0 },
      ga4: { success: ga4.success, dataAsOf: ga4.success ? ga4.dataAsOf : void 0 },
      lastRun: finishedAt,
      status
    });
    return { runId, status, sources: { gsc, ga4 } };
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
    var _a;
    const setupSheets = (_a = dependencies.ensureWorkbookSheets) != null ? _a : ensureWorkbookSheets;
    setupSheets(dependencies.getVerifiedActiveWorkbook());
  }

  // seo/apps-script/src/Menu.ts
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
      ui.alert("Evochia SEO workbook", String(error), ui.ButtonSet.OK);
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
