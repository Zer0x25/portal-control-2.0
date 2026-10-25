import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { useStore } from "../store/useStore";
import {
  fromInclusiveRange,
  formatBusinessDateCL,
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

  it("formats business dates across Chilean summer and winter midnight boundaries", () => {
    expect(formatBusinessDateCL(new Date("2026-01-01T02:59:59.999Z"))).toBe("2025-12-31");
    expect(formatBusinessDateCL(new Date("2026-01-01T03:00:00.000Z"))).toBe("2026-01-01");
    expect(formatBusinessDateCL(new Date("2026-07-01T03:59:59.999Z"))).toBe("2026-06-30");
    expect(formatBusinessDateCL(new Date("2026-07-01T04:00:00.000Z"))).toBe("2026-07-01");
  });

  it("matches date-fns-tz for deterministic instants, including an early year", () => {
    const dates = [new Date("0099-12-31T23:00:00.000Z")];
    for (let day = 0; day < 370; day++) {
      dates.push(new Date(Date.UTC(2025, 0, 1 + day, (day * 7) % 24, (day * 13) % 60)));
    }

    for (const date of dates) {
      expect(formatBusinessDateCL(date)).toBe(
        formatInTimeZone(date, "America/Santiago", "yyyy-MM-dd"),
      );
    }
  });

  it("uses the synchronized business now as the default date", () => {
    vi.setSystemTime(new Date("2026-03-06T05:00:00.000Z"));
    useStore.setState({ serverTimeOffset: -3 * 60 * 60 * 1000 });

    expect(formatBusinessDateCL()).toBe("2026-03-05");
  });

  it("keeps throwing for invalid dates", () => {
    expect(() => formatBusinessDateCL(new Date("invalid"))).toThrow(RangeError);
  });
});
