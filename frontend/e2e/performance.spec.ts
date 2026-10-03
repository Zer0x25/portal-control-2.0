import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth-helper";

// Reescrito en spec 004 fase 3 (2026-10-03):
// - HashRouter: la auditoría vive en `/#/admin/governance?tab=audit`
//   (`/audit-logs` solo redirige ahí). El selector de filas virtualizadas
//   se evalúa sobre la vista real, no sobre cualquier página con listas.
// - El test de "OmniSearch" (Ctrl+K + `input[placeholder*='Busca']`) se
//   elimina: esa funcionalidad no existe en el código (sin atajos
//   globales ni placeholder "Busca"). Se reemplaza por medición del
//   cambio de tab del Governance Hub, que sí ejercita lazy-load real.
// - Filosofía: estos tests gatean catástrofes de rendimiento (caps
//   generosos), no presupuestos de frames; los tiempos se reportan
//   al terminal para seguimiento.

test.describe("Render Performance", () => {
  test.setTimeout(120000);
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Audit Logs view load and scroll performance", async ({ page }) => {
    // 1. Navigate and measure initial load
    await page.goto("/#/admin/governance?tab=audit");
    await expect(page.getByText(/visor de auditoría/i)).toBeVisible({ timeout: 30000 });

    const [loadTime, totalEntries] = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const displayLogs = document.querySelectorAll("div[style*='transform: translateY']").length;
      return [navEntry ? navEntry.duration : 0, displayLogs] as const;
    });

    console.log(`\n[PERF] Audit Logs view ready (Entries rendered: ${totalEntries})`);

    // 2. Measure Virtualization Scroll Performance (only if rows rendered)
    if (totalEntries === 0) {
      console.warn("[PERF] No audit rows rendered, scroll measurement skipped");
      return;
    }
    const scrollParent = page.locator("div.overflow-y-auto.relative").first();
    await expect(scrollParent).toBeVisible();

    const scrollCount = 5;
    let totalScrollTime = 0;

    for (let i = 0; i < scrollCount; i++) {
      const startMark = `scroll-start-${i}`;
      const endMark = `scroll-end-${i}`;

      await page.evaluate((mark) => performance.mark(mark), startMark);

      // Scroll down
      await scrollParent.evaluate((el) => (el.scrollTop += 800));

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

    // Basic assertions (generous caps: gate catastrophes, not frames)
    expect(loadTime).toBeLessThan(30000);
    expect(avgScrollTime).toBeLessThan(500);
  });

  test("Governance tab switch render performance", async ({ page }) => {
    await page.goto("/#/admin/governance?tab=integrity");
    await expect(page.getByText(/INTEGRA|DEGRADADA/)).toBeVisible({ timeout: 30000 });

    // Measure time to switch to the Security tab (lazy-loaded view)
    await page.evaluate(() => performance.mark("tab-switch-start"));

    await page.getByRole("button", { name: "Seguridad", exact: true }).click();
    await expect(page.getByText(/Vigilancia & Riesgos/i)).toBeVisible({ timeout: 30000 });

    await page.evaluate(() => performance.mark("tab-switch-end"));
    await page.evaluate(() =>
      performance.measure("Tab Switch", "tab-switch-start", "tab-switch-end"),
    );

    const switchTime = await page.evaluate(() => {
      const measure = performance.getEntriesByName("Tab Switch")[0];
      return measure ? measure.duration : 0;
    });

    console.log(`[PERF] Governance tab switch Time: ${switchTime.toFixed(2)}ms`);
    expect(switchTime).toBeLessThan(15000);
  });
});
