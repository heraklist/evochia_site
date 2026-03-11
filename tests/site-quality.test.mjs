import test from "node:test";
import assert from "node:assert/strict";

import {
  contentPages,
  escapeRegex,
  extractAll,
  listFiles,
  locales,
  pagePath,
  publicUrl,
  readRepoFile,
  sitemapPages,
} from "./helpers/site-fixtures.mjs";

const ogLocales = {
  en: { current: "en_GB", alternate: "el_GR" },
  el: { current: "el_GR", alternate: "en_GB" },
};

const requiredRedirects = new Map([
  ["/", "/en/"],
  ["/index", "/en/"],
  ["/index/", "/en/"],
  ["/about", "/en/about/"],
  ["/about/", "/en/about/"],
  ["/catering", "/en/catering/"],
  ["/catering/", "/en/catering/"],
  ["/wedding-catering", "/en/wedding-catering/"],
  ["/wedding-catering/", "/en/wedding-catering/"],
  ["/corporate-catering", "/en/corporate-catering/"],
  ["/corporate-catering/", "/en/corporate-catering/"],
  ["/private-chef", "/en/private-chef/"],
  ["/private-chef/", "/en/private-chef/"],
  ["/villa-private-chef", "/en/villa-private-chef/"],
  ["/villa-private-chef/", "/en/villa-private-chef/"],
  ["/yacht-private-chef", "/en/yacht-private-chef/"],
  ["/yacht-private-chef/", "/en/yacht-private-chef/"],
  ["/athens-private-chef", "/en/athens-private-chef/"],
  ["/athens-private-chef/", "/en/athens-private-chef/"],
  ["/greek-islands-private-chef", "/en/greek-islands-private-chef/"],
  ["/greek-islands-private-chef/", "/en/greek-islands-private-chef/"],
  ["/menus", "/en/menus/"],
  ["/menus/", "/en/menus/"],
  ["/contact", "/en/contact/"],
  ["/contact/", "/en/contact/"],
  ["/privacy", "/en/privacy/"],
  ["/privacy/", "/en/privacy/"],
  ["/faq", "/en/faq/"],
  ["/faq/", "/en/faq/"],
  ["/lookbook", "/en/lookbook/"],
  ["/lookbook/", "/en/lookbook/"],
]);

function getVercelConfig() {
  return JSON.parse(readRepoFile("vercel.json"));
}

function getVercelCsp() {
  const config = getVercelConfig();
  const headerGroup = config.headers.find((entry) => entry.source === "/(.*)");
  assert.ok(headerGroup, "Missing global header group in vercel.json");
  const cspHeader = headerGroup.headers.find(
    (entry) => entry.key === "Content-Security-Policy",
  );
  assert.ok(cspHeader, "Missing CSP header in vercel.json");
  return cspHeader.value;
}

function getMiddlewareCsp() {
  const middleware = readRepoFile("middleware.ts");
  const match = middleware.match(/'Content-Security-Policy': "([^"]+)"/);
  assert.ok(match, "Missing CSP header in middleware.ts");
  return match[1];
}

test("CSP stays consistent across vercel and middleware", () => {
  const vercelCsp = getVercelCsp();
  const middlewareCsp = getMiddlewareCsp();

  assert.equal(
    middlewareCsp,
    vercelCsp,
    "Localized 404 responses must use the same CSP as normal pages",
  );
  assert.match(vercelCsp, /style-src 'self'/);
  assert.doesNotMatch(vercelCsp, /unsafe-inline/);
});

test("vercel redirects keep the current canonical EN-first routing", () => {
  const config = getVercelConfig();
  const redirects = new Map(
    config.redirects.map((entry) => [entry.source, entry.destination]),
  );

  assert.equal(config.cleanUrls, true);
  assert.equal(config.trailingSlash, true);

  for (const [source, destination] of requiredRedirects) {
    assert.equal(
      redirects.get(source),
      destination,
      `Redirect ${source} should resolve to ${destination}`,
    );
  }
});

test("localized content pages keep canonical, hreflang, and og locale tags", () => {
  for (const locale of locales) {
    for (const page of contentPages) {
      const html = readRepoFile(pagePath(locale, page));
      const currentUrl = publicUrl(locale, page);
      const enUrl = publicUrl("en", page);
      const elUrl = publicUrl("el", page);

      assert.match(
        html,
        new RegExp(`<link rel="canonical" href="${escapeRegex(currentUrl)}">`),
        `${pagePath(locale, page)} is missing its canonical`,
      );
      assert.match(
        html,
        new RegExp(`<link rel="alternate" hreflang="en" href="${escapeRegex(enUrl)}">`),
      );
      assert.match(
        html,
        new RegExp(`<link rel="alternate" hreflang="el" href="${escapeRegex(elUrl)}">`),
      );
      assert.match(
        html,
        new RegExp(`<link rel="alternate" hreflang="x-default" href="${escapeRegex(enUrl)}">`),
      );
      if (page !== "privacy") {
        assert.match(
          html,
          new RegExp(`<meta property="og:locale" content="${escapeRegex(ogLocales[locale].current)}">`),
        );
        assert.match(
          html,
          new RegExp(
            `<meta property="og:locale:alternate" content="${escapeRegex(ogLocales[locale].alternate)}">`,
          ),
        );
      }
      assert.match(html, /<meta name="robots" content="/);
    }
  }
});

test("localized 404 pages stay noindex and omit canonical and hreflang markup", () => {
  for (const locale of locales) {
    const html = readRepoFile(pagePath(locale, "404"));
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.doesNotMatch(html, /<link rel="canonical"/);
    assert.doesNotMatch(html, /hreflang="/);
  }
});

test("privacy pages remain noindex and out of the sitemap", () => {
  const sitemap = readRepoFile("sitemap.xml");

  for (const locale of locales) {
    const privacyHtml = readRepoFile(pagePath(locale, "privacy"));
    assert.match(privacyHtml, /<meta name="robots" content="noindex">/);
    assert.doesNotMatch(
      sitemap,
      new RegExp(escapeRegex(publicUrl(locale, "privacy"))),
      "Privacy pages should stay out of the sitemap while noindex is active",
    );
  }
});

test("sitemap keeps EN/EL/x-default alternate sets for indexed pages", () => {
  const sitemap = readRepoFile("sitemap.xml");

  for (const locale of locales) {
    for (const page of sitemapPages) {
      const currentUrl = publicUrl(locale, page);
      const enUrl = publicUrl("en", page);
      const elUrl = publicUrl("el", page);

      assert.match(sitemap, new RegExp(`<loc>${escapeRegex(currentUrl)}</loc>`));
      assert.match(
        sitemap,
        new RegExp(
          `<xhtml:link rel="alternate" hreflang="en" href="${escapeRegex(enUrl)}"/>`,
        ),
      );
      assert.match(
        sitemap,
        new RegExp(
          `<xhtml:link rel="alternate" hreflang="el" href="${escapeRegex(elUrl)}"/>`,
        ),
      );
      assert.match(
        sitemap,
        new RegExp(
          `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeRegex(enUrl)}"/>`,
        ),
      );
    }
  }
});

test("core entry points link to the expanded landing-page set", () => {
  const expectations = new Map([
    [pagePath("en", "index"), [
      "/en/wedding-catering/",
      "/en/corporate-catering/",
      "/en/villa-private-chef/",
      "/en/yacht-private-chef/",
      "/en/athens-private-chef/",
      "/en/greek-islands-private-chef/",
    ]],
    [pagePath("el", "index"), [
      "/el/wedding-catering/",
      "/el/corporate-catering/",
      "/el/villa-private-chef/",
      "/el/yacht-private-chef/",
      "/el/athens-private-chef/",
      "/el/greek-islands-private-chef/",
    ]],
    [pagePath("en", "catering"), ["/en/wedding-catering/", "/en/corporate-catering/"]],
    [pagePath("el", "catering"), ["/el/wedding-catering/", "/el/corporate-catering/"]],
    [pagePath("en", "private-chef"), [
      "/en/villa-private-chef/",
      "/en/yacht-private-chef/",
      "/en/athens-private-chef/",
      "/en/greek-islands-private-chef/",
    ]],
    [pagePath("el", "private-chef"), [
      "/el/villa-private-chef/",
      "/el/yacht-private-chef/",
      "/el/athens-private-chef/",
      "/el/greek-islands-private-chef/",
    ]],
  ]);

  for (const [file, links] of expectations) {
    const html = readRepoFile(file);
    for (const href of links) {
      assert.match(html, new RegExp("href=\"" + escapeRegex(href) + "\""), `${file} should link to ${href}`);
    }
  }
});
test("contact pages keep lead qualification fields and canonical social links", () => {
  const enContact = readRepoFile(pagePath("en", "contact"));
  const elContact = readRepoFile(pagePath("el", "contact"));

  for (const html of [enContact, elContact]) {
    assert.match(html, /name="guest_count"/);
    assert.match(html, /name="event_location"/);
    assert.match(html, /name="venue_type"/);
    assert.match(html, /name="_gotcha"/);
    assert.match(html, /https:\/\/www\.instagram\.com\/evochia/);
    assert.match(html, /https:\/\/www\.facebook\.com\/evochia/);
  }

  assert.match(elContact, /%CE%93%CE%B5%CE%B9%CE%B1/);
  assert.doesNotMatch(
    elContact,
    /Hello%21%20I%27d%20like%20to%20learn%20more%20about%20Evochia%27s%20services\./,
  );
  assert.doesNotMatch(
    elContact,
    /data-el="Athens & Greek Islands">Athens & Greek Islands</,
  );
});

test("venue and menu cards keep descriptive, sized images", () => {
  const files = [
    pagePath("en", "index"),
    pagePath("el", "index"),
    pagePath("en", "menus"),
    pagePath("el", "menus"),
  ];

  for (const file of files) {
    const html = readRepoFile(file);
    const imageMatches = extractAll(/<div class="venue-card-bg"><img\b([^>]+)>/g, html);

    assert.ok(imageMatches.length > 0, `${file} should contain venue/menu card images`);

    for (const [, attributes] of imageMatches) {
      const altMatch = attributes.match(/\balt="([^"]*)"/);
      assert.ok(altMatch, `${file} card image is missing alt text`);
      assert.notEqual(altMatch[1].trim(), "", `${file} card image alt should not be empty`);
      assert.match(attributes, /\bwidth="\d+"/, `${file} card image is missing width`);
      assert.match(attributes, /\bheight="\d+"/, `${file} card image is missing height`);
    }
  }
});

test("repo stays free of inline style attributes", () => {
  const htmlFiles = [
    "404.html",
    "privacy.html",
    ...listFiles("en", ".html"),
    ...listFiles("el", ".html"),
  ];
  const styleAttributePattern = /\sstyle\s*=\s*"/i;

  for (const file of htmlFiles) {
    const content = readRepoFile(file);
    assert.doesNotMatch(content, styleAttributePattern, `${file} contains inline styles`);
  }
});

test("first-party JS stays free of direct style injection", () => {
  const firstPartyScripts = ["js/site.js", "js/cookieconsent-config.js"];
  const forbiddenPatterns = [
    /createElement\("style"\)/,
    /createElement\('style'\)/,
    /setAttribute\("style"/,
    /setAttribute\('style'/,
    /style\.cssText/,
    /\.style\./,
  ];

  for (const file of firstPartyScripts) {
    const content = readRepoFile(file);

    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(content, pattern, `${file} should not inject inline styles`);
    }
  }
});

test("language switcher links point to the correct counterpart page", () => {
  const otherLocale = { en: "el", el: "en" };

  for (const locale of locales) {
    for (const page of [...contentPages, "404"]) {
      const html = readRepoFile(pagePath(locale, page));
      const match = html.match(/class="lang-switch"\s+href="([^"]+)"/);
      if (!match) continue;

      const href = match[1];
      const expectedSlug = page === "index" ? "" : `${page}/`;
      const expectedHref = `/${otherLocale[locale]}/${expectedSlug}`;

      assert.equal(
        href,
        expectedHref,
        `${pagePath(locale, page)} lang-switch should point to ${expectedHref} but got ${href}`,
      );
    }
  }
});

test("contact form controls keep 1rem font sizing for mobile usability", () => {
  const css = readRepoFile("css/site.css");

  assert.match(
    css,
    /\.form-group input, \.form-group select, \.form-group textarea \{[\s\S]*?font-size: 1rem;/,
  );
});

