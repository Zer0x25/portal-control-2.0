import { test, expect, type Page } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

// Spec 032 T8 (AC3): con red el boot hidrata el cache persistido de TanStack
// Query (IndexedDB `SAPHRPortalQueryCache`, store separado de la cola
// offline); sin red, el worker-portal y el kiosk sirven esos datos desde el
// cache en lugar de quedar vacios. La escritura sigue siendo online-first:
// sin red falla con toast y sin crash, y al reconectar la app recupera.
//
// Corre contra build de produccion (vite preview) + backend real: en dev el
// loading state lento produce falsos fallos (lecciones de spec 031 T19).
//
// Sin red = `context.setOffline(true)`, el escenario real del dispositivo.
// El app shell lo sirve el service worker (PWA autoUpdate: precache del
// index.html + navigateFallback); los chunks lazy post-login quedan en el
// runtime cache StaleWhileRevalidate en la segunda carga, ya con la pagina
// bajo control del SW. Por eso cada caso hace una recarga online de calentamiento
// antes de cortar la red, igual que un usuario que ya uso la app antes.

const QUERY_CACHE_DB = "SAPHRPortalQueryCache";
const QUERY_CACHE_STORE = "queryCache";

/** Cuenta las entradas persistidas del cache de queries. */
async function persistedQueryCacheEntries(page: Page): Promise<number> {
  return page.evaluate(
    ([dbName, storeName]) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open(dbName as string);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(storeName as string)) {
            db.close();
            resolve(0);
            return;
          }
          const request = db
            .transaction(storeName as string, "readonly")
            .objectStore(storeName as string)
            .count();
          request.onsuccess = () => {
            resolve(request.result);
            db.close();
          };
          request.onerror = () => {
            reject(request.error);
            db.close();
          };
        };
      }),
    [QUERY_CACHE_DB, QUERY_CACHE_STORE] as const,
  );
}

/** Espera a que el SW tome control y termine el precache (instalacion previa). */
async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 45000,
  });
}

test.describe("Offline desde cache persistido (spec 032 AC3)", () => {
  test("worker-portal sirve el perfil y jornada desde el cache sin red", async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(150000);

    await loginFast(page, request, "worker");
    await page.goto("/#/worker-portal");
    await expect(page).toHaveURL(/#\/worker-portal/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Portal del Trabajador" })).toBeVisible({
      timeout: 60000,
    });

    // Identidad Digital muestra el nombre del empleado: dato que solo puede
    // venir de la coleccion employees (query persistida).
    const identityHeading = page.getByRole("heading", { name: "Juan Perez", exact: true });
    await expect(identityHeading).toBeVisible({ timeout: 30000 });

    // El persister (throttle 1s) debe haber vaciado el cache a IndexedDB.
    await expect
      .poll(() => persistedQueryCacheEntries(page), { timeout: 30000 })
      .toBeGreaterThan(0);

    // Calentamiento bajo control del SW (chunks lazy al runtime cache) y de
    // la sesion (owner marker del cache persistido).
    await waitForServiceWorkerControl(page);
    await page.reload();
    await expect(identityHeading).toBeVisible({ timeout: 60000 });

    // --- Sin red: recarga completa sirve desde el cache ---
    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { name: "Portal del Trabajador" })).toBeVisible({
      timeout: 60000,
    });
    await expect(identityHeading).toBeVisible({ timeout: 30000 });

    await context.setOffline(false);
  });

  test("kiosk sirve la lista de personal desde el cache sin red", async ({ page, context }) => {
    test.setTimeout(150000);

    // El kiosk es ruta publica (sin sesion): el dispositivo solo necesita red
    // en la primera carga para sembrar el cache.
    await page.goto("/#/kiosk");
    await expect(page.getByRole("heading", { name: "Portal Empleado" })).toBeVisible({
      timeout: 60000,
    });

    await page.getByRole("button", { name: /seleccionar de la lista/i }).click();
    await expect(page.getByRole("heading", { name: "Lista de Personal" })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole("button", { name: /juan perez/i }).first()).toBeVisible({
      timeout: 30000,
    });

    await expect
      .poll(() => persistedQueryCacheEntries(page), { timeout: 30000 })
      .toBeGreaterThan(0);

    // Calentamiento bajo control del SW (chunks lazy al runtime cache). El
    // kiosk no restaura sesion, por lo que el arranque no purga el cache.
    await waitForServiceWorkerControl(page);
    await page.reload();
    await page.getByRole("button", { name: /seleccionar de la lista/i }).click();
    await expect(page.getByRole("button", { name: /juan perez/i }).first()).toBeVisible({
      timeout: 30000,
    });

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { name: "Portal Empleado" })).toBeVisible({
      timeout: 60000,
    });
    await page.getByRole("button", { name: /seleccionar de la lista/i }).click();
    await expect(page.getByRole("heading", { name: "Lista de Personal" })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole("button", { name: /juan perez/i }).first()).toBeVisible({
      timeout: 30000,
    });

    await context.setOffline(false);
  });

  test("escritura con backend caido falla con toast y la app se recupera", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);

    await loginFast(page, request, "worker");
    await page.goto("/#/worker-portal");
    await expect(page.getByRole("heading", { name: "Portal del Trabajador" })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByRole("heading", { name: "Juan Perez", exact: true })).toBeVisible({
      timeout: 30000,
    });

    // Backend caido (la escritura es online-first, sin cola local): el
    // marcaje debe degradar con toast de error, sin congelar la UI ni
    // romper la sesion.
    await page.route("**/api/**", (route) => route.abort());
    const punchButton = page.getByRole("button", { name: "Inicio Jornada" });
    await expect(punchButton).toBeEnabled({ timeout: 30000 });
    await punchButton.click();
    await expect(page.getByText("Error de conexión al registrar marcaje.")).toBeVisible({
      timeout: 30000,
    });
    // La sesion sobrevive: el portal sigue montado con sus datos.
    await expect(page.getByRole("heading", { name: "Juan Perez", exact: true })).toBeVisible();

    // Reconectar: la app sigue operativa y refresca con red normal.
    await page.unroute("**/api/**");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Portal del Trabajador" })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByRole("heading", { name: "Juan Perez", exact: true })).toBeVisible({
      timeout: 30000,
    });
  });
});
