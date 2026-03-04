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
