import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

declare global {
  interface Window {
    __portalRenderCounts?: Record<string, number>;
  }
}

const countCommit: ProfilerOnRenderCallback = (id) => {
  if (import.meta.env.MODE !== "development" || typeof window === "undefined") return;
  window.__portalRenderCounts ??= {};
  window.__portalRenderCounts[id] = (window.__portalRenderCounts[id] ?? 0) + 1;
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
