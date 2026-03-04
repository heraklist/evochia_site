# GA4 QA Checklist

## Preconditions
- Use a browser with devtools open.
- Ensure network is not blocking `www.googletagmanager.com`.
- In GA4, keep Realtime and DebugView open.

## Steps
1. Open `/contact?ga_debug=1`.
2. Confirm Google tag is loaded in page source and no duplicate GA snippets exist.
3. Click the phone link (`tel:`) and verify `contact_click` with `method=phone`.
4. Click the email link (`mailto:`) and verify `contact_click` with `method=email`.
5. Click a WhatsApp link (`wa.me`) and verify `contact_click` with `method=whatsapp`.
6. Click a primary CTA (`.btn-primary`) and verify `cta_click` with `cta_variant=primary`.
7. Click a secondary CTA (`.btn-secondary`) and verify `cta_click` with `cta_variant=secondary`.
8. Click a text CTA (`.text-link`) and verify `cta_click` with `cta_variant=text`.
9. Submit the quote form once with valid values and verify `form_submit_attempt` fires.
10. On successful submit, verify `generate_lead` appears with `form_id=quoteForm` and `event_type` from `#qf-event`.
11. Confirm in DebugView that events include `debug_mode=true` while using `?ga_debug=1`.
12. Open `/contact` without debug query and repeat one CTA click; verify events still arrive but `debug_mode` is omitted.

## Expected event payload checks
- `page_path` should always be present.
- `contact_click` should include `method`, `link_url`, `link_text`, `lead_source`.
- `cta_click` should include `cta_variant`, `link_url`, `link_text`, `lead_source`.
- `generate_lead` should include `lead_source`, `event_type`, `form_id`.
