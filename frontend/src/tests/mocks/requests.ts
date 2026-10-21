import { server } from "./server";

/**
 * Grabador de peticiones atendidas por MSW (spec 035, T4).
 *
 * Los tests que migran de `vi.mock` de modulo a handlers de MSW necesitan
 * contar **peticiones reales** (no llamadas a un mock): "no se vuelve a pedir
 * lo mismo" y "no se llama al backend" son afirmaciones sobre el transporte.
 */
export interface RecordedRequest {
  method: string;
  path: string;
  /** URL completa (incluye el query string). */
  url: string;
  /** Query string parseado. */
  query: URLSearchParams;
  /** Cabeceras de la peticion. */
  headers: Record<string, string>;
  /** Lee el body como texto (sin consumir el original). */
  bodyText: () => Promise<string>;
  /** Lee el body como JSON (undefined si no es JSON o esta vacio). */
  bodyJson: () => Promise<unknown>;
}

export interface RequestRecorder {
  /** Peticiones atendidas, en orden (compatibilidad). */
  readonly calls: Array<{ method: string; path: string }>;
  /** Peticiones atendidas, con detalle (query, headers, body). */
  readonly requests: RecordedRequest[];
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
  const requests: RecordedRequest[] = [];

  const listener = ({ request }: { request: Request }): void => {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const recorded: RecordedRequest = {
      method: request.method.toUpperCase(),
      path: url.pathname,
      url: request.url,
      query: url.searchParams,
      headers,
      bodyText: () => request.clone().text(),
      bodyJson: async () => {
        const text = await request.clone().text();
        if (!text) return undefined;
        try {
          return JSON.parse(text);
        } catch {
          return undefined;
        }
      },
    };

    calls.push({ method: recorded.method, path: recorded.path });
    requests.push(recorded);
  };

  server.events.on("request:start", listener);

  return {
    calls,
    requests,
    total: () => calls.length,
    countOf: (method, path) =>
      calls.filter((call) => call.method === method.toUpperCase() && call.path === path).length,
    stop: () => {
      server.events.removeListener("request:start", listener);
    },
  };
};
