import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

/**
 * Worker MSW para el modo navegador (spec 035, T10).
 *
 * **No** se usa en el modo node (`setupServer`): el worker intercepta en el
 * navegador y necesita el service worker `mockServiceWorker.js` en `public/`
 * (se genera con `npx msw init public/`). El modo navegador de Vitest
 * (Fase C) es el unico consumidor.
 */
export const worker = setupWorker(...handlers);
