# GSC URL Inspection Telemetry Implementation Plan — Amendment 1

Date: 2026-09-02
Status: Blocking implementation-plan corrections approved before Task 1
Applies to: `docs/superpowers/plans/2026-09-02-gsc-url-inspection-telemetry-implementation.md`

This amendment overrides only the implementation details below. The approved design/spec and all unaffected plan requirements remain binding.

## A. Canonical comparison must not use the WHATWG `URL` API

The Google Apps Script V8 runtime does not provide the Web APIs `URL` or `URLSearchParams`. Node-based tests would therefore give false confidence if production canonical comparison used `new URL()`.

Task 3 must implement canonical comparison using a string-level parser/normalizer that changes only the three approved non-semantic components:

- lowercase the hostname only;
- remove an explicit default port (`:80` for `http`, `:443` for `https`) only;
- remove the fragment beginning at `#` only.

It must not parse-and-reserialize through WHATWG `URL` or any browser/Node URL global, because that can normalize additional syntax that the contract requires to remain significant.

Add the table-driven case:

```text
https://example.com/%7Efoo
https://example.com/~foo
→ MISMATCH
```

Path text, percent-encoding, trailing slash, query text, scheme, `www`, and path casing must remain byte/text significant except for the three explicit transformations above.

## B. `monitoredUrls` is optional in parsed configuration and required only by `gscIndex`

Task 1 must define:

```ts
export interface SeoConfig {
  gscProperty: string;
  monitoredUrls?: string[];
  // existing fields unchanged
}
```

The base `SEO_GOOGLE_RESOURCES_JSON` parser must accept a configuration object in which `monitoredUrls` is absent.

Capability validation owns requiredness:

```text
verifyConfig(..., ['gsc'])
  → valid when monitoredUrls is absent

verifyConfig(..., ['gscIndex'])
  → ConfigurationError when monitoredUrls is absent
```

This is required for the production activation sequence that intentionally observes `GSC_INDEX FAILED / ConfigurationError` before the Script Property is extended, while canonical GSC and GA4 continue successfully.

Task 1 RED coverage must include a fixture with the `monitoredUrls` key completely absent, not merely malformed or empty.

## C. Task-local clarifications to apply when those tasks execute

These are not separate blockers for Task 1, but they are binding rulings for their respective tasks:

1. **Task 1 route-existence test:** resolve repository routes from an explicit known repository root (for example `fileURLToPath(new URL('../../../..', import.meta.url))` in Node test code or an equivalent deterministic root helper). Do not depend on `process.cwd()`.
2. **Task 2 scalar provider values:** do not silently coerce `null`, arrays, or objects to strings. Define and test one explicit provider-shape rule consistent with malformed-response protection. The implementation may accept strings (and only strings) as scalar provider values; any present non-string scalar value should be treated as malformed unless the actual provider contract requires a documented alternative.
3. **Task 5 existing `inspectMonitoredUrls()`:** decide explicitly whether the function becomes the new isolated batch collector, delegates to it, or is retired. Preserve or deliberately replace its existing allowlist/canonical tests; do not leave two competing inspection paths.
4. **Task 7 range prohibition:** the first range test is a characterization test that should pass against current behavior. The final implementation contract must make the prohibition structural: range/measure orchestration must have no inspection-stage call path regardless of whether a future config object contains valid `monitoredUrls`.

## D. TDD effect

No production code may be written for either blocking correction before its corresponding RED test has been executed and observed failing for the intended reason.
