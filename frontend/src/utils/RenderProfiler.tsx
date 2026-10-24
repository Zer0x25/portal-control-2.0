import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

type ProfilerPhase = "mount" | "update" | "nested-update";

interface RenderProfileMetric {
  commits: number;
  phases: Record<ProfilerPhase, number>;
  actualDurationMs: number;
  baseDurationMs: number;
  maxActualDurationMs: number;
}

interface RenderProfileCommit {
  id: string;
  phase: ProfilerPhase;
  startTimeMs: number;
  commitTimeMs: number;
  actualDurationMs: number;
}

const MAX_PROFILE_COMMIT_EVENTS = 500;

declare global {
  interface Window {
    __portalRenderCounts?: Record<string, number>;
    __portalRenderMetrics?: Record<string, RenderProfileMetric>;
    __portalRenderCommitEvents?: RenderProfileCommit[];
    __portalRenderCommitEventsDropped?: number;
  }
}

const countCommit: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  if (import.meta.env.MODE !== "development" || typeof window === "undefined") return;
  const commitEvents = (window.__portalRenderCommitEvents ??= []);
  if (commitEvents.length < MAX_PROFILE_COMMIT_EVENTS) {
    commitEvents.push({
      id,
      phase,
      startTimeMs: Number(startTime.toFixed(2)),
      commitTimeMs: Number(commitTime.toFixed(2)),
      actualDurationMs: Number(actualDuration.toFixed(2)),
    });
  } else {
    window.__portalRenderCommitEventsDropped = (window.__portalRenderCommitEventsDropped ?? 0) + 1;
  }

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
