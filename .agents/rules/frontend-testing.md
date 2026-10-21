---
trigger: model_decision
description: Frontend testing invariants, MSW network mocking, cache invalidation verification, Vitest Browser mode, and Playwright visual regression.
---

# Frontend Testing Invariants & Standards (Spec 035)

## 1. Mocking de Red con MSW (Obligatorio)

- **Prohibido el mock de módulo en mutaciones**: Las mutaciones (`useMutation`, `src/hooks/use*Mutations.ts`) y clientes de datos se deben testear SIEMPRE contra la red interceptada por MSW (`src/tests/mocks/server.ts`). Queda terminantemente prohibido usar `vi.mock` sobre módulos de servicios (`import * as service from ...; vi.mock(...)`) para simular mutaciones.
- **Fail on Unhandled Requests**: El servidor MSW en tests opera con `onUnhandledRequest: "error"`. Toda petición no contemplada debe provocar un fallo explícito en el test en vez de escaparse a la red real o fallar silenciosamente.
- **Alineación con OpenAPI / Swagger**: Todo handler registrado en `src/tests/mocks/handlers.ts` debe poseer su ruta correspondiente en `backend/docs/swagger.json` y retornar fixtures que cumplan el contrato de tipos de la API. El test ejecutable `src/tests/contracts/swagger-alignment.test.ts` valida esta sincronización en CI.

## 2. Verificación de Caché e Invalidación (TanStack Query)

- **Ciclo Completo**: Para cada mutación que llame a `queryClient.invalidateQueries`, el test debe ejercitar el ciclo:
  1. Montar `QueryClient` real.
  2. Sembrar el estado inicial (`setQueryData` o query fetch).
  3. Ejecutar la mutación (vía handler MSW).
  4. Verificar que se dispara el re-fetch automático con los nuevos datos.
- **Respeto a Claves Canónicas y Allowlists**: Las claves de query deben respetar estrictamente las convenciones de raíz y prefijo (ej. `["shiftReports"]` para reportes de turno; `["config", key]` para configuraciones; y raíces autorizadas en `src/lib/queryCache.ts`).

## 3. Entorno de Ejecución: JSDOM vs Browser Mode

- **JSDOM (`src/tests/**/*.test.{ts,tsx}`)**:
  - Entorno estándar para lógica de negocio, hooks, reducers, stores Zustand y contratos de servicios HTTP.
  - No usar JSDOM para validar focus trap real, layout dimensions (`getBoundingClientRect` > 0) o scroll virtualizado.
- **Vitest Browser Mode (`src/tests/browser/**/*.browser.spec.{ts,tsx}`)**:
  - Corre en Chromium real headless (Playwright provider).
  - Obligatorio para componentes con comportamiento dependiente del motor de renderizado del navegador:
    - `CinematicModal`: Focus trap real, ciclo de animación y retorno de foco al elemento disparador.
    - `DatePickerDialog`: Roving tabindex y navegación con flechas por la grilla APG.
    - `TabNav`: Roving tabindex, foco activo en tablist y navegación con flechas/Home/End.
    - `NumericKeypad`: Interacciones con Pointer Events en pantalla táctil/kiosco.
    - `SortableHeader`: Dimensiones reales de layout de tablas y ordenamiento interactivo.
    - `VirtualizedContainer`: Cálculo de alturas reales (`@tanstack/react-virtual`) y scroll de viewport.

## 4. Regresión Visual (Playwright Visual)

- **Conjunto Curado Único**: La suite de regresión visual solo cubre las rutas críticas declaradas en `frontend/e2e/visual-targets.ts` (`dashboard`, `planificador`, `worker-portal`, `kiosk`, `logbook`, `governance`).
- **Temas Claro y Oscuro**: Cada ruta se evalúa en ambos esquemas (`light` y `dark`).
- **Umbral Estricto**: Tolerancia `maxDiffPixelRatio: 0.05` con animaciones deshabilitadas y enmascaramiento de elementos con reloj/timestamps en vivo.
- **Actualización de Baselines**: La regeneración con `--update-snapshots` es una operación explícita en un PR separado con revisión del diff gráfico; nunca mezclar cambios de baseline visual en un PR de lógica.

## 5. Aislamiento de Entorno de Test y Ratchet de Cobertura

- **Observabilidad Aislada**: El SDK de Sentry está mockeado globalmente en `src/tests/setup.ts`. El servicio `logger` cuenta con spies automáticos (`spyOn`) para prevenir polución en stdout y permitir aserciones limpias.
- **Ratchet de Cobertura No Regresivo**: Los umbrales de cobertura en `frontend/vite.config.ts` solo pueden mantenerse o incrementarse; cualquier descenso de cobertura romperá el pipeline de CI.
