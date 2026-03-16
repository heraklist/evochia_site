import AxeBuilder from "../../node_modules/@axe-core/playwright/dist/index.js";
import { expect, test } from "@playwright/test";

import { accessibilityRoutes, gotoAndWait, stabilizePage } from "./helpers.mjs";

function formatViolations(violations) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(", ");
      return `${violation.id} (${violation.impact}): ${nodes}`;
    })
    .join("\n");
}

for (const route of accessibilityRoutes) {
  test(`${route} has no serious axe violations`, async ({ page }) => {
    await gotoAndWait(page, route);
    await stabilizePage(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const blockingViolations = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );

    expect(
      blockingViolations,
      blockingViolations.length ? formatViolations(blockingViolations) : undefined,
    ).toEqual([]);
  });
}

test("keyboard users can focus the skip link first", async ({ page }) => {
  await gotoAndWait(page, "/en/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
});
