# GA4 Setup

## Measurement ID
- Configured ID: `G-******HHF1` (masked; last 4: `HHF1`)

## Pages instrumented
- `/` (`index.html`)
- `/about` (`about.html`)
- `/catering` (`catering.html`)
- `/private-chef` (`private-chef.html`)
- `/menus` (`menus.html`)
- `/contact` (`contact.html`)

## Events implemented

### `generate_lead`
- Trigger: successful quote form submit only (`res.ok` branch)
- Source hook: `js/site.js` inside quote form success flow
- Params:
  - `lead_source`: `quote_form`
  - `event_type`: selected value from `#qf-event` (or empty string)
  - `form_id`: `quoteForm`
  - `page_path`: auto-filled by helper if missing
  - `debug_mode`: included only when `?ga_debug=1`

### `form_submit_attempt`
- Trigger: quote form submit start (before `fetch`)
- Params:
  - `form_id`: `quoteForm`
  - `lead_source`: `quote_form`
  - `page_path`: auto-filled by helper if missing
  - `debug_mode`: included only when `?ga_debug=1`

### `contact_click`
- Trigger classes:
  - phone links (`tel:`)
  - email links (`mailto:`)
  - WhatsApp links (`wa.me`)
- Params:
  - `method`: `phone | email | whatsapp`
  - `link_url`
  - `link_text`
  - `lead_source`: `site`
  - `page_path`: auto-filled by helper if missing
  - `debug_mode`: included only when `?ga_debug=1`

### `cta_click`
- Trigger: delegated clicks on `.btn-primary`, `.btn-secondary`, `.text-link`
- Params:
  - `cta_variant`: `primary | secondary | text`
  - `link_url`
  - `link_text`
  - `lead_source`: `site`
  - `page_path`: auto-filled by helper if missing
  - `debug_mode`: included only when `?ga_debug=1`

## Debug behavior
- Enable debug by appending `?ga_debug=1` to any page URL.
- When debug is enabled, events include `debug_mode: true`.
- When debug is not enabled, `debug_mode` is omitted entirely.

## CSP requirements for GA4 on Vercel
- Keep the GA4 snippet in `<head>` as already implemented (no GTM migration required).
- Required `Content-Security-Policy` sources:
  - `script-src`:
    - `'self'`
    - `https://*.googletagmanager.com`
    - `'sha256-2WIuDihWi48Fg5pkalmwn/qtUUnLW3XxjuNkZRe7RNo='` (inline GA config block hash)
  - `connect-src`:
    - `'self'`
    - `https://formspree.io` (existing)
    - `https://*.google-analytics.com`
    - `https://*.analytics.google.com`
    - `https://*.googletagmanager.com`
  - `img-src`:
    - `'self'`
    - `data:`
    - `https://*.google-analytics.com`
    - `https://*.googletagmanager.com`
- Canonical production domain remains `www.evochia.gr`; CSP allowances above are domain-agnostic for GA endpoints.
- If CSP changes in the future, keep this inline script hash unchanged unless the inline GA block content is edited; any content change requires a new hash.
