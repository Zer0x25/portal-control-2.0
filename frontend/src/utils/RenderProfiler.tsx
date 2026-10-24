import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

type ProfilerPhase = "mount" | "update" | "nested-update";

interface RenderProfileMetric {
  commits: number;
  phases: Record<ProfilerPhase, number>;
  actualDurationMs: number;
  baseDurationMs: number;
  maxActualDurationMs: number;
}

declare global {
  interface Window {
    __portalRenderCounts?: Record<string, number>;
    __portalRenderMetrics?: Record<string, RenderProfileMetric>;
  }
}

const countCommit: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  if (import.meta.env.MODE !== "development" || typeof window === "undefined") return;
  window.__portalRenderCounts ??= {};
  window.__portalRenderCounts[id] = (window.__portalRenderCounts[id] ?? 0) + 1;

  window.__portalRenderMetrics ??= {};
  const metric = (window.__portalRenderMetrics[id] ??= {
    commits: 0,
    phases: { mount: 0, update: 0, "nested-update": 0 },
    actualDurationMs: 0,
    baseDurationMs: 0,
    maxActualDurationMs: 0,
  });
  metric.commits += 1;
  metric.phases[phase] += 1;
  metric.actualDurationMs += actualDuration;
  metric.baseDurationMs += baseDuration;
  metric.maxActualDurationMs = Math.max(metric.maxActualDurationMs, actualDuration);
};

/**
 * Development-only profiler used by scripts/measure-renders.mjs.
 * Production builds return children without adding a Profiler boundary.
 */
export const RenderProfiler = ({ id, children }: { id: string; children: ReactNode }) => {
  if (import.meta.env.MODE !== "development") return <>{children}</>;
  return (
    <Profiler id={id} onRender={countCommit}>
      {children}
    </Profiler>
  );
};
