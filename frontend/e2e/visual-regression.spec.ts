import { test, expect, Locator, Page } from "@playwright/test";
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
 *
 * ## Determinismo
 *
 * Tres palancas, todas necesarias (una sola no basta):
 *
 * 1. **Reloj fijo** (`page.clock.setFixedTime`): congela `Date.now()` y
 *    `new Date()` en el navegador. Sin esto, el saludo ("Buenos días" /
 *    "Buenas tardes" / "Buenas noches") y las fechas cambian según la hora a la
 *    que corra la suite, y el baseline nunca coincide consigo mismo.
 * 2. **Zona horaria fija** (`timezoneId` en `playwright.config.ts`):
 *    `America/Santiago` es la zona de negocio de la app; sin fijar la zona,
 *    el runner y el CI renderizan horas distintas.
 * 3. **Enmascarado de datos vivos** (`volatileSelectors` /
 *    `volatileCards` en `visual-targets.ts`): el staging muta en cada corrida
 *    e2e (empleados `E2E Kiosk ...`, auditorías, conteos). Sin enmascarar,
 *    el baseline se rompe con cada corrida y el test miente.
 *
 * El resto de la página (jerarquía, tipografía, color, espaciado, estados) sí
 * se compara: es lo que la regresión visual debe proteger.
 */

/**
 * Instante fijo de la suite: lunes 16/03/2026 11:00 hora de Santiago
 * (UTC-3 en marzo). Elegido a mediodía para que el saludo sea siempre
 * "Buenos días" y ninguna fecha del mes caiga en un fin de semana.
 */
export const VISUAL_FIXED_TIME = new Date("2026-03-16T14:00:00.000Z");

/**
 * Tolerancia de diferencia por pixel. Ajustada al renderizado de Chromium en
 * Linux (antialiasing entre plataformas): absorbe el ruido de sub-pixel sin
 * tolerar un cambio de diseño real.
 */
const MAX_DIFF_PIXEL_RATIO = 0.02;

/**
 * Localiza la tarjeta (Card/WidgetContainer) cuyo título es `title`.
 *
 * El título se busca por su **texto DOM** ("Panel de Operación"), no por el
 * renderizado en mayúsculas (CSS `uppercase`), y se sube al contenedor con
 * la clase `animate-in` más cercano.
 */
function cardByTitle(page: Page, title: string): Locator {
  return page
    .getByRole("heading", { name: title, exact: true })
    .locator(
      "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' animate-in ')][1]",
    );
}

/** Regiones con datos vivos de un target: se enmascaran en el snapshot. */
function volatileRegions(page: Page, target: VisualTarget): Locator[] {
  return [
    ...(target.volatileSelectors ?? []).map((selector) => page.locator(selector)),
    ...(target.volatileCards ?? []).map((title) => cardByTitle(page, title)),
  ];
}

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
  // Reloj fijo ANTES de navegar: la app lee el reloj al montar.
  await page.clock.setFixedTime(VISUAL_FIXED_TIME);
  await page.goto(target.route);
  if (target.waitForSelector) {
    await page
      .waitForSelector(target.waitForSelector, { state: "visible", timeout: 15000 })
      .catch(() => {});
  }
  // Esperar a que la vista termine de renderizar sus esqueletos. Capturar el
  // fallback de carga (chunk lazy o query en vuelo) produce un baseline que
  // depende de la latencia, no del diseño.
  await expect
    .poll(async () => page.locator('[data-testid="skeleton"]:visible').count(), {
      timeout: 15000,
    })
    .toBe(0);
  await applyTheme(page, theme);

  // Restricciones de layout para que la geometría de la captura no dependa
  // del volumen de datos (ver `style` en visual-targets.ts).
  if (target.style) {
    await page.addStyleTag({ content: target.style });
  }

  // Ocultar elementos parpadeantes/relojes en vivo para snapshots estables
  await expect(page).toHaveScreenshot(`${target.id}-${theme}.png`, {
    maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
    animations: "disabled",
    fullPage: false,
    mask: [
      page.locator('time, [data-testid="live-clock"], [role="status"]'),
      ...volatileRegions(page, target),
    ],
  });
}
