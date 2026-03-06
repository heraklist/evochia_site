# Site Audit — Full Report

## 0) Audit metadata
- **Date/time (local):** 2026-03-05 ~08:00 EET
- **Model:** Claude Opus 4.6 (`claude-opus-4-6`)
- **Repo root:** `evochia_site_v6`
- **Assumptions:**
  - [High] Site is live at `https://www.evochia.gr/` on Vercel
  - [Medium] Formspree endpoint `xwvngybk` is the active one (contact.html currently references this; MEMORY.md mentions `xwpkpzkd` from an earlier phase)
  - [Medium] AVIF browser support is sufficient for target audience (luxury travel market, modern devices)
  - [Low] No server-side rendering or edge functions in use beyond static hosting

---

## 1) Executive summary (max 12 bullets)

1. **AVIF-only background images have no fallback** — 10 images on index.html and menus.html use `.avif` format in CSS `background-image` with no `<picture>` fallback. Safari < 16 and older browsers will show blank areas. (P1 — Perf/A11y)
2. **71 inline `style=""` attributes across 6 pages** — forces `'unsafe-inline'` in CSP `style-src`, weakening XSS protection. (P1 — Sec/DX)
3. **No `loading="lazy"` on any `<img>` tag** — all images (logo x2 per page) load eagerly, though impact is low since most content images use CSS backgrounds. (P2 — Perf)
4. **CSS/JS cached 30 days but versioned with `?v=2.0`** — cache-busting works only if the version string is actually bumped on deploy. Manual process = regression risk. (P1 — Perf/DX)
5. **`'unsafe-inline'` in `style-src`** — required by Google Fonts and inline styles; could be tightened with hashes or nonces if inline styles are moved to classes. (P2 — Sec)
6. **No `<h3>` headings on menus.html cuisine cards** — uses `.venue-card-title` divs instead, breaking heading hierarchy for screen readers. (P1 — A11y/SEO)
7. **Duplicated head/nav/footer HTML across 7 files** — ~80 lines of identical boilerplate per page; any change (e.g., new nav link) must be replicated 7 times. (P2 — DX)
8. **AVIF images in `assets/images/` have immutable cache (1 year)** — filename-based cache busting not in use; updating an image at the same path won't propagate. (P2 — Perf)
9. **All OG images point to same `chef-plating.webp`** on 4 of 6 pages — reduces social share visual diversity. (P2 — UX/SEO)
10. **Structured data `name` on catering.html and private-chef.html is generic** — both say "Evochia -- Premium Event Catering & Private Chef Services" instead of page-specific service names. (P1 — SEO)
11. **No `<noscript>` fallback** — preloader and reveal animations require JS; if JS fails, content stays hidden behind `.no-js .reveal { opacity:1 }` rule (good), but preloader has `display:none` only in reduced-motion media query, not in `<noscript>`. (P2 — A11y)
12. **404 page has no preloader** — inconsistency with other pages; not a bug but breaks the visual transition pattern. (P2 — UX)

---

## 2) Inventory

### Pages
| File | URL | Purpose |
|------|-----|---------|
| `index.html` | `/` | Homepage — hero, about teaser, services tabs, cuisines, venues |
| `about.html` | `/about/` | Story, philosophy, values grid, stats |
| `catering.html` | `/catering/` | Event catering — weddings, baptisms, corporate, themed |
| `private-chef.html` | `/private-chef/` | Private chef — 8 cuisine styles, themed experiences |
| `menus.html` | `/menus/` | Sample menu collections — Mediterranean, Nikkei, Asian Fusion |
| `contact.html` | `/contact/` | Quote request form + contact info |
| `404.html` | (error) | Custom 404 with nav and CTA |
| `googlef65d7b72f287c349.html` | — | Google Search Console verification |

### Key assets
| Type | Files | Notes |
|------|-------|-------|
| CSS | `css/site.css` (801 lines) | Single stylesheet, custom properties, responsive breakpoints |
| JS | `js/site.js` (354 lines) | Single script, IIFE, strict mode, no global leaks |
| Fonts | Google Fonts (Cormorant Garamond + Raleway) | Preconnect + preload, `display=swap` |
| Photos | 13 production `.webp` in `photos/` | ~40-290 KB each |
| AVIF | 9 images in `assets/images/` | ~25-260 KB each, used on index + menus |
| Favicon | `assets/favicon.{ico,png,svg}`, `apple-touch-icon.png` | Full coverage |
| Logo | `assets/logo.{png,webp}` | Used in preloader + nav via `<picture>` |

### Deployment/config
| File | Key behaviors |
|------|---------------|
| `vercel.json` | `cleanUrls: true`, `trailingSlash: true`, security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy, COOP, CORP), cache rules (assets/photos: 1yr immutable; CSS/JS: 30d), `/index` -> `/` 301 redirect |
| `robots.txt` | `Allow: /` for all bots, sitemap declared |
| `sitemap.xml` | 6 URLs, all with trailing slashes, `lastmod: 2026-03-01` |
| `.vercelignore` | 14 bonus photos excluded from deploy |

---

## 3) Risk register

| ID | Severity | Area | File(s) | Finding | Evidence | Recommended fix | Effort | Regression risk |
|----|----------|------|---------|---------|----------|-----------------|--------|-----------------|
| R01 | P1 | Perf/A11y | `index.html:187,201,258-262`, `menus.html:98-100` | AVIF background images with no fallback for older browsers | `style="background-image:...url('assets/images/bbq-grills.avif')"` — no `<picture>` or WebP alternative | Provide WebP versions alongside AVIF; use CSS `@supports` or `<picture>` with `<source>` for `<img>` replacements | M | Med |
| R02 | P1 | Sec | All 6 main HTML files | 71 inline `style=""` attributes force `'unsafe-inline'` in CSP style-src | `style="--bg:url(...)"; style="text-align:center;..."` across all pages | Move inline styles to CSS classes; remove `'unsafe-inline'` from CSP | L | High |
| R03 | P1 | A11y/SEO | `menus.html:98-100` | Menu collection cards use `<div class="venue-card-title">` instead of `<h3>` | `<div class="venue-card-title" data-en="Mediterranean">` — breaks heading hierarchy after H2 | Change to `<h3 class="venue-card-title">` | S | Low |
| R04 | P1 | SEO | `catering.html:53`, `private-chef.html:53` | JSON-LD `name` field is generic, not page-specific | `"name": "Evochia -- Premium Event Catering & Private Chef Services"` on both Service schemas | Use service-specific names: "Event Catering" / "Private Chef Services" | S | Low |
| R05 | P1 | Perf/DX | `vercel.json:34-43`, all HTML `?v=2.0` | CSS/JS cache 30 days; version string `?v=2.0` requires manual bump | `"Cache-Control": "public, max-age=2592000"` + `css/site.css?v=2.0` | Automate version bump (content hash) or reduce max-age to match deploy frequency | S | High |
| R06 | P2 | Sec | `vercel.json:14` | CSP `style-src 'unsafe-inline'` weakens XSS protection | `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` | Long-term: replace inline styles with classes; use hashes for remaining inline styles | L | High |
| R07 | P2 | SEO/UX | `about.html:30`, `menus.html:31`, `contact.html:30` | 4 of 6 pages use same OG image (`chef-plating.webp`) | `og:image` = `https://www.evochia.gr/photos/chef-plating.webp` on about, menus, contact, index | Use page-specific hero images for social sharing | S | Low |
| R08 | P2 | Perf | All HTML | No `loading="lazy"` on any `<img>` element | `<img src="assets/logo.png" alt="" ... width="110" height="110">` — no `loading` attr | Add `loading="lazy"` to below-fold images (note: most content is CSS background, so impact is low) | S | Low |
| R09 | P2 | DX | All 7 HTML files | ~80 lines of identical head/nav/footer per page | Identical preconnect, GA script, nav structure, footer, conciergerie widget in every file | Consider static site generator or HTML includes (e.g., 11ty, simple build step) | L | Med |
| R10 | P2 | Perf | `vercel.json:28-31,46-49` | `assets/` and `photos/` use immutable cache but filenames aren't content-hashed | `"Cache-Control": "public, max-age=31536000, immutable"` — replacing a file at same path won't bust cache | Use content-hashed filenames for assets, or reduce to `max-age` without `immutable` | M | Med |
| R11 | P2 | A11y | `index.html:112`, all pages | Preloader logo has `alt=""` (decorative) but is the first visible content during load | `<img src="assets/logo.png" alt="" class="preloader-logo-img">` | Consider `alt="Evochia"` for preloader logo since it's the only content visible during load | S | Low |
| R12 | P2 | UX | `404.html` | 404 page has no preloader, unlike all other pages | No `<div class="preloader">` in 404.html | Add preloader for visual consistency, or remove from all pages (preloader adds ~3.5s to first visit) | S | Low |
| R13 | P2 | SEO | `sitemap.xml` | All `lastmod` dates are `2026-03-01` — not per-page actual modification dates | `<lastmod>2026-03-01</lastmod>` on all 6 entries | Update lastmod per page when content changes; automate via deploy hook | S | Low |
| R14 | P2 | A11y | All pages | No `<noscript>` tag for users with JS disabled | Preloader hides behind `.no-js .preloader { display: none !important }`, content reveals via `.no-js .reveal { opacity: 1 !important }` — works, but no explicit messaging | Add `<noscript><style>.preloader{display:none}.reveal{opacity:1}</style></noscript>` as safety net | S | Low |
| R15 | P2 | Perf | All pages | Google Fonts loads 8 weights of Cormorant Garamond + 4 weights of Raleway (12 total) | `Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500` + `Raleway:wght@300;400;500;600` | Audit actual weight usage; trim to only used weights (likely 4-6 weights needed) | S | Low |
| R16 | P2 | Perf | `index.html` | Homepage is the largest page with hero particles, grain overlay, and multiple AVIF backgrounds | Multiple SVG data URIs in inline styles, grain texture, particle system | Consider lazy-loading below-fold sections or deferring particle animation | M | Med |

---

## 4) Findings (grouped)

### 4.1 SEO

**Titles & meta descriptions:** All 6 pages have unique, descriptive `<title>` and `<meta name="description">` tags. Lengths are appropriate (50-70 chars for titles, 100-160 chars for descriptions).

**Canonicals:** All 6 pages have `<link rel="canonical">` with trailing-slash URLs matching the Vercel `trailingSlash: true` config and sitemap URLs. 404 page correctly omits canonical. Canonical format is consistent: `https://www.evochia.gr/{slug}/`.

**Robots directives:**
- All pages: `<meta name="robots" content="index, follow">`
- 404 page: `<meta name="robots" content="noindex">` (correct)
- `robots.txt`: `Allow: /`, sitemap declared

**Sitemap quality:** 6 URLs, all correctly formatted with trailing slashes. `lastmod` dates are all `2026-03-01` — should reflect actual per-page modification dates. `changefreq: monthly` and `priority` values are reasonable.

**Open Graph + Twitter:**
- All 6 pages have complete OG tags (title, description, url, image, type, locale, site_name)
- All have `twitter:card=summary_large_image` with title, description, image
- `og:url` matches canonical on each page
- Issue: 4/6 pages use same `chef-plating.webp` as OG image (R07)

**Structured data (JSON-LD):**
- `index.html`: FoodEstablishment/CateringBusiness + WebSite schemas (good, comprehensive)
- `about.html`: AboutPage
- `catering.html`: Service (serviceType: "Event Catering")
- `private-chef.html`: Service (serviceType: "Private Chef")
- `menus.html`: WebPage
- `contact.html`: ContactPage
- Issue: `name` on catering + private-chef Service schemas is generic (R04)

**Heading hierarchy:**
- All pages have exactly one H1
- H2/H3 hierarchy is clean on most pages
- Issue: `menus.html` cuisine cards lack `<h3>` (R03)

**hreflang:** Not present. The site uses JS-based language toggle (EN/EL) on the same URL — no separate `/el/` paths exist. hreflang is not applicable here since there are no distinct language-specific URLs. This is correct for the current architecture.

**Internal linking:** Nav links use clean URLs (`/about`, `/catering`, etc.) consistent with `cleanUrls: true`. Footer links match nav. `aria-current="page"` correctly set on each page.

**Duplicate URL risk:** `/index` redirects to `/` via 301 (vercel.json). `cleanUrls` strips `.html`. `trailingSlash` enforces trailing slash. Minimal duplicate URL risk.

**404 handling:** Custom `404.html` with `noindex`, nav, and CTAs. Good UX for lost visitors.

### 4.2 Performance

**Image formats/sizes:**
- Production photos: WebP format, 40-293 KB — reasonable for hero/card images
- AVIF images: 25-260 KB — good compression
- Issue: AVIF used as CSS backgrounds with no fallback (R01). `bbq-grills.avif` at 250 KB is the largest
- Logo: `<picture>` with WebP source + PNG fallback (good)

**Lazy-loading:**
- No `loading="lazy"` on any `<img>` tag (R08)
- Impact is low since only logo images use `<img>` (preloader + nav); all content images are CSS backgrounds
- CSS background images for below-fold sections load eagerly (browser behavior)

**Width/height (CLS):**
- All `<img>` tags have explicit `width` and `height` attributes (preloader: 110x110, nav: 42x42)
- CSS background images don't affect CLS since they're on sized containers

**Font loading:**
- `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` (good)
- `preload` on Google Fonts CSS (good)
- `display=swap` in the font URL (FOUT behavior, good for performance)
- Issue: 12 font weight/style variants loaded; may be trimmed (R15)

**Render-blocking:**
- CSS: `<link rel="stylesheet" href="css/site.css?v=2.0">` — render-blocking (expected/necessary)
- JS: `<script src="js/site.js?v=2.0" defer>` — deferred (good)
- GA: `<script async src="...gtag/js?id=G-DERZSDHHF1">` — async (good)
- Inline GA config script: small, render-blocking but minimal

**Caching strategy:**
- Assets/photos: 1 year, immutable — but no content-hash in filenames (R10)
- CSS/JS: 30 days with `?v=2.0` query string — manual versioning (R05)
- Fonts: cached by Google CDN (browser manages)

**CWV risks (code-inferred):**
- LCP: Hero images preloaded (`fetchpriority="high"` on `chef-plating.webp`) — good
- CLS: Explicit dimensions on `<img>` tags — good. CSS backgrounds on fixed containers — good
- FID/INP: JS is deferred, event handlers are passive where applicable — good
- Preloader animation takes ~3.5s on first session visit (sessionStorage controls repeat)

### 4.3 Security

**Headers (from vercel.json):**
| Header | Value | Assessment |
|--------|-------|------------|
| `X-Content-Type-Options` | `nosniff` | Good |
| `X-Frame-Options` | `DENY` | Good |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Good |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Good |
| `HSTS` | `max-age=63072000; includeSubDomains; preload` | Good (2 years) |
| `COOP` | `same-origin-allow-popups` | Good (allows social popups) |
| `CORP` | `same-site` | Good |

**CSP analysis:**
- `default-src 'self'` — good baseline
- `script-src 'self' https://www.googletagmanager.com https://*.googletagmanager.com 'sha256-...'` — good, uses hash for inline GA config
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — `'unsafe-inline'` needed for Google Fonts injection and 71 inline styles (R02, R06)
- `font-src https://fonts.gstatic.com` — correctly scoped
- `img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com` — good
- `connect-src 'self' https://formspree.io ...google-analytics...` — covers form submission and analytics
- `frame-ancestors 'none'` — redundant with X-Frame-Options DENY but good defense-in-depth
- Missing: `base-uri`, `form-action`, `object-src` directives — consider adding for tighter CSP

**Third-party scripts:**
- Google Analytics (GA4) via `googletagmanager.com` — CSP-allowlisted
- Google Fonts via `fonts.googleapis.com` / `fonts.gstatic.com` — CSP-allowlisted
- Formspree via `formspree.io` — CSP-allowlisted in `connect-src`

**Forms:**
- `contact.html`: Form action `https://formspree.io/f/xwvngybk`, method POST
- All inputs have `name` attributes, labels with `for`, `autocomplete` hints
- Honeypot field: `<input type="text" name="_gotcha" tabindex="-1" autocomplete="off">` (good)
- AJAX submission via `fetch()` with `Accept: application/json`
- `aria-live="polite"` on status div
- No CSRF token (Formspree handles this server-side)

**External links:** All `target="_blank"` links have `rel="noopener noreferrer"` (23 occurrences verified).

### 4.4 Accessibility (A11y)

**Semantic landmarks:**
- All pages use `<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`
- Skip link present on all pages: `<a href="#main" class="skip-link">`
- Sections use `aria-labelledby` pointing to heading IDs

**Labels and ARIA:**
- Navigation: `aria-label="Main navigation"`, `aria-current="page"` on active link
- Hamburger: `aria-expanded`, `aria-label="Open menu"` / `"Close menu"`
- Service tabs (index.html): `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- Conciergerie: `aria-expanded`, `aria-label="Contact options"`
- Preloader: `role="status"`, `aria-label="Loading"`
- Decorative elements: `aria-hidden="true"` throughout

**Alt text:**
- Nav logo: `alt="Evochia logo"` — good
- Preloader logo: `alt=""` — decorative treatment (R11, minor)
- CSS background images: `role="img"` with descriptive `aria-label` — good pattern
- No content `<img>` without alt text

**Keyboard navigation:**
- `:focus-visible` styles throughout CSS — good
- Service tabs: arrow key navigation with focus management in JS
- Mobile menu: Escape key closes
- Conciergerie: Escape key closes
- Tab order follows visual order

**Needs manual test:**
- Color contrast ratios (gold on dark green, cream on green)
- Focus ring visibility on dark backgrounds
- Screen reader announcement order
- Mobile touch target sizes (44x44px minimum)

### 4.5 UX / Copy / Visual consistency

**CTA clarity:**
- Homepage separates "Event Catering" and "Private Chef" as distinct service tabs with individual CTAs
- Each service page has a CTA to contact: "Request a Quote" / "Book your private chef experience"
- Conciergerie floating widget on every page provides quick access to phone, WhatsApp, email

**Nav/footer consistency:**
- Navigation links identical across all 7 pages: Home, About, Catering, Private Chef, Menus, Contact
- Footer structure identical: Services column, Company column, Connect column, social links
- `aria-current="page"` correctly marks active page in nav

**Contact trust signals:**
- Phone: `+30 693 117 0245` (clickable `tel:` link)
- Email: `info@evochia.gr` (clickable `mailto:` link)
- WhatsApp: `wa.me/306931170245` link
- Location: Athens mentioned in structured data
- Service area: "across Greece" / "Greek Islands" in copy
- Response time: "We reply within 24 hours" in meta description and form area
- No physical address displayed (may be intentional for mobile service)

**Language consistency:**
- EN/EL toggle with `data-en` / `data-el` attributes on all translatable elements
- Language stored in `localStorage('evochia-lang')`
- HTML `lang` attribute synced by JS
- Bilingual content complete across all pages

**Microcopy:**
- Form: Labels for all fields, event type dropdown, date picker
- Success: "Thank you! We'll be in touch within 24 hours." (EN) / Greek equivalent
- Error: "Something went wrong. Please try again or email us directly." (EN)
- Missing: No explicit mention of deposit terms, minimum group size, or pricing range on form page (may be intentional for premium positioning)

### 4.6 Maintainability / DX

**Duplicated code (R09):**
- Head block: ~40 lines identical across pages (preconnect, GA, meta viewport, theme-color, favicons)
- Nav: ~20 lines identical
- Footer: ~30 lines identical
- Conciergerie widget: ~15 lines identical
- Total: ~105 lines duplicated per page x 7 pages = 735 lines of duplication

**Inline styles vs CSS classes (R02):**
- 71 inline `style=""` attributes across 6 pages
- Primary offenders: background-image with gradients, layout spacing, text-align
- These force `'unsafe-inline'` in CSP
- Many could be replaced with utility classes or existing CSS patterns

**JS organization:**
- Single IIFE with strict mode — clean
- No global leaks verified
- ES5-compatible (var, function expressions)
- Defensive null checks on all DOM queries
- `IntersectionObserver` fallback for older browsers
- GA4 graceful degradation if gtag unavailable

**Configuration drift risks:**
- `cleanUrls: true` + `trailingSlash: true` in vercel.json vs clean nav links (no `.html`) — currently aligned
- If someone adds an `href="/about.html"` link, Vercel will redirect to `/about/` (302), adding latency
- CSS/JS version string `?v=2.0` must be manually bumped — easy to forget
- Formspree endpoint in HTML must match Formspree dashboard config

---

## 5) Action plan

### Quick wins (< 2 hours)

1. **R03 — Fix heading hierarchy on menus.html** (15 min)
   - Change `<div class="venue-card-title">` to `<h3 class="venue-card-title">` on lines 98-100

2. **R04 — Fix JSON-LD service names** (15 min)
   - `catering.html`: Change `"name"` to `"Evochia -- Luxury Event Catering"`
   - `private-chef.html`: Change `"name"` to `"Evochia -- Private Chef Services"`

3. **R07 — Diversify OG images** (30 min)
   - `about.html`: Use a chef/team photo if available
   - `catering.html`: Already uses `wedding-catering.webp` (good)
   - `private-chef.html`: Already uses `cuisine-nikkei.webp` (good)
   - `menus.html`, `contact.html`: Consider different images

4. **R13 — Update sitemap lastmod dates** (10 min)
   - Set per-page modification dates instead of blanket `2026-03-01`

5. **R11 — Add alt text to preloader logo** (10 min)
   - Change `alt=""` to `alt="Evochia"` on preloader logo in all pages

6. **R15 — Trim Google Fonts weights** (30 min)
   - Audit CSS for actual `font-weight` values used
   - Remove unused italic variants and extreme weights from font URL

### 1-day improvements

7. **R01 — Add AVIF fallbacks** (4-6 hours)
   - Create WebP versions of all 9 AVIF images in `assets/images/`
   - Use CSS `@supports` or JS-based format detection for background images
   - Alternative: Convert AVIF backgrounds to `<picture>` elements with `<source>` tags

8. **R05 — Automate cache busting** (2-3 hours)
   - Add a simple build script that hashes CSS/JS content and appends hash to filenames
   - Or: reduce CSS/JS cache to `max-age=86400` (1 day) with `must-revalidate`

9. **R14 — Add `<noscript>` safety net** (30 min)
   - Add `<noscript><style>.preloader{display:none!important}.reveal{opacity:1!important;transform:none!important}</style></noscript>` to all pages

10. **CSP tightening** (2-3 hours)
    - Add `base-uri 'self'`, `form-action 'self' https://formspree.io`, `object-src 'none'`

### 1-week improvements / refactors

11. **R02 + R06 — Eliminate inline styles** (2-3 days)
    - Create CSS utility classes for common patterns (`text-center`, `mt-1`, layout variants)
    - Move all `background-image` declarations to CSS with class selectors
    - Remove `'unsafe-inline'` from CSP `style-src`
    - Use CSP hashes for any remaining necessary inline styles

12. **R09 — Templating / build system** (3-5 days)
    - Adopt a minimal SSG (e.g., 11ty) or simple HTML includes
    - Extract shared partials: `_head.html`, `_nav.html`, `_footer.html`, `_conciergerie.html`
    - Eliminates ~735 lines of duplication
    - Enables automated cache busting, minification

13. **R10 — Content-hashed asset filenames** (part of build system)
    - Hash-based filenames for CSS, JS, and images
    - Update `immutable` cache strategy to be truly safe

---

## 6) Regression checklist (run after every change)

Run these checks after every deploy or significant code change:

- [ ] **Canonicals match URLs:** Each page's `<link rel="canonical">` matches its live URL (with trailing slash)
- [ ] **Nav links work:** All 6 nav links resolve without redirect chains (no `.html`, has trailing slash)
- [ ] **Footer links match nav:** Footer service/company links point to same URLs as nav
- [ ] **Form submits:** Contact form on `/contact/` sends to Formspree and shows success/error messages
- [ ] **CSP not broken:** No CSP errors in browser console on any page (check after adding scripts/styles)
- [ ] **CSS/JS version string updated:** `?v=` parameter in HTML matches latest deploy (if manual versioning)
- [ ] **OG tags page-specific:** `og:url` matches canonical; `og:title` matches `<title>` (or close)
- [ ] **JSON-LD valid:** Paste each page's JSON-LD into Google's Rich Results Test
- [ ] **Language toggle works:** EN/EL switch updates all `data-en`/`data-el` elements; persists on reload
- [ ] **Images load:** All WebP and AVIF images render (check in Safari + Chrome)
- [ ] **Mobile menu:** Hamburger opens/closes; Escape key closes; click-outside closes
- [ ] **Heading hierarchy:** Each page has exactly one `<h1>`, followed by `<h2>`, then `<h3>` (no skips)
- [ ] **404 page:** Navigating to `/nonexistent-page/` shows custom 404 with nav
- [ ] **No console errors:** Zero JS errors on all pages in Chrome DevTools

---

## 7) Appendix: Suggested local validation commands (do not run)

No `package.json` exists in this repo. The following are optional external tools:

```bash
# Optional: HTML validation (requires Java)
npx html-validate "*.html"

# Optional: Lighthouse CLI audit
npx lighthouse https://www.evochia.gr/ --output=html --output-path=audit/lighthouse.html

# Optional: Pa11y accessibility audit
npx pa11y https://www.evochia.gr/

# Optional: Check structured data
# Visit: https://search.google.com/test/rich-results (paste each page URL)

# Optional: CSP evaluation
# Visit: https://csp-evaluator.withgoogle.com/ (paste CSP header value)

# Optional: Check image sizes
find photos/ assets/ -type f \( -name "*.webp" -o -name "*.avif" -o -name "*.png" -o -name "*.jpg" \) -exec ls -lh {} \;

# Optional: Validate sitemap
npx sitemap-validator sitemap.xml

# Optional: Check for broken links
npx broken-link-checker https://www.evochia.gr/ --recursive
```
