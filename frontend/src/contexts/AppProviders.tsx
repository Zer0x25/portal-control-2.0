import React from "react";
import { HashRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const ReactQueryDevtools = React.lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

import { logQueryError, logMutationError } from "../utils/sentryMiddlewares";

/** HTTP errors thrown by the API client carry a numeric `status`. */
const hasHttpStatus = (error: unknown): boolean => {
  if (error === null || typeof error !== "object" || !("status" in error)) return false;
  const { status } = error as { status: unknown };
  return status === 401 || status === 403 || status === 404;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: (failureCount, error: unknown) => {
        // Log to Sentry if it fails after some retries or specific errors
        if (failureCount >= 1) {
          logQueryError(error, { queryKey: ["unknown"] }); // Basic logging, TanStack Query 5 handles meta differently
        }
        // Only retry on network errors or server 5xx
        if (hasHttpStatus(error)) return false;
        return failureCount < 2;
      },
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

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>{children}</HashRouter>
      {localStorage.getItem("devModeEnabled") === "true" && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
