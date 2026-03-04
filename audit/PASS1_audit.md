# Site Audit — PASS 1 (Primary)
## Executive summary (10 bullets max)
- Scope covered: `index.html`, inner pages (`about/catering/private-chef/menus/contact`), `css/site.css`, `js/site.js`, `vercel.json`, `robots.txt`, `sitemap.xml`.
- Overall status: strong baseline after recent cleanup (unique titles/descriptions, canonical tags, OG/Twitter tags, clean URLs, security headers, Formspree wiring).
- `P0`: 0 items identified.
- `P1`: 6 items identified (SEO architecture, CSP hardening, performance blocking patterns, legal/trust transparency).
- `P2`: 8 items identified (sitemap/structured data depth, accessibility polish, caching workflow, copy consistency).
- SEO fundamentals are mostly correct (per-page canonical + `og:url`, robots + sitemap present).
- The largest SEO gap is bilingual delivery via client-side toggle only (no dedicated Greek URLs), limiting locale-specific indexability.
- The largest performance gap is image delivery strategy (many CSS background images, no `srcset/sizes/loading` pattern).
- The largest security gap is CSP allowing inline styles (`'unsafe-inline'`) because of pervasive inline `style="..."` usage.
- UX funnel is clear (Catering vs Private Chef), but legal/trust artifacts (privacy/terms) are not surfaced where data collection happens.

## Risk register
| ID | Severity (P0/P1/P2) | Area (SEO/Perf/Sec/A11y/UX/DX) | File(s) | Finding | Evidence | Recommended fix | Effort (S/M/L) |
|---|---|---|---|---|---|---|---|
| P1-SEO-01 | P1 | SEO | `about.html`, `contact.html`, `js/site.js` | Bilingual content is client-side toggled on a single URL set; no dedicated Greek URLs. This weakens Greek SEO targeting. | `about.html:2` `<html lang="en" class="no-js">`; `js/site.js:113-121` updates text from `data-en/data-el`; `js/site.js:106-110` language from `localStorage`; no `hreflang` tags in HTML files. | Create `/el/...` pages (or server-rendered localized routes), set page-level `lang`, and add reciprocal `hreflang` + canonical pairs. | L |
| P1-SEO-02 | P1 | SEO | `_publish_repo/*`, `vercel.json` | Assumption (High confidence): duplicate site copy in `_publish_repo` may create duplicate crawlable URL surface if deployed as-is. | `_publish_repo/about.html`, `_publish_repo/index.html`, etc. exist; `vercel.json` has no exclusion/deny rule for `/_publish_repo/*`. | Exclude `_publish_repo` from production deploy output or block crawling/indexing for that subtree. | S |
| P1-SEC-01 | P1 | Sec | `vercel.json`, multiple `*.html` | CSP allows inline styles (`'unsafe-inline'`), reducing CSP effectiveness. | `vercel.json:14` `style-src 'self' 'unsafe-inline' ...`; inline style attributes throughout pages, e.g. `about.html:80` `<section ... style="...">`. | Move inline styles to CSS classes and remove `'unsafe-inline'` from `style-src` (or use nonce/hash strategy). | M |
| P1-PERF-01 | P1 | Perf | `js/site.js`, `css/site.css` | Preloader can block first interaction/visibility for returning and first-time users, hurting CWV and UX. | `css/site.css:52-55` full-screen fixed preloader; `js/site.js:30-46` timed hide sequence (`1000ms` + staged fade/hide). | Replace blocking preloader with non-blocking intro or cap total overlay time to a minimal threshold. | M |
| P1-PERF-02 | P1 | Perf | `index.html`, `private-chef.html`, `catering.html` | Content-heavy imagery is mostly CSS background-image based, without responsive source selection and native lazy-loading controls. | `index.html:232-236` background-image cards; `private-chef.html:91-126` cuisine cards via `style="--bg:url(...)"`; no `loading=`, `srcset=`, `sizes=` usage in HTML image markup. | For content images, migrate to `<picture>/<img>` with `srcset`, `sizes`, and `loading="lazy"`; keep CSS backgrounds only for decorative assets. | L |
| P1-UX-01 | P1 | UX | `contact.html`, `index.html` | Personal data capture exists, but privacy/terms links are not surfaced in footer/contact flow. | `contact.html:80` form posts to Formspree; `index.html:272-276` footer “Company” links only `About`/`Contact`; no privacy/terms pages in repo. | Add Privacy Policy + Terms pages and link them from footer and contact form area. | M |
| P2-SEO-01 | P2 | SEO | `sitemap.xml` | Sitemap lacks `lastmod`, reducing freshness signaling to crawlers. | `sitemap.xml:3-8` entries include `loc/changefreq/priority` only. | Add `lastmod` per URL (automated during publish). | S |
| P2-SEO-02 | P2 | SEO | `index.html`, inner pages | Structured data is homepage-only; inner pages have no page-level schema. | `index.html:46` has `application/ld+json`; `about.html/catering.html/private-chef.html/menus.html/contact.html` have none. | Add Organization/WebPage/Breadcrumb schema on inner pages with shared `@id` entity graph. | M |
| P2-PERF-03 | P2 | Perf | `index.html`, inner pages | Google Fonts stylesheet remains render-blocking despite preload/preconnect. | `index.html:40` `<link ... rel="stylesheet">` to Google Fonts (same pattern in inner pages). | Self-host fonts or load non-critically after first render while keeping fallback typography stable. | M |
| P2-DX-01 | P2 | DX | `vercel.json`, all `*.html` | Cache busting is manual (`?v=1.0`) with 30-day cache TTL for CSS/JS, prone to stale assets if version bump is missed. | `vercel.json:28` and `:34` `max-age=2592000`; `about.html:30-31` `site.css?v=1.0`, `site.js?v=1.0` (same across pages). | Move to hashed filenames (build step) or enforce automated version stamping in release process. | M |
| P2-A11Y-01 | P2 | A11y | `css/site.css`, `about.html`, `js/site.js` | Hamburger control lacks dedicated focus-visible styling and keeps static `aria-label` text. | `.hamburger` rules at `css/site.css:128-137` (no `:focus-visible`); `about.html:46` `aria-label="Open menu"`; `js/site.js:69-72` toggles `aria-expanded` only. | Add visible keyboard focus style and update `aria-label` to “Open/Close menu” statefully. | S |
| P2-A11Y-02 | P2 | A11y | all `*.html` nav blocks | Navigation lacks `aria-current="page"`, reducing orientation for screen-reader users. | Example `about.html:39-43` nav links have no `aria-current`; same pattern on all pages. | Mark current nav link with `aria-current="page"` (server-side or JS by pathname). | S |
| P2-UX-02 | P2 | UX | `index.html` | EN/EL mismatch in cuisine section heading creates bilingual inconsistency. | `index.html:194` `data-en-html="A World of <em>Flavor</em>, One Vision"` vs `data-el-html="Τρεις <em>Παραδόσεις</em>, Ένα Όραμα"`. | Align Greek copy with updated EN intent (remove outdated “Three traditions” framing). | S |
| P2-SEC-02 | P2 | Sec | `vercel.json` | Security headers are good baseline, but modern isolation headers are absent. | Present: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP, HSTS (`vercel.json:8-16`); absent: `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`. | Add COOP/CORP (evaluate compatibility with current resource usage). | S |
| P2-A11Y-03 | P2 | A11y | `css/site.css`, visual design tokens | Contrast appears intentionally tuned but still needs visual/manual verification for all states. | `css/site.css:17` comment “bumped ... for WCAG AA on dark”; multiple translucent backgrounds may vary by device/brightness. | Run manual contrast audit (normal/hover/focus/disabled states, EN+EL) and adjust tokens where needed. | S |

## Findings
### SEO
- Verified good:
  - Unique page titles/descriptions are present and non-duplicated across the six main pages (e.g., `index.html:8-9`, `about.html:6-8`, `contact.html:6-8`).
  - Canonical and `og:url` are page-specific and aligned with clean URLs (e.g., `catering.html:10` + `catering.html:14`, `private-chef.html:10` + `private-chef.html:14`).
  - `robots.txt` and `sitemap.xml` exist and are wired (`robots.txt:4`).
  - H1/H2 hierarchy is structurally sane (1x H1 per page; multiple H2s for sections).
- Gaps:
  - `P1-SEO-01`: locale architecture is JS-toggle on single URLs (no dedicated EL URL space).
  - `P1-SEO-02` (Assumption, High confidence): duplicate `_publish_repo` mirror could expand crawlable duplicate surface.
  - `P2-SEO-01`: sitemap freshness metadata (`lastmod`) missing.
  - `P2-SEO-02`: structured data depth limited to homepage only.

### Performance
- Verified good:
  - Modern image formats are used heavily (`.webp`, `.avif`) in `photos/` and `assets/images/`.
  - Critical nav/preloader logos include fixed dimensions (`width`/`height`) to avoid obvious logo CLS.
- Gaps:
  - `P1-PERF-01`: preloader overlay blocks early UX and likely impacts CWV.
  - `P1-PERF-02`: no responsive image delivery pattern (`srcset/sizes/loading`) for content imagery.
  - `P2-PERF-03`: render-blocking Google Fonts stylesheet on all pages.
  - `P2-DX-01`: stale-asset risk due manual version query strategy + long cache TTL.

### Security
- Verified good:
  - Baseline hardening headers are configured in deployment (`nosniff`, `DENY`, HSTS, CSP, referrer, permissions) at `vercel.json:8-16`.
  - Form endpoint is explicit and HTTPS (`contact.html:80`), with honeypot anti-bot field (`contact.html:117-119`).
- Gaps:
  - `P1-SEC-01`: CSP includes `'unsafe-inline'` for styles due inline styling footprint.
  - `P2-SEC-02`: consider COOP/CORP additions for stronger isolation hardening.
  - `P1-UX-01` intersects security/compliance: no visible privacy/terms links despite personal-data form submission.

### Accessibility (A11y)
- Verified good:
  - Skip link exists (`css/site.css:42-49`, markup in each page).
  - Many interactive elements have `:focus-visible` styles (`css/site.css:117`, `125`, `210`, `219`, `319`, `462`, `474`, `501`).
  - Reduced-motion mode is handled (`css/site.css:773-783`).
  - Form controls are labeled with proper `for/id` pairing (`contact.html:83-115`).
- Gaps:
  - `P2-A11Y-01`: hamburger focus and label-state polish missing.
  - `P2-A11Y-02`: missing `aria-current` on active nav item.
  - `P2-A11Y-03`: contrast requires manual visual test across all states/devices.

### UX / Copy / Visual consistency
- Verified good:
  - Funnel separation is clear at IA level (separate pages for `Catering` vs `Private Chef`).
  - Nav/footer structure is largely consistent across pages.
  - Trust basics are present in contact flow (email, phone, area + quote form).
- Gaps:
  - `P1-UX-01`: legal trust artifacts (privacy/terms) are missing where users submit personal details.
  - `P2-UX-02`: bilingual heading mismatch in homepage cuisine section.

## Quick wins (≤2 hours)
- Add `aria-current="page"` on active nav links (`P2-A11Y-02`).
- Add `.hamburger:focus-visible` and dynamic `aria-label` toggle logic (`P2-A11Y-01`).
- Fix EN/EL cuisine heading mismatch in `index.html` (`P2-UX-02`).
- Add `lastmod` to all sitemap entries (`P2-SEO-01`).
- Add footer links to Privacy Policy and Terms (even as starter pages) (`P1-UX-01`).

## 1-day improvements
- Remove preloader blocking pattern or reduce to near-zero non-blocking animation (`P1-PERF-01`).
- Replace high-impact content background images with semantic `<picture>/<img>` + `srcset/sizes/loading` (`P1-PERF-02`).
- Refactor inline style attributes into CSS classes and tighten CSP by removing `'unsafe-inline'` (`P1-SEC-01`).
- Add minimal structured data to inner pages (WebPage + Breadcrumb) (`P2-SEO-02`).

## 1-week improvements / refactors
- Implement real i18n URL architecture (`/en/...`, `/el/...`) with hreflang/canonical matrix (`P1-SEO-01`).
- Introduce build pipeline for hashed CSS/JS filenames and sitemap generation with `lastmod` (`P2-DX-01`, `P2-SEO-01`).
- Decide deployment artifact strategy: remove `_publish_repo` from runtime output or isolate build/deploy directories (`P1-SEO-02`, Assumption high confidence).
- Evaluate COOP/CORP and broader security header policy with regression testing (`P2-SEC-02`).

## Appendix: Suggested local validation commands (do not run)
- Found in repo:
  - No `package.json` scripts were found (static site, no build step declared).
- Optional:
  - `python -m http.server 8080`
  - `lighthouse http://localhost:8080 --view`
  - `npx html-validate "*.html"`
  - `npx stylelint "css/**/*.css"`
  - `npx pa11y http://localhost:8080`
  - `npx broken-link-checker http://localhost:8080 --recursive`
