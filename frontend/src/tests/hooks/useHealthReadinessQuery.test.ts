import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../../services/apiClient", () => ({ apiClient: { get } }));

import { deriveReadinessStatus, readinessQueryOptions } from "../../hooks/queries/useHealthQuery";
import { queryKeys } from "../../lib/queryKeys";

describe("health readiness query", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({
      status: "ready",
      healthStatus: "healthy",
      instanceId: "instance-1",
    });
  });

  afterEach(() => {
    const diagnosticWindow = window as Window & {
      __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean;
      __PORTAL_SYNC_PERF_RUN_ID__?: string;
      __PORTAL_SYNC_PERF_SAMPLE__?: number;
    };
    delete diagnosticWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__;
    delete diagnosticWindow.__PORTAL_SYNC_PERF_RUN_ID__;
    delete diagnosticWindow.__PORTAL_SYNC_PERF_SAMPLE__;
  });

  it("uses the lightweight typed endpoint and a separate sensitive key", async () => {
    await expect(readinessQueryOptions.queryFn()).resolves.toMatchObject({
      status: "ready",
      healthStatus: "healthy",
      instanceId: "instance-1",
    });

    expect(get).toHaveBeenCalledWith("/api/health/ready", {
      timeoutMs: 5000,
      retry: false,
    });
    expect(readinessQueryOptions.queryKey).toEqual(queryKeys.systemReadiness());
    expect(readinessQueryOptions.queryKey).not.toEqual(queryKeys.systemHealth());
  });

  it("adds a run and sample marker only when performance diagnostics are enabled", async () => {
    const diagnosticWindow = window as Window & {
      __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean;
      __PORTAL_SYNC_PERF_RUN_ID__?: string;
      __PORTAL_SYNC_PERF_SAMPLE__?: number;
    };
    diagnosticWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = true;
    diagnosticWindow.__PORTAL_SYNC_PERF_RUN_ID__ = "perf067-unit";
    diagnosticWindow.__PORTAL_SYNC_PERF_SAMPLE__ = 2;
    const queryTimings: Array<{
      startedAtMs: number;
      resolvedAtMs: number;
      outcome: "success" | "failure";
    }> = [];
    const listener = (event: Event) => {
      queryTimings.push((event as CustomEvent<(typeof queryTimings)[number]>).detail);
    };
    window.addEventListener("portal:readiness-query", listener);

    await readinessQueryOptions.queryFn();
    window.removeEventListener("portal:readiness-query", listener);

    expect(get).toHaveBeenCalledWith("/api/health/ready", {
      params: { performance_probe: "perf067-unit-s2" },
      timeoutMs: 5000,
      retry: false,
    });
    expect(queryTimings).toHaveLength(1);
    expect(queryTimings[0]?.outcome).toBe("success");
    expect(queryTimings[0]?.resolvedAtMs).toBeGreaterThanOrEqual(
      queryTimings[0]?.startedAtMs ?? Infinity,
    );
  });

  it("ignores invalid diagnostic correlation values", async () => {
    const diagnosticWindow = window as Window & {
      __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean;
      __PORTAL_SYNC_PERF_RUN_ID__?: string;
      __PORTAL_SYNC_PERF_SAMPLE__?: number;
    };
    diagnosticWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = true;
    diagnosticWindow.__PORTAL_SYNC_PERF_RUN_ID__ = "invalid/run-id";
    diagnosticWindow.__PORTAL_SYNC_PERF_SAMPLE__ = 1;

    await readinessQueryOptions.queryFn();

    expect(get).toHaveBeenCalledWith("/api/health/ready", {
      timeoutMs: 5000,
      retry: false,
    });
  });

  it.each([
    [{ status: "ready", healthStatus: "healthy", instanceId: "instance-1" }, "healthy"],
    [{ status: "ready", healthStatus: "degraded", instanceId: "instance-1" }, "degraded"],
    [undefined, "offline"],
  ] as const)("maps readiness %o to %s", (data, expected) => {
    expect(deriveReadinessStatus(data, undefined, false)).toBe(expected);
  });

  it("treats an unresolved first probe as connecting/healthy", () => {
    expect(deriveReadinessStatus(undefined, undefined, true)).toBe("healthy");
  });
});
