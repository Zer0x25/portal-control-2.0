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
const QUERY_CACHE_KEY = "saphr:react-query-cache";

/**
 * Raíces de query presentes en el payload persistido de TanStack Query.
 *
 * Contar claves del store no basta para el escenario offline: el persister
 * (throttle 1s) escribe el payload en ráfagas y una escritura temprana puede
 * crear la llave con un estado parcial anterior a que `employees` resuelva
 * (en el boot 1 el `_verifyAuth` primero purga el cache y luego sincroniza).
 * Si el reload offline hidrata un payload sin `employees`, el portal no
 * puede resolver el empleado y cae en "Error de Configuración de Cuenta",
 * mientras que el reload online enmascara el defecto con un fetch en vivo.
 * Por eso el test espera contenido, no solo existencia de la llave.
 */
async function persistedQueryRoots(page: Page): Promise<string[]> {
  return page.evaluate(
    ([dbName, storeName, cacheKey]) =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open(dbName as string);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(storeName as string)) {
            db.close();
            resolve([]);
            return;
          }
          const request = db
            .transaction(storeName as string, "readonly")
            .objectStore(storeName as string)
            .get(cacheKey as string);
          request.onsuccess = () => {
            db.close();
            const raw = request.result;
            if (typeof raw !== "string") return resolve([]);
            try {
              const parsed = JSON.parse(raw) as {
                clientState?: { queries?: Array<{ queryKey?: unknown[] }> };
              };
              const queries = parsed.clientState?.queries ?? [];
              resolve(
                queries
                  .filter((q) => Array.isArray(q.queryKey) && q.queryKey.length > 0)
                  .map((q) => String((q.queryKey as unknown[])[0])),
              );
            } catch {
              resolve([]);
            }
          };
          request.onerror = () => {
            db.close();
            reject(request.error);
          };
        };
      }),
    [QUERY_CACHE_DB, QUERY_CACHE_STORE, QUERY_CACHE_KEY] as const,
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

    // El persister (throttle 1s) debe haber vaciado el cache a IndexedDB,
    // incluyendo la query de empleados (spec 032 AC3).
    await expect
      .poll(async () => (await persistedQueryRoots(page)).includes("employees"), {
        timeout: 30000,
      })
      .toBe(true);

    // Calentamiento bajo control del SW (chunks lazy al runtime cache) y de
    // la sesion (owner marker del cache persistido).
    await waitForServiceWorkerControl(page);
    await page.reload();
    await expect(identityHeading).toBeVisible({ timeout: 60000 });

    // El reload de calentamiento vuelve a persistir: esperar su throttle
    // antes de cortar la red, o el reload offline puede hidratar el payload
    // anterior sin `employees` (el reload online si lo enmascara con fetch).
    await expect
      .poll(async () => (await persistedQueryRoots(page)).includes("employees"), {
        timeout: 30000,
      })
      .toBe(true);

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

    // Contenido, no solo llave: el kiosk persiste la query `employees/kiosk`
    // bajo la misma raíz `employees` que requiere este escenario.
    await expect
      .poll(async () => (await persistedQueryRoots(page)).includes("employees"), {
        timeout: 30000,
      })
      .toBe(true);

    // Calentamiento bajo control del SW (chunks lazy al runtime cache). El
    // kiosk no restaura sesion, por lo que el arranque no purga el cache.
    await waitForServiceWorkerControl(page);
    await page.reload();
    await page.getByRole("button", { name: /seleccionar de la lista/i }).click();
    await expect(page.getByRole("button", { name: /juan perez/i }).first()).toBeVisible({
      timeout: 30000,
    });

    // Igual que en worker-portal: no cortar la red dentro del throttle del
    // persister tras el reload de calentamiento.
    await expect
      .poll(async () => (await persistedQueryRoots(page)).includes("employees"), {
        timeout: 30000,
      })
      .toBe(true);

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
