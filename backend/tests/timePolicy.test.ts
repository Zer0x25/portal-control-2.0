import { describe, expect, it } from "vitest";
import {
  addBusinessDaysCL,
  formatBusinessDateCL,
  fromInclusiveRange,
  toEndExclusive,
  toEndInclusive,
  toInclusiveRange,
} from "../src/utils/timePolicy";

describe("timePolicy", () => {
  it("converts inclusive end date to exclusive end date", () => {
    expect(toEndExclusive("2026-01-31")).toBe("2026-02-01");
  });

  it("handles month boundaries including leap year", () => {
    expect(toEndExclusive("2026-01-31")).toBe("2026-02-01");
    expect(toEndExclusive("2026-04-30")).toBe("2026-05-01");
    expect(toEndExclusive("2024-02-29")).toBe("2024-03-01");
    expect(toEndExclusive("2025-02-28")).toBe("2025-03-01");
  });

  it("keeps invariant toInclusive(toExclusive(end)) == end", () => {
    const endInclusive = "2026-06-17";
    expect(toEndInclusive(toEndExclusive(endInclusive))).toBe(endInclusive);
  });

  it("converts ranges with adapter helpers", () => {
    const exclusive = fromInclusiveRange({ startDate: "2026-01-01", endDate: "2026-01-31" });
    expect(exclusive).toEqual({ startDate: "2026-01-01", endDateExclusive: "2026-02-01" });

    const inclusive = toInclusiveRange(exclusive);
    expect(inclusive).toEqual({ startDate: "2026-01-01", endDate: "2026-01-31" });
  });

  it("preserves business date across DST changes in Chile", () => {
    const before = new Date("2026-09-05T23:30:00.000Z");
    const after = new Date("2026-09-06T23:30:00.000Z");
    const beforeDate = formatBusinessDateCL(before);
    const afterDate = formatBusinessDateCL(after);

    expect(addBusinessDaysCL(beforeDate, 1)).toBe(afterDate);
  });
});
