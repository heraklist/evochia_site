# Evochia Website (Starter)

Static multi‑page site (HTML/CSS/JS) for **Evochia**.

## Pages
- `/index.html` – Homepage
- `/catering.html`
- `/private-chef.html`
- `/menus.html` (includes PDF embed/flipbook area)
- `/about.html`
- `/contact.html` (quote form)

## Quick local preview
From the project root:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy to Vercel (recommended for MVP)
### Option A — Git integration (cleanest)
1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → Import Git Repository**.
3. Framework preset: **Other** (static).
4. Build settings: no build step needed.
5. Deploy.

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel
vercel --prod
```

## Domain
You already own the domain.
After the first deploy, add your domain to the Vercel Project (Settings → Domains) and follow the DNS instructions shown in the dashboard.

## Important placeholders to update
- `https://wa.me/` in the Concierge panel (add your WhatsApp number)
- `info@evochia.gr` (set your real inbox if different)
- `assets/sample-menu.pdf` (replace with your real menu PDF when ready)



## Lead capture (Quote + Newsletter)
This site includes:
- **Quote modal** (opens from the floating Concierge panel)
- **Contact page quote form**
- **Newsletter signup** in the footer

All three try to submit to Vercel Functions first:
- `POST /api/quote`
- `POST /api/newsletter`

If the email service isn’t configured, the frontend automatically falls back to **mailto** (so nothing is lost).

### Configure email delivery (Resend)
1. Create a Resend API key.
2. In Vercel → Project → Settings → Environment Variables, add:
   - `RESEND_API_KEY` = your Resend key
   - `TO_EMAIL` = where you want to receive requests (e.g. `info@evochia.gr`)
   - `FROM_EMAIL` = a verified sender (e.g. `Evochia <hello@evochia.gr>`)
   - (optional) `SITE_NAME` = `Evochia`
3. Redeploy.

> Tip: If you haven’t verified a sender domain yet, use Resend’s onboarding sender for testing.

## WhatsApp
Update the Concierge WhatsApp link:
- Search for `https://wa.me/` in the HTML files and paste your number in international format (e.g. `https://wa.me/3069xxxxxxxx`).

## SEO basics already included
- `sitemap.xml`
- `robots.txt`
- OG meta tags per page

