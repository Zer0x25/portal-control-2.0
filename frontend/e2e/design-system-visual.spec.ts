import { expect, test } from "@playwright/test";
import { CERTIFIED_DESIGN_SYSTEM_STORIES } from "../src/features/design-system/certifiedStoryManifest";

const primitiveStories = CERTIFIED_DESIGN_SYSTEM_STORIES.filter(
  (story) => story.category === "primitive",
);

for (const story of primitiveStories) {
  for (const theme of ["light", "dark"] as const) {
    test(`${story.title} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-10-23T12:00:00.000Z"));
      await page.goto(
        `/iframe.html?id=${story.storyId}--default&viewMode=story&globals=theme:${theme}`,
      );
      await expect(page.locator("html")).toHaveAttribute("data-story-density", "standard");
      if (theme === "dark") {
        await expect(page.locator("html")).toHaveClass(/dark/);
      } else {
        await expect(page.locator("html")).not.toHaveClass(/dark/);
      }
      const canvas = page.locator("#storybook-root");
      await expect(canvas).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(canvas).toHaveScreenshot(`${story.storyId}-${theme}.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: true,
        maxDiffPixelRatio: 0.001,
      });
    });
  }
}
