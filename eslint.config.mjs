import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const jsRecommendedRules = js.configs.recommended.rules;
const tsConfigs = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ["middleware.ts"],
  languageOptions: {
    ...(config.languageOptions ?? {}),
    globals: {
      ...globals.node,
      ...globals.serviceworker,
    },
  },
}));

export default [
  {
    ignores: [
      "node_modules/**",
      ".reports/**",
      ".tmp-edge-profile*/**",
      "js/cookieconsent.umd.js",
    ],
  },
  {
    files: ["js/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        CookieConsent: "readonly",
        dataLayer: "writable",
        gtag: "readonly",
      },
      sourceType: "module",
    },
    rules: {
      ...jsRecommendedRules,
      "no-var": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.mjs", "playwright.config.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "module",
    },
    rules: jsRecommendedRules,
  },
  {
    files: ["tests/playwright/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      sourceType: "module",
    },
  },
  ...tsConfigs,
];
