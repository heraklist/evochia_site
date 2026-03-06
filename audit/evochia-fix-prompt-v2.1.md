# Evochia Site — Fix Prompt v2.1 (Remaining Open/Partial)
## Για χρήση με AI coding assistant

Αυτό το prompt καλύπτει **μόνο τα εναπομείναντα** Open/Partial items από τα audit reports v1 + v2.
Όλα τα άλλα έχουν ήδη fixed.

---

## CONTEXT

Static site `heraklist/evochia_site`. Vanilla HTML/CSS/JS, deployed στο Vercel, χωρίς build step.
Current version strings: `?v=2.0`. Brand color: `#0a1f15` (dark green).

---

## TASK 1 — Image Compression (Partial → Fixed)

Εκτέλεσε στο terminal. Αυτές οι 3 εικόνες παραμένουν πολύ μεγάλες:

```
pizza-night-01.webp  ~1.4MB  ← τεράστιο
greek-night-02.webp  ~578KB
pizza-night-03.webp  ~433KB
```

```bash
# macOS
brew install webp

# Re-encode με lossy compression
cwebp -q 78 photos/pizza-night-01.webp  -o photos/pizza-night-01.webp
cwebp -q 80 photos/greek-night-02.webp  -o photos/greek-night-02.webp
cwebp -q 80 photos/pizza-night-03.webp  -o photos/pizza-night-03.webp

# Verify αποτέλεσμα
du -sh photos/pizza-night-01.webp photos/greek-night-02.webp photos/pizza-night-03.webp
# Target: pizza-01 < 300KB, τα άλλα δύο < 200KB
```

**Σημείωση:** Τα WebP files αυτά έχουν `Cache-Control: immutable` στο Vercel, οπότε μετά το re-encode
το Vercel CDN θα σερβίρει τη νέα έκδοση μόνο σε νέους visitors ή αν κάνεις cache purge.
Εκτέλεσε `vercel --prod` ή κάνε redeploy για να invaluate το CDN cache.

---

## TASK 2 — Fix `innerHTML` XSS στο language toggle

**Αρχείο:** `js/site.js`

**Πρόβλημα:** Η `applyLanguage()` function χρησιμοποιεί `innerHTML` για τα `data-*-html` attributes.
Αν κάποτε αυτά τα attributes έρθουν από user input ή CMS, γίνεται XSS vector.

Βρες αυτή τη function (~line 115-130):

```javascript
function applyLanguage() {
  document.querySelectorAll('[data-' + lang + ']').forEach(function (el) {
    if (el.hasAttribute('data-' + lang + '-html')) return;
    var t = el.getAttribute('data-' + lang);
    if (t) el.textContent = t;
  });
  document.querySelectorAll('[data-' + lang + '-html]').forEach(function (el) {
    var t = el.getAttribute('data-' + lang + '-html');
    if (t) el.innerHTML = t;   // ← το πρόβλημα
  });
}
```

**Αντικατάστησε** το `innerHTML` block με DOMParser sanitization:

```javascript
document.querySelectorAll('[data-' + lang + '-html]').forEach(function (el) {
  var t = el.getAttribute('data-' + lang + '-html');
  if (!t) return;
  // Sanitize: επιτρέπουμε μόνο <em> και <span> tags που χρησιμοποιούνται στο site
  var allowed = t.replace(/<(?!\/?(?:em|span)(?:\s[^>]*)?>)[^>]+>/gi, '');
  el.innerHTML = allowed;
});
```

**Εναλλακτικά** αν θες strict approach, πρόσθεσε comment για να το document-άρεις:

```javascript
document.querySelectorAll('[data-' + lang + '-html]').forEach(function (el) {
  var t = el.getAttribute('data-' + lang + '-html');
  // NOTE: innerHTML is intentional here. These data attributes are compile-time
  // static values from HTML source only — never from user input or external APIs.
  // Only <em> and <span class="gold"> tags are expected in these values.
  if (t) el.innerHTML = t;
});
```

Επέλεξε την εναλλακτική που ταιριάζει στο workflow σου. Για static site, ο comment είναι αρκετός.

---

## TASK 3 — Schema.org `founder` + `address` στο `index.html`

**Αρχείο:** `index.html`

Βρες το `<script type="application/ld+json">` και κάνε τις παρακάτω αλλαγές:

**3a.** Ενημέρωσε το `founder` object:
```json
"founder": {
  "@type": "Person",
  "name": "Heraklis Listikakis",
  "jobTitle": "Executive Chef & Founder"
}
```
*(Αντικατάστησε `Listikakis` με το πραγματικό επώνυμο αν θες να εμφανιστεί στα Google Knowledge Panels)*

**3b.** Αντικατάστησε το `"address": { "addressCountry": "GR" }` με πλήρες PostalAddress:
```json
"address": {
  "@type": "PostalAddress",
  "addressLocality": "Athens",
  "addressRegion": "Attica",
  "addressCountry": "GR"
}
```

**3c.** Βεβαιώσου ότι το τελικό schema object μοιάζει κάπως έτσι:
```json
{
  "@context": "https://schema.org",
  "@type": ["FoodEstablishment", "CateringBusiness"],
  "@id": "https://www.evochia.gr/#organization",
  "name": "Evochia – Premium Event Catering & Private Chef Services",
  "url": "https://www.evochia.gr",
  "telephone": "+306931170245",
  "email": "info@evochia.gr",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Athens",
    "addressRegion": "Attica",
    "addressCountry": "GR"
  },
  "priceRange": "€€€",
  "servesCuisine": ["Mediterranean", "Asian Fusion", "Nikkei"],
  "founder": {
    "@type": "Person",
    "name": "Heraklis [Επώνυμο]",
    "jobTitle": "Executive Chef & Founder"
  },
  "sameAs": [
    "https://www.instagram.com/evochia",
    "https://www.facebook.com/evochia"
  ]
}
```

---

## TASK 4 — Favicon fallbacks (`favicon.ico` + `favicon.svg`)

**Αρχείο:** Όλα τα HTML + δημιουργία νέων favicon files

### 4a. Δημιούργησε `favicon.ico` από το υπάρχον `assets/favicon.png`

Στο terminal:
```bash
# Με ImageMagick
convert assets/favicon.png -resize 32x32 assets/favicon.ico

# Ή με Python (αν δεν έχεις ImageMagick)
python3 -c "
from PIL import Image
img = Image.open('assets/favicon.png')
img.save('assets/favicon.ico', format='ICO', sizes=[(16,16),(32,32)])
"

# Ή online: https://favicon.io/favicon-converter/ (upload favicon.png)
```

### 4b. Δημιούργησε minimal `favicon.svg` (προαιρετικό αλλά best practice)

Δημιούργησε `assets/favicon.svg` — ένα απλό SVG με το γράμμα "E" στο brand color:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0a1f15"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
    font-family="Georgia, serif" font-size="20" fill="#c4a265">E</text>
</svg>
```
Αποθήκευσε ως `assets/favicon.svg`.

### 4c. Ενημέρωσε το `<head>` σε **κάθε** HTML αρχείο

Βρες:
```html
<link rel="icon" href="assets/favicon.png" type="image/png">
```

Αντικατάστησε με:
```html
<link rel="icon" href="assets/favicon.ico" sizes="any">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
```

*(Αν το `apple-touch-icon.png` έχει ήδη μπει από το v2 fix, κράτα τη γραμμή του.)*

---

## TASK 5 — `logo.png` → WebP (quick win)

**Αρχεία:** `assets/logo.png` → `assets/logo.webp`, ενημέρωση σε όλα τα HTML

### 5a. Μετατροπή:
```bash
cwebp -lossless assets/logo.png -o assets/logo.webp
# Χρησιμοποίησε -lossless γιατί το logo έχει πιθανώς transparency

# Verify μέγεθος
du -sh assets/logo.png assets/logo.webp
# Expected: logo.webp < 20KB vs logo.png ~60KB
```

### 5b. Ενημέρωσε το `<head>` σε κάθε HTML

Βρες:
```html
<link rel="preload" href="assets/logo.png" as="image">
```
Άλλαξε σε:
```html
<link rel="preload" href="assets/logo.webp" as="image" type="image/webp">
```

### 5c. Ενημέρωσε τα `<img>` tags στο nav και preloader σε **κάθε** HTML

Βρες όλα τα:
```html
<img src="assets/logo.png" ...>
```

Άλλαξε τα σε `<picture>` element για fallback:
```html
<picture>
  <source srcset="assets/logo.webp" type="image/webp">
  <img src="assets/logo.png" alt="Evochia logo" class="nav-logo-img" id="navLogo" width="42" height="42">
</picture>
```

**Προσοχή:** Το preloader logo `id="preloaderLogo"` πρέπει να παραμείνει με `id` στο `<img>`, όχι στο `<picture>`, γιατί το JS το αναζητά με `getElementById('preloaderLogo')`. Βεβαιώσου ότι το `id` παραμένει στο `<img>` tag μέσα στο `<picture>`.

---

## TASK 6 — Cache busting documentation (config-only, δεν αλλάζει κώδικα)

Το manual `?v=2.0` pattern παραμένει αποδεκτό για static site χωρίς build step.
Δεν χρειάζεται αλλαγή κώδικα, αλλά πρόσθεσε comment στο `vercel.json` ή κράτα note:

**Κανόνας deploy:** Κάθε φορά που αλλάζει `css/site.css` ή `js/site.js`, bump το version:
- `?v=2.0` → `?v=2.1` → `?v=2.2` κλπ.
- Αλλαγή σε **όλα τα 6 HTML files** ταυτόχρονα.

---

## VALIDATION CHECKLIST

```bash
# Task 1 — Image sizes
du -sh photos/pizza-night-01.webp photos/greek-night-02.webp photos/pizza-night-03.webp
# pizza-01 < 350KB, τα άλλα < 220KB

# Task 2 — innerHTML
grep -n 'innerHTML' js/site.js
# Πρέπει να υπάρχει είτε sanitization είτε comment

# Task 3 — Schema address
grep -A3 '"address"' index.html
# Πρέπει να έχει addressLocality και addressRegion

# Task 4 — Favicon
ls assets/favicon.ico assets/favicon.svg
grep 'favicon.ico' index.html

# Task 5 — Logo WebP
ls assets/logo.webp
grep 'logo.webp' index.html

# Task 6 — Version
grep '?v=' about.html catering.html contact.html menus.html private-chef.html index.html | grep -v 'v=2'
# Δεν πρέπει να επιστρέφει τίποτα
```

---

## COMMIT MESSAGE

```
fix(audit): compress photos, favicon fallbacks, schema address, logo webp, innerHTML guard
```
