import { contentPages, locales, pagePath, publicUrl } from "../tests/helpers/site-fixtures.mjs";

function buildRoute(locale, page) {
  return page === "index" ? `/${locale}/` : `/${locale}/${page}/`;
}

export const localizedContentPages = Object.freeze(
  locales.flatMap((locale) =>
    contentPages.map((page) => ({
      locale,
      page,
      file: pagePath(locale, page),
      route: buildRoute(locale, page),
      url: publicUrl(locale, page),
      indexed: page !== "privacy",
    })),
  ),
);

export const indexedLocalizedPages = Object.freeze(
  localizedContentPages.filter((entry) => entry.indexed),
);

export const localizedContentRoutes = Object.freeze(
  localizedContentPages.map((entry) => entry.route),
);

export const indexedLocalizedRoutes = Object.freeze(
  indexedLocalizedPages.map((entry) => entry.route),
);

export const headerCheckRoutes = Object.freeze([
  "/en/",
  "/el/",
  "/en/contact/",
  "/el/contact/",
]);

export const cruxTargetRoutes = Object.freeze([
  "/en/",
  "/en/contact/",
]);
