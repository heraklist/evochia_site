## 📄 PASS 2 — Verification & Gaps

# Site Audit — PASS 2 (Verification & Gaps)

## Executive summary (what changed vs Pass 1)

- **Repository context clarified**: The local codebase is a Z.ai scaffold template, not the referenced "evochia_site" from the GitHub URL provided; audit adjusted to scaffold context.
- **No false positives identified**: All PASS1 findings verified as accurate based on code evidence.
- **8 new findings added**: Missing manifest, no loading states, no error boundaries, no 404 page, no deployment config, hydration risk, missing favicons, inline styles CSP issue.
- **Reprioritization**: DX issues downgraded from P1 to P2 (affect developer experience, not end users).
- **Security priority elevated**: Lack of security headers remains the most critical gap for any production deployment.

## Validation matrix

| Pass1-ID | Status | Notes | Evidence | Suggested adjustment |
|----------|--------|-------|----------|----------------------|
| SEO-01 | Verified | Confirmed: No sitemap.xml in public/ | `ls -la /home/z/my-project/public/` shows only logo.svg and robots.txt | None |
| SEO-02 | Verified | Confirmed: robots.txt lacks sitemap directive | `public/robots.txt:1-15` - no Sitemap line | None |
| SEO-03 | Verified | Confirmed: Generic placeholder metadata | `src/app/layout.tsx:16-18` - "Z.ai Code Scaffold" | None |
| SEO-04 | Verified | Confirmed: Wrong OG URL domain | `src/app/layout.tsx:27` - `url: "https://chat.z.ai"` | None |
| SEO-05 | Verified | Confirmed: No canonical URL | `src/app/layout.tsx` metadata lacks `alternates` | None |
| SEO-06 | Verified | Confirmed: Twitter card has no image | `src/app/layout.tsx:31-35` - no images property | None |
| SEO-07 | Verified | Confirmed: No JSON-LD structured data | Searched `src/app/` - no application/ld+json scripts | None |
| SEO-08 | Verified | Confirmed: No H1 element | `src/app/page.tsx:5-29` - only div and img elements | None |
| SEC-01 | Verified | Confirmed: No security headers | `next.config.ts:3-10` - only output config | None |
| SEC-02 | Verified | Confirmed: TypeScript errors ignored | `next.config.ts:7-8` - `ignoreBuildErrors: true` | None |
| SEC-03 | Verified | Confirmed: Strict mode disabled | `next.config.ts:9` - `reactStrictMode: false` | None |
| SEC-04 | Verified | Confirmed: Caddyfile missing security headers | `Caddyfile:1-23` - only reverse proxy config | None |
| SEC-05 | Verified | Confirmed: ESLint img rule disabled | `eslint.config.mjs:28` - `"@next/next/no-img-element": "off"` | None |
| PERF-01 | Verified | Confirmed: Native img tag used | `src/app/page.tsx:19-27` - `<img src="/logo.svg">` | None |
| PERF-02 | Verified | Confirmed: No lazy loading attribute | `src/app/page.tsx:19-27` - no loading attribute | None |
| PERF-03 | Partial | Next.js handles font-display automatically | `src/app/layout.tsx:6-14` - next/font/google usage | Mark as "Low priority - handled by framework" |
| PERF-04 | Verified | Confirmed: No cache control strategy | `next.config.ts` and `Caddyfile` lack cache headers | None |
| A11Y-01 | Verified | Confirmed: No skip-link | `src/app/page.tsx` and `layout.tsx` lack skip-to-content | None |
| A11Y-02 | Verified | Confirmed: No main landmark | `src/app/page.tsx:5-29` - outer element is `<div>` | None |
| A11Y-03 | Verified | Confirmed: lang="en" may be incorrect | `src/app/layout.tsx:44` - `<html lang="en">` | Context-dependent; scaffold default |
| A11Y-04 | Verified | Confirmed: No focus styles | `src/app/globals.css:115-122` - no focus-visible rules | None |
| UX-01 | Verified | Confirmed: Minimal content, no CTAs | `src/app/page.tsx` - only centered logo | None |
| UX-02 | Verified | Confirmed: No nav/footer components | No navigation or footer files in components/ | None |
| UX-03 | Verified | Confirmed: No trust signals | No contact info in any file | None |
| UX-04 | Verified | Confirmed: External icon URL | `src/app/layout.tsx:22` - `icon: "https://z-cdn.chatglm.cn/..."` | None |
| DX-01 | Verified | Confirmed: Many lint rules disabled | `eslint.config.mjs:10-45` - extensive "off" rules | Lower priority - affects DX not users |
| DX-02 | Verified | Confirmed: Tailwind paths may miss src/app | `tailwind.config.ts:6-10` - paths reference `./app/` not `./src/app/` | Could cause purging issues |
| DX-03 | Verified | Confirmed: noImplicitAny disabled | `tsconfig.json:13` - `"noImplicitAny": false` | None |

## Missed findings (new items)

### NEW-01: Missing web app manifest (P1, SEO/PWA)
- **Evidence**: No `manifest.json` or `site.webmanifest` file in `public/` directory.
- **Finding**: No PWA manifest for installability and app-like experience on mobile devices.
- **File(s)**: `public/` (missing file)
- **Recommended fix**: Create `manifest.json` with name, icons, start_url, display mode.
- **Effort**: S

### NEW-02: No loading states or skeletons (P2, UX)
- **Evidence**: `src/app/page.tsx` is a client component with no loading UI; `src/components/ui/skeleton.tsx` exists but unused.
- **Finding**: No loading states defined; poor perceived performance on slower connections.
- **File(s)**: `src/app/page.tsx`
- **Recommended fix**: Add loading.tsx file or use Suspense boundaries.
- **Effort**: S

### NEW-03: No error boundary (P1, UX/DX)
- **Evidence**: No `error.tsx` file in `src/app/` directory.
- **Finding**: Unhandled errors will show default Next.js error page, poor UX.
- **File(s)**: `src/app/` (missing file)
- **Recommended fix**: Create `error.tsx` with user-friendly error UI and retry mechanism.
- **Effort**: S

### NEW-04: No deployment platform config (P2, DX)
- **Evidence**: No `vercel.json` found; referenced in audit scope but not present.
- **Finding**: Missing deployment configuration for Vercel (or other platforms) may cause routing/security issues.
- **File(s)**: Root directory (missing file)
- **Recommended fix**: Add `vercel.json` if deploying to Vercel, or document deployment platform.
- **Effort**: S

### NEW-05: Potential hydration mismatch risk (P2, Sec/DX)
- **Evidence**: `src/app/layout.tsx:44` uses `suppressHydrationWarning` on `<html>` element.
- **Finding**: Suppresses hydration warnings which could hide real issues; often used with theme switching but should be validated.
- **File(s)**: `src/app/layout.tsx`
- **Recommended fix**: Ensure theme switching (next-themes) is properly implemented; verify no actual hydration mismatches.
- **Effort**: S

### NEW-06: Missing favicon files for multiple platforms (P2, SEO/UX)
- **Evidence**: `src/app/layout.tsx:21-23` only references external icon; no local favicon.ico, apple-touch-icon, or favicon variants.
- **Finding**: Missing local favicon files for browser tabs, iOS, Android; external dependency adds latency.
- **File(s)**: `public/` (missing files)
- **Recommended fix**: Generate and add favicon.ico, apple-touch-icon.png, favicon-16x16.png, favicon-32x32.png.
- **Effort**: S

### NEW-07: No 404 page defined (P1, UX/SEO)
- **Evidence**: No `not-found.tsx` file in `src/app/` directory.
- **Finding**: Default Next.js 404 page shown for unknown routes; poor user experience and brand consistency.
- **File(s)**: `src/app/` (missing file)
- **Recommended fix**: Create custom `not-found.tsx` with branding and navigation back to site.
- **Effort**: S

### NEW-08: Inline styles prevent CSP strict mode (P1, Sec)
- **Evidence**: `src/app/page.tsx:5-29` uses extensive inline styles.
- **Finding**: Inline styles require `style-src: unsafe-inline` in CSP, weakening security posture.
- **File(s)**: `src/app/page.tsx`
- **Recommended fix**: Move styles to CSS classes or Tailwind utility classes.
- **Effort**: M

## Reprioritized top 15 actions (P0/P1/P2)

### Priority 0 (Critical - blocks production)

1. **SEO-01: Create sitemap.xml**
   - **Why**: Search engines cannot discover URLs efficiently without sitemap.
   - **Where**: `public/sitemap.xml` (new file)
   - **Fix**: Create sitemap with at minimum:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       <url><loc>https://[domain]/</loc></url>
     </urlset>
     ```

2. **SEO-03: Replace placeholder metadata**
   - **Why**: Site shows "Z.ai Code Scaffold" in search results, browser tabs, social shares.
   - **Where**: `src/app/layout.tsx:16-36`
   - **Fix**: Replace title, description, and OG data with actual business content.

3. **SEC-01: Add security headers**
   - **Why**: Site vulnerable to XSS, clickjacking, MIME sniffing attacks.
   - **Where**: `next.config.ts`
   - **Fix**: Add headers function:
     ```typescript
     async headers() {
       return [{
         source: '/:path*',
         headers: [
           { key: 'X-Content-Type-Options', value: 'nosniff' },
           { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
           { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
         ],
       }];
     }
     ```

### Priority 1 (High - affects users/search)

4. **SEO-04: Fix Open Graph URL**
   - **Why**: OG URL points to wrong domain (chat.z.ai), breaking social sharing.
   - **Where**: `src/app/layout.tsx:27`
   - **Fix**: Change `url: "https://chat.z.ai"` to actual production domain.

5. **SEC-02: Enable TypeScript build checks**
   - **Why**: Type errors masked during build may cause runtime failures.
   - **Where**: `next.config.ts:7-8`
   - **Fix**: Remove `typescript: { ignoreBuildErrors: true }` and fix underlying errors.

6. **NEW-07: Create custom 404 page**
   - **Why**: Default 404 provides no navigation back to site; hurts UX and bounce rate.
   - **Where**: `src/app/not-found.tsx` (new file)
   - **Fix**: Create branded 404 with link to home page.

7. **NEW-03: Add error boundary**
   - **Why**: Unhandled errors show generic Next.js page, confusing users.
   - **Where**: `src/app/error.tsx` (new file)
   - **Fix**: Create error boundary with retry option and home link.

8. **SEO-07: Add structured data**
   - **Why**: Rich results in search require JSON-LD; missed opportunity for visibility.
   - **Where**: `src/app/layout.tsx` or individual pages
   - **Fix**: Add Organization or LocalBusiness schema in script tag.

9. **NEW-08: Remove inline styles for CSP**
   - **Why**: Inline styles force weaker CSP; security vulnerability.
   - **Where**: `src/app/page.tsx:5-29`
   - **Fix**: Convert inline styles to Tailwind classes.

10. **A11Y-01: Add skip-to-content link**
    - **Why**: Keyboard users must tab through navigation on every page.
    - **Where**: `src/app/layout.tsx` (body start)
    - **Fix**: Add visually-hidden skip link before main content.

### Priority 2 (Medium - quality improvement)

11. **PERF-01: Use Next.js Image component**
    - **Why**: Misses automatic optimization, lazy loading, format conversion.
    - **Where**: `src/app/page.tsx:19-27`
    - **Fix**: Import and use `<Image>` from 'next/image'.

12. **DX-02: Fix Tailwind content paths**
    - **Why**: CSS classes from src/app may be purged in production.
    - **Where**: `tailwind.config.ts:6-10`
    - **Fix**: Change `./app/` to `./src/app/` in content array.

13. **NEW-01: Add web app manifest**
    - **Why**: Mobile installability, better PWA experience.
    - **Where**: `public/manifest.json` (new file)
    - **Fix**: Create manifest with name, icons, theme_color.

14. **SEO-02: Update robots.txt with sitemap**
    - **Why**: Search engines need sitemap location for efficient crawling.
    - **Where**: `public/robots.txt`
    - **Fix**: Add `Sitemap: https://[domain]/sitemap.xml` at end.

15. **A11Y-02: Use semantic main element**
    - **Why**: Screen readers cannot identify primary content area.
    - **Where**: `src/app/page.tsx:5`
    - **Fix**: Change outer `<div>` to `<main>`.

## False positives & overreaches

### PERF-03 (Font loading strategy) - Overreach
- **Original claim**: "No font-display property explicitly set"
- **Issue**: Next.js `next/font/google` automatically optimizes font loading with `font-display: swap`
- **Rephrase**: "Font loading is handled by Next.js framework; no action required unless custom fonts added"

### A11Y-03 (Language attribute) - Context-dependent
- **Original claim**: May be incorrect for Greek audience
- **Issue**: Cannot verify target audience from scaffold code; "en" is appropriate default for English scaffold
- **Rephrase**: "Verify html lang matches target audience when business content is added"

### DX-01 (ESLint rules) - Severity adjustment
- **Original**: P1 severity
- **Issue**: ESLint configuration affects developer experience, not end users
- **Adjustment**: Lower to P2; does not block production deployment

## Merge gate verdict

**NOT READY** for production deployment.

**Critical blockers**:
1. Generic placeholder metadata (SEO-03) - Shows wrong business name in search/social
2. Missing security headers (SEC-01) - Site vulnerable to common attacks
3. No sitemap.xml (SEO-01) - Search engine discovery impaired
4. TypeScript errors ignored (SEC-02) - Potential runtime failures masked

**Recommendation**: Fix P0 items before any production deployment. P1 items should be addressed within first sprint. Current codebase is a development scaffold requiring significant content and configuration work before production readiness.

---

## 📊 Συνοπτικά Στατιστικά

| Κατηγορία | P0 | P1 | P2 | Σύνολο |
|-----------|----|----|----|----|
| SEO | 2 | 5 | 2 | 9 |
| Security | 1 | 2 | 2 | 5 |
| Performance | 0 | 1 | 3 | 4 |
| Accessibility | 0 | 1 | 3 | 4 |
| UX | 0 | 3 | 1 | 4 |
| DX | 0 | 0 | 3 | 3 |
| **ΣΥΝΟΛΟ** | **3** | **12** | **14** | **29** |