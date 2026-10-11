import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { formatDisplayDateTime } from "./formatters";
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
    // Depending on timezone, could be 15/05/2024 06:30 or similar.
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

    // Mock formatInTimeZone to throw an error
    vi.mocked(dateFnsTz.formatInTimeZone).mockImplementationOnce(() => {
      throw new Error("Mocked format error");
    });

    const result = formatDisplayDateTime("2024-05-15T10:30:00Z");

    expect(result).toBe("-");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error formatting date:", "2024-05-15T10:30:00Z");
  });
});
