# Evochia Site — Master Audit Status
**Repository:** `heraklist/evochia_site` | **Τελευταία ενημέρωση:** Μάρτιος 2026  
**Βάση:** Audit v1 (15 findings) + Audit v2 (9 νέα findings) = **24 findings σύνολο**

---

## Σύνοψη

| Status | Count |
|--------|-------|
| ✅ Fixed | 12 |
| ⚠️ Partial | 4 |
| ❌ Code-side (actionable) | 5 |
| 🔒 Dashboard-only (non-code) | 3 |
| **Σύνολο** | **24** |

---

## Audit v1 — 15 Original Findings

| # | Finding | Status | Σημείωση |
|---|---------|--------|----------|
| 1 | `404.html` missing | ✅ Fixed | title, robots, hero, nav, footer |
| 2 | `pizza-night-01.webp` 1.5MB | ⚠️ Partial | pizza-01: 1.4MB · greek-02: 578KB · pizza-03: 433KB |
| 3 | Hero image χωρίς preload | ✅ Fixed | `index.html:56` |
| 4 | `souvlaki.jpg` JPEG | ✅ Fixed | `souvlaki.webp` δημιουργήθηκε, refs ενημερώθηκαν |
| 5 | Cache busting `?v=1.0` manual | ⚠️ Partial | Έγινε `?v=2.0`, παραμένει manual |
| 6 | `logo.png` immutable χωρίς hash | ❌ Open | `vercel.json:28,30` — στο v2.1 fix prompt |
| 7 | `og:image:alt` missing | ✅ Fixed | Και στις 6 σελίδες |
| 8 | `innerHTML` language toggle XSS | ❌ Open | `js/site.js:129` — στο v2.1 fix prompt |
| 9 | Sitemap χωρίς `lastmod` | ✅ Fixed | `sitemap.xml:3` |
| 10 | Schema.org `founder` + `address` ελλιπή | ⚠️ Partial | telephone/email/sameAs ✅ · founder χωρίς επώνυμο · no PostalAddress |
| 11 | `apple-touch-icon` + favicon fallbacks | ⚠️ Partial | apple-touch-icon ✅ · favicon.ico/svg missing |
| 12 | `theme-color` missing | ✅ Fixed | Σε όλες τις σελίδες |
| 13 | `logo.png` 59KB PNG | ❌ Open | `assets/logo.png` — στο v2.1 fix prompt |
| 14 | Formspree anti-spam hardening | 🔒 Dashboard | reCAPTCHA + domain restriction — Formspree dashboard only |
| 15 | `?v=1.0` missing από `private-chef.html` | ✅ Fixed | `private-chef.html:49` με `?v=2.0` |

---

## Audit v2 — 9 Νέα Findings

| # | Finding | Status | Σημείωση |
|---|---------|--------|----------|
| V2-1 | `og:url` www mismatch σε όλα τα pages | ✅ Fixed | Εφαρμόστηκε μαζί με v2 |
| V2-2 | `trailingSlash: false` vs sitemap trailing slashes | ✅ Fixed | Εφαρμόστηκε μαζί με v2 |
| V2-3 | `sameAs: []` κενό array | ✅ Fixed | Τώρα έχει Instagram + Facebook |
| V2-4 | `preloader-tagline` χωρίς `aria-hidden` στα inner pages | 🔒 Verify | Να ελεγχθεί |
| V2-5 | `aria-current="page"` missing στο nav | 🔒 Verify | Να ελεγχθεί |
| V2-6 | `hamburger:focus-visible` CSS missing | ❌ Open | Στο v2.1 fix prompt |
| V2-7 | Form validation (`novalidate` χωρίς JS check) | ❌ Open | Στο v2.1 fix prompt |
| V2-8 | COOP/CORP headers missing | 🔒 Dashboard | `vercel.json` — low priority |
| V2-9 | Schema missing σε `menus.html` / `about.html` | ✅ Fixed | Εφαρμόστηκε μαζί με v2 |

---

## Τι Απομένει — Grouped By Type

### ❌ Code-side (5 items — Fix Prompt v2.1)

| ID | Task | Αρχείο | Χρόνος |
|----|------|--------|--------|
| #2 | Compress photos (3 εικόνες) | `photos/pizza-night-01.webp` κλπ | ~30 min |
| #8 | `innerHTML` sanitization ή comment | `js/site.js:129` | 10 min |
| #10 | Schema PostalAddress + founder επώνυμο | `index.html` | 10 min |
| #11 | `favicon.ico` + `favicon.svg` fallback | `assets/` + όλα τα HTML | 20 min |
| #13 | `logo.png` → WebP + `<picture>` element | `assets/` + όλα τα HTML | 30 min |
| V2-6 | `hamburger:focus-visible` στο CSS | `css/site.css` | 5 min |
| V2-7 | Form validation (`novalidate`) | `contact.html` / `js/site.js` | 15 min |

**Εκτιμώμενος χρόνος:** ~2 ώρες

---

### ⚠️ Partial (αποδεκτά ως έχουν)

| ID | Finding | Γιατί αποδεκτό |
|----|---------|---------------|
| #5 | Manual `?v=2.0` | Για static site χωρίς build step είναι workable. Αρκεί να θυμάσαι να το bumps κάθε deploy. |
| #6 | `immutable` χωρίς hash στο logo | Το logo αλλάζει σπάνια. Αν αλλάξει, rename σε `logo-v2.png` και update refs. |

---

### 🔒 Non-code / Verify (3 items)

| ID | Finding | Action |
|----|---------|--------|
| #14 | Formspree anti-spam | Formspree dashboard → Settings → Add domain restriction `evochia.gr` + enable reCAPTCHA |
| V2-4 | `aria-hidden` preloader tagline | Grep: `grep 'preloader-tagline' about.html catering.html contact.html menus.html private-chef.html` |
| V2-5 | `aria-current` nav | Grep: `grep 'aria-current' *.html` |

---

## Quick Verify Commands

```bash
# Ελέγχει V2-4 (preloader aria-hidden)
grep -n 'preloader-tagline' about.html catering.html contact.html menus.html private-chef.html

# Ελέγχει V2-5 (aria-current)
grep -n 'aria-current' *.html

# Ελέγχει #10 (schema address)
python3 -c "import json,re; s=open('index.html').read(); m=re.search(r'<script type=\"application/ld\+json\">(.*?)</script>',s,re.DOTALL); d=json.loads(m.group(1)); print(d.get('address')); print(d.get('founder'))"

# Ελέγχει image sizes
du -sh photos/pizza-night-01.webp photos/greek-night-02.webp photos/pizza-night-03.webp

# Ελέγχει favicon files
ls -la assets/favicon.ico assets/favicon.svg 2>/dev/null || echo "MISSING"

# Ελέγχει logo.webp
ls -la assets/logo.webp 2>/dev/null || echo "MISSING"
```

---

## Τελικός Στόχος — Definition of Done

Το site θεωρείται **production-ready** όταν:
- [ ] Όλα τα ❌ code-side items κλειστά
- [ ] Formspree domain restriction ενεργοποιημένο
- [ ] `aria-hidden` + `aria-current` verified με grep
- [ ] Google Search Console: Submit sitemap, zero coverage errors
- [ ] Lighthouse score: Performance >85, Accessibility >95, SEO >95, Best Practices >95

---

*Consolidated από: Audit v1 (Claude Sonnet), Audit v1 Pass1/Pass2, GLM Audit, Qwen Audit, Audit v2 (Claude Sonnet)*
