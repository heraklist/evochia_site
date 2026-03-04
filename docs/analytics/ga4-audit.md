# GA4 Instrumentation Audit

## Scope
- Repo root audited: `.`
- No code changes made in this pass.

## 1) HTML entrypoints (`*.html`) and public-serving status

| File | Likely public | Basis |
|---|---|---|
| `index.html` | Yes | In sitemap root URL: `sitemap.xml:3` (`https://evochia.gr/`). |
| `about.html` | Yes | In sitemap: `sitemap.xml:4` (`/about`). |
| `catering.html` | Yes | In sitemap: `sitemap.xml:5` (`/catering`). |
| `private-chef.html` | Yes | In sitemap: `sitemap.xml:6` (`/private-chef`). |
| `menus.html` | Yes | In sitemap: `sitemap.xml:7` (`/menus`). |
| `contact.html` | Yes | In sitemap: `sitemap.xml:8` (`/contact`). |
| `_publish_repo/index.html` | Unclear / potential duplicate surface | Exists on disk; not listed in sitemap. Could be reachable as `/_publish_repo/...` depending on deploy behavior. |
| `_publish_repo/about.html` | Unclear / potential duplicate surface | Same as above. |
| `_publish_repo/catering.html` | Unclear / potential duplicate surface | Same as above. |
| `_publish_repo/private-chef.html` | Unclear / potential duplicate surface | Same as above. |
| `_publish_repo/menus.html` | Unclear / potential duplicate surface | Same as above. |
| `_publish_repo/contact.html` | Unclear / potential duplicate surface | Same as above. |

Notes:
- `vercel.json:2` has `cleanUrls: true`, so root HTML pages are served as `/about`, `/contact`, etc.
- No explicit exclude rule for `/_publish_repo/*` appears in `vercel.json:1-47`.

## 2) `<head>` audit per HTML file (GA/GTM presence + insertion point)

Search patterns run against all HTML heads:
- `googletagmanager`, `gtag(`, `GTM-`, `UA-`, `G-`, `google-analytics`, `analytics.js`, `gtm.js`
- Result: no matches in any HTML file.

| File | Head close line | Existing GA/GTM tags | Recommended GA insertion point |
|---|---:|---|---|
| `index.html` | 79 | None | Insert GA snippet before local script tag at `index.html:78`, or immediately before `</head>` at `index.html:79`. |
| `about.html` | 32 | None | Insert before `about.html:31` (`js/site.js`), or before `</head>` at `about.html:32`. |
| `catering.html` | 32 | None | Insert before `catering.html:31`, or before `</head>` at `catering.html:32`. |
| `private-chef.html` | 32 | None | Insert before `private-chef.html:31`, or before `</head>` at `private-chef.html:32`. |
| `menus.html` | 32 | None | Insert before `menus.html:31`, or before `</head>` at `menus.html:32`. |
| `contact.html` | 32 | None | Insert before `contact.html:31`, or before `</head>` at `contact.html:32`. |
| `_publish_repo/index.html` | 79 | None | Same as root mirror: before `_publish_repo/index.html:78` if this tree is deployed. |
| `_publish_repo/about.html` | 32 | None | Same as root mirror: before `_publish_repo/about.html:31`. |
| `_publish_repo/catering.html` | 32 | None | Same as root mirror: before `_publish_repo/catering.html:31`. |
| `_publish_repo/private-chef.html` | 32 | None | Same as root mirror: before `_publish_repo/private-chef.html:31`. |
| `_publish_repo/menus.html` | 32 | None | Same as root mirror: before `_publish_repo/menus.html:31`. |
| `_publish_repo/contact.html` | 32 | None | Same as root mirror: before `_publish_repo/contact.html:31`. |

## 3) JS audit: global script + form success hook + click handlers

### Main global JS bundle(s)
- Primary bundle loaded by public pages: `js/site.js`
  - Evidence: `about.html:31`, `catering.html:31`, `private-chef.html:31`, `menus.html:31`, `contact.html:31`, `index.html:78`.
- Mirror bundle exists: `_publish_repo/js/site.js` (same pattern for mirror HTML files).

### Contact/quote form submission handler
- Form element: `contact.html:80` (`<form id="quoteForm" ...>`)
- Submit listener: `js/site.js:222-263`
- Fetch request starts: `js/site.js:231`
- Success branch (`res.ok`): `js/site.js:236-246`
- Success UI state set: `js/site.js:242-244`
- Form reset (best conversion hook point): `js/site.js:245`
- Submit button in HTML: `contact.html:120`

Recommended GA4 success hook insertion point:
- Inside `if (res.ok) { ... }` at `js/site.js:236-246`, preferably right before `quoteForm.reset();` at `js/site.js:245`.

### Existing click handlers (for global behavior)
- `js/site.js:70-72` hamburger click
- `js/site.js:76` nav links click (`closeMenu`)
- `js/site.js:95-100` document click outside mobile menu
- `js/site.js:125-132` language switch click
- `js/site.js:148-160` services tabs click
- `js/site.js:180-185` conciergerie toggle click
- `js/site.js:186-188` document click closes conciergerie
- `js/site.js:209-216` anchor smooth-scroll for `a[href^="#"]`
- No dedicated analytics/click instrumentation exists.

## 4) Candidate CTAs and contact links to tag

### CTA buttons / primary conversion actions
| Candidate | Evidence |
|---|---|
| Homepage hero `Get a Quote` | `index.html:126` |
| Homepage hero `View Menus` | `index.html:127` |
| Homepage final CTA `Get in Touch` | `index.html:248` |
| Homepage final CTA `View Menus` | `index.html:249` |
| Homepage text CTAs (`Discover Our Story`, `Explore Catering`, `Explore Private Chef`, `Explore all 8+ cuisine styles`) | `index.html:142`, `index.html:171`, `index.html:184`, `index.html:202` |
| Catering hero `Request a Quote` + `View Menus` | `catering.html:63`, `catering.html:64` |
| Catering bottom CTA `Get a Quote` | `catering.html:123` |
| Private-chef hero `Request a Quote` + `View Menus` | `private-chef.html:63`, `private-chef.html:64` |
| Private-chef bottom CTA `Get a Quote` | `private-chef.html:159` |
| Menus CTA `Request Custom Menu` | `menus.html:63`, `menus.html:100` |
| About CTA `Get a Quote` + `View Menus` | `about.html:154`, `about.html:155` |
| Quote form submit button (`Send Request`) | `contact.html:120` |

### Direct contact links
| Candidate | Evidence |
|---|---|
| `tel:+306931170245` | `contact.html:74` |
| `mailto:info@evochia.gr` in contact details | `contact.html:73` |
| `mailto:info@evochia.gr` in footer/conciergerie across pages | e.g. `index.html:281`, `index.html:307`, `about.html:165`, `catering.html:132`, `private-chef.html:168`, `menus.html:109` |
| WhatsApp deep link (`https://wa.me/...`) in conciergerie | e.g. `index.html:303`, `contact.html:131`, `about.html:164`, `catering.html:131`, `private-chef.html:167`, `menus.html:108` |

## Recommended GA4 event map (minimal)

| Event name | Trigger |
|---|---|
| `generate_lead` | Quote form success (`js/site.js:236-246`). |
| `form_submit_attempt` | On quote form submit start (`js/site.js:222`). |
| `contact_click_tel` | Click on `a[href^="tel:"]`. |
| `contact_click_email` | Click on `a[href^="mailto:"]`. |
| `contact_click_whatsapp` | Click on `a[href*="wa.me"]`. |
| `cta_click_primary` | Click on `.btn-primary`, `.btn.btn-primary`. |
| `cta_click_secondary` | Click on `.btn-secondary`, `.btn.btn-secondary`, `.text-link`. |

Implementation note:
- Since most CTAs are plain anchors (no dedicated handlers), easiest instrumentation path is delegated `document.addEventListener('click', ...)` in `js/site.js` filtering by selector/href pattern.
