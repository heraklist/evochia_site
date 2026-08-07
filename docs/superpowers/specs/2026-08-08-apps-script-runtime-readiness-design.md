# Apps Script Runtime Readiness Design

**Status:** Approved for written-spec review

**Scope:** Reproducible Apps Script build output, committed-bundle equivalence CI, shared runtime utilities, and a data-free non-production GAS V8 smoke gate for PR #35 (`seo-system` -> `main`).

## Context

The Apps Script source is currently TypeScript using ES modules. Node CI validates the TypeScript source, but Apps Script V8 does not execute repository ES-module source directly. A production-ready path therefore needs a deterministic transform into deployable Apps Script code and evidence that the generated code actually executes in the GAS V8 runtime.

The recent `URLSearchParams` defect demonstrated an important environment gap: Node can expose globals that Apps Script V8 does not. Node tests remain necessary but are not sufficient as the final runtime-compatibility gate.

This batch deliberately separates runtime/build readiness from later production orchestration. It does not add live GA4/GSC imports, production triggers, or production deployment.

## Goals

1. Produce deterministic Apps Script-compatible build artifacts from the version-controlled TypeScript source.
2. Commit the deployable generated bundle and make stale or hand-edited output impossible to pass CI through an exact bundle-equivalence check.
3. Keep Node unit/type/regression tests as the fast everyday gate while adding a documented real GAS V8 smoke gate before production trust.
4. Run the GAS smoke only in a dedicated non-production Apps Script project bound to a synthetic test Sheet.
5. Keep the runtime smoke data-free: no real GA4/GSC/GTM calls and no production Sheet access.
6. Extract the duplicated hostname-validation and timezone-calendar primitives into shared Apps Script runtime utilities without changing behavior.
7. Record smoke-test evidence in an auditable, repeatable form.
8. Preserve the existing governance boundary: no Google-side write occurs without a separate explicit owner instruction.

## Non-goals

This batch does not:

- deploy or push code to the production Apps Script project;
- create or install production or test triggers;
- authorize GA4, GSC, or GTM scopes for the smoke project;
- call real GA4, GSC, or GTM APIs from the smoke test;
- write any production Sheet;
- implement production `Refresh GA4` / `Refresh GSC` orchestration;
- wire importer bundles to production `upsertRows` calls;
- add GTM monitoring/fingerprinting;
- refactor the site analytics consent-state `window.__EVOCHIA_CONSENT_STATE__` coupling;
- build a permanent cloud-hosted clasp CI system when a documented repeatable owner-triggered smoke is sufficient.

## Architecture

The design has four layers:

1. **TypeScript source** under `seo/apps-script/src/` remains the source of truth.
2. **Deterministic build** transforms that source into Apps Script-compatible generated output with no runtime `import`/`export` statements.
3. **Committed deploy artifact + equivalence CI** stores the generated deploy bundle in the repository and fails CI unless a fresh clean build is byte-for-byte identical to it.
4. **Real GAS V8 smoke** executes selected data-free entrypoints in a dedicated non-production Apps Script project only after explicit owner approval for the Google-side push.

The committed bundle is never an independent source of truth. It is a reproducible derivative of the TypeScript source and must never be hand-edited.

## Build contract

### Source of truth

All behavior changes are made in TypeScript source and covered by source-level tests first. Generated Apps Script files must not be hand-edited.

### Output properties

The build must be deterministic for identical source, lockfile, Node version family, and build configuration.

The generated Apps Script artifact must:

- contain no unresolved ES-module `import` or `export` syntax;
- preserve top-level callable Apps Script entrypoints required by the runtime;
- preserve Apps Script global references such as `SpreadsheetApp`, `PropertiesService`, and `UrlFetchApp` without browser polyfill assumptions;
- avoid introducing browser-only globals;
- be reproducible through a documented npm script;
- be suitable for `clasp push` into a dedicated test Apps Script project.

The implementation plan may choose a minimal bundler such as esbuild or an equivalent deterministic tool. The build tool must be lockfile-pinned as a development dependency.

## Committed bundle-equivalence CI invariant

The deployable Apps Script bundle is a tracked repository artifact. It is acceptable only when it is exactly the deterministic output of the current source tree.

CI must:

1. build from source into a clean temporary output location;
2. compare that fresh output byte-for-byte against the committed deploy artifact;
3. fail if any difference exists.

This check must catch both stale generated files and manual edits to generated output. A build that succeeds but differs from the committed bundle is a CI failure.

The repository should expose reproducible commands conceptually equivalent to:

```text
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

Exact command names are implementation details, but the invariant is mandatory. The normal `SEO Data Hub Validation` workflow must run the bundle-equivalence check after dependency installation and before reporting success.

The committed deploy artifact should live under a clearly generated directory within `seo/apps-script/`; the implementation plan will choose the exact path once the bundler output shape is known. Whatever path is chosen becomes the sole tracked deploy artifact and is covered by the equivalence check.

## Generated-artifact policy

Generated Apps Script output must be clearly marked as generated and must identify its source/build command in a header or adjacent README.

Generated output must not contain:

- OAuth tokens;
- Google credentials;
- Script IDs;
- Sheet IDs;
- production resource IDs beyond values already intentionally present in source/config fixtures;
- machine-specific absolute paths;
- timestamps or nondeterministic banners that would break byte-for-byte reproducibility.

## Non-production GAS V8 smoke environment

### Isolation

The runtime smoke executes only in:

- a dedicated non-production Apps Script project;
- a synthetic non-production Google Sheet when a bound Sheet is required;
- an owner-controlled test environment with no connection to production data.

The test Apps Script project and synthetic Sheet are not production resources and must be unmistakably named/documented as test-only.

### Authorization boundary

Writing the repository build/runbook does **not** authorize creation of the test project, test Sheet, or a `clasp push`.

The first Google-side write requires a separate explicit owner instruction in the conversation. The same applies to any later push/update of the test project unless the owner has explicitly authorized that specific execution/session under an agreed procedure.

No production Apps Script project is ever used for this smoke gate.

### No triggers

The smoke project must not install time-driven, edit, open, or other triggers as part of this batch.

## Minimal smoke-project OAuth footprint

The smoke is for runtime compatibility, not data access.

The test manifest should use only the minimum scopes necessary to execute the selected smoke logic and, if required, interact with the synthetic bound Sheet. It must not request GA4, GSC, or GTM API scopes solely for the smoke.

If pure/runtime tests can run without Sheet access, they should. Any Sheet assertion must target only the synthetic test Sheet.

## Data-free smoke contract

The real GAS V8 smoke must execute bundled production logic, not a separate reimplementation of it.

It must verify at least:

1. **Named-timezone calendar behavior** — the shared timezone helper handles `Europe/Athens` and known DST/calendar boundary cases correctly.
2. **Apps-Script-safe query parsing** — URL-quality classification works without relying on `URLSearchParams` or another browser-only global.
3. **Page classification** — language/service classification preserves raw path identity and handles trailing-slash comparison behavior as designed.
4. **URL-quality classification** — tracking parameters, unexpected parameters, double slashes, legacy `.html`, preview hosts, and non-production hosts produce deterministic classifications.
5. **Hostname validation** — the shared validator accepts/rejects the same shapes as repository tests.
6. **Configuration validation** — synthetic valid and invalid config fixtures exercise the fail-closed contract without reading production Script Properties.
7. **Importer assembly** — GA4 and GSC importer logic can execute with injected synthetic/mock transports and deterministic synthetic API responses.
8. **Sparse/error semantics** — empty/sparse synthetic responses remain empty and expected synthetic transport failures propagate as typed/explicit errors.

The smoke must not:

- call live GA4/GSC/GTM endpoints;
- depend on real OAuth access tokens;
- fetch production Script Properties;
- mutate production resources;
- require network access to prove pure importer/classification behavior.

## Smoke entrypoint design

Provide one explicit test-only GAS entrypoint, conceptually `runRuntimeSmoke()`, that:

- executes a fixed suite of deterministic assertions;
- returns or logs a compact structured result containing pass/fail, individual check names, and the source/build revision identifier if available;
- throws or clearly fails when any assertion fails;
- performs no external data collection.

The smoke entrypoint must be structurally isolated from production menu/refresh entrypoints so it cannot be mistaken for a production workflow.

## Evidence and auditability

Each real GAS V8 smoke execution used as a readiness gate must leave auditable evidence.

The canonical repository location is:

```text
docs/reports/apps-script-runtime-smoke/
```

For each accepted gate execution, record a short Markdown evidence note named with the execution date, for example:

```text
docs/reports/apps-script-runtime-smoke/2026-08-08.md
```

The evidence note must include:

- source branch and commit SHA tested;
- generated bundle identity/hash if the build exposes one;
- non-production project label, without secrets or credentials;
- date/time of execution;
- smoke result (pass/fail);
- individual check summary;
- operator confirmation that no real GA4/GSC/GTM calls and no production Sheet writes occurred.

Do not commit OAuth tokens, refresh tokens, cookies, Script IDs if treated as private operational identifiers, or synthetic Sheet IDs unless the owner explicitly decides they are non-sensitive and useful. The default is placeholders/redaction.

The first evidence note is created only after an owner-authorized real smoke execution. The implementation batch may add the directory/runbook template without fabricating a successful execution.

## Test-project identifiers and secrets

The repository must not contain credentials.

A `.clasp.json` containing a real test Script ID must not be committed by default. Provide either:

- a clearly marked `.clasp.json.example` with placeholder values; or
- documented local creation/configuration commands.

Any real local `.clasp.json` and equivalent operator-specific files must be ignored by git. The same default applies to synthetic Sheet IDs and operator-specific smoke configuration.

## Shared runtime utilities

This batch may extract only utilities that directly support the runtime/build boundary and eliminate already-observed duplication.

### Calendar utility

Create one shared Apps Script-compatible helper for named-timezone calendar extraction/formatting used by GA4 availability dates, GSC availability dates, and Sheet date-key normalization where semantics match.

The refactor must preserve existing tests for:

- `America/Los_Angeles` GSC boundaries;
- `Europe/Athens` GA4 boundaries;
- DST behavior;
- Sheet date-key timezone normalization.

No source calendar is changed by the refactor.

### Hostname utility

Create one shared validator implementing the existing production-hostname contract and reuse it in configuration validation and GA4 runtime validation.

No hostname acceptance policy changes in this refactor unless separately justified by a failing behavioral test.

## Runtime compatibility discipline

The TypeScript configuration currently includes DOM libraries for the wider repository. Their presence must not be treated as evidence that browser globals exist in Apps Script V8.

For Apps Script production code, any newly introduced global/API must be evaluated against GAS V8 compatibility. When practical, add an environment-gap regression test analogous to the `URLSearchParams` test if Node exposes a global that GAS does not.

The real GAS smoke remains the final runtime compatibility proof.

## CI and test requirements

Before this batch is considered code-complete, repository CI must verify:

1. all existing root SEO contract tests pass;
2. all Apps Script unit/regression tests pass;
3. TypeScript validation passes;
4. site analytics regression tests remain green;
5. Apps Script build succeeds from a clean dependency install;
6. generated output contains no unresolved module syntax;
7. committed-bundle equivalence/build-diff check passes;
8. generated output contains no obvious committed credentials/real local clasp configuration;
9. shared calendar refactor preserves all current source-calendar/DST behavior;
10. shared hostname refactor preserves existing validation behavior.

A real GAS V8 smoke is a **production-readiness gate**, but because it requires an owner-authorized Google-side write it is not automatically executed by ordinary GitHub CI.

## Runbook contract

Add a concise operator runbook that separates repository-only steps from Google-side steps.

### Repository-only steps

These may be implemented and executed without Google-side authorization:

1. install locked dependencies;
2. run source tests/typecheck;
3. build Apps Script artifact;
4. run committed-bundle equivalence check;
5. inspect generated manifest/output;
6. prepare placeholder/local clasp configuration instructions.

### Google-side steps

These are blocked until explicit owner approval:

1. create/select the dedicated non-production Apps Script project and synthetic Sheet;
2. configure local clasp against that test project;
3. push the generated artifact to the test project;
4. run the data-free V8 smoke entrypoint;
5. record real smoke evidence.

The runbook must explicitly warn against substituting the production Apps Script project.

## Error behavior

- Build failure blocks the batch.
- Committed-bundle equivalence mismatch blocks CI.
- Presence of unresolved module syntax blocks CI.
- Smoke assertion failure blocks production-readiness status.
- Missing/invalid local test-project configuration blocks only the Google-side smoke step, not source CI.
- No smoke failure may trigger an automatic fallback to production resources.
- No failed smoke may install triggers or attempt live API calls as a diagnostic shortcut.

## Acceptance criteria

The repository portion of this design is accepted when:

- Apps Script source builds deterministically into a deployable V8-compatible artifact;
- the deployable generated bundle is committed to the repository;
- CI proves that committed bundle is byte-for-byte identical to a clean fresh build from the current source;
- generated output cannot silently drift from tested TypeScript source;
- shared hostname and calendar helpers replace the targeted duplication without behavior changes;
- a documented data-free smoke entrypoint and runbook exist;
- no real test Script ID, OAuth secret, or production identifier is newly committed;
- PR #35 remains open/draft and no production deployment occurs.

The system is **not** considered production-runtime-verified until, after a separate explicit owner instruction:

- the generated artifact is pushed to the dedicated non-production Apps Script project;
- the real GAS V8 data-free smoke passes;
- an evidence note is recorded for the exact tested commit;
- the owner confirms that no live GA4/GSC/GTM call and no production Sheet write occurred.

Only after that runtime gate passes may later production orchestration/deployment planning treat Apps Script V8 compatibility as externally verified.
