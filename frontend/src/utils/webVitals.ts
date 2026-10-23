import type { Metric } from "web-vitals";

const DEGRADED_THRESHOLDS = {
  CLS: 0.25,
  FCP: 3000,
  INP: 500,
  LCP: 4000,
  TTFB: 1800,
} as const;

type VitalName = keyof typeof DEGRADED_THRESHOLDS;
type ConnectionInfo = {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
};

type MetricContext = {
  route: string;
  role: string;
  device: "mobile" | "desktop";
  connection: ConnectionInfo | null;
  reducedMotion: boolean;
  uiPerformanceMode: string;
  metrics: Record<string, number | string>;
};

const observedMetrics: Record<string, number | string> = {};
let initialized = false;
let sentryModulePromise: Promise<typeof import("@sentry/react") | null> | null = null;

export const isDegradedVital = (name: string, value: number): name is VitalName =>
  Object.prototype.hasOwnProperty.call(DEGRADED_THRESHOLDS, name) &&
  value > DEGRADED_THRESHOLDS[name as VitalName] &&
  Number.isFinite(value);

const readRole = (): string => {
  try {
    const storedUser = sessionStorage.getItem("currentUser");
    if (!storedUser) return "anonymous";
    const user: unknown = JSON.parse(storedUser);
    if (typeof user !== "object" || user === null || !("role" in user)) return "unknown";
    return typeof user.role === "string" ? user.role : "unknown";
  } catch {
    return "unknown";
  }
};

const getMetricContext = (): MetricContext => {
  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  return {
    route: `${window.location.pathname}${window.location.hash}`,
    role: readRole(),
    device:
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(pointer: coarse)").matches
        ? "mobile"
        : "desktop",
    connection: connection
      ? {
          ...(connection.effectiveType ? { effectiveType: connection.effectiveType } : {}),
          ...(connection.rtt === undefined ? {} : { rtt: connection.rtt }),
          ...(connection.downlink === undefined ? {} : { downlink: connection.downlink }),
          ...(connection.saveData === undefined ? {} : { saveData: connection.saveData }),
        }
      : null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    uiPerformanceMode: document.documentElement.getAttribute("data-ui-perf") ?? "default",
    metrics: { ...observedMetrics },
  };
};

const getSentry = async () => {
  if (import.meta.env.MODE === "test" || !import.meta.env.VITE_SENTRY_DSN) return null;
  sentryModulePromise ??= import("@sentry/react").catch(() => null);
  return sentryModulePromise;
};

const recordVital = (metric: Metric): void => {
  observedMetrics[metric.name] = metric.value;
  const context = getMetricContext();

  void getSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.setContext("web_vitals", context);
    if (!isDegradedVital(metric.name, metric.value)) return;
    Sentry.addBreadcrumb({
      category: "web-vitals",
      message: `${metric.name} exceeded the degraded threshold`,
      level: "warning",
      data: {
        name: metric.name,
        value: metric.value,
        threshold: DEGRADED_THRESHOLDS[metric.name as VitalName],
        rating: metric.rating,
        ...context,
      },
    });
  });
};

const scheduleIdle = (callback: () => void): void => {
  const idleCallback = (
    window as Window & {
      requestIdleCallback?: (task: () => void, options?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (idleCallback) {
    idleCallback.call(window, callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 1);
  }
};

/** Register CWV observers after first paint; browserTracing remains canonical for transactions. */
export const initWebVitals = (): void => {
  if (initialized || import.meta.env.MODE === "test" || !import.meta.env.VITE_SENTRY_DSN) return;
  initialized = true;
  scheduleIdle(() => {
    void import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onLCP(recordVital);
      onINP(recordVital);
      onCLS(recordVital);
      onFCP(recordVital);
      onTTFB(recordVital);
    });
  });
};
