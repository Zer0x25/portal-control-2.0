import { QueryClient } from "@tanstack/react-query";

import { logMutationError } from "../utils/sentryMiddlewares";

/**
 * Clasificador de errores HTTP no transitorios (Spec 034 / ADR-0024 / AC2).
 * Bloquea cualquier 4xx definitivo (400, 401, 403, 404, 409, 422, etc.).
 * Status transitorios excluidos del bloqueo: 408 (timeout) y 429 (rate limit).
 */
export const isNonRetryableStatus = (status: number): boolean => {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
};

export const hasHttpStatus = (error: unknown): boolean => {
  if (error === null || typeof error !== "object" || !("status" in error)) return false;
  const { status } = error as { status: unknown };
  return typeof status === "number" && isNonRetryableStatus(status);
};

/**
 * Cliente único de TanStack Query (spec 032, spec 034).
 *
 * Vive fuera de `AppProviders` para que la capa de estado (persistencia,
 * purga de sesión y sincronización) pueda importarlo sin acoplarse a React.
 * El dueño único del retry es `apiClient` (queries.retry: false).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
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
