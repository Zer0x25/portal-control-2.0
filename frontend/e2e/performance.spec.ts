import { test, expect } from "@playwright/test";

test.describe("Render Performance", () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    // Login before each test to ensure state is clean
    await page.goto("/");
    // Check if we are already logged in or at login page
    if (await page.locator("#username").isVisible()) {
      await page.fill("#username", "admin");
      await page.fill("#password", "999.666");
      await page.getByRole("button", { name: /acceder al portal/i }).click();
      await expect(page).toHaveURL(
        /(dashboard|time-control|configuration|admin\/tools|audit-logs)/,
        { timeout: 15000 },
      );
    }
  });

  test("Audit Logs Page load and scroll performance", async ({ page }) => {
    // 1. Navigate and measure initial load
    await page.goto("/audit-logs");

    // Wait for the virtualized items to be present in the DOM OR the empty state
    await Promise.any([
      page.waitForSelector("div[style*='transform: translateY']", { state: "attached" }),
      page.waitForSelector("text=Secuencia Vacía", { state: "visible" }),
      page.waitForSelector("text=No se han detectado eventos", { state: "visible" }),
    ]).catch(() => console.log("Timed out waiting for content, but continuing..."));

    const [loadTime, totalEntries] = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const displayLogs = document.querySelectorAll("div[style*='transform: translateY']").length;
      return [navEntry ? navEntry.duration : 0, displayLogs];
    });

    console.log(
      `\n[PERF] Initial Audit Logs Load Time: ${loadTime.toFixed(2)}ms (Entries rendered: ${totalEntries})`,
    );

    // 2. Measure Virtualization Scroll Performance
    const container = page.locator(".overflow-y-auto.relative.custom-scrollbar").first();
    const scrollCount = 5;
    let totalScrollTime = 0;

    for (let i = 0; i < scrollCount; i++) {
      const startMark = `scroll-start-${i}`;
      const endMark = `scroll-end-${i}`;

      await page.evaluate((mark) => performance.mark(mark), startMark);

      // Scroll down
      await container.evaluate((el) => (el.scrollTop += 800));

      // Wait for the next animation frame to ensure React has had a chance to render
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

      await page.evaluate((mark) => performance.mark(mark), endMark);
      await page.evaluate(({ start, end, name }) => performance.measure(name, start, end), {
        start: startMark,
        end: endMark,
        name: `Scroll-${i}`,
      });

      const duration = await page.evaluate((name) => {
        const measure = performance.getEntriesByName(name)[0];
        return measure ? measure.duration : 0;
      }, `Scroll-${i}`);

      totalScrollTime += duration;
    }

    const avgScrollTime = totalScrollTime / scrollCount;
    console.log(
      `[PERF] Average Scroll Render Time (Virtualization): ${avgScrollTime.toFixed(2)}ms`,
    );

    // Reporting to terminal
    if (loadTime > 2000) {
      console.warn("⚠️ Warning: Initial load exceeds 2000ms");
    }
    if (avgScrollTime > 50) {
      console.warn("⚠️ Warning: Scroll rendering exceeds 50ms per frame");
    }

    // Basic assertions
    expect(loadTime).toBeLessThan(5000);
    expect(avgScrollTime).toBeLessThan(150);
  });

  test("Global Search (OmniSearch) trigger performance", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Measure time to open OmniSearch (it has a lot of data/logic)
    await page.evaluate(() => performance.mark("omni-open-start"));

    // Trigger with shortcut (Ctrl+K or similar) or just click if there is a button
    // Based on DESIGN_SYSTEM.md, it might have shortcuts. Let's try "k" with control
    await page.keyboard.press("Control+k");

    // Wait for the search input to be focused
    await page.waitForSelector("input[placeholder*='Busca']", { state: "visible" });

    await page.evaluate(() => performance.mark("omni-open-end"));
    await page.evaluate(() =>
      performance.measure("OmniSearch Open", "omni-open-start", "omni-open-end"),
    );

    const openTime = await page.evaluate(() => {
      const measure = performance.getEntriesByName("OmniSearch Open")[0];
      return measure ? measure.duration : 0;
    });

    console.log(`[PERF] OmniSearch Open Time: ${openTime.toFixed(2)}ms`);
    expect(openTime).toBeLessThan(500);
  });
});
