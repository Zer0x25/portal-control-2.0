import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * Server MSW del entorno de test (spec 035, T1).
 *
 * `onUnhandledRequest: "error"` es la parte importante: una llamada que
 * ningun handler cubre **falla el test** en lugar de colarse en silencio
 * contra la red. Es lo que convierte los tests de service en tests de
 * contrato (AC3) y lo que hace visible un endpoint que nadie mockea.
 */
export const server = setupServer(...handlers);

/** Arranca el server MSW (lo llama `src/tests/setup.ts`). */
export const startMockServer = (): void => {
  server.listen({ onUnhandledRequest: "error" });
};

/** Reinicia los handlers al conjunto por defecto y cierra el server. */
export const resetMockServer = (): void => {
  server.resetHandlers();
};
