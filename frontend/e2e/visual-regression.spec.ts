import { test, expect, Page } from "@playwright/test";
import { VISUAL_TARGETS, VisualTarget } from "./visual-targets";
import { loginFast } from "./helpers/auth-helper";
import { withWorker } from "./helpers/worker-factory";

/**
 * Suite de Regresión Visual (Spec 035 - AC4)
 *
 * Captura snapshots deterministas de rutas curadas en temas 'light' y 'dark'.
 * Los baselines se versionan en el repositorio.
 * La actualización de baselines es una operación explícita mediante:
 *   npx playwright test --project visual --update-snapshots
 */

async function applyTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("app-theme", t);
  }, theme);
  // Pequeña espera para estabilización de renderizado y transiciones CSS
  await page.waitForTimeout(300);
}

test.describe("Regresión Visual Curada (AC4)", () => {
  test.describe.configure({ mode: "serial" });

  for (const target of VISUAL_TARGETS) {
    for (const theme of ["light", "dark"] as const) {
      test(`${target.name} [${target.id}] - tema ${theme}`, async ({ page, request }) => {
        // Autenticación por rol
        if (target.role === "admin") {
          await loginFast(page, request, "admin");
        } else if (target.role === "worker") {
          await withWorker(page, request, async () => {
            await runVisualAssertion(page, target, theme);
          });
          return;
        }

        await runVisualAssertion(page, target, theme);
      });
    }
  }
});

async function runVisualAssertion(page: Page, target: VisualTarget, theme: "light" | "dark") {
  await page.goto(target.route);
  if (target.waitForSelector) {
    await page.waitForSelector(target.waitForSelector, { state: "visible", timeout: 15000 }).catch(() => {});
  }
  await applyTheme(page, theme);

  // Ocultar elementos parpadeantes/relojes en vivo para snapshots estables
  await expect(page).toHaveScreenshot(`${target.id}-${theme}.png`, {
    maxDiffPixelRatio: 0.05,
    animations: "disabled",
    fullPage: false,
    mask: [
      page.locator('time, [data-testid="live-clock"], [role="status"]'),
    ],
  });
}
