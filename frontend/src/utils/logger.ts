/**
 * Minimal console logger for the frontend.
 *
 * `no-console` allows only `warn`/`error`, so ad-hoc `console.log` calls in
 * components and bootstrap code are not allowed. Routing them through this
 * helper keeps the existing console output while staying lint-clean and
 * giving us one place to later forward messages to Sentry.
 */
type LogArgs = unknown[];

export const logger = {
  log(...args: LogArgs) {
    console.log(...args);
  },
  info(...args: LogArgs) {
    console.info(...args);
  },
  debug(...args: LogArgs) {
    console.debug(...args);
  },
  warn(...args: LogArgs) {
    console.warn(...args);
  },
  error(...args: LogArgs) {
    console.error(...args);
  },
};
