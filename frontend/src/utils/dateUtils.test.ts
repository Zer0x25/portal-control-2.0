import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../store/useStore";
import {
  getWeekStartDate,
  getDateRange,
  getChileDateISO,
  getBusinessDateRangePreset,
  parseBusinessDateTimeCL,
  toBusinessDateChile,
} from "./dateUtils";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  useStore.setState({ serverTimeOffset: 0 });
});

describe("getWeekStartDate", () => {
  it("should return the preceding Monday for a given Wednesday", () => {
    // Wednesday, Jan 10, 2024
    const date = new Date("2024-01-10T12:00:00Z");
    const weekStart = getWeekStartDate(date);
    expect(weekStart.toISOString()).toBe("2024-01-08T00:00:00.000Z");
    expect(weekStart.getUTCDay()).toBe(1); // Monday
  });
  it("should return the same day if it is a Monday", () => {
    const date = new Date("2024-01-08T12:00:00Z"); // Monday
    const weekStart = getWeekStartDate(date);
    expect(weekStart.toISOString()).toBe("2024-01-08T00:00:00.000Z");
    expect(weekStart.getUTCDay()).toBe(1);
  });
  it("should return the preceding Monday for a Sunday", () => {
    const date = new Date("2024-01-14T12:00:00Z"); // Sunday
    const weekStart = getWeekStartDate(date);
    expect(weekStart.toISOString()).toBe("2024-01-08T00:00:00.000Z");
    expect(weekStart.getUTCDay()).toBe(1);
  });
  it("should handle week start crossing month boundaries", () => {
    const date = new Date("2024-03-03T12:00:00Z"); // Sunday, March 3rd
    const weekStart = getWeekStartDate(date);
    expect(weekStart.toISOString()).toBe("2024-02-26T00:00:00.000Z");
  });
});

describe("getDateRange", () => {
  it('should return the correct start and end for "day" mode', () => {
    const date = new Date("2024-05-15T10:00:00Z");
    const { startDate, endDate } = getDateRange("day", date);
    expect(startDate.toISOString()).toBe("2024-05-15T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2024-05-15T23:59:59.999Z");
  });
  it('should return the correct range for "week" mode', () => {
    const date = new Date("2024-05-15T10:00:00Z"); // A Wednesday
    const { startDate, endDate } = getDateRange("week", date);
    expect(startDate.toISOString()).toBe("2024-05-13T00:00:00.000Z"); // Monday
    expect(endDate.toISOString()).toBe("2024-05-19T23:59:59.999Z"); // Sunday
  });
  it('should return the correct range for "month" mode', () => {
    const date = new Date("2024-02-15T10:00:00Z"); // February
    const { startDate, endDate } = getDateRange("month", date);
    expect(startDate.toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2024-02-29T23:59:59.999Z"); // Leap year
  });

  it("should derive chile business date from synchronized server offset", () => {
    vi.setSystemTime(new Date("2026-03-06T02:30:00.000Z"));
    useStore.setState({ serverTimeOffset: 2 * 60 * 60 * 1000 });

    expect(getChileDateISO()).toBe("2026-03-06");
    expect(toBusinessDateChile()).toBe("2026-03-06");
  });

  it("builds a capped business month range from central utilities", () => {
    vi.setSystemTime(new Date("2026-03-06T02:30:00.000Z"));
    useStore.setState({ serverTimeOffset: 2 * 60 * 60 * 1000 });

    expect(getBusinessDateRangePreset("month")).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-05",
    });
  });

  it("parses business date-time in Chile timezone without ad hoc concatenation consumers", () => {
    expect(parseBusinessDateTimeCL("2026-03-06", "08:30:00").toISOString()).toBe(
      "2026-03-06T11:30:00.000Z",
    );
  });
});
