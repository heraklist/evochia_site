import { expect, test } from "@playwright/test";

import {
  assertNoConsoleErrors,
  captureConsoleErrors,
  gotoAndWait,
  smokeRoutes,
} from "./helpers.mjs";

for (const route of smokeRoutes) {
  test(`${route} renders without runtime errors`, async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await gotoAndWait(page, route);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator(".skip-link")).toBeAttached();

    assertNoConsoleErrors(errors);
  });
}

test("language switch points to the matching localized page", async ({ page }, testInfo) => {
  const errors = captureConsoleErrors(page);

  await gotoAndWait(page, "/en/catering/");

  if (testInfo.project.name.startsWith("mobile")) {
    await page.locator("#hamburger").click();
  }

  const languageSwitch = page.locator(".lang-switch");
  await expect(languageSwitch).toHaveAttribute("href", "/el/catering/");

  await languageSwitch.click();
  await expect(page).toHaveURL(/\/el\/catering\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "el");

  assertNoConsoleErrors(errors);
});

test("contact form submits against a mocked Formspree endpoint", async ({ page }) => {
  const errors = captureConsoleErrors(page);

  await page.route("https://formspree.io/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await gotoAndWait(page, "/en/contact/");

  await page.getByLabel("Full Name").fill("QA Audit");
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Guest Count").fill("12");
  await page.getByLabel("Event Location").fill("Athens");
  await page.getByLabel("Event Type").selectOption("corporate");
  await page.getByRole("button", { name: "Send Inquiry" }).click();

  await expect(page.locator("#form-status")).toContainText("Thank you");
  assertNoConsoleErrors(errors);
});

test("mobile menu opens and closes on mobile projects", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  const errors = captureConsoleErrors(page);
  await gotoAndWait(page, "/en/");

  const hamburger = page.locator("#hamburger");
  await expect(hamburger).toBeVisible();
  await hamburger.click();
  await expect(page.locator("#navLinks")).toHaveClass(/mobile-open/);

  await page.keyboard.press("Escape");
  await expect(page.locator("#navLinks")).not.toHaveClass(/mobile-open/);
  assertNoConsoleErrors(errors);
});