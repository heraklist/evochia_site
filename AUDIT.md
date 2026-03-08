# 🔍 Evochia.gr — Full Site Audit

**Ημερομηνία:** 8 Μαρτίου 2026  
**Scope:** Code quality, SEO, Metadata, CLS, LCP, Performance, Accessibility, Fonts  
**Εξετάστηκαν:** 16 HTML σελίδες (8 EN + 8 EL), 3 CSS, 3 JS, vercel.json, sitemap.xml, robots.txt

---

## Πίνακας Περιεχομένων

1. [Συνοπτικό Executive Summary](#1-executive-summary)
2. [SEO & Metadata](#2-seo--metadata)
3. [Performance — CLS (Cumulative Layout Shift)](#3-cls-cumulative-layout-shift)
4. [Performance — LCP (Largest Contentful Paint)](#4-lcp-largest-contentful-paint)
5. [Performance — Γενικά](#5-performance-γενικά)
6. [Κώδικας — HTML](#6-κώδικας--html)
7. [Κώδικας — CSS](#7-κώδικας--css)
8. [Κώδικας — JavaScript](#8-κώδικας--javascript)
9. [Accessibility (A11y)](#9-accessibility)
10. [Security](#10-security)
11. [Πρόταση Γραμματοσειρών](#11-πρόταση-γραμματοσειρών)
12. [Checklist Προτεραιοτήτων](#12-checklist-προτεραιοτήτων)

---

## 1. Executive Summary

Η Evochia.gr είναι ένα **πολύ καλά δομημένο** premium catering site. Η βάση είναι σωστή: σύγχρονα image formats (AVIF/WebP), self-hosted fonts, strong security headers, comprehensive structured data, bilingual i18n. Παρακάτω αναφέρονται τα σημεία που χρειάζονται βελτίωση ή διόρθωση, κατηγοριοποιημένα ανά σοβαρότητα.

| Κατηγορία | Κρίσιμα 🔴 | Σημαντικά 🟡 | Μικρά 🟢 |
|-----------|-----------|-------------|----------|
| SEO & Metadata | 3 | 4 | 3 |
| CLS | 2 | 1 | — |
| LCP | 1 | 2 | 1 |
| Code Quality | 1 | 4 | 3 |
| Accessibility | — | 3 | 2 |
| Security | — | 1 | 1 |

---

## 2. SEO & Metadata

### 🔴 Κρίσιμα

#### S-1. Λείπει `hreflang="x-default"`
**Αρχεία:** Όλα τα HTML (en/ και el/)  
**Πρόβλημα:** Οι σελίδες έχουν `hreflang="en"` και `hreflang="el"` αλλά **δεν** υπάρχει `hreflang="x-default"`. Η Google χρειάζεται το `x-default` ως fallback για χρήστες που δεν ταιριάζουν σε κανένα locale.  
**Διόρθωση:** Προσθήκη σε κάθε σελίδα (εκτός 404):
```html
<link rel="alternate" hreflang="x-default" href="https://www.evochia.gr/en/{page}/">
```

#### S-2. Ασυνέπεια Social Media URLs
**Αρχεία:** `en/contact.html` (γρ. 174–175), `el/contact.html`  
**Πρόβλημα:** Η σελίδα contact χρησιμοποιεί **διαφορετικά** social URLs από τις υπόλοιπες σελίδες:
- Contact: `instagram.com/evochia_catering` + `facebook.com/Evochiacatering`
- Υπόλοιπες: `instagram.com/evochia` + `facebook.com/evochia`
- Schema.org (index.html): `instagram.com/evochia` + `facebook.com/evochia`

Αυτό μπερδεύει τα social signals και τα rich results. Πρέπει **όλα** να δείχνουν στο ίδιο URL.  
**Διόρθωση:** Αποφασίστε ποιο είναι το σωστό username (π.χ. αν το Instagram είναι `evochia_catering`, ενημερώστε **όλες** τις σελίδες + τα JSON-LD).

#### S-3. Ελληνική σελίδα: Structured Data μόνο στο homepage
**Αρχείο:** `el/index.html`  
**Πρόβλημα:** Η ελληνική αρχική σελίδα έχει μόνο **1** JSON-LD block ενώ η αγγλική έχει πλήρες `@graph` με Organization, CateringBusiness, WebSite, WebPage. Οι inner pages (el/about, el/catering κτλ.) φαίνεται να μοιράζονται τα ίδια schemas αλλά πρέπει να **επαληθευτεί** ότι η el/index.html έχει πλήρες graph.  
**Διόρθωση:** Mirror του πλήρους JSON-LD graph από `en/index.html` στο `el/index.html`, με τα `url` να δείχνουν σε `/el/` paths.

### 🟡 Σημαντικά

#### S-4. Λείπει `og:image:alt` tag σε ορισμένες σελίδες
**Αρχεία:** Ελέγξτε `el/about.html`, `el/catering.html` κτλ.  
**Πρόβλημα:** Η τιμή `og:image:alt` είναι πάντα στα αγγλικά — ακόμη και στις ελληνικές σελίδες. Δεν είναι critical αλλά τα social previews θα ήταν πιο σωστά.  
**Διόρθωση:** Μετάφραση του `og:image:alt` content στις ελληνικές σελίδες.

#### S-5. Sitemap: Λείπει `<xhtml:link>` για hreflang
**Αρχείο:** `sitemap.xml`  
**Πρόβλημα:** Το sitemap.xml δεν χρησιμοποιεί `<xhtml:link rel="alternate">` — Google συνιστά τη χρήση τους σε multilingual sitemaps.  
**Διόρθωση:** Κάθε `<url>` θα πρέπει να περιλαμβάνει:
```xml
<url>
  <loc>https://www.evochia.gr/en/</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://www.evochia.gr/en/"/>
  <xhtml:link rel="alternate" hreflang="el" href="https://www.evochia.gr/el/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://www.evochia.gr/en/"/>
  <lastmod>2026-03-08</lastmod>
</url>
```
Και στο root `<urlset>`:
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
```

#### S-6. Font preload μόνο στο homepage
**Αρχεία:** Μόνο `en/index.html` και `el/index.html` (γρ. 43)  
**Πρόβλημα:** Η critical font (Cormorant Garamond Latin) κάνει preload μόνο στο homepage. Οι εσωτερικές σελίδες (about, catering, κτλ.) δεν έχουν `<link rel="preload">`, πράγμα που επιβραδύνει τα headings στο first paint.  
**Διόρθωση:** Προσθήκη σε **όλες** τις σελίδες:
```html
<link rel="preload" href="/assets/fonts/cormorant-garamond-latin.woff2" as="font" type="font/woff2" crossorigin>
```

#### S-7. Λείπει `preconnect` για external services
**Αρχεία:** Όλες οι σελίδες  
**Πρόβλημα:** Δεν υπάρχει `preconnect` για Formspree ή Google Analytics domains.  
**Διόρθωση:** Προσθήκη στο `<head>` τουλάχιστον στο contact.html:
```html
<link rel="preconnect" href="https://formspree.io" crossorigin>
```

### 🟢 Μικρά

#### S-8. `robots.txt` — Disallow μόνο `_publish_repo`
Δεν αποκλείει `/docs/`, `/audit/` ή `.md` αρχεία. Αυτά προστατεύονται μόνο μέσω vercel.json X-Robots-Tag, πράγμα σωστό, αλλά μια redundant γραμμή στο robots.txt δεν βλάπτει.

#### S-9. Description Length
Μερικά descriptions πλησιάζουν τους 165 χαρακτήρες. Ιδανικά 130–155 χαρακτήρες για full visibility στα SERPs.

#### S-10. Missing `article:author` / `article:published_time`
Δεν ισχύει για service pages, αλλά αν προστεθεί blog μελλοντικά, θα χρειαστεί.

---

## 3. CLS (Cumulative Layout Shift)

### 🔴 Κρίσιμα

#### C-1. Venue card images χωρίς `width`/`height`
**Αρχεία:** `en/index.html` γρ. 279–283, `el/index.html` γρ. 279–283  
**Πρόβλημα:** Τα 5 venue card images (private-villas, luxury-yachts, corporate-events, exclusive-venues, island-retreats) **δεν** έχουν `width` και `height` attributes. Αυτό σημαίνει ότι ο browser δεν μπορεί να υπολογίσει aspect ratio πριν φορτωθεί η εικόνα → **layout shift**.  
**Εκτιμώμενο CLS impact:** 0.05–0.15 (moderate-high)  
**Διόρθωση:** Προσθήκη `width` και `height` σε κάθε εικόνα:
```html
<img src="/assets/images/private-villas.avif" alt="..." width="600" height="800" loading="lazy" decoding="async">
```

#### C-2. Menu page images χωρίς `width`/`height`
**Αρχεία:** `en/menus.html` γρ. 106–108, `el/menus.html`  
**Πρόβλημα:** Τα 3 menu concept card images (mediterranean.avif, nikkei-sushi.avif, bbq-grills.avif) δεν έχουν `width`/`height`.  
**Διόρθωση:** Ίδια με C-1.

### 🟡 Σημαντικά

#### C-3. `stats-grid` CSS: 4 columns, 3 items
**Αρχείο:** `css/site.css` γρ. 423  
**Πρόβλημα:** Η `.stats-grid` ορίζει `grid-template-columns: repeat(4, 1fr)` αλλά στο homepage (index.html) και στο about.html χρησιμοποιούνται μόνο 3 `stat-item`. Αυτό αφήνει μια κενή στήλη στη δεξιά πλευρά — δεν είναι CLS αλλά είναι visual inconsistency. Στο about.html και private-chef.html χρησιμοποιείται inline style `grid-template-columns:repeat(3,1fr)` για να αντιμετωπιστεί.  
**Διόρθωση:** Δημιουργία `.stats-grid-3` class ή αλλαγή default σε `repeat(auto-fit, minmax(200px, 1fr))`.

---

## 4. LCP (Largest Contentful Paint)

### 🔴 Κρίσιμα

#### L-1. Hero section: Δεν υπάρχει hero image — LCP element είναι κείμενο
**Πρόβλημα:** Ο LCP element στο homepage είναι πιθανότατα το hero `<h1>` ή το `.hero-description`. Αυτά εξαρτώνται από font loading (Cormorant Garamond). Αν η font δεν φορτωθεί γρήγορα, χρησιμοποιείται Georgia (fallback) → `font-display: swap` → FOUT.  
**Εκτιμώμενο LCP:** 1.5–2.5s (καλό, αλλά εξαρτάται από network)  
**Βελτίωση:** Η font preload (ήδη υπάρχει στο homepage) βοηθάει. Για τις **εσωτερικές σελίδες** που δεν έχουν preload, αυτό μεγαλώνει — βλ. S-6.

### 🟡 Σημαντικά

#### L-2. Render-blocking CSS
**Αρχείο:** Όλες οι σελίδες  
**Πρόβλημα:** Το `site.css` (36 KB) φορτώνεται ολόκληρο ως render-blocking. Ιδανικά, μόνο τα above-the-fold styles (nav + hero ≈ 5–8 KB) θα έπρεπε να είναι inline ή critical CSS, με το υπόλοιπο deferred.  
**Εκτιμώμενη βελτίωση:** 200–500ms στο FCP/LCP  
**Προτεινόμενη λύση:** Εφαρμογή critical CSS extraction (π.χ. με `critters` ή χειροκίνητα):
1. Inline τα styles για nav + hero στο `<head>`
2. Defer load για το υπόλοιπο `site.css`

**Σημείωση:** Αυτό είναι advanced optimization — η τωρινή κατάσταση (ένα 36KB CSS αρχείο) δεν είναι κακή.

#### L-3. Μεγάλα images πάνω από 250 KB
**Αρχεία:**
- `cuisine-mexican.webp` — 293 KB
- `cuisine-asian.webp` — 271 KB
- `mediterranean.avif` — 260 KB
- `bbq-grills.avif` — 250 KB

**Πρόβλημα:** Αυτά τα images, αν και lazy-loaded, μπορούν να καθυστερήσουν τη γενική εμπειρία. Εάν κάποιο image γίνει ποτέ above-the-fold (π.χ. σε μικρή οθόνη), θα επηρεάσει LCP.  
**Διόρθωση:** Recompress σε target < 150 KB ανά image. Για AVIF, quality 60–70 συνήθως αρκεί.

### 🟢 Μικρά

#### L-4. Cookie Consent CSS deferred σωστά ✅
Τα `cookieconsent.css` + `cookieconsent-evochia.css` φορτώνονται μέσω JS — σωστή πρακτική, δεν blocking.

---

## 5. Performance — Γενικά

### ✅ Σωστά

| Στοιχείο | Κατάσταση |
|----------|-----------|
| Images formats | AVIF + WebP ✅ |
| Lazy loading | `loading="lazy"` + `decoding="async"` σε όλα τα content images ✅ |
| Font format | WOFF2 ✅ |
| Font display | `font-display: swap` ✅ |
| Script loading | `defer` (site.js), `type="module"` (cookieconsent) ✅ |
| Cache headers | 1yr immutable (assets/photos), 30d (css/js) ✅ |
| Passive scroll | `{ passive: true }` στο scroll event ✅ |
| No jQuery | Vanilla JS ✅ |

### 🟡 Βελτιώσεις

#### P-1. Total font payload: 190 KB
Τα 6 font files αθροίζουν 190 KB. Η latin-ext ομάδα (Cormorant Garamond Latin-Ext: 33 KB, Raleway Latin-Ext: 31 KB) φορτώνεται μόνο αν χρησιμοποιούνται extended Latin χαρακτήρες. Σε ένα EN/EL site, αυτοί σπάνια χρειάζονται.  
**Πρόταση:** Αξιολόγηση αν τα latin-ext subsets χρειάζονται πραγματικά. Αν χρειάζονται μόνο βασικοί ελληνικοί + λατινικοί χαρακτήρες, μπορεί να γίνει custom subsetting (π.χ. με `pyftsubset` ή Google Fonts subsetter) για να μειωθεί σε ~120 KB.

#### P-2. Cookieconsent UMD bundle: 23 KB
Η βιβλιοθήκη `cookieconsent.umd.js` (23 KB) + config (5 KB) = 28 KB JavaScript μόνο για cookies. Δεν είναι ακριβό αλλά φορτώνεται ως module.  
**Πρόταση:** Φόρτωση ασύγχρονα ή με `setTimeout` μετά το interaction.

#### P-3. Nav logo χωρίς explicit `fetchpriority`
Το logo εμφανίζεται above-the-fold αλλά δεν έχει `fetchpriority="high"`.  
**Πρόταση:** Προσθήκη `fetchpriority="high"` στο nav logo `<img>`.

---

## 6. Κώδικας — HTML

### 🔴 Κρίσιμα

#### H-1. Footer **δεν** είναι μέσα στο `<body>` ομοιόμορφα
**Αρχείο:** `en/contact.html` γρ. 157–167  
**Πρόβλημα:** Στο contact.html, ο conciergerie panel και ο footer βρίσκονται **μετά** το κλείσιμο του `</main>` αλλά **πριν** τον footer. Στο index.html η σειρά είναι: `</main>` → `<footer>` → conciergerie → scripts. Στο contact.html η σειρά είναι: `</main>` → conciergerie → `<footer>` → scripts.  
**Πρόβλημα:** Ασυνέπεια στο DOM order μεταξύ σελίδων — δεν επηρεάζει functionality αλλά κάνει τη συντήρηση πιο δύσκολη.  
**Πρόταση:** Τυποποίηση σε: `</main>` → `<footer>` → conciergerie → scripts σε **όλες** τις σελίδες.

### 🟡 Σημαντικά

#### H-2. Πολλά inline styles
**Αρχεία:** `about.html` (15 instances), `private-chef.html` (14), `contact.html` (12), `catering.html` (11), `menus.html` (9)  
**Παραδείγματα:**
```html
<div style="text-align:center;max-width:800px;margin:0 auto">
<div style="margin-top:2rem">
<p style="color:var(--cream-dim);margin-bottom:1.5rem">
```
**Πρόβλημα:** Inline styles δυσκολεύουν τη maintenance, αυξάνουν HTML size, δεν μπορούν να γίνουν cache, και σε strict CSP θα χρειαζόντουσαν `style-src 'unsafe-inline'` (που ήδη χρησιμοποιείται).  
**Πρόταση:** Δημιουργία utility classes στο `site.css`:
```css
.text-center { text-align: center; }
.inner-narrow { max-width: 800px; margin: 0 auto; }
.mt-2 { margin-top: 2rem; }
.mb-1\.5 { margin-bottom: 1.5rem; }
```

#### H-3. Empty `alt=""` σε venue card images
**Αρχεία:** `en/index.html` γρ. 279–283, `el/index.html` γρ. 279–283  
**Πρόβλημα:** 5 venue card images έχουν `alt=""`. Αυτές οι εικόνες **δεν** είναι καθαρά decorative — αποτελούν το background ενός card που περιγράφει "Private Villas", "Luxury Yachts" κτλ. Ένας screen reader θα τις αγνοήσει τελείως.  
**Πρόταση:**
- **Επιλογή Α (recommended):** Descriptive alt: `alt="Private villa dining terrace in Greece"`
- **Επιλογή Β:** Αν θεωρούνται decorative, προσθήκη `role="presentation"` στο `<img>` (πέρα από `alt=""`)

#### H-4. `<head>` tag ordering inconsistency
**Πρόβλημα:** Στο `index.html` ο `<head>` ακολουθεί: charset → verification → viewport → title → description → canonical → hreflang → OG → Twitter → referrer → favicon → preload → schema → CSS → JS.  
Στο `about.html`: charset → viewport → title → favicon → theme-color → description → canonical → hreflang → referrer → OG → Twitter → schema → CSS → JS.  
**Πρόταση:** Τυποποίηση σε consistent ordering σε όλες τις σελίδες.

### 🟢 Μικρά

#### H-5. Duplicate `id="navLogo"` pattern
Δεν είναι πρόβλημα αν κάθε σελίδα φορτώνεται ανεξάρτητα (δεν υπάρχει SPA), αλλά σημειώνεται.

#### H-6. `en/index.html` hero-title `alt` στο logo
Στο index.html: `alt="Evochia"`. Στις υπόλοιπες σελίδες: `alt="Evochia logo"`. Μικρή ασυνέπεια.

#### H-7. Αρκετά μεγάλα inline SVGs
Τα footer social icons (Instagram, Facebook) + conciergerie WhatsApp icon περιλαμβάνουν πλήρη SVG paths inline σε **κάθε σελίδα**. Αυτό αυξάνει το HTML size αλλά αποφεύγει HTTP requests — trade-off αποδεκτό.

---

## 7. Κώδικας — CSS

### ✅ Σωστά

| Στοιχείο | Κατάσταση |
|----------|-----------|
| CSS Variables | ✅ Ολοκληρωμένο design token system |
| Responsive | ✅ 6 breakpoints (1100, 968, 768, 600, 480px) |
| Reduced motion | ✅ `@media (prefers-reduced-motion: reduce)` |
| Focus indicators | ✅ Consistent `outline: 2px solid var(--gold)` |
| No-JS fallback | ✅ `.no-js .reveal` rule |
| `font-display: swap` | ✅ |

### 🟡 Σημαντικά

#### CSS-1. Χρώματα contrast
**Αρχείο:** `css/site.css` γρ. 67  
Η `--cream-dim: #c4b9a8` πάνω σε `--green-dark: #0f2e1f` δίνει contrast ratio **≈ 7.5:1** (WCAG AAA ✅). Σωστά αναβαθμίστηκε. Σημειώστε ότι μερικά μικρά κείμενα (`.venue-card p`, `.footer-desc`) χρησιμοποιούν `cream-dim` σε μέγεθος `.75rem`–`.82rem` — σε αυτά τα μεγέθη χρειάζεται τουλάχιστον **4.5:1** contrast (AA), πράγμα που ικανοποιείται.

#### CSS-2. Η `splatter-overlay` χρησιμοποιεί `position: absolute` χωρίς explicit containment
**Αρχείο:** `css/site.css` γρ. 103  
**Πρόταση:** Προσθήκη `contain: layout` ή `will-change: transform` στα parent elements για performance optimization σε paint-heavy sections.

#### CSS-3. Animation count
Υπάρχουν **47** animation/transition rules. Αν και αυτά ελέγχονται σωστά από το `prefers-reduced-motion`, μπορεί να εμφανίσουν jank σε αδύναμες συσκευές.  
**Πρόταση:** Εξέταση αν μπορούν να μειωθούν σε **GPU-accelerated only** animations (transform, opacity) — αυτό ήδη γίνεται στις περισσότερες περιπτώσεις ✅.

### 🟢 Μικρά

#### CSS-4. `.hero { height: 100vh }` → `100svh` fallback ✅
Η χρήση `@supports (height: 100svh)` είναι σωστή. Σημειώνεται ως positive.

#### CSS-5. No CSS minification flag
Εάν η Vercel κάνει auto-minification, τότε OK. Αλλιώς, ένα 36 KB CSS μπορεί να γίνει ~25 KB minified + ~7 KB gzip.

---

## 8. Κώδικας — JavaScript

### ✅ Σωστά

| Στοιχείο | Κατάσταση |
|----------|-----------|
| IIFE wrapper | ✅ `(function () { 'use strict'; ...})()` |
| Defensive coding | ✅ Null checks σε κάθε `getElementById` |
| Passive scroll | ✅ `{ passive: true }` |
| IntersectionObserver | ✅ Σωστό fallback |
| GA4 tracking | ✅ Consent-aware |
| Form submission | ✅ Proper error handling |

### 🟡 Σημαντικά

#### JS-1. XSS mitigation στο `innerHTML`
**Αρχείο:** `js/site.js` γρ. 143–151  
**Κώδικας:** Η `applyLanguage()` χρησιμοποιεί `el.innerHTML = allowed` αφού κάνει sanitize. Ο sanitizer φιλτράρει σωστά: μόνο `<em>` και `<span>` tags, stripped `on*` attributes. Σωστή υλοποίηση, αλλά θα ήταν ακόμη πιο ασφαλής με DOMParser ή template-based approach.  
**Πρόταση:** Χαμηλή προτεραιότητα — η τωρινή υλοποίηση είναι αρκετά ασφαλής.

#### JS-2. Language persistence μπορεί να δημιουργήσει confusion
**Αρχείο:** `js/site.js` γρ. 128–135  
**Πρόβλημα:** Σε legacy root pages (χωρίς `/en/` ή `/el/`), η γλώσσα αποθηκεύεται σε localStorage. Αλλά με τα redirects στο vercel.json (`/` → `/en/`), οι χρήστες δεν θα φτάσουν ποτέ σε root pages. Αυτός ο κώδικας υπάρχει για backward compatibility.  
**Πρόταση:** Μπορεί να αφαιρεθεί safety αν επιβεβαιωθεί ότι δεν υπάρχουν legacy root URLs in the wild.

#### JS-3. Δεν γίνεται debounce στο scroll event
**Αρχείο:** `js/site.js` γρ. 37–39  
**Πρόβλημα:** Η `classList.toggle` στο scroll event εκτελείται σε κάθε scroll frame. Ο browser optimizes με passive listener, αλλά ένα `requestAnimationFrame` wrapper θα ήταν πιο αποδοτικό.  
**Πρόταση:** Χαμηλή προτεραιότητα — η λειτουργία είναι ελαφριά (μόνο classList toggle).

### 🟢 Μικρά

#### JS-4. Copyright year hardcoded + dynamic
**Αρχεία:** HTML (γρ. 344 index): `<span id="copyright-year">2026</span>`  
**JS:** `yearEl.textContent = new Date().getFullYear();`  
Σωστό — fallback σε hardcoded + dynamic override.

---

## 9. Accessibility

### ✅ Σωστά

| Στοιχείο | Κατάσταση |
|----------|-----------|
| Skip link | ✅ `<a href="#main" class="skip-link">` σε κάθε σελίδα |
| ARIA labels | ✅ 19+ instances (nav, hamburger, conciergerie, social icons) |
| Heading hierarchy | ✅ H1 → H2 → H3 χωρίς skipping |
| Focus-visible | ✅ Custom gold outline σε κάθε interactive element |
| Form labels | ✅ Explicit `<label for="...">` |
| Aria-live | ✅ Form status `aria-live="polite"` |
| Aria-expanded | ✅ Hamburger + conciergerie buttons |
| Semantic HTML | ✅ `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` |
| Keyboard nav | ✅ Arrow keys σε service tabs |
| Color contrast | ✅ WCAG AA+ σε κύρια χρώματα |
| Touch targets | ✅ `min-width: 44px; min-height: 44px` σε buttons |
| Reduced motion | ✅ `@media (prefers-reduced-motion: reduce)` |

### 🟡 Σημαντικά

#### A-1. Venue card images: empty `alt` (ξαναεπισημαίνεται — βλ. H-3)
Δεδομένου ότι τα cards αυτά είναι `<article>` elements με `<h3>`, οι εικόνες φόντου δεν είναι καθαρά decorative.

#### A-2. `aria-current="page"` consistency
**Αρχεία:** Inner pages (about, catering, κτλ.)  
Το `aria-current="page"` εφαρμόζεται σωστά στο nav link κάθε σελίδας ✅. Σημειώνεται ως positive.

#### A-3. Conciergerie εμφανίζεται σε κάθε σελίδα, ακόμη και στο contact
**Αρχείο:** `en/contact.html`  
**Πρόβλημα:** Ο floating conciergerie panel (με "Request a Quote") εμφανίζεται και στη σελίδα Contact, όπου ο χρήστης **ήδη βλέπει** τη φόρμα. Πιθανό redundancy.  
**Πρόταση:** Μπορεί να κρύβεται στο Contact page μέσω CSS: `.contact-page .conciergerie { display: none; }` ή να αλλάζει σε "Call Us" / "WhatsApp Only".

### 🟢 Μικρά

#### A-4. `<html>` lacks `dir="ltr"`
Δεν είναι απαραίτητο (default LTR) αλλά explicit declaration είναι best practice.

#### A-5. Form honeypot uses `inert` ✅
Σωστή χρήση `inert` attribute + `aria-hidden` στο honeypot field.

---

## 10. Security

### ✅ Σωστά

| Στοιχείο | Κατάσταση |
|----------|-----------|
| CSP header | ✅ Strict, no `unsafe-eval` |
| HSTS | ✅ 2 years + preload |
| X-Frame-Options | ✅ DENY |
| X-Content-Type | ✅ nosniff |
| Referrer-Policy | ✅ strict-origin-when-cross-origin |
| Permissions-Policy | ✅ camera/microphone/geolocation denied |
| COOP | ✅ same-origin-allow-popups |
| CORP | ✅ same-site |
| Cookie consent | ✅ GDPR-compliant, consent-before-tracking |
| Honeypot | ✅ Hidden field + `inert` |
| External links | ✅ `rel="noopener noreferrer"` |

### 🟡 Σημαντικά

#### SEC-1. CSP: `style-src 'unsafe-inline'`
**Αρχείο:** `vercel.json` γρ. 14  
**Πρόβλημα:** Η CSP επιτρέπει `'unsafe-inline'` στα styles. Αυτό είναι κοινό (πολλά CSS-in-JS frameworks το απαιτούν), αλλά αν αφαιρεθούν τα inline styles (βλ. H-2), θα μπορούσε να γίνει πιο strict.  
**Πρόταση:** Μακροπρόθεσμα, migration σε `style-src 'self'` αν αφαιρεθούν τα inline styles + cookieconsent inline.

### 🟢 Μικρά

#### SEC-2. Formspree endpoint visible στο HTML
Το endpoint `https://formspree.io/f/xwvngybk` είναι visible στο HTML. Αυτό είναι by design (Formspree client-side), αλλά κάνει πιο εύκολο το spam — μετριάζεται από honeypot + Formspree rate limiting.

---

## 11. Πρόταση Γραμματοσειρών

### Τρέχουσα κατάσταση

| Ρόλος | Font | Βάρη | Σχόλιο |
|-------|------|------|--------|
| Headings | Cormorant Garamond | 300, 300 italic | Elegant serif, εξαιρετική για luxury |
| Body | Raleway | 300–600 | Clean geometric sans, modern |

### Αξιολόγηση τρεχουσών fonts

**Cormorant Garamond** — ✅ **Εξαιρετική επιλογή** για headings. Lightweight serif, πολύ elegant, ταιριάζει στο luxury positioning. Λεπτές γραμμές, κλασικό αλλά μοντέρνο feel. Υποστηρίζει εξαιρετικά ελληνικούς χαρακτήρες.

**Raleway** — 🟡 **Καλή αλλά βελτιώσιμη** για body text. Η Raleway είναι geometric sans-serif, σχεδιασμένη αρχικά ως display font. Σε μικρά μεγέθη (.78rem–.95rem) που χρησιμοποιεί η Evochia, μπορεί να φαίνεται λίγο **λεπτή** και δυσανάγνωστη, ειδικά στο weight 300. Στις μεγάλες παραγράφους (About, Private Chef pages) αυτό γίνεται πιο εμφανές.

### 🎯 Προτάσεις

#### Πρόταση Α: Κρατήστε Cormorant + Αντικαταστήστε body font (Recommended)

| Ρόλος | Font | Γιατί |
|-------|------|-------|
| **Headings** | **Cormorant Garamond** (κρατήστε) | Η τέλεια επιλογή — μην αλλάξετε |
| **Body** | **Jost** | Modern geometric sans, πιο readable σε μικρά μεγέθη, εξαιρετικό Greek support, ελαφριά και κομψή. Μοιάζει με Raleway αλλά πιο readable. ~50 KB WOFF2 |

**Εναλλακτικές body fonts:**

| Font | Χαρακτήρας | WOFF2 | Greek | Σχόλιο |
|------|-----------|-------|-------|--------|
| **Jost** | Geometric, modern | ~50 KB | ✅ Excellent | Closest to Raleway, better readability |
| **Inter** | Humanist, neutral | ~100 KB | ✅ Excellent | Best readability, variable font, πιο "tech" |
| **Source Sans 3** | Humanist, warm | ~60 KB | ✅ Excellent | Professional, excellent reading flow |
| **Outfit** | Geometric, friendly | ~45 KB | ✅ Good | Lighter, modern startup feel |
| **Figtree** | Geometric, friendly | ~35 KB | ❌ Basic only | Great but weak Greek — exclude |
| **DM Sans** | Geometric, premium | ~45 KB | ✅ Good | Premium look, σαν high-end brand |

#### Πρόταση Β: Full refresh (αν θέλετε πιο dramatic αλλαγή)

| Ρόλος | Font | Γιατί |
|-------|------|-------|
| **Headings** | **Playfair Display** | Πιο theatrical serif, bold luxury — αλλά heavy. ~80 KB |
| **Body** | **Jost** ή **DM Sans** | Ταιριάζει τέλεια |

⚠️ **Δεν προτείνεται** — η Cormorant Garamond ταιριάζει πολύ καλύτερα στο refined/understated brand voice της Evochia.

#### Πρόταση Γ: Μόνο weight tuning (ελάχιστη αλλαγή)

Αν δεν θέλετε να αλλάξετε fonts, αυξήστε μόνο τα body weights:

```css
/* Αντί body weight: 300, χρησιμοποιήστε 400 */
body { font-weight: 400; }

/* Paragraphs πιο ευανάγνωστα */
.about-text p,
.service-info p { font-weight: 400; }
```

Αυτό θα βελτιώσει αισθητά τη readability χωρίς αλλαγή font family.

### Γενικές Συμβουλές Τυπογραφίας

1. **Body text weight:** Αυξήστε από 300 σε **400** — το 300 σε μικρά μεγέθη (.85rem–.95rem) σε dark backgrounds είναι δυσανάγνωστο
2. **Line-height:** Η τρέχουσα `1.7` είναι εξαιρετική ✅
3. **Letter-spacing:** Τα uppercase labels (`.section-label`) με `.4em` spacing είναι σωστά αλλά στα ελληνικά φαίνεται πιο sparse — ίσως `.25em` θα ήταν καλύτερο (ήδη γίνεται σε `.hero-subtitle` για EL ✅)
4. **Font subsetting:** Αν αλλάξει η body font, φτιάξτε custom subset για Greek + Latin μόνο

---

## 12. Checklist Προτεραιοτήτων

### 🔴 Υψηλή Προτεραιότητα (SEO/CLS impact)

- [ ] **S-1:** Προσθήκη `hreflang="x-default"` σε όλες τις σελίδες
- [ ] **S-2:** Ομοιομορφία social media URLs (Instagram/Facebook) σε όλες τις σελίδες + JSON-LD
- [ ] **S-3:** Πλήρες JSON-LD graph στο `el/index.html`
- [ ] **C-1:** Προσθήκη `width`/`height` στα venue card images (index.html)
- [ ] **C-2:** Προσθήκη `width`/`height` στα menu card images (menus.html)

### 🟡 Μεσαία Προτεραιότητα (Performance/Quality)

- [ ] **S-5:** Sitemap xhtml:link hreflang annotations
- [ ] **S-6:** Font preload σε όλες τις inner pages
- [ ] **H-2:** Μετακίνηση inline styles σε CSS classes
- [ ] **H-3/A-1:** Descriptive alt text σε venue card images
- [ ] **L-3:** Recompress images > 250 KB
- [ ] **CSS-3/C-3:** Fix stats-grid 4-column/3-item mismatch
- [ ] **H-1:** Ομοιομορφία DOM order (footer vs conciergerie)

### 🟢 Χαμηλή Προτεραιότητα (Nice-to-have)

- [ ] **S-4:** Μετάφραση `og:image:alt` στις EL σελίδες
- [ ] **S-7:** Preconnect σε Formspree
- [ ] **L-2:** Critical CSS extraction (advanced)
- [ ] **P-1:** Font subsetting (αφαίρεση latin-ext αν δεν χρειάζεται)
- [ ] **P-3:** `fetchpriority="high"` στο nav logo
- [ ] **H-4:** Consistent `<head>` tag ordering
- [ ] **A-3:** Κρύψτε conciergerie στη σελίδα Contact
- [ ] **Body font weight:** Αύξηση από 300 σε 400 για readability
- [ ] **Font recommendation:** Εξετάστε αντικατάσταση Raleway → Jost

---

> **Τελική εκτίμηση:** Η Evochia.gr είναι ένα **εξαιρετικά καλοφτιαγμένο** site για luxury brand. Τα ζητήματα που εντοπίστηκαν είναι κυρίως fine-tuning — δεν υπάρχουν critical bugs ή μεγάλα structural προβλήματα. Οι σημαντικότερες βελτιώσεις (hreflang x-default, image dimensions, social links consistency) μπορούν να ολοκληρωθούν σε λίγες ώρες.
