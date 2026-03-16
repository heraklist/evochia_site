import { cruxTargetRoutes } from "./content-routes.mjs";
import { createSkipReport, fetchWithTimeout, writeJsonReport, writeTextReport } from "./audit-utils.mjs";
import { liveBaseURL } from "./qa-config.mjs";

const apiKey = process.env.CRUX_API_KEY?.trim() || process.env.PAGESPEED_API_KEY?.trim();
const origin = process.env.CRUX_ORIGIN?.trim() || new URL(liveBaseURL).origin;
const urls = (process.env.CRUX_URLS ?? cruxTargetRoutes.map((route) => new URL(route, `${liveBaseURL}/`).toString()).join(","))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const formFactors = (process.env.CRUX_FORM_FACTORS ?? "PHONE,DESKTOP")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

if (!apiKey) {
  const summary = createSkipReport("check-crux", "CRUX_API_KEY is not configured.");
  writeJsonReport(["crux", "crux.json"], summary);
  process.exit(0);
}

const endpoint = new URL("https://chromeuxreport.googleapis.com/v1/records:queryRecord");
endpoint.searchParams.set("key", apiKey);

try {
  const rows = [];
  for (const formFactor of formFactors) {
    rows.push(await queryRecord({ origin, formFactor, label: `origin:${origin}` }));

    for (const url of urls) {
      rows.push(await queryRecord({ url, formFactor, label: `url:${url}` }));
    }
  }
  
  const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
  const warningCount = rows.reduce((sum, row) => sum + row.warnings.length, 0);
  const summary = {
    tool: "check-crux",
    status: errorCount ? "failed" : warningCount ? "warning" : "passed",
    origin,
    urls,
    formFactors,
    errorCount,
    warningCount,
    rows,
  };

  writeJsonReport(["crux", "crux.json"], summary);
  writeTextReport(
    ["crux", "crux.md"],
    [
      "# CrUX",
      "",
      `- Status: ${summary.status}`,
      `- Origin: ${summary.origin}`,
      `- URLs: ${summary.urls.join(", ")}`,
      `- Errors: ${summary.errorCount}`,
      `- Warnings: ${summary.warningCount}`,
    ].join("\n"),
  );

  console.table(
    rows.map((row) => ({
      label: row.label,
      formFactor: row.formFactor,
      available: row.available,
      lcpP75: row.metrics.lcpMs,
      inpP75: row.metrics.inpMs,
      clsP75: row.metrics.cls,
      errors: row.errors.length,
      warnings: row.warnings.length,
    })),
  );

  if (errorCount) {
    process.exit(1);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const status = /SERVICE_DISABLED|Chrome UX Report API has not been used|PERMISSION_DENIED/i.test(message)
    ? "skipped"
    : "failed";
  const summary = {
    tool: "check-crux",
    status,
    origin,
    urls,
    formFactors,
    errorCount: status === "failed" ? 1 : 0,
    warningCount: 0,
    rows: [],
    reason: message,
  };

  writeJsonReport(["crux", "crux.json"], summary);
  writeTextReport(["crux", "crux.md"], `# CrUX\n\n- Status: ${status}\n- Reason: ${message}\n`);

  if (status === "failed") {
    process.exit(1);
  }
}

async function queryRecord({ origin: targetOrigin, url, formFactor, label }) {
  const body = url ? { url, formFactor } : { origin: targetOrigin, formFactor };
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: 15_000,
  });

  if (response.status === 404) {
    return {
      label,
      formFactor,
      available: false,
      metrics: { lcpMs: null, inpMs: null, cls: null, ttfbMs: null },
      errors: [],
      warnings: ["No CrUX data is available for this key/form factor."],
    };
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`CrUX request failed for ${label} (${formFactor}): ${response.status} ${message}`);
  }

  const payload = await response.json();
  const metrics = {
    lcpMs: payload.record?.metrics?.largest_contentful_paint?.percentiles?.p75 ?? null,
    inpMs: payload.record?.metrics?.interaction_to_next_paint?.percentiles?.p75 ?? null,
    cls: payload.record?.metrics?.cumulative_layout_shift?.percentiles?.p75 ?? null,
    ttfbMs:
      payload.record?.metrics?.experimental_time_to_first_byte?.percentiles?.p75 ?? null,
  };
  const errors = [];
  const warnings = [];

  if (formFactor === "PHONE") {
    if (metrics.lcpMs != null && metrics.lcpMs > 2500) {
      errors.push(`LCP p75 ${metrics.lcpMs} ms exceeds 2500 ms.`);
    }
    if (metrics.inpMs != null && metrics.inpMs > 200) {
      errors.push(`INP p75 ${metrics.inpMs} ms exceeds 200 ms.`);
    }
    if (metrics.cls != null && metrics.cls > 0.1) {
      errors.push(`CLS p75 ${metrics.cls.toFixed(3)} exceeds 0.1.`);
    }
  } else {
    if (metrics.lcpMs != null && metrics.lcpMs > 2500) {
      warnings.push(`LCP p75 ${metrics.lcpMs} ms exceeds 2500 ms.`);
    }
    if (metrics.inpMs != null && metrics.inpMs > 200) {
      warnings.push(`INP p75 ${metrics.inpMs} ms exceeds 200 ms.`);
    }
    if (metrics.cls != null && metrics.cls > 0.1) {
      warnings.push(`CLS p75 ${metrics.cls.toFixed(3)} exceeds 0.1.`);
    }
  }

  return {
    label,
    formFactor,
    available: true,
    collectionPeriod: payload.record?.collectionPeriod ?? null,
    metrics,
    errors,
    warnings,
  };
}
