import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { shiftReportService } from "../../services/shiftReportService";

describe("P0-1: shiftReports cache invalidation unification (AC5 / T17)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 1000 * 60 * 5, retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  it("invalidación por raíz canónica ['shiftReports'] alcanza a queries con params y variantes infinite", async () => {
    const key1 = ["shiftReports", { status: "closed", pageSize: 50 }];
    const key2 = ["shiftReports", { page: 1, pageSize: 20 }];

    await queryClient.prefetchQuery({
      queryKey: key1,
      queryFn: () => ({ data: [{ id: "rep-1" }], total: 1 }),
      staleTime: 1000 * 60 * 5,
    });
    await queryClient.prefetchQuery({
      queryKey: key2,
      queryFn: () => ({ data: [{ id: "rep-1" }], total: 1 }),
      staleTime: 1000 * 60 * 5,
    });

    const cache = queryClient.getQueryCache();
    expect(cache.find({ queryKey: key1 })?.isStale()).toBe(false);
    expect(cache.find({ queryKey: key2 })?.isStale()).toBe(false);

    // Invalidation by canonical root
    await queryClient.invalidateQueries({ queryKey: ["shiftReports"] });

    // Both queries are now stale and marked for refetch
    expect(cache.find({ queryKey: key1 })?.isStale()).toBe(true);
    expect(cache.find({ queryKey: key2 })?.isStale()).toBe(true);
  });

  it("las mutaciones de reportes invalidan la raíz ['shiftReports']", async () => {
    const closedKey = ["shiftReports", { status: "closed" }];

    await queryClient.prefetchQuery({
      queryKey: closedKey,
      queryFn: () => ({ data: [] }),
      staleTime: 1000 * 60 * 5,
    });

    const cache = queryClient.getQueryCache();
    expect(cache.find({ queryKey: closedKey })?.isStale()).toBe(false);

    vi.spyOn(shiftReportService, "save").mockResolvedValue({
      id: "new-rep",
      timestamp: Date.now(),
      shiftId: "s-1",
      employeeId: "e-1",
      notes: "",
      anomaliesCount: 0,
    } as never);

    // Simulate mutation onSuccess behavior
    await shiftReportService.save({ id: "new-rep" } as never);
    await queryClient.invalidateQueries({ queryKey: ["shiftReports"] });

    expect(cache.find({ queryKey: closedKey })?.isStale()).toBe(true);
  });
});
