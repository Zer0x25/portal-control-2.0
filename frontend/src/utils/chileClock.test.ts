import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { formatChileTimeHHmm } from "./chileClock";

const CHILE_TZ = "America/Santiago";

describe("formatChileTimeHHmm", () => {
  it("matches date-fns-tz across midnight, DST transitions and invalid input", () => {
    const cases: Date[] = [
      new Date("2026-01-15T12:00:00Z"),
      new Date("2026-09-05T03:59:00Z"),
      new Date("2026-09-05T04:30:00Z"),
      new Date("2026-04-04T03:59:00Z"),
      new Date("2026-04-04T04:30:00Z"),
      new Date("2026-10-12T03:00:00Z"),
      new Date("2026-10-12T04:00:00Z"),
      ...Array.from({ length: 48 }, (_, i) => new Date(Date.UTC(2026, 2, 15) + i * 1800_000)),
    ];

    for (const date of cases) {
      expect(formatChileTimeHHmm(date)).toBe(formatInTimeZone(date, CHILE_TZ, "HH:mm"));
    }
  });

  it("returns --:-- for invalid dates", () => {
    expect(formatChileTimeHHmm(new Date(Number.NaN))).toBe("--:--");
  });
});
