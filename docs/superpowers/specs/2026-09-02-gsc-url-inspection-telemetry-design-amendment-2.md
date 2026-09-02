# GSC URL Inspection Telemetry Design — Amendment 2

Date: 2026-09-02
Status: Approved design correction carried into Task 6
Applies to: `docs/superpowers/specs/2026-09-02-gsc-url-inspection-telemetry-design.md`

This amendment supersedes only the schema-width wording described below. All other approved design requirements remain binding.

## Canonical schema scope is the first 19 columns

The canonical `GSC Indexing` schema is defined by the first 19 columns only, in the approved order:

```text
Checked At
Run Id
URL
Outcome
Verdict
Coverage State
Robots.txt State
Indexing State
Page Fetch State
Crawled As
Google Canonical
User Canonical
Canonical Match
Last Crawl Time
Sitemap
Referring URLs
Inspection Result Link
Error Class
Error Message
```

The schema validator must read only the bounded range `A1:S1` (1 row × 19 columns). It must not use `getDataRange()` or infer schema width from cells elsewhere in the sheet.

Consequences:

- fewer than 19 canonical headers -> `SchemaError`;
- reordered or mismatched canonical headers -> `SchemaError`;
- content or notes in columns beyond column 19 do not invalidate the canonical schema and are ignored by schema validation;
- `setupWorkbook()` remains the sole initializer of the canonical 19 headers;
- preflight remains read-only and never repairs or initializes schema.

This correction is intentional. It prevents unrelated cells outside the canonical telemetry range from causing daily `GSC_INDEX` failures and keeps schema-validation cost constant as historical telemetry rows accumulate.

## Task 9 verification interpretation

Where the implementation plan says the fixed 19-column schema must “exactly match the spec,” interpret that as exact equality of the first 19 canonical headers in order, not a prohibition on unrelated columns beyond the canonical range.
