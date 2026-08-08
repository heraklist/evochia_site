# Apps Script Runtime Readiness Design

**Status:** Approved for implementation planning

**Scope:** Reproducible Apps Script build output, committed-bundle equivalence CI, GAS-scoped compile-time compatibility checks, shared runtime utilities, and a data-free non-production GAS V8 smoke gate for PR #35 (`seo-system` -> `main`).

## Context

The Apps Script source is TypeScript using ES modules. Node CI validates the TypeScript source, but Apps Script V8 does not execute repository ES-module source directly. A production-ready path therefore needs a deterministic transform into deployable Apps Script code and evidence that the generated code actually executes in the GAS V8 runtime.

The recent `URLSearchParams` defect exposed two separate environment gaps:

1. the root TypeScript configuration includes DOM libraries, so browser-only globals can typecheck even though Apps Script V8 does not provide them;
2. Node tests can expose globals or runtime behavior that GAS V8 does not.

This design closes both gaps: a GAS-scoped no-DOM TypeScript compile gate catches browser-only APIs early, while a real GAS V8 smoke remains the final runtime proof.

This batch deliberately separates runtime/build readiness from later production orchestration. It does not add live GA4/GSC imports, production triggers, or production deployment.

## Goals

1. Produce deterministic Apps Script-compatible build artifacts from the version-controlled TypeScript source.
2. Commit the deployable generated bundle and make stale or hand-edited output impossible to pass CI through an exact bundle-equivalence check.
3. Add a GAS-specific TypeScript configuration with no DOM libraries so browser-only globals become compile errors in normal CI.
4. Keep Node unit/type/regression tests as the fast everyday gate while adding a documented real GAS V8 smoke gate before production trust.
5. Run the GAS smoke only in a dedicated non-production Apps Script project and, if a bound Sheet is required, a synthetic non-production Sheet.
6. Keep the runtime smoke data-free: no real GA4/GSC/GTM calls and no production Sheet access.
7. Extract duplicated hostname-validation and timezone-calendar primitives into shared Apps Script runtime utilities without changing behavior.
8. Record smoke-test evidence in an auditable, repeatable form.
9. Preserve the existing governance boundary: no Google-side write occurs without a separate explicit owner instruction.

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

The design has five layers:

1. **TypeScript source** under `seo/apps-script/src/` remains the source of truth.
2. **GAS-scoped compile gate** typechecks that source without DOM libraries and with Google Apps Script types only.
3. **Deterministic build** transforms source into Apps Script-compatible generated output with no runtime `import`/`export` statements.
4. **Committed deploy artifact + equivalence CI** stores generated artifacts in the repository and fails CI unless a fresh clean build is byte-for-byte identical.
5. **Real GAS V8 smoke** executes selected data-free production logic in a dedicated non-production Apps Script project only after explicit owner approval for the Google-side push.

Generated bundles are never independent sources of truth. They are reproducible derivatives of the TypeScript source and must never be hand-edited.

## GAS-scoped TypeScript compile contract

Create a dedicated Apps Script TypeScript configuration, separate from the wider repository configuration.

It must:

- include only `seo/apps-script/src/**/*.ts` and any explicitly designated Apps Script runtime-smoke source;
- use an ECMAScript library set without `DOM` or `DOM.Iterable`;
- use `types: ["google-apps-script"]` for production Apps Script source;
- keep strict type checking;
- run on every normal SEO validation CI execution;
- make browser-only globals such as `URLSearchParams`, `window`, `document`, `fetch`, and `localStorage` compile errors unless an explicitly reviewed compatibility shim is introduced.

The existing repository-wide TypeScript configuration may continue to include DOM types for browser/site code. Passing the root typecheck alone is not evidence of Apps Script compatibility; the GAS-scoped typecheck is mandatory.

The implementation must expose this through a stable command and integrate it into the normal `npm run typecheck` or the mandatory SEO validation workflow so it cannot be accidentally skipped.

## Build contract

### Source of truth

All behavior changes are made in TypeScript source and covered by source-level tests first. Generated Apps Script files must not be hand-edited.

### Pinned build environment

Bundle equivalence must be reproducible under a pinned build environment, not merely a broad Node version family.

The implementation must:

- pin the Node version used by repository documentation and SEO CI;
- make the SEO workflow consume that same pinned version rather than an unconstrained floating major;
- exact-pin the bundler and clasp/tooling dependencies through `package.json`/`package-lock.json`;
- document the required build environment in the runtime-readiness runbook.

The CI byte-for-byte comparison remains authoritative. A contributor using a different local runtime must reproduce under the pinned environment before treating a local mismatch as a source change.

### Output properties

The generated Apps Script artifacts must:

- contain no unresolved ES-module `import` or `export` syntax;
- preserve top-level callable Apps Script entrypoints required by the runtime;
- preserve Apps Script global references such as `SpreadsheetApp`, `PropertiesService`, and `UrlFetchApp` without browser polyfill assumptions;
- avoid introducing browser-only globals;
- be reproducible through documented npm scripts;
- be suitable for `clasp push` into a dedicated test Apps Script project.

Use a minimal deterministic bundler. The implementation plan may select esbuild or an equivalent tool, but it must be exact-pinned in the lockfile.

## Production bundle and smoke bundle separation

The repository must produce two separate build targets from the same production source graph:

1. **Production deploy bundle** — contains only production Apps Script entrypoints and production logic. It must not contain `runRuntimeSmoke()` or other test-only callable entrypoints.
2. **Smoke bundle** — imports and bundles the same production logic needed for runtime verification, plus the test-only `runRuntimeSmoke()` entrypoint and its synthetic fixtures/assertions.

The smoke bundle must exercise production implementations rather than duplicate their logic. It may contain smoke-only wrappers and synthetic fixtures, but those wrappers/fixtures must not be part of the production deploy artifact.

Both generated targets are deterministic and covered by bundle-equivalence CI if they are tracked for deployment/smoke use.

## Committed bundle-equivalence CI invariant

Deployable/smoke generated artifacts are tracked repository outputs. They are acceptable only when they exactly match a deterministic fresh build from the current source tree.

CI must:

1. build from source into a clean temporary output location;
2. compare the fresh output byte-for-byte against the committed generated artifacts;
3. fail if any difference exists.

This check must catch both stale generated files and manual edits. A build that succeeds but differs from the committed artifacts is a CI failure.

The repository must expose stable commands conceptually equivalent to:

```text
npm run seo:build:apps-script
npm run seo:check:apps-script-bundle
```

The normal `SEO Data Hub Validation` workflow must run the GAS-scoped typecheck, build, unresolved-module check, and bundle-equivalence check before reporting success.

Generated output should live under a clearly generated directory within `seo/apps-script/`. Exact paths are implementation details selected in the implementation plan.

## Generated-artifact policy

Generated Apps Script output must be clearly marked as generated and identify its source/build command in a header or adjacent README.

Generated output must not contain:

- OAuth tokens;
- Google credentials;
- Script IDs;
- Sheet IDs;
- machine-specific absolute paths;
- timestamps or nondeterministic banners that would break byte-for-byte reproducibility.

A real `.clasp.json` containing a test Script ID must not be committed by default. The repository may include a clearly marked placeholder example. Real local clasp configuration and equivalent operator-specific files must be ignored by git.

## Non-production GAS V8 smoke environment

### Isolation

The runtime smoke executes only in:

- a dedicated non-production Apps Script project;
- a synthetic non-production Google Sheet only if a bound Sheet is required;
- an owner-controlled test environment with no connection to production data.

The test project/Sheet must be unmistakably identified as non-production.

### Authorization boundary

Writing or executing repository-only build/test commands does **not** authorize creation of the test project, synthetic Sheet, OAuth authorization, or `clasp push`.

The first Google-side write requires a separate explicit owner instruction in the conversation. The same boundary applies to later Google-side smoke actions unless the owner explicitly authorizes that execution under an agreed procedure.

No production Apps Script project is ever used for this smoke gate.

### No triggers

The smoke project must not install time-driven, edit, open, or other triggers in this batch.

## Minimal smoke-project OAuth footprint

The smoke proves runtime compatibility, not data access.

The smoke manifest must request only scopes actually necessary for the test runtime. It must not request GA4, GSC, or GTM API scopes solely for smoke verification.

Pure/runtime checks should run without Sheet access. If a Sheet assertion is later proven necessary, it may target only the synthetic test Sheet after owner authorization.

## Data-free smoke contract

The real GAS V8 smoke must execute bundled production logic, not a separate reimplementation.

It must verify at least:

1. **Named-timezone calendar behavior** — the shared helper handles `Europe/Athens`, `America/Los_Angeles`, and known DST/calendar boundary cases.
2. **Apps-Script-safe query parsing** — URL-quality classification works without browser-only query APIs.
3. **Page classification** — language/service classification preserves raw path identity and trailing-slash comparison behavior.
4. **URL-quality classification** — tracking params, unexpected params, double slashes, legacy `.html`, preview hosts, and non-production hosts are deterministic.
5. **Hostname validation** — the shared validator accepts/rejects the same shapes as repository tests.
6. **Configuration validation** — synthetic valid/invalid fixtures exercise fail-closed validation without reading production Script Properties.
7. **Importer assembly** — GA4 and GSC importer logic executes with injected synthetic/mock transports and deterministic API responses.
8. **Sparse/error semantics** — empty/sparse synthetic responses remain empty and expected synthetic transport failures propagate.

The smoke must not:

- call live GA4/GSC/GTM endpoints;
- depend on real OAuth access tokens;
- fetch production Script Properties;
- mutate production resources;
- require network access to prove importer/classification behavior.

## Smoke entrypoint design

The smoke build provides one explicit test-only GAS entrypoint, `runRuntimeSmoke()`, that:

- executes a fixed suite of deterministic assertions;
- returns/logs a compact structured result containing pass/fail and named check results;
- throws or clearly fails when any assertion fails;
- performs no external data collection.

`runRuntimeSmoke()` must not exist in the production deploy bundle.

## Shared runtime utilities

This batch may extract only utilities that directly support the runtime/build boundary and eliminate already-observed duplication.

### Calendar utility

Create one shared Apps Script-compatible helper for named-timezone calendar extraction/formatting used by GA4 availability dates, GSC availability dates, and Sheet date-key normalization where semantics match.

The refactor must preserve existing tests for:

- `America/Los_Angeles` GSC boundaries;
- `Europe/Athens` GA4 boundaries;
- DST behavior;
- Sheet date-key timezone normalization.

No source calendar changes.

### Hostname utility

Create one shared validator implementing the existing production-hostname contract and reuse it in configuration validation and GA4 runtime validation.

No hostname acceptance-policy change is part of this refactor.

## Runtime compatibility discipline

The GAS-scoped no-DOM tsconfig is the primary compile-time guard against browser-only APIs. Environment-gap regression tests remain useful for bugs that involve runtime semantics or globals not represented accurately by TypeScript types, but they are supplementary rather than the only defense.

Any newly introduced Apps Script global/API must be checked against GAS V8 compatibility. The real GAS smoke remains the final runtime compatibility proof.

## Evidence and auditability

Each real GAS V8 smoke execution used as a readiness gate must leave auditable evidence under:

```text
docs/reports/apps-script-runtime-smoke/
```

For each accepted execution, record a short Markdown evidence note named by execution date, for example:

```text
docs/reports/apps-script-runtime-smoke/2026-08-08.md
```

The evidence note must include:

- source branch and commit SHA tested;
- generated smoke bundle identity/hash if available;
- non-production project label, without secrets/credentials;
- execution date/time;
- pass/fail result;
- named check summary;
- operator confirmation that no real GA4/GSC/GTM calls and no production Sheet writes occurred.

Do not commit OAuth tokens, refresh tokens, cookies, real Script IDs, or synthetic Sheet IDs by default. The first evidence note is created only after an owner-authorized real smoke execution. The repository batch may add a template/runbook without fabricating success evidence.

## CI and test requirements

Before the repository portion of this batch is code-complete, CI must verify:

1. all existing root SEO contract tests pass;
2. all Apps Script unit/regression tests pass;
3. repository-wide TypeScript validation passes;
4. GAS-scoped no-DOM TypeScript validation passes;
5. site analytics regression tests remain green;
6. Apps Script production and smoke builds succeed under the pinned Node/toolchain;
7. generated output contains no unresolved module syntax;
8. committed bundle-equivalence/build-diff passes for all tracked generated targets;
9. generated output contains no obvious credentials/real local clasp configuration;
10. shared calendar refactor preserves all current source-calendar/DST behavior;
11. shared hostname refactor preserves existing validation behavior;
12. the production artifact contains no `runRuntimeSmoke` entrypoint.

A real GAS V8 smoke is a **production-readiness gate**, but because it requires owner-authorized Google-side writes it is not automatically executed by ordinary GitHub CI.

## Runbook contract

Add a concise operator runbook that separates repository-only steps from Google-side steps.

### Repository-only steps

These may be implemented/executed without Google-side authorization:

1. install locked dependencies under the pinned Node version;
2. run source tests and both typecheck layers;
3. build production and smoke Apps Script artifacts;
4. run committed-bundle equivalence;
5. inspect generated manifests/output;
6. prepare placeholder/local clasp configuration instructions.

### Google-side steps

These remain blocked until explicit owner approval:

1. create/select the dedicated non-production Apps Script project and synthetic Sheet if needed;
2. configure local clasp against that test project;
3. push the **smoke artifact only** to the non-production project;
4. run `runRuntimeSmoke()`;
5. record real smoke evidence.

The runbook must explicitly warn against substituting the production Apps Script project.

## Error behavior

- GAS-scoped typecheck failure blocks CI.
- Build failure blocks the batch.
- Committed-bundle equivalence mismatch blocks CI.
- Presence of unresolved module syntax blocks CI.
- Presence of a smoke entrypoint in the production artifact blocks CI.
- Smoke assertion failure blocks production-runtime-readiness status.
- Missing/invalid local test-project configuration blocks only the Google-side smoke step, not source CI.
- No smoke failure may trigger an automatic fallback to production resources, trigger installation, or live API calls.

## Acceptance criteria

The repository portion is accepted when:

- Apps Script source passes a strict no-DOM GAS-scoped compile gate;
- Apps Script source builds deterministically into separate production and smoke V8-compatible artifacts;
- the deploy/smoke generated artifacts used by the workflow are committed;
- CI proves committed artifacts are byte-for-byte identical to clean fresh builds under the pinned toolchain;
- the production artifact contains no test-only smoke entrypoint;
- shared hostname/calendar helpers replace targeted duplication without behavior changes;
- a documented data-free smoke entrypoint and runbook exist;
- no real test Script ID, OAuth secret, or production identifier is newly committed;
- PR #35 remains open/draft and no production deployment occurs.

The system is **not** considered production-runtime-verified until, after a separate explicit owner instruction:

- the smoke artifact is pushed to the dedicated non-production Apps Script project;
- the real GAS V8 data-free smoke passes;
- an evidence note is recorded for the exact tested commit;
- the owner confirms that no live GA4/GSC/GTM call and no production Sheet write occurred.

Only after that runtime gate passes may later production orchestration/deployment planning treat Apps Script V8 compatibility as externally verified.
