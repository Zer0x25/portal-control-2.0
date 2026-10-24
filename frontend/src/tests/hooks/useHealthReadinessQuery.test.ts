import { beforeEach, describe, expect, it, vi } from "vitest";

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
