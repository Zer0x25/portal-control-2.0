import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useStore } from "../store/useStore";
import { apiClient, resetRateLimitEventLockForTests } from "../services/apiClient";

describe("Anti-regression: rate_limited event handling without logout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adds toast and does NOT trigger logout when rate_limited event fires", () => {
    const logoutSpy = vi.spyOn(useStore.getState(), "logout");
    const addToastSpy = vi.spyOn(useStore.getState(), "addToast");

    window.dispatchEvent(new Event("rate_limited"));

    expect(addToastSpy).toHaveBeenCalledWith(
      "Demasiadas peticiones detectadas. Espere unos segundos antes de intentar nuevamente.",
      "error",
      6000,
    );

    // Fast-forward past 600ms (the old aggressive logout timeout) and 3000ms
    vi.advanceTimersByTime(1000);
    expect(logoutSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  /**
   * Spec 034, T16 (AC4): tras eliminar el parche global de `window.fetch`
   * (`fetchGuards.ts`), el evento `rate_limited` lo emite `apiClient` y el
   * toast de `src/store/useStore.ts` se sigue mostrando.
   */
  it("muestra el toast cuando el cliente recibe un 429", async () => {
    resetRateLimitEventLockForTests();
    const addToastSpy = vi.spyOn(useStore.getState(), "addToast");

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "Demasiadas peticiones" }), {
            status: 429,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    await apiClient
      .get("/api/users" as never, { retry: false, dedup: false })
      .catch(() => undefined);

    expect(addToastSpy).toHaveBeenCalledWith(
      "Demasiadas peticiones detectadas. Espere unos segundos antes de intentar nuevamente.",
      "error",
      6000,
    );
  });
});
