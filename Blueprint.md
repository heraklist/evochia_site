Apply the following implementation plan across the Evochia codebase.

Work within the existing stack:
- static HTML
- CSS in /css/site.css
- JS in /js/site.js
- Vercel routing via middleware.ts and vercel.json
- bilingual EN/EL structure
- current brand voice must remain intact

Global brand rule:
Do not turn Evochia into a louder luxury brand.
Keep the site calm, atmospheric, editorial, precise, and house-led.
Preserve the cinematic and branded tone in both English and Greek.
No generic luxury wording.
No corporate marketing language.
No feature clutter that weakens the current service architecture.

Primary implementation goals:
1. Fix encoding/rendering issues on Catering
2. Unify coverage wording across the site
3. Normalize CSS/JS asset version consistency
4. Improve mobile menu focus management
5. Add one elegant proof layer
6. Enrich footer internal linking
7. Create a dedicated FAQ page
8. Add visual breadcrumbs to supporting pages
9. Add a Lookbook page
10. Refine font accent usage
11. Refine the conciergerie toggle label/presentation

--------------------------------------------------
1. FIX ENCODING / RENDERING ON CATERING
--------------------------------------------------

Audit all catering-related text for broken characters or encoding glitches.
Examples to fix include any malformed apostrophes, bullets, accented words, or corrupted strings.

Requirements:
- Check /en/catering/ and /el/catering/
- Check any reused catering fragments across subpages
- Ensure all files are saved and rendered in UTF-8 correctly
- Replace broken punctuation and malformed characters with clean, intended copy
- Verify the live output visually after implementation

Important:
Do not rewrite the whole page unnecessarily.
Fix the rendering while preserving the current tone and structure.

--------------------------------------------------
2. UNIFY COVERAGE WORDING
--------------------------------------------------

The site currently communicates service coverage inconsistently.
Unify all geography/service-area wording under one clear positioning.

Use this principle:
Evochia travels to the guest and serves across Greece.

Requirements:
- Review Home, Contact, FAQ content, footer, service pages, and any trust or reassurance blocks
- Replace narrower wording where it creates friction or contradiction
- Keep wording calm and confident, not exaggerated

Examples of preferred direction:
- across Greece
- wherever the occasion calls
- we travel to you
- your setting, our service

Avoid:
- conflicting combinations like “Athens & Greek Islands” in one place and broader wording elsewhere, unless a specific local context is truly required

Important:
Keep the message broad but believable.
Do not overinflate into “worldwide” or similar language.

--------------------------------------------------
3. NORMALIZE CSS / JS ASSET VERSION CONSISTENCY
--------------------------------------------------

The codebase currently has inconsistent asset query versions.

Requirements:
- Standardize site.css version references across all HTML files
- Standardize site.js version references across all HTML files
- Use a single updated version value consistently after implementation
- Ensure the same versioning pattern is used in EN and EL files
- Verify that no outdated HTML still references previous versions

Goal:
Prevent cache inconsistency and partial rollout behavior.

--------------------------------------------------
4. IMPROVE MOBILE MENU FOCUS MANAGEMENT
--------------------------------------------------

The mobile menu currently opens and closes visually, but needs better keyboard accessibility and focus behavior.

Requirements:
- On menu open, move focus to the first interactive menu item
- On menu close, return focus to the hamburger button
- Support Escape key closing behavior consistently
- Prevent background interaction confusion while the mobile menu is open
- If feasible, add simple focus containment while the menu is open

Important:
Do not over-engineer this.
Keep the JS lightweight and compatible with the current vanilla setup.

Also verify:
- hamburger aria-expanded stays accurate
- any open mobile overlay state remains accessible
- focus-visible styles remain clear and elegant

--------------------------------------------------
5. ADD ONE ELEGANT PROOF LAYER
--------------------------------------------------

Add a proof layer without turning the site into a review-heavy or noisy trust page.

Preferred order of implementation:
1. gallery / portfolio
2. testimonials strip
3. lookbook support within broader proof system

At this phase, implement one refined proof layer only.

Recommended direction:
- a curated proof section that supports the house-of-hospitality identity
- clean photography and selective trust signals
- no clutter, no “5-star rating wall”, no generic client-logo overload unless provided

If testimonials are added:
- keep them short
- use editorial styling
- avoid sounding promotional

If gallery is added:
- keep it curated, not endless
- focus on atmosphere, table setting, execution, texture, service presence

--------------------------------------------------
6. ENRICH FOOTER INTERNAL LINKING
--------------------------------------------------

Improve discoverability through the footer instead of adding heavy navigation complexity.

Requirements:
- Keep the top navigation clean
- Expand the footer service linking thoughtfully
- Surface key supporting pages through footer hierarchy

Recommended footer structure:
Services
- Event Catering
  - Wedding Catering
  - Corporate Catering
- Private Chef
  - Villa Private Chef
  - Yacht Private Chef
  - Athens Private Chef
  - Greek Islands Private Chef
- Menus
- FAQ
- Lookbook

Important:
Do not make the footer visually heavy.
It should remain elegant, readable, and useful.

--------------------------------------------------
7. CREATE A DEDICATED FAQ PAGE
--------------------------------------------------

Add:
- /en/faq/
- /el/faq/

Purpose:
Create a utility page that supports trust, clarity, and SEO without disturbing the main editorial pages.

Structure:
1. Page hero
2. FAQ accordion
3. small CTA to Contact
4. FAQPage JSON-LD schema

Content principles:
- practical questions
- concise answers
- same Evochia tone
- reassuring, not corporate
- useful, not verbose

Suggested topics:
- areas served
- booking lead time
- guest count expectations
- dietary requirements
- staffing and equipment
- difference between Private Chef and Catering
- menus and proposals
- pricing approach
- vendor coordination
- how to begin

Technical requirements:
- accessible accordion behavior
- aria-expanded support
- keyboard friendly interaction
- consistent styling in EN and EL
- update sitemap, middleware, and routing config as needed

--------------------------------------------------
8. ADD VISUAL BREADCRUMBS
--------------------------------------------------

Add visible breadcrumbs to supporting pages and service detail pages.

Purpose:
Help orientation without changing the main navigation structure.

Recommended pages:
- wedding-catering
- corporate-catering
- villa-private-chef
- yacht-private-chef
- athens-private-chef
- greek-islands-private-chef
- faq
- lookbook

Structure examples:
Home > Private Chef > Villa Private Chef
Home > Catering > Wedding Catering

Rules:
- keep them visually quiet
- match the premium aesthetic
- do not over-style them
- ensure EN/EL consistency

Note:
JSON-LD breadcrumbs may already exist; this task is about visible UI breadcrumbs.

--------------------------------------------------
9. ADD LOOKBOOK PAGE
--------------------------------------------------

Add:
- /en/lookbook/
- /el/lookbook/

Purpose:
Create a curated visual extension of the brand.

Use the Lookbook as:
- an editorial brand asset
- a visual companion to Menus / Home / inquiry flow
- a refined destination for visual storytelling

Implementation options:
- if PDF is ready: embed same-origin PDF cleanly
- if PDF is not ready: use a polished placeholder with a request CTA

Requirements:
- elegant hero
- calm introduction
- clear CTA toward inquiry or email request
- maintain visual consistency with the rest of the site
- update sitemap, routing, and footer links accordingly

Important:
Do not make the page feel temporary or unfinished.
If using a placeholder state, it must still feel intentional and premium.

--------------------------------------------------
10. FONT ACCENT REFINEMENTS
--------------------------------------------------

Refine use of the accent/script font already present in the design system.

Goal:
Use it more intentionally, not more often.

Use cases:
- small decorative section accents
- refined short taglines
- subtle quote flourishes
- selective editorial highlights

Avoid:
- body copy
- navigation
- forms
- dense UI sections
- overuse that reduces readability

Rule:
The accent font should feel like a signature gesture, not a decorative gimmick.

--------------------------------------------------
11. CONCIERGERIE BUTTON LABEL REFINEMENT
--------------------------------------------------

The current floating conciergerie toggle needs clearer affordance.

Requirements:
- keep mobile compact
- make desktop clearer
- preserve elegance and minimalism

Recommended direction:
- desktop: icon + short label
- mobile: icon-only is acceptable if space is tight
- ensure aria-label remains clear
- keep the component premium and unobtrusive

Possible label directions:
- Get in Touch
- Contact Options
- Speak With Us

Do not use:
- loud chat-widget language
- support-desk phrasing
- anything that makes the brand feel mass-market

--------------------------------------------------
IMPLEMENTATION PRIORITY
--------------------------------------------------

Execute in this order:

Phase 1
- fix Catering encoding/rendering
- unify coverage wording
- normalize CSS/JS version consistency
- improve mobile menu focus management

Phase 2
- enrich footer internal linking
- add visual breadcrumbs
- refine conciergerie label
- refine font accent usage

Phase 3
- create FAQ page
- create Lookbook page
- add one proof layer

--------------------------------------------------
NON-GOALS / DO NOT DO IN THIS PASS
--------------------------------------------------

Do not:
- add heavy dropdown navigation as a first solution
- make the homepage louder
- turn Menus into a restaurant catalog
- re-fragment Private Chef into many equal formats
- introduce generic luxury slogans
- overcomplicate the JS architecture
- add multiple new proof systems at once

--------------------------------------------------
FINAL QUALITY CHECK
--------------------------------------------------

Before finalizing, verify:

1. Does the site still sound like Evochia?
2. Is the tone still calm, cinematic, and branded?
3. Has any page become more generic or more commercial than before?
4. Is the service hierarchy still clear?
5. Are EN and EL equally natural?
6. Do the new elements feel integrated rather than added-on?
