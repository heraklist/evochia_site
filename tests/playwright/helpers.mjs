import { expect } from "@playwright/test";

import {
  accessibilityRoutes,
  smokeRoutes,
  visualScenarios,
} from "../../scripts/qa-config.mjs";

const ignoredConsolePatterns = [];

export { accessibilityRoutes, smokeRoutes, visualScenarios };

export function captureConsoleErrors(page) {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }

    errors.push(`console: ${text}`);
  });

  return errors;
}

export async function gotoAndWait(page, route) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main")).toBeVisible();

  if (response) {
    expect(response.status(), `${route} should not fail to load`).toBeLessThan(400);
  }

  return response;
}

export function assertNoConsoleErrors(errors) {
  expect(
    errors,
    errors.length ? `Runtime errors detected:\n${errors.join("\n")}` : undefined,
  ).toEqual([]);
}

export async function stabilizePage(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document
      .querySelectorAll(
        "main > section, main > .section-divider, main > .trust-layer, main > .trust-layer-contact, footer.footer",
      )
      .forEach((element) => {
        element.style.contentVisibility = "visible";
        element.style.containIntrinsicSize = "auto";
      });
    document
      .querySelectorAll(".hero-particles, .splatter-overlay, .scroll-indicator")
      .forEach((element) => element.remove());
    document
      .querySelectorAll(".reveal")
      .forEach((element) => {
        element.classList.add("visible");
        element.style.transition = "none";
        element.style.opacity = "1";
        element.style.transform = "none";
      });

    // Accessibility audits should measure the settled UI, not transient
    // opacity states from decorative entrance animations.
    document
      .querySelectorAll(
        ".hero-subtitle, .hero-title, .hero-tagline, .hero-description, .hero-cta-group",
      )
      .forEach((element) => {
        element.style.animation = "none";
        element.style.opacity = "1";
        element.style.transform = "none";
      });

    const conciergerie = document.getElementById("conciergerie");
    if (conciergerie) {
      conciergerie.classList.remove("open");
    }
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
