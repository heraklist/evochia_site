@workspace Perform a full audit of this entire repository in audit-first mode.

Context:
- Plain HTML/CSS/vanilla JS static site. No JS framework.
- Production lead-generation website for Evochia (evochia.gr), deployed to Vercel from GitHub.
- Bilingual: Greek and English.
- Key integrations: GA4, vanilla-cookieconsent v3.1.0 + Google Consent Mode v2,
  JSON-LD structured data, AVIF images with HTML fallbacks.
- Business priorities: brand trust, lead conversion, SEO, accessibility, performance, reliability.

Your task:
1. Inspect all source files, config files, public assets, SEO files (sitemap, robots.txt,
   JSON-LD), Vercel config, and any CDN/script dependencies.
2. Do NOT apply framework assumptions. This is plain HTML/CSS/JS.
3. Review from these angles:
   - HTML semantics and correctness
   - CSS quality and mobile responsiveness
   - Vanilla JS correctness and form handling
   - Security and CSP configuration
   - Performance and Core Web Vitals risks (images, AVIF fallbacks, render-blocking)
   - Accessibility (WCAG 2.1 AA target)
   - SEO (per-page meta, canonical, hreflang, JSON-LD schema validity)
   - Bilingual content consistency (EN/EL parity)
   - CTA and contact flow quality
   - Cookie consent and GA4 Consent Mode v2 correctness
   - Vercel deployment and caching configuration
   - CDN dependencies and integrity attributes
4. Do NOT modify any source files in this pass.
5. Write the final report in Greek to: docs/reports/codebase-audit-2026-03-23.md
   (create the directory if it doesn't exist)

Required report structure:

# Εκτελεστική Σύνοψη
- Γενική αξιολόγηση
- Top 5 προτεραιότητες
- Μεγαλύτεροι επιχειρηματικοί κίνδυνοι
- Quick wins

# Επισκόπηση Repository
- Δομή αρχείων και σελίδων
- Build/deploy flow
- Βασικές παραδοχές

# Πίνακας Ευρημάτων
Στήλες: ID | Severity | Category | File(s) | Evidence | Business Impact | Recommendation | Effort

# Αναλυτικά Ευρήματα
Για κάθε εύρημα: τίτλος, severity, category, αρχεία + γραμμές, τι φταίει, γιατί μετράει, πώς φτιάχνεται.

# Θετικά Στοιχεία
Patterns και δυνατά σημεία που αξίζει να κρατηθούν.

# Κίνδυνοι Vercel / Deployment
Headers, caching, redirects, asset handling.

# SEO / Accessibility / Performance
Κύρια ζητήματα, medium priority, μετρήσιμα κέρδη.

# Σχέδιο Δράσης
- Άμεσα (Critical + High)
- Σύντομα (Medium)
- Αργότερα (Low + improvements)

Rules:
- Evidence-based only. Αν κάτι είναι υποθετικό, σήμανέ το ρητά.
- Αναφορά σε exact file paths και γραμμές όπου είναι εφικτό.
- Ανάφερε τους ελέγχους που έτρεξες και αυτούς που δεν μπόρεσες να τρέξεις.
- Γράψε την αναφορά στα Ελληνικά. File paths, κώδικας, commands παραμένουν στα Αγγλικά.
