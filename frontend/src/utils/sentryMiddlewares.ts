import { StateCreator, StoreMutatorIdentifier } from "zustand";

let sentryModulePromise: Promise<typeof import("@sentry/react") | null> | null = null;

const getSentryModule = async () => {
  if (!import.meta.env.VITE_SENTRY_DSN) return null;
  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/react").catch(() => null);
  }
  return sentryModulePromise;
};

const addSentryBreadcrumb = async (breadcrumb: {
  category: string;
  message: string;
  level: "info" | "warning" | "error";
  data?: Record<string, unknown>;
}) => {
  const Sentry = await getSentryModule();
  Sentry?.addBreadcrumb(breadcrumb);
};

/**
 * Zustand middleware to capture state changes as Sentry breadcrumbs
 */
type SentryMiddleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  config: StateCreator<T, Mps, Mcs>,
) => StateCreator<T, Mps, Mcs>;

export const sentryMiddleware: SentryMiddleware = (config) => (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loggedSet: any = (...args: any[]) => {
    // Determine action name if possible
    const action = typeof args[1] === "string" ? args[1] : undefined;

    void addSentryBreadcrumb({
      category: "zustand",
      message: action ? `Action: ${action}` : "State updated",
      level: "info",
      data: {
        type: action || "anonymous_set",
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (set as any)(...args);
  };

  return config(loggedSet, get, api);
};

interface QueryMeta {
  queryKey: string[];
}

/**
 * Helper to log TanStack Query events to Sentry
 */
export const logQueryError = (error: unknown, query: QueryMeta) => {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    if (status === 401 || status === 403) return;
  }

  void addSentryBreadcrumb({
    category: "react-query",
    message: `Query failed: ${query.queryKey.join("/")}`,
    level: "warning",
    data: {
      queryKey: query.queryKey,
      error: error instanceof Error ? error.message : String(error),
    },
  });
};

interface MutationMeta {
  options: {
    mutationKey?: string[];
  };
}

export const logMutationError = (
  error: unknown,
  variables: unknown,
  _context: unknown,
  mutation: MutationMeta,
) => {
  void addSentryBreadcrumb({
    category: "react-query",
    message: `Mutation failed: ${mutation.options.mutationKey?.join("/") || "anonymous"}`,
    level: "error",
    data: {
      mutationKey: mutation.options.mutationKey,
      variables: typeof variables === "object" ? JSON.stringify(variables) : String(variables),
      error: error instanceof Error ? error.message : String(error),
    },
  });
};
