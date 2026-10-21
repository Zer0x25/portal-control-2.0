import { QueryCache, QueryClient } from "@tanstack/react-query";

import { logQueryError, logMutationError } from "../utils/sentryMiddlewares";

/**
 * Clasificador de status HTTP **no transitorio** (spec 034, AC2).
 *
 * Un 4xx distinto de 408 (Request Timeout) y 429 (Too Many Requests) es
 * definitivo: la petición es incorrecta, no transitoria, y reintentarla solo
 * multiplica la carga sobre el backend (un 403 reintentado son 2 denegados
 * de más por cada intento del usuario).
 *
 * Los errores con `status` numérico los aporta `ApiHttpError`
 * (`src/services/apiClient.ts`), que es el unico cliente HTTP del frontend.
 */
export const isNonRetryableStatus = (error: unknown): boolean => {
  if (error === null || typeof error !== "object" || !("status" in error)) return false;
  const { status } = error as { status: unknown };
  if (typeof status !== "number") return false;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
};

/**
 * Cliente unico de TanStack Query (spec 032, spec 034 AC2).
 *
 * Vive fuera de `AppProviders` para que la capa de estado (persistencia,
 * purga de sesion y sincronizacion) pueda importarlo sin acoplarse a React.
 *
 * **El retry de transporte tiene un unico dueño: `apiClient`.** Con
 * `queries.retry: false`, un GET que falla con 500/503 pasa de 9 peticiones
 * HTTP (3 intentos del cliente x 3 ejecuciones de `queryFn`) a **3**
 * (3 intentos del cliente x 1 ejecucion). Los overrides por query que
 * contradecían la política tambien se eliminaron: la politica vive en un
 * solo sitio.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logQueryError(error, { queryKey: query.queryKey as string[] });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      // Sin retry en la capa de cache: el reintento de transporte (con
      // backoff y `Retry-After`) es responsabilidad de `apiClient`.
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      onError: (error, variables, context) => {
        logMutationError(error, variables, context, { options: { mutationKey: ["mutation"] } });
      },
    },
  },
});
