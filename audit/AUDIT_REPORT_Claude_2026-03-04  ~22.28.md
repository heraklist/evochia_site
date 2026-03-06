# Site Audit — Full Report

## 0) Audit metadata
- **Date/time (local):** 2026-03-04T21:30:00 EET
- **Model:** Claude Opus 4.6 (claude-opus-4-6)
- **Repo root:** evochia_site_v6
- **Assumptions:**
  - (High) Site is deployed on Vercel with `vercel.json` config active
  - (High) Domain is `www.evochia.gr` with HTTPS enforced by Vercel
  - (Medium) Formspree endpoint `xwvngybk` is active and verified
  - (Medium) GA4 property `G-DERZSDHHF1` is configured and receiving data
  - (Low) Social media URLs (instagram.com/evochia, facebook.com/evochia) are live profiles

---

## 1) Executive summary

- **P0 — Contact form layout breaks on mobile** (inline 2-column grid doesn't stack) — directly impacts lead generation on the primary conversion page
- **P0 — CSP script hash is fragile** — the SHA-256 hash for the inline GA4 script will silently break analytics if any whitespace changes
- **P1 — AVIF images used in CSS backgrounds have no fallback** — Safari <16.4 users see empty venue/service cards on homepage and menus page
- **P1 — CSS/JS cached 30 days with static `?v=2.0`** — forgetting to bump the version after a deploy serves stale assets for up to a month
- **P1 — ~2.5 MB of unused photo assets** deployed (14 images in `photos/` not referenced by any HTML)
- **P1 — Footer Greek translation inconsistent** — index.html says "Επικοινωνία" for "Connect", all other pages say "Σύνδεση"
- **P1 — Inner-page inline `padding: 6rem 3rem`** overrides responsive `--page-pad` on mobile, causing excessive horizontal padding
- **P2 — Nav/footer/preloader/conciergerie duplicated** across 7 HTML files — high maintenance burden, consistency risk
- **P2 — No privacy/cookie policy page** — GDPR concern given GA4 + Formspree usage and EU audience
- **P2 — Structured data on contact page** missing `isPartOf` link to website entity
- Overall SEO foundations are strong: unique titles, meta descriptions, canonicals, OG/Twitter, sitemap, robots.txt all present and correct
- Accessibility is above average: skip link, ARIA roles/labels, reduced-motion support, focus-visible styles, keyboard tab navigation all implemented

---

## 2) Inventory

### Pages

| File | URL (clean) | Purpose |
|------|-------------|---------|
| `index.html` | `/` | Homepage — hero, services tabs, cuisines, venues, CTA |
| `about.html` | `/about` | Brand story, philosophy, values, stats |
| `catering.html` | `/catering` | Event catering service — event types, inclusions |
| `private-chef.html` | `/private-chef` | Private chef service — cuisine grid, themed experiences |
| `menus.html` | `/menus` | Menu collections, how-it-works process |
| `contact.html` | `/contact` | Contact info + quote request form (Formspree) |
| `404.html` | (error page) | Custom 404 with nav and CTA links |
| `googlef65d7b72f287c349.html` | (verification) | Google Search Console verification file |

### Key assets

| Type | File | Size | Notes |
|------|------|------|-------|
| CSS | `css/site.css` | ~789 lines | Single file, all styles, versioned `?v=2.0` |
| JS | `js/site.js` | ~353 lines | Single IIFE, vanilla ES5, versioned `?v=2.0` |
| Logo | `assets/logo.webp` | 22 KB | Preloaded, with PNG fallback (59 KB) |
| Favicon | `assets/favicon.ico` | 289 B | Plus SVG (257 B) and apple-touch-icon (7.2 KB) |
| Photos | `photos/*.webp` | ~4.3 MB total | 27 WebP + 1 JPG; 14 images appear unused |
| AVIF | `assets/images/*.avif` | ~932 KB total | 9 images, used in CSS backgrounds only |
| Fonts | Google Fonts (external) | N/A | Cormorant Garamond + Raleway, preconnected |

### Deployment/config

| File | Key behaviors |
|------|---------------|
| `vercel.json` | `cleanUrls: true`, `trailingSlash: true`, security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy, COOP, CORP), asset caching (assets/photos: 1yr immutable; css/js: 30 days), redirect `/index` -> `/` (301) |
| `robots.txt` | Allow all, sitemap reference |
| `sitemap.xml` | 6 URLs, all with trailing slash, lastmod 2026-03-01 |

---

## 3) Risk register

| ID | Severity | Area | File(s) | Finding | Evidence | Recommended fix | Effort | Regression risk |
|----|----------|------|---------|---------|----------|-----------------|--------|-----------------|
| R01 | P0 | UX | `contact.html:88` | Contact form 2-column grid doesn't stack on mobile | Inline `style="display:grid;grid-template-columns:1fr 1.1fr;gap:3rem"` — no CSS class, no media query can override inline styles | Replace inline grid with a CSS class (e.g., `.contact-grid`) that stacks at 768px | S | Med |
| R02 | P0 | Sec/Perf | `vercel.json:14` | CSP inline script hash is fragile | `'sha256-2WIuDihWi48...'` must match exact byte content of GA4 inline script across all 7 pages; any whitespace change silently blocks GA4 | Move GA4 config to `js/site.js` (already deferred) or use `nonce`-based approach; verify hash matches with `echo -n "..." \| openssl dgst -sha256 -binary \| base64` | M | High |
| R03 | P1 | Perf | `index.html`, `menus.html` | AVIF images in CSS `background-image` have no fallback | `url('assets/images/bbq-grills.avif')` in inline styles — Safari <16.4, older Firefox show no image (just gradient overlay) | Use `<picture>` elements or provide WebP versions of AVIF assets and use JS/CSS feature detection | M | Low |
| R04 | P1 | Perf | `vercel.json:36-44`, all HTML | CSS/JS cached 30 days but version is manual `?v=2.0` | `"Cache-Control": "public, max-age=2592000"` on `/css/(.*)` and `/js/(.*)`; version string hardcoded in 7 HTML files (14 references) | Use content hash in filename (e.g., `site.abc123.css`) or reduce max-age to 86400 (1 day) | S | High |
| R05 | P1 | Perf | `photos/` | ~2.5 MB of unused images deployed | 14 files not referenced in any HTML: `bbq-night-{01,02,03}.webp`, `greek-night-{01,02,03}.webp`, `pizza-night-{01,02,03}.webp`, `street-food-{01,02,03}.webp`, `souvlaki.jpg`, `souvlaki.webp` | Remove from deployment or add to `.vercelignore` | S | Low |
| R06 | P1 | UX | `contact.html:88`, `catering.html:133`, `private-chef.html:109` | Hardcoded inline `padding: 6rem 3rem` ignores responsive `--page-pad` | `--page-pad` changes to `2rem` at 968px and `1.5rem` at 768px, but inline `3rem` overrides | Use CSS classes instead of inline styles for section padding | S | Low |
| R07 | P1 | UX/Copy | `index.html:306` vs others | Footer "Connect" heading Greek translation inconsistent | index.html: `data-el="Επικοινωνία"` — all other pages: `data-el="Σύνδεση"` | Standardize to one translation across all pages | S | Low |
| R08 | P1 | SEO | `contact.html:39-46` | ContactPage structured data missing `isPartOf` | Other pages link to `#website` entity; contact page JSON-LD has no `isPartOf` | Add `"isPartOf": { "@id": "https://www.evochia.gr/#website" }` | S | Low |
| R09 | P1 | A11y | `index.html:163`, `about.html:90`, `catering.html:102-123`, `private-chef.html:116-153` | CSS background images cannot be lazy-loaded | Images loaded via `--bg` custom property or inline `background-image` — browser downloads all immediately regardless of viewport position | Consider using `<img loading="lazy">` in visible containers with `object-fit: cover` for below-fold images | L | Med |
| R10 | P2 | DX | All HTML | Nav/footer/preloader/conciergerie duplicated across 7 files | ~80 lines of identical markup per file; index.html footer has minor differences from other pages (missing `data-en`/`data-el` on some links, different social link format) | Introduce includes (SSI, 11ty, or build-time partials) | L | Low |
| R11 | P2 | Sec/Legal | (missing) | No privacy policy or cookie consent | GA4 + Formspree collect personal data; site targets EU audience (Greece); GDPR requires disclosure | Create `/privacy` page with data processing details; add cookie consent banner | M | Low |
| R12 | P2 | SEO | `index.html:118-120` vs others | Nav logo alt text inconsistent | index.html: `alt="Evochia"`, `aria-label="Evochia — Home"` — other pages: `alt="Evochia logo"`, `aria-label="Evochia - Home"` (em-dash vs hyphen) | Standardize to `alt="Evochia logo"` and `aria-label="Evochia — Home"` everywhere | S | Low |
| R13 | P2 | DX | All HTML | Inline styles used extensively on inner pages | `about.html`, `catering.html`, `private-chef.html`, `menus.html`, `contact.html` all use `style="..."` for layout, padding, colors — prevents override via CSS media queries and complicates CSP | Extract to named CSS classes | M | Low |
| R14 | P2 | A11y | All pages | Contrast of `--cream-dim` (#c4b9a8) on dark backgrounds needs verification | CSS comment says "bumped for WCAG AA" but actual ratio on `--green-dark` (#0f2e1f) should be tested | Run axe/WAVE contrast checker on live site | S | Low |
| R15 | P2 | Perf | `photos/souvlaki.jpg` | JPG file (186 KB) alongside WebP version (80 KB) | `souvlaki.jpg` exists but is not referenced in HTML — dead asset; `souvlaki.webp` also present and unused | Delete `souvlaki.jpg` (and `souvlaki.webp` if unused) | S | Low |
| R16 | P2 | SEO | `sitemap.xml` | `lastmod` dates are all identical (2026-03-01) | All 6 URLs have same lastmod — reduces signal value for search engines | Update lastmod per-page when content changes | S | Low |
| R17 | P2 | DX | `index.html:306-311` | Index footer has different markup pattern than other pages | Index footer email link has no `data-en`/`data-el`; social links have `aria-label` instead of `data-en`/`data-el` text | Align index.html footer with the template used in other pages | S | Low |

---

## 4) Findings (grouped)

### 4.1 SEO

**Titles & Descriptions:** All 6 pages have unique `<title>` and `<meta name="description">` tags. Titles follow a consistent `Evochia — [Page-specific]` pattern. Descriptions are appropriately keyword-rich and under 160 characters.

**Canonicals:** Every page has `<link rel="canonical">` with trailing-slash URLs matching the `trailingSlash: true` setting in `vercel.json`. The canonical URLs use `https://www.evochia.gr/` domain consistently.

**Robots:** All content pages have `<meta name="robots" content="index, follow">`. The 404 page correctly uses `noindex`. `robots.txt` allows all crawlers and references the sitemap.

**Sitemap:** `sitemap.xml` lists all 6 content pages with trailing slashes, matching canonicals. `changefreq` is `monthly`, `priority` is `1.0` for homepage and `0.8` for subpages. All `lastmod` values are identical (`2026-03-01`) — low signal value (R16).

**Open Graph & Twitter:** All 6 content pages have complete OG tags (`og:title`, `og:description`, `og:url`, `og:image`, `og:image:width`, `og:image:height`, `og:site_name`, `og:locale`, `og:locale:alternate`, `og:type`). Twitter cards are `summary_large_image` with matching content. `og:image:alt` is present on all pages.

Evidence — unique OG images per service page:
- `index.html:26`: `og:url` = `https://www.evochia.gr/`, image = `chef-plating.webp`
- `catering.html:26-28`: `og:url` = `.../catering/`, image = `wedding-catering.webp`
- `private-chef.html:26-28`: `og:url` = `.../private-chef/`, image = `cuisine-nikkei.webp`

**Structured Data:**
- `index.html`: `FoodEstablishment` + `CateringBusiness` (with founder, address, contact, sameAs) and `WebSite` entity — valid, well-connected
- `about.html`: `AboutPage` with `isPartOf` reference — good
- `catering.html`: `Service` with `serviceType: "Event Catering"`, `provider` ref — good
- `private-chef.html`: `Service` with `serviceType: "Private Chef"`, `provider` ref — good
- `menus.html`: `WebPage` with `isPartOf` reference — good
- `contact.html:39-46`: `ContactPage` but **missing `isPartOf`** reference to `#website` entity (R08)

**Heading Hierarchy:** All pages have a single `<h1>`. Inner pages use `<h2>` for section titles, `<h3>` for subsections. No skipped levels detected.

**hreflang:** Not implemented — correct decision. The site uses client-side JS language toggle (not separate URL variants), so hreflang would be incorrect.

**404 Handling:** `404.html` exists with `noindex`, proper nav/footer, and CTAs to home + contact. Vercel serves this automatically.

**Duplicate URL Risk:** `vercel.json` has `cleanUrls: true` + `trailingSlash: true`, so `/about.html` redirects to `/about/`. The redirect from `/index` to `/` (301) is explicitly configured. No duplicate URL risk detected.

### 4.2 Performance

**Image Formats & Sizes:**
- Photos use WebP format (56-287 KB each) — good modern format
- Assets use AVIF (25-255 KB) — excellent compression but **no fallback for older browsers** (R03)
- One JPG file remains: `souvlaki.jpg` (186 KB) — unused but deployed (R15)
- 14 images (~2.5 MB total) in `photos/` are not referenced by any HTML file (R05)

Evidence — unreferenced photos:
```
bbq-night-01.webp (238K), bbq-night-02.webp (158K), bbq-night-03.webp (132K)
greek-night-01.webp (213K), greek-night-02.webp (169K), greek-night-03.webp (128K)
pizza-night-01.webp (265K), pizza-night-02.webp (268K), pizza-night-03.webp (105K)
street-food-01.webp (106K), street-food-02.webp (204K), street-food-03.webp (220K)
souvlaki.jpg (186K), souvlaki.webp (80K)
```

**Lazy Loading:**
- Logo images use `<picture>` with WebP source — good
- Background images loaded via CSS `var(--bg)` or inline `background-image:` cannot use `loading="lazy"` — all download immediately (R09)
- No `<img>` elements use `loading="lazy"` on any page

**Width/Height & CLS:**
- All `<img>` tags have explicit `width` and `height` attributes — good for CLS
- CSS background images use `aspect-ratio` containers — CLS is controlled by CSS

**Font Loading:**
- `<link rel="preconnect">` to both `fonts.googleapis.com` and `fonts.gstatic.com` — good
- `<link rel="preload" ... as="style">` for the font CSS — good
- Google Fonts URL includes `display=swap` — good for FOIT prevention
- Font weights loaded: Cormorant Garamond (300-700, italic 300-500) + Raleway (300-600) — 12 variants is on the heavy side

**Render-Blocking:**
- CSS is a `<link rel="stylesheet">` in `<head>` — render-blocking but necessary
- JS uses `defer` attribute — good, non-blocking
- GA4 script uses `async` — non-blocking

**Caching:**
- `assets/` and `photos/`: 1 year, immutable — good for content-addressed files
- `css/` and `js/`: 30 days — but version string is manual `?v=2.0` (R04)
- HTML pages: no explicit cache-control (Vercel default, likely no-cache) — correct

### 4.3 Security

**Headers (via vercel.json):**

| Header | Value | Assessment |
|--------|-------|------------|
| `Content-Security-Policy` | Comprehensive policy | See detailed analysis below |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Excellent (2 years) |
| `X-Content-Type-Options` | `nosniff` | Good |
| `X-Frame-Options` | `DENY` | Good (also `frame-ancestors 'none'` in CSP) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Good |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Good |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | Good (allows WhatsApp/social popups) |
| `Cross-Origin-Resource-Policy` | `same-site` | Good |

**CSP Detailed Analysis:**
```
default-src 'self';
script-src 'self' https://www.googletagmanager.com https://*.googletagmanager.com 'sha256-...';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com;
connect-src 'self' https://formspree.io https://www.google-analytics.com https://analytics.google.com
           https://region1.google-analytics.com https://www.googletagmanager.com
           https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
frame-ancestors 'none'
```

- `'unsafe-inline'` in `style-src` is required due to heavy inline style usage — acceptable but could be tightened if inline styles are moved to CSS classes (R13)
- SHA-256 hash for GA4 inline script is correct but fragile (R02) — any change to whitespace or content of the inline `<script>` block will silently break analytics
- `connect-src` properly allows `formspree.io` for form submissions
- `img-src` allows `data:` URIs (used by SVG grain texture in CSS) — acceptable
- Missing: `wa.me` not in CSP — WhatsApp links are `<a href>` navigations, not `fetch`/XHR, so this is correct

**Forms:**
- `contact.html:101`: Form has `action="https://formspree.io/f/xwvngybk"` and `method="POST"` — proper configuration
- Honeypot field present: `<input type="text" name="_gotcha" tabindex="-1" autocomplete="off">` — good spam mitigation
- All inputs have `id`, `name`, `for` (via `<label for="...">`), and `autocomplete` attributes
- JS submit handler (`site.js:294-347`) uses `fetch` with `FormData` — AJAX submission with status feedback
- No client-side validation beyond HTML5 `required` and `type` attributes — Formspree handles server-side validation

**Third-Party Scripts:**
- Only Google Analytics/Tag Manager — allowlisted in CSP
- No other third-party scripts detected

**External Links:**
- All external links (`target="_blank"`) have `rel="noopener noreferrer"` — good

### 4.4 Accessibility (A11y)

**Landmarks & Semantics:**
- `<nav aria-label="Main navigation">` — present on all pages
- `<main id="main">` — present on all pages
- `<footer>` — present on all pages (implicit `contentinfo` role)
- `<section>` elements have `aria-label` or `aria-labelledby` attributes
- Skip link (`<a href="#main" class="skip-link">`) present on all pages

**ARIA Usage:**
- Tab widget (`index.html:182-214`): proper `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby` — excellent
- Hamburger menu: `aria-expanded`, `aria-controls="navLinks"` — good
- Conciergerie toggle: `aria-expanded`, `aria-label="Contact options"` — good
- Active page: `aria-current="page"` on current nav link — good
- Decorative elements: `aria-hidden="true"` on particles, splatters, ornaments, icons — good
- Preloader: `role="status"`, `aria-label="Loading"` — good
- CSS background images: `role="img"` with descriptive `aria-label` — good

**Alt Text:**
- Logo `<img>`: alt text present ("Evochia" on index, "Evochia logo" on others — inconsistent, R12)
- Preloader logo: `alt=""` (decorative) — correct
- No other `<img>` elements exist; all content images are CSS backgrounds with `role="img"` + `aria-label`

**Keyboard Navigation:**
- Focus-visible styles on all interactive elements: `.nav-links a:focus-visible`, `.btn-primary:focus-visible`, `.btn-secondary:focus-visible`, `.lang-switch:focus-visible`, `.hamburger:focus-visible`, `.conciergerie-toggle:focus-visible`, `.conciergerie-option:focus-visible`, `.text-link:focus-visible`, `.footer ul a:focus-visible`, `.services-tab:focus-visible`
- Tab arrow-key navigation implemented in JS (`site.js:174-187`)
- Escape key closes mobile menu and conciergerie (`site.js:96-101`)

**Reduced Motion:**
- `@media (prefers-reduced-motion: reduce)` disables all animations and transitions — good
- JS checks `prefers-reduced-motion` for smooth scrolling (`site.js:219`) — good
- Preloader hidden immediately under reduced-motion — good

**No-JS Fallback:**
- `.no-js` class on `<html>` removed by JS — CSS shows `.no-js .reveal { opacity: 1 }` and `.no-js .preloader { display: none }` — content visible without JS

**Needs Manual Test:**
- Color contrast ratios (especially `--cream-dim` #c4b9a8 on `--green-dark` #0f2e1f) (R14)
- Focus ring visibility on dark backgrounds
- Screen reader flow and announcement order
- Mobile touch target sizes (especially hamburger at 26px wide)

### 4.5 UX / Copy / Visual consistency

**CTA Clarity:**
- Primary CTA "Get a Quote" / "Request a Quote" links to `/contact` — consistent
- Secondary CTA "View Menus" links to `/menus` — consistent
- Service pages link to each other clearly (Catering -> Contact, Private Chef -> Contact)
- Homepage has dual CTAs in hero + bottom CTA section — good funnel

**Funnel Separation:**
- Catering vs Private Chef are clearly separated as service tabs on homepage and as distinct pages
- Contact form has "Event Type" dropdown with both options — good convergence point

**Nav/Footer Consistency:**
- Navigation links identical across all 7 pages — good
- Footer structure identical across all pages with minor differences:
  - Index.html footer email link missing `data-en`/`data-el` (R17)
  - Index.html social links use `aria-label` instead of text with `data-en`/`data-el` (R17)
  - Greek translation for "Connect" heading differs: "Επικοινωνία" (index) vs "Σύνδεση" (others) (R07)

**Contact Trust Signals:**
- Phone number visible: `+30 693 117 0245` (contact page)
- Email visible: `info@evochia.gr` (contact page + footer)
- WhatsApp link in conciergerie widget on all pages
- Service area stated: "Athens & Greek Islands" (contact page)
- Response time set: "within 24 hours" (contact page + CTA sections)
- No physical address beyond "Athens, Attica, GR" (structured data) — acceptable for mobile catering service

**Language Consistency:**
- EN/EL toggle works via `data-en`/`data-el` attributes on elements
- Language saved to `localStorage` and restored on page load — good persistence
- HTML `lang` attribute updated dynamically — good for screen readers
- Some terms kept in English in Greek mode (e.g., "Catering", "Private Chef", "BBQ & Grill") — intentional branding choice

**Microcopy:**
- Form has success message: "Thank you! We'll be in touch within 24 hours." (EN) / "Ευχαριστούμε! Θα επικοινωνήσουμε σύντομα." (EL) — good
- Form error message: "Something went wrong. Please try again or email us." — good fallback guidance
- No field-level validation hints (e.g., "We'll never share your email") — minor
- No deposit/pricing terms mentioned — may be intentional for bespoke service

**Mobile Contact Form (R01):**
- `contact.html:88` uses inline `grid-template-columns: 1fr 1.1fr` — this will NOT stack on mobile because inline styles cannot be overridden by CSS media queries
- On a 375px phone, the contact info column gets ~170px and the form gets ~190px — both are too narrow for comfortable use

### 4.6 Maintainability / DX

**Duplicated Blocks (R10):**
Every HTML file contains identical copies of:
- Google Analytics inline script (lines 7-13) — 7 copies
- Favicon links (3 lines) — 7 copies
- Font preconnect/preload/stylesheet links (4 lines) — 7 copies
- Navigation (~15 lines) — 7 copies
- Conciergerie widget (~15 lines) — 7 copies
- Footer (~20 lines) — 7 copies with minor inconsistencies

Total duplicated markup: ~80 lines x 7 files = ~560 lines that must be kept in sync manually.

**Inline Styles (R13):**
Inner pages use inline styles extensively for:
- Section backgrounds: `style="background:var(--green-main);padding:6rem 3rem"` (catering.html:133, private-chef.html:109)
- Layout: `style="display:grid;grid-template-columns:1fr 1.1fr;gap:3rem;align-items:start"` (contact.html:88)
- Spacing: `style="text-align:center;max-width:800px;margin:0 auto"` (about.html:103)
- Text: `style="color:var(--cream-dim);margin-bottom:2rem"` (many pages)

This prevents responsive CSS overrides and makes the CSP `'unsafe-inline'` requirement harder to remove.

**JS Organization:**
- Single IIFE in `site.js` — clean, no global leakage
- Defensive element references (all `getElementById` checked before use)
- ES5-compatible code (`var`, `.forEach`, no arrow functions) — broad browser support
- GA4 helper function centralizes analytics calls — good
- Form submit handler properly handles success/error states

**Configuration Drift Risk:**
- `cleanUrls: true` in vercel.json means `/about.html` -> `/about/`, but all internal links already use clean URLs (`/about`, `/catering`, etc.) — consistent
- `trailingSlash: true` means Vercel adds trailing slash — canonicals all have trailing slash — consistent
- Version string `?v=2.0` must be updated in 14 places (7 files x 2 refs) when CSS or JS changes (R04)

**Unused Code:**
- No obviously unused CSS classes detected (all classes referenced in HTML)
- No unused JS functions detected
- 14 unused image files in `photos/` (R05)

---

## 5) Action plan

### Quick wins (< 2 hours)

1. **(R01 — P0)** Replace inline grid on `contact.html:88` with a CSS class `.contact-grid` that stacks at 768px
2. **(R07 — P1)** Fix footer "Connect" Greek translation — standardize `data-el="Σύνδεση"` across all pages (or change all to "Επικοινωνία")
3. **(R08 — P1)** Add `"isPartOf": { "@id": "https://www.evochia.gr/#website" }` to contact.html JSON-LD
4. **(R05 — P1)** Delete or `.vercelignore` the 14 unused images from `photos/` to save ~2.5 MB deploy size
5. **(R12 — P2)** Standardize nav logo `alt` and `aria-label` across all pages
6. **(R17 — P2)** Align index.html footer markup with other pages (add `data-en`/`data-el` to email/social links)
7. **(R16 — P2)** Update sitemap.xml `lastmod` dates to reflect actual last-modified dates per page

### 1-day improvements

8. **(R02 — P0)** Move GA4 inline script content into `site.js` (already loaded with `defer`) and remove the SHA hash from CSP — eliminates fragile hash dependency
9. **(R06 — P1)** Replace all inline `padding: 6rem 3rem` with CSS classes using `var(--page-pad)` for responsive padding
10. **(R13 — P2)** Extract remaining inline styles to named CSS classes (especially layout grids, section backgrounds)
11. **(R03 — P1)** Create WebP versions of the 9 AVIF images and either use `<picture>` elements or add CSS `@supports` fallback

### 1-week improvements / refactors

12. **(R04 — P1)** Implement content-hash filenames for CSS/JS (via build script or Vercel plugin) — eliminates manual version bumping
13. **(R10 — P2)** Introduce a static site generator or build step (e.g., 11ty, simple include script) to extract nav/footer/head into partials
14. **(R11 — P2)** Create privacy policy page (`/privacy`) covering GA4 data collection, Formspree form data, cookies/localStorage usage
15. **(R09 — P1)** Convert below-fold CSS background images to `<img loading="lazy">` with `object-fit: cover` for deferred loading
16. **(R14 — P2)** Run automated contrast audit (axe, WAVE) on live deployment and fix any failing ratios

---

## 6) Regression checklist (run after every change)

Run these checks after every deployment:

- [ ] **Canonicals match URLs:** Every page's `<link rel="canonical">` uses `https://www.evochia.gr/[page]/` with trailing slash
- [ ] **Nav links consistent:** All 7 pages have identical navigation (5 links + language toggle) pointing to clean URLs
- [ ] **Footer consistent:** All pages have identical footer content, Greek translations, and link targets
- [ ] **CSP not broken:** Open browser console on each page — no `Refused to execute` or `Refused to load` errors
- [ ] **GA4 firing:** Check GA4 Realtime in Google Analytics — events appear for page views
- [ ] **Form works:** Submit test entry on `/contact` — confirm Formspree receives it and success message displays
- [ ] **Language toggle:** Switch to EL and back on each page — all text switches, `lang` attribute updates, preference persists across pages
- [ ] **Mobile layout:** Contact page form stacks properly at 375px width
- [ ] **404 works:** Visit a non-existent URL — custom 404 page renders with navigation
- [ ] **Images load:** Visually verify venue cards, service panels, and cuisine cards show photos (not just gradient overlays)
- [ ] **No stale cache:** After CSS/JS changes, version string is updated in all HTML files OR content-hash filenames are used
- [ ] **Sitemap current:** `sitemap.xml` URLs match actual pages, `lastmod` updated
- [ ] **robots.txt accessible:** `https://www.evochia.gr/robots.txt` returns valid content
- [ ] **HTTPS enforced:** HTTP request redirects to HTTPS (Vercel handles this)
- [ ] **Structured data valid:** Paste homepage URL into Google Rich Results Test — no errors

---

## 7) Appendix: Suggested local validation commands (do not run)

No `package.json` exists — this is a static site with no build step.

**Optional checks:**

```bash
# Validate HTML (requires vnu-jar or online validator)
# Optional — upload each .html file to https://validator.w3.org/

# Validate structured data
# Optional — paste URLs into https://search.google.com/test/rich-results

# Check CSP hash matches inline script (run locally)
# Optional
echo -n '<script-content-here>' | openssl dgst -sha256 -binary | base64

# Lighthouse audit (requires Chrome/Chromium)
# Optional
npx lighthouse https://www.evochia.gr --output=json --output-path=./audit/lighthouse.json

# axe accessibility check (requires @axe-core/cli)
# Optional
npx @axe-core/cli https://www.evochia.gr

# Validate sitemap
# Optional — paste URL into https://www.xml-sitemaps.com/validate-xml-sitemap.html

# Check security headers
# Optional — paste URL into https://securityheaders.com/
```
