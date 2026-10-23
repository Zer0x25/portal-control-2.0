import { expect, test } from "@playwright/test";

test("container query follows the block width while the viewport stays wide", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("#username")).toBeVisible({ timeout: 30_000 });

  await page.evaluate(() => {
    const container = document.createElement("div");
    container.id = "container-query-fixture";
    container.className = "@container";
    container.style.cssText = "position:fixed;top:0;left:0;width:320px;z-index:2147483647";

    const metric = document.createElement("h2");
    metric.id = "container-query-metric";
    // Mirrors the real MetricCard heading's container-responsive typography.
    metric.className = "text-2xl @sm:text-3xl";
    metric.textContent = "Metric";
    container.append(metric);
    document.body.append(container);
  });

  const metric = page.locator("#container-query-metric");
  const fontScale = () =>
    metric.evaluate((element) => {
      const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      return Number.parseFloat(getComputedStyle(element).fontSize) / rootSize;
    });

  await expect.poll(fontScale).toBe(1.5);

  await page.locator("#container-query-fixture").evaluate((element) => {
    (element as HTMLElement).style.width = "640px";
  });
  await expect.poll(fontScale).toBe(1.875);

  await page.setViewportSize({ width: 375, height: 900 });
  // The app scales rem sizes with the viewport; the container-selected type scale stays at 1.875.
  await expect.poll(fontScale).toBe(1.875);
});
