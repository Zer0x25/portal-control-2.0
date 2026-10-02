/**
 * Minimal structured JSON logger for backend bootstrap and background tasks.
 * Emits JSON to stdout for better observability.
 */

type LogLevel = "info" | "warn" | "error";

/**
 * Any value that survives a `JSON.stringify` round-trip without losing
 * information, so structured context can never hold functions, symbols or cycles.
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  eventType?:
    | "TASK_START"
    | "TASK_END"
    | "TASK_SKIP"
    | "TASK_ERROR"
    | "BOOT"
    | "LOCK_ACQUIRE"
    | "LOCK_DENY"
    | "LOCK_RELEASE";
  taskName?: string;
  durationMs?: number;
  [key: string]: JsonValue | undefined;
}

/**
 * Own enumerable fields of a value, equivalent to object spread: it copies
 * string *and* symbol keys, but skips non-enumerable and inherited ones.
 * `Error` keeps `message`/`stack` non-enumerable, so they are copied explicitly.
 */
const toPlainObjectFields = (value: unknown): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  return Object.assign(fields, value as object);
};

const formatError = (error: unknown): unknown => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      ...toPlainObjectFields(error),
    };
  }
  return error;
};

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  },

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const errorPayload = error ? { error: formatError(error) } : {};
    this.log("error", message, { ...errorPayload, ...context });
  },

  log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
    process.stdout.write(JSON.stringify(payload) + "\n");
  },

  /**
   * Standardized task logging helper.
   */
  logTask(
    eventType: LogPayload["eventType"],
    taskName: string,
    message: string,
    extra: Record<string, unknown> = {},
  ) {
    const level =
      eventType === "TASK_ERROR" ? "error" : eventType === "TASK_SKIP" ? "warn" : "info";

    const normalizedExtra: Record<string, unknown> = { ...extra };
    if (normalizedExtra.error) {
      normalizedExtra.error = formatError(normalizedExtra.error);
    }

    this.log(level, message, { eventType, taskName, ...normalizedExtra });
  },
};
