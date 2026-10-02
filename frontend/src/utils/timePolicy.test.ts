import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../store/useStore";
import {
  fromInclusiveRange,
  nowUtcInstant,
  toEndExclusive,
  toEndInclusive,
  toInclusiveRange,
} from "./timePolicy";

describe("timePolicy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useStore.setState({ serverTimeOffset: 0 });
  });

  it("converts inclusive end date to exclusive end date", () => {
    expect(toEndExclusive("2026-01-31")).toBe("2026-02-01");
  });

  it("handles month boundaries including leap and non-leap February", () => {
    expect(toEndExclusive("2026-01-31")).toBe("2026-02-01");
    expect(toEndExclusive("2024-02-29")).toBe("2024-03-01");
    expect(toEndExclusive("2025-02-28")).toBe("2025-03-01");
  });

  it("maintains invariant toInclusive(toExclusive(end))", () => {
    const endInclusive = "2026-08-19";
    expect(toEndInclusive(toEndExclusive(endInclusive))).toBe(endInclusive);
  });

  it("adapts inclusive range to exclusive and back", () => {
    const exclusive = fromInclusiveRange({ startDate: "2026-01-01", endDate: "2026-01-31" });
    expect(exclusive).toEqual({ startDate: "2026-01-01", endDateExclusive: "2026-02-01" });
    expect(toInclusiveRange(exclusive)).toEqual({ startDate: "2026-01-01", endDate: "2026-01-31" });
  });

  it("uses synchronized business now for utc instant defaults", () => {
    vi.setSystemTime(new Date("2026-03-06T03:00:00.000Z"));
    useStore.setState({ serverTimeOffset: 2 * 60 * 60 * 1000 });

    expect(nowUtcInstant()).toBe("2026-03-06T05:00:00.000Z");
  });
});
