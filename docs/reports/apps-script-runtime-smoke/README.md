# Apps Script Runtime Smoke Evidence Schema

This directory stores evidence for future owner-authorized real Google Apps Script V8 smoke executions. This README is a schema/template only. Its presence is **not** evidence that any smoke has run.

Create a dated evidence note only after an actual non-production V8 execution:

```markdown
# Apps Script Runtime Smoke Evidence — YYYY-MM-DD

- Tested branch:
- Tested commit SHA:
- Smoke bundle SHA-256:
- Non-production project label (redacted identifier):
- Execution timestamp:
- Overall result: PASS | FAIL
- Named checks:
  - athens_calendar_dst:
  - gsc_los_angeles_calendar:
  - url_query_parser:
  - page_classification:
  - url_quality_classification:
  - hostname_validation:
  - config_validation:
  - ga4_import_assembly:
  - gsc_import_assembly:
  - sparse_and_error_semantics:
- Operator confirmation: no live GA4/GSC/GTM requests; no production Sheet writes; no triggers installed.
- Notes:
```

Do not record raw Script IDs, Sheet IDs, OAuth tokens, cookies, access/refresh tokens, or other credentials. If the smoke fails, preserve the failing check names and concise error details, but redact any environment identifiers before committing the note.
