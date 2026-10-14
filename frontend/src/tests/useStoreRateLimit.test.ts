import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useStore } from "../store/useStore";

describe("Anti-regression: rate_limited event handling without logout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
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
});
