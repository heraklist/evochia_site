# Site Audit — PASS 2 (Verification & Gaps)
## Executive summary (what changed vs Pass 1)
- Verified 11/15 PASS1 items outright, 3 partial, 1 unverified.
- Reclassified `P1-SEO-02` as partial because deployment of `_publish_repo` is not provable from repo alone.
- Added 3 new findings: JS Greek text mojibake, `novalidate` without custom validation, and `og:image` set to `.webp` only.
- No P0 items found; top risks remain i18n URL architecture, CSP hardening, and image delivery strategy.

## Validation matrix
| Pass1-ID | Status (Verified/Partial/Unverified/Incorrect) | Notes | Evidence | Suggested adjustment |
|---|---|---|---|---|
| P1-SEO-01 | Verified | Single URL set with client-side language swap; no hreflang. | `about.html:2` `<html lang="en" class="no-js">`; `js/site.js:112-121` applies `data-en/data-el` text; `index.html:8-22` SEO head shows no `hreflang`. | Build `/el/...` routes and add hreflang/canonical pairs per locale. |
| P1-SEO-02 | Partial | `_publish_repo` duplicate exists, but deploy exposure is unproven. | `_publish_repo/index.html:1-3` duplicate HTML; `vercel.json:1-20` has no rule excluding `/_publish_repo/*`. | Keep as conditional risk: remove/ignore `_publish_repo` in deploy output or block indexing if exposed. |
| P1-SEC-01 | Verified | CSP explicitly allows inline styles; multiple inline `style` attributes exist. | `vercel.json:13-14` includes `style-src 'self' 'unsafe-inline'`; `about.html:80-85` inline `style="..."` present. | Move inline styles to CSS classes and drop `'unsafe-inline'` (or use nonces). |
| P1-PERF-01 | Partial | Preloader overlay exists and is timed; CWV impact is inferred. | `css/site.css:52-55` full-screen fixed preloader; `js/site.js:24-46` timed hide sequence. | Reduce/remove blocking preloader or cap at a minimal duration. |
| P1-PERF-02 | Verified | Content imagery is largely CSS background-based; no responsive image attributes found. | `index.html:232-235` background-image cards; `private-chef.html:91-107` `style="--bg:url(...)"`; repo search for `srcset/sizes/loading="lazy"` returned no matches. | Use `<picture>/<img>` with `srcset`, `sizes`, `loading="lazy"` for content images. |
| P1-UX-01 | Partial | Form collects PII; footer lacks privacy/terms links (compliance need is jurisdictional). | `contact.html:80` form posts to Formspree; `index.html:272-276` footer “Company” only links About/Contact. | Add Privacy/Terms pages and link them from footer + form area. |
| P2-SEO-01 | Verified | `lastmod` missing from sitemap entries. | `sitemap.xml:3-8` URLs include only `loc/changefreq/priority`. | Add `lastmod` values per URL. |
| P2-SEO-02 | Verified | Structured data exists only on homepage. | `index.html:46` has `application/ld+json`; `about.html:1-24` head has no JSON-LD block. | Add WebPage/Breadcrumb schema to inner pages. |
| P2-PERF-03 | Verified | Google Fonts stylesheet is render-blocking. | `about.html:26-29` Google Fonts loaded via `<link rel="stylesheet">`. | Self-host fonts or load non-critically after first render. |
| P2-DX-01 | Verified | 30-day cache + manual `?v=1.0` cache busting. | `vercel.json:26-34` sets 30-day cache for `/css` and `/js`; `about.html:30-31` uses `site.css?v=1.0` and `site.js?v=1.0`. | Use hashed filenames or automated version stamping. |
| P2-A11Y-01 | Verified | Hamburger lacks focus-visible styling; aria-label static. | `css/site.css:127-137` `.hamburger` rules without `:focus-visible`; `about.html:46` `aria-label="Open menu"`; `js/site.js:69-72` toggles only `aria-expanded`. | Add focus-visible styling and toggle aria-label text. |
| P2-A11Y-02 | Verified | No `aria-current` on active nav link. | `about.html:38-43` nav links missing `aria-current`. | Add `aria-current="page"` for active item. |
| P2-UX-02 | Verified | EN/EL mismatch in cuisine heading. | `index.html:194` `data-en-html="A World of <em>Flavor</em>, One Vision"` vs `data-el-html="Τρεις <em>Παραδόσεις</em>, Ένα Όραμα"`. | Align EL copy to EN intent. |
| P2-SEC-02 | Verified | COOP/CORP not present in headers. | `vercel.json:8-16` header list shows no `Cross-Origin-Opener-Policy` or `Cross-Origin-Resource-Policy`. | Add COOP/CORP after compatibility review. |
| P2-A11Y-03 | Unverified | Contrast compliance requires visual testing. | `css/site.css:17` comment notes WCAG tuning but not a measurable pass/fail. | Mark as “needs manual contrast audit” rather than a confirmed issue. |

## Missed findings (new items)
- NEW-01 (P2 UX/A11y): Greek strings in `js/site.js` are mojibake, likely encoding issue; affects language toggle aria-label and form status messages. Evidence: `js/site.js:128-140` shows `Ξ‘Ξ»Ξ»Ξ±Ξ³Ξ®...`; `js/site.js:239-253` shows garbled Greek responses. Suggested fix: re-save `js/site.js` as UTF-8 and replace garbled strings with correct Greek.
- NEW-02 (P2 UX/Sec): Contact form uses `novalidate` with no custom validation, allowing empty required fields to submit. Evidence: `contact.html:80` `novalidate`; `js/site.js:220-234` submits without validation. Suggested fix: remove `novalidate` or add explicit validation before `fetch`.
- NEW-03 (P2 SEO/UX): Social share images use `.webp` only; some platforms still require JPEG/PNG. Evidence: `index.html:17` and `about.html:16` `og:image` points to `.webp`. Suggested fix: provide `.jpg`/`.png` OG image or add fallback meta tags.

## Reprioritized top 15 actions (P0/P1/P2)
1. P1 — Implement localized URLs; why: improve Greek SEO and proper indexing; where: all HTML + routing; minimal fix: create `/el/` page copies and add hreflang/canonical pairs.
2. P1 — Remove CSP `style-src 'unsafe-inline'`; why: hardens CSP against inline injection; where: `vercel.json:13-14` and inline styles across HTML; minimal fix: move inline styles into CSS classes and drop `'unsafe-inline'`.
3. P1 — De-block preloader; why: improves first interaction and CWV; where: `css/site.css:52-55`, `js/site.js:24-46`; minimal fix: remove overlay or cap at minimal delay without blocking nav.
4. P1 — Convert content backgrounds to responsive images; why: reduce bandwidth and improve LCP; where: `index.html:232-235`, `private-chef.html:91-107`, similar sections; minimal fix: replace with `<picture>/<img>` + `srcset/sizes/loading="lazy"`.
5. P1 — Add Privacy/Terms pages and links; why: trust/compliance for PII collection; where: `contact.html:80`, `index.html:272-276`; minimal fix: create pages and link from footer + form.
6. P2 — Fix JS Greek mojibake; why: user-visible language/UI strings; where: `js/site.js:128-140`, `js/site.js:239-253`; minimal fix: re-save file as UTF-8 and correct strings.
7. P2 — Restore validation or custom checks; why: data quality and spam resistance; where: `contact.html:80`, `js/site.js:220-234`; minimal fix: remove `novalidate` or validate required fields before submit.
8. P2 — Add cache-busting strategy; why: prevent stale CSS/JS after changes; where: `vercel.json:26-34`, `about.html:30-31`; minimal fix: hashed filenames or auto version stamping.
9. P2 — Add `lastmod` in sitemap; why: better crawl freshness signals; where: `sitemap.xml:3-8`; minimal fix: add `lastmod` fields per URL.
10. P2 — Expand structured data to inner pages; why: richer SERP understanding; where: `about.html` head and other inner pages; minimal fix: add WebPage/Breadcrumb schema with shared Organization `@id`.
11. P2 — Address render-blocking fonts; why: improve first render; where: `about.html:26-29` (and all pages); minimal fix: self-host fonts or load asynchronously after first paint.
12. P2 — Add COOP/CORP headers; why: stronger isolation hardening; where: `vercel.json:8-16`; minimal fix: add `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` after testing.
13. P2 — Add hamburger focus-visible + dynamic label; why: keyboard and screen-reader usability; where: `css/site.css:127-137`, `about.html:46`, `js/site.js:69-72`; minimal fix: add `.hamburger:focus-visible` and update `aria-label` on toggle.
14. P2 — Add `aria-current="page"`; why: orientation for screen readers; where: nav in all pages; minimal fix: set active link in each page or via JS.
15. P2 — Provide OG image fallback formats; why: consistent social previews; where: `index.html:17`, `about.html:16`; minimal fix: switch to JPG/PNG or add additional tags.

## False positives & overreaches
- `P1-SEO-02`: deployment exposure of `_publish_repo` is not provable from repo; should be phrased as “if `_publish_repo` is deployed, it may create duplicates.”
- `P1-PERF-01`: CWV impact is inferred; better framed as “preloader can delay visibility and interaction.”
- `P1-UX-01`: privacy/terms requirement depends on jurisdiction; should be “recommended for trust/compliance.”
- `P2-A11Y-03`: contrast failure not proven; should be “needs manual contrast test.”
- `P2-PERF-03`: render-blocking fonts are confirmed but performance impact is unmeasured; should be “potential LCP impact.”
