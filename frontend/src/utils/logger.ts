/**
 * Application logging boundary.
 *
 * Browser console output is limited to development. In configured non-test
 * environments messages become Sentry breadcrumbs, while unexpected errors
 * become events. The dynamic SDK import avoids a static logger/Sentry cycle.
 */
import { getHttpStatus, isHandledBusinessHttpError } from "./loggerPolicy";

type LogArgs = unknown[];
type SentryBreadcrumbLevel = "debug" | "info" | "warning" | "error";
let sentryModulePromise: Promise<typeof import("@sentry/react") | null> | null = null;

const formatMessage = (args: LogArgs): string =>
  args
    .map((arg) => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === "string") return arg;
      if (arg === undefined) return "undefined";
      if (arg === null) return "null";
      try {
        return JSON.stringify(arg) ?? String(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");

const getSentryModule = async () => {
  if (import.meta.env.MODE === "test" || !import.meta.env.VITE_SENTRY_DSN) return null;
  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/react").catch(() => null);
  }
  return sentryModulePromise;
};

const addBreadcrumb = (level: SentryBreadcrumbLevel, message: string, status?: number): void => {
  void getSentryModule().then((Sentry) => {
    Sentry?.addBreadcrumb({
      category: "application",
      message,
      level,
      ...(status === undefined ? {} : { data: { httpStatus: status } }),
    });
  });
};

const writeDevelopmentConsole = (
  level: "log" | "info" | "debug" | "warn" | "error",
  args: LogArgs,
) => {
  if (import.meta.env.MODE !== "development") return;
  console[level](...args);
};

export const logger = {
  log(...args: LogArgs) {
    writeDevelopmentConsole("log", args);
    addBreadcrumb("debug", formatMessage(args));
  },
  info(...args: LogArgs) {
    writeDevelopmentConsole("info", args);
    addBreadcrumb("info", formatMessage(args));
  },
  debug(...args: LogArgs) {
    writeDevelopmentConsole("debug", args);
    addBreadcrumb("debug", formatMessage(args));
  },
  warn(...args: LogArgs) {
    writeDevelopmentConsole("warn", args);
    addBreadcrumb("warning", formatMessage(args), getHttpStatus(args));
  },
  error(...args: LogArgs) {
    writeDevelopmentConsole("error", args);

    const message = formatMessage(args);
    const status = getHttpStatus(args);
    if (isHandledBusinessHttpError(status)) {
      addBreadcrumb("warning", message, status);
      return;
    }

    void getSentryModule().then((Sentry) => {
      if (!Sentry) return;
      const error = args.find((arg): arg is Error => arg instanceof Error);
      Sentry.captureException(error ?? new Error(message));
    });
  },
};
