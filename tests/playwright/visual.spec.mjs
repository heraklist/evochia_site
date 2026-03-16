import { expect, test } from "@playwright/test";

import { gotoAndWait, stabilizePage, visualScenarios } from "./helpers.mjs";

const visualProjects = new Set(["desktop-chromium", "mobile-chromium", "mobile-webkit"]);

for (const scenario of visualScenarios) {
  test(`${scenario.name} stays visually stable`, async ({ page }, testInfo) => {
    test.skip(
      !visualProjects.has(testInfo.project.name),
      "Visual baselines are maintained for Chromium and optional mobile WebKit.",
    );

    await gotoAndWait(page, scenario.route);
    await stabilizePage(page);

    await expect(page.locator(scenario.selector)).toHaveScreenshot(
      `${scenario.name}.png`,
      {
        animations: "disabled",
        caret: "hide",
        scale: "css",
      },
    );
  });
}