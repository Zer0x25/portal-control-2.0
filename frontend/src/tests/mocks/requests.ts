import { server } from "./server";

/**
 * Grabador de peticiones atendidas por MSW (spec 035, T4).
 *
 * Los tests que migran de `vi.mock` de modulo a handlers de MSW necesitan
 * contar **peticiones reales** (no llamadas a un mock): "no se vuelve a pedir
 * lo mismo" y "no se llama al backend" son afirmaciones sobre el transporte.
 */
export interface RequestRecorder {
  /** Peticiones atendidas, en orden. */
  readonly calls: Array<{ method: string; path: string }>;
  /** Total de peticiones atendidas. */
  total(): number;
  /** Peticiones que coinciden con verbo y path. */
  countOf(method: string, path: string): number;
  /** Deja de registrar (llamar en el `afterEach`). */
  stop(): void;
}

/** Empieza a registrar las peticiones que atiende el server MSW. */
export const recordRequests = (): RequestRecorder => {
  const calls: Array<{ method: string; path: string }> = [];

  const listener = ({ request }: { request: Request }): void => {
    const url = new URL(request.url);
    calls.push({ method: request.method.toUpperCase(), path: url.pathname });
  };

  server.events.on("request:start", listener);

  return {
    calls,
    total: () => calls.length,
    countOf: (method, path) =>
      calls.filter((call) => call.method === method.toUpperCase() && call.path === path).length,
    stop: () => {
      server.events.removeListener("request:start", listener);
    },
  };
};
