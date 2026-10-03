import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Sentry DSN not found. Skipping Sentry initialization.");
    }
    return;
  }

  Sentry.init({
    dsn: dsn,
    integrations: [nodeProfilingIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Profiling continuo (Sentry v11): el muestreo de sesion reemplaza al
    // antiguo profilesSampleRate; 'trace' mantiene los perfiles ligados a
    // las trazas como antes.
    profileSessionSampleRate: 1.0,
    profileLifecycle: "trace",
    environment: process.env.NODE_ENV || "development",
  });

  console.warn("✅ Sentry initialized successfully on Backend");
};
