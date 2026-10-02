import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBusinessNow } from "../../hooks/useBusinessNow";
import { useStore } from "../../store/useStore";

describe("useBusinessNow", () => {
  beforeEach(() => {
    useStore.setState({ serverTimeOffset: 0 });
    vi.useRealTimers();
  });

  it("applies server offset to business now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));
    useStore.setState({ serverTimeOffset: 90_000 });

    const { result } = renderHook(() => useBusinessNow());

    expect(result.current.toISOString()).toBe("2026-03-06T12:01:30.000Z");
  });
});
