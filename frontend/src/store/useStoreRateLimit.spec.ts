import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useStore } from "./useStore";
import { apiClient, resetRateLimitLock } from "../services/apiClient";

describe("rate_limited event integration with useStore (AC4 / T16)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetRateLimitLock();
    useStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetRateLimitLock();
  });

  it("agrega un toast de error cuando apiClient recibe un 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Rate limit" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await apiClient.get("/api/test-rate-limit" as never, { dedup: false }).catch(() => undefined);

    const toasts = useStore.getState().toasts;
    expect(toasts.length).toBeGreaterThanOrEqual(1);
    expect(toasts[0].message).toContain("Demasiadas peticiones detectadas");
    expect(toasts[0].type).toBe("error");
  });
});
