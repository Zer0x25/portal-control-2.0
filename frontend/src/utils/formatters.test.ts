import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  formatDisplayDateTime,
  formatDisplayDate,
  formatDisplayTime,
  formatDateToDateTimeLocal,
  formatDateToTimeLocal,
  formatLogTimestamp,
  formatDecimalHoursToHHMM,
} from "./formatters";
import * as dateFnsTz from "date-fns-tz";

// Mock the date-fns-tz module to allow spying/overriding
vi.mock("date-fns-tz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("date-fns-tz")>();
  return {
    ...actual,
    formatInTimeZone: vi.fn().mockImplementation(actual.formatInTimeZone),
  };
});

describe("formatDisplayDateTime", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return correctly formatted string for valid ISO datetime", () => {
    const result = formatDisplayDateTime("2024-05-15T10:30:00Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it("should return '-' for empty string", () => {
    expect(formatDisplayDateTime("")).toBe("-");
  });

  it("should return '-' for undefined", () => {
    expect(formatDisplayDateTime(undefined)).toBe("-");
  });

  it("should return '-' for invalid date string", () => {
    expect(formatDisplayDateTime("invalid-date")).toBe("-");
  });

  it("should gracefully catch error from formatInTimeZone, log error, and return '-'", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(dateFnsTz.formatInTimeZone).mockImplementationOnce(() => {
      throw new Error("Mocked format error");
    });

    const result = formatDisplayDateTime("2024-05-15T10:30:00Z");

    expect(result).toBe("-");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error formatting date:", "2024-05-15T10:30:00Z");
  });
});

describe("formatDisplayDate", () => {
  it("formats date-only YYYY-MM-DD string correctly", () => {
    expect(formatDisplayDate("2026-10-15")).toBe("15-10-2026");
  });

  it("formats full ISO datetime string", () => {
    const result = formatDisplayDate("2026-10-15T14:30:00Z");
    expect(result).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it("returns '-' for empty or undefined input", () => {
    expect(formatDisplayDate("")).toBe("-");
    expect(formatDisplayDate(undefined)).toBe("-");
  });

  it("returns '-' for invalid date", () => {
    expect(formatDisplayDate("invalid-date")).toBe("-");
  });
});

describe("formatDisplayTime", () => {
  it("formats valid ISO datetime to HH:mm", () => {
    const result = formatDisplayTime("2026-10-15T14:30:00Z");
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns '-' for empty or invalid input", () => {
    expect(formatDisplayTime("")).toBe("-");
    expect(formatDisplayTime("invalid")).toBe("-");
  });
});

describe("formatDateToDateTimeLocal and formatDateToTimeLocal", () => {
  it("formats date to local datetime string", () => {
    const d = new Date("2026-10-15T15:45:00Z");
    expect(formatDateToDateTimeLocal(d)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(formatDateToTimeLocal(d)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("formatLogTimestamp", () => {
  it("formats log timestamps to full date-time-seconds", () => {
    const result = formatLogTimestamp("2026-10-15T14:30:00Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  });

  it("returns '-' for empty input", () => {
    expect(formatLogTimestamp("")).toBe("-");
  });
});

describe("formatDecimalHoursToHHMM", () => {
  it("formats positive decimal hours", () => {
    expect(formatDecimalHoursToHHMM(7.5)).toBe("07:30");
    expect(formatDecimalHoursToHHMM(1.25)).toBe("01:15");
  });

  it("formats negative decimal hours", () => {
    expect(formatDecimalHoursToHHMM(-1.5)).toBe("-01:30");
  });

  it("returns 00:00 for NaN or non-finite values", () => {
    expect(formatDecimalHoursToHHMM(NaN)).toBe("00:00");
    expect(formatDecimalHoursToHHMM(Infinity)).toBe("00:00");
  });
});
