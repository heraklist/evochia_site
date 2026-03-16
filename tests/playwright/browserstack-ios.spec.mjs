import { expect, test } from "@playwright/test";

import {
  assertNoConsoleErrors,
  captureConsoleErrors,
  smokeRoutes,
} from "./helpers.mjs";

test("real iPhone Safari smoke sign-off", async ({ page }) => {
  test.setTimeout(600000);
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(60000);

  const errors = captureConsoleErrors(page);

  async function gotoOnDevice(route) {
    const response = await page.goto(route, {
      waitUntil: "commit",
      timeout: 90000,
    });

    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1200);

    if (response) {
      expect(
        response.status(),
        `${route} should not fail to load on iPhone Safari`,
      ).toBeLessThan(400);
    }
  }

  for (const route of smokeRoutes) {
    await gotoOnDevice(route);
    await expect(page.locator("h1").first(), `${route} should render a heading`).toBeVisible();
    await expect(page.locator(".skip-link"), `${route} should keep the skip link`).toBeAttached();
  }

  await gotoOnDevice("/en/catering/");
  const hamburger = page.locator("#hamburger");
  if (await hamburger.isVisible()) {
    await hamburger.click();
  }

  const languageSwitch = page.locator(".lang-switch");
  await expect(languageSwitch).toHaveAttribute("href", "/el/catering/");
  await languageSwitch.click();
  await expect(page).toHaveURL(/\/el\/catering\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "el");

  await page.route("https://formspree.io/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await gotoOnDevice("/en/contact/");
  await page.getByLabel("Full Name").fill("QA Audit");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Guest Count").fill("12");
  await page.getByLabel("Event Location").fill("Athens");
  await page.getByLabel("Event Type").selectOption("corporate");
  await page.getByRole("button", { name: "Send Inquiry" }).click();
  await expect(page.locator("#form-status")).toContainText("Thank you");

  await gotoOnDevice("/en/");
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await expect(page.locator("#navLinks")).toHaveClass(/mobile-open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#navLinks")).not.toHaveClass(/mobile-open/);
  }

  assertNoConsoleErrors(errors);
});


