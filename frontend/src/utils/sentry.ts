import { logger } from "./logger";

const asRate = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
};

export const initSentry = async () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const isProd = import.meta.env.PROD;

  const tracesSampleRate = asRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, isProd ? 0.1 : 1);
  const replaysSessionSampleRate = asRate(
    import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    isProd ? 0.02 : 0.1,
  );
  const replaysOnErrorSampleRate = asRate(
    import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    1,
  );

  if (!dsn) {
    if (isProd) {
      console.warn("Sentry DSN (VITE_SENTRY_DSN) not found. Skipping Sentry initialization.");
    }
    return;
  }

  const Sentry = await import("@sentry/react");

  Sentry.init({
    dsn: dsn,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate,
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    environment: import.meta.env.MODE || "development",
  });

  logger.log("✅ Sentry initialized successfully on Frontend");
};
