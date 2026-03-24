# Repository Context

This repository powers Evochia's public-facing company website (evochia.gr). It is a **production, lead-generation website** for a premium event catering and private chef business in Greece.

**Stack:** Plain HTML5 / CSS3 / vanilla JavaScript. No JS framework. No SSR, no SSG framework, no bundler. Static files deployed to Vercel from GitHub.
**Languages:** Bilingual — Greek (primary) and English.
**Key integrations:** Google Analytics 4 (GA4), vanilla-cookieconsent v3.1.0 with Google Consent Mode v2, JSON-LD structured data, AVIF images with fallbacks.

The website is brand-sensitive, trust-sensitive, and every broken element has direct commercial impact (lost leads, damaged trust, lower search visibility).

# Default Review Behavior

When asked to review, audit, or analyze this repository:

- Read the repository files first. Infer the actual structure before drawing conclusions.
- Inspect the full codebase, not only the currently open file.
- Do **not** apply framework-specific patterns (Next.js, Astro, React, etc.) — this is plain HTML/CSS/JS.
- Prioritize issues that affect: production reliability, security, SEO, Core Web Vitals,
  accessibility, lead generation flows, analytics accuracy, and Vercel deployment safety.

# What to Check

- HTML semantics, structure, and correctness across all pages
- CSS quality, specificity issues, unused rules, mobile responsiveness
- Vanilla JS correctness, event handling, form validation, error states
- Security: exposed secrets, unsafe inline patterns, CSP configuration
- Performance: oversized assets, unoptimized images, render-blocking resources, AVIF fallbacks
- Accessibility: alt text, keyboard navigation, ARIA, labels, contrast, focus states
- SEO: title/meta per page, canonical, hreflang, JSON-LD schema correctness, sitemap, robots.txt
- Bilingual consistency: missing translations, mismatched content between EN/EL variants
- CTA and contact flow quality: WhatsApp link, quote request, contact form if present
- Cookie consent implementation and GA4 firing correctness with Consent Mode v2
- Vercel config: vercel.json headers, redirects, rewrites, caching rules
- Dependency hygiene: any CDN scripts, versioning, integrity attributes
- Broken internal links, missing asset references, wrong relative paths, and language-switching link integrity

# Reporting Rules

- Do not invent issues. Separate confirmed findings from assumptions clearly.
- For each finding: severity, impacted file(s), evidence, business impact, fix, effort.
- Severity: Critical / High / Medium / Low. Effort: S / M / L.
- Prefer actionable recommendations over generic advice.
- Unless explicitly asked, do **not** modify source files in the first pass. Audit only.
- Reports in Markdown. Final report language: **Greek** (keep file paths, code, commands in English).
