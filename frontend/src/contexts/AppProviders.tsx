import React from "react";
import { HashRouter } from "react-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
const ReactQueryDevtools = React.lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

import { QUERY_CACHE_BUSTER, queryCachePersister, shouldDehydrateQuery } from "../lib/queryCache";
import { queryClient } from "../lib/queryClient";
import { profileReactSubtree } from "../utils/RenderProfiler";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h, alineado con gcTime

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = profileReactSubtree("app:router", <HashRouter>{children}</HashRouter>);
  const queryCacheProvider = profileReactSubtree(
    "app:query-cache-provider",
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryCachePersister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery,
        },
      }}
    >
      {router}
      {localStorage.getItem("devModeEnabled") === "true" && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </React.Suspense>
      )}
    </PersistQueryClientProvider>,
  );

  return <React.StrictMode>{queryCacheProvider}</React.StrictMode>;
};
