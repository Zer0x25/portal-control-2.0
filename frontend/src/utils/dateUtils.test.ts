import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../store/useStore";
import {
  getWeekStartDate,
  getDateRange,
  getChileDateISO,
  getBusinessDateRangePreset,
  parseBusinessDateTimeCL,
  toBusinessDateChile,
  parseTimeToMinutes,
  formatDateUTCISO,
  compareBusinessDate,
  addBusinessDaysChile,
  parseDateAsUTC,
  parseDateOnlyUTC,
  formatBusinessDate,
  formatDateTime,
  getDaysInMonthArray,
  getDaysInWeekArray,
  generateCalendarGrid,
  getChileMidnight,
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

describe("pure date helpers (sin DB ni store)", () => {
  it("parseTimeToMinutes convierte HH:mm a minutos", () => {
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("22:15")).toBe(1335);
  });

  it("formatDateUTCISO usa campos UTC aunque el TZ local difiera", () => {
    expect(formatDateUTCISO(new Date("2026-03-01T02:00:00Z"))).toBe("2026-03-01");
    expect(formatDateUTCISO(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12-31");
  });

  it("compareBusinessDate ordena lexicograficamente (YYYY-MM-DD)", () => {
    expect(compareBusinessDate("2026-03-01", "2026-03-02")).toBe(-1);
    expect(compareBusinessDate("2026-03-02", "2026-03-01")).toBe(1);
    expect(compareBusinessDate("2026-03-01", "2026-03-01")).toBe(0);
  });

  it("addBusinessDaysChile suma dias calendario con carry de mes", () => {
    expect(addBusinessDaysChile("2026-01-30", 5)).toBe("2026-02-04");
    expect(addBusinessDaysChile("2026-03-10", -3)).toBe("2026-03-07");
  });

  it("parseDateAsUTC rechaza formatos invalidos con NaN", () => {
    // Medianoche Chile, no UTC (horario de verano: 03:00Z): round-trip de fecha.
    expect(toBusinessDateChile(parseDateOnlyUTC("2026-03-01"))).toBe("2026-03-01");
    expect(Number.isNaN(parseDateAsUTC("").getTime())).toBe(true);
    expect(Number.isNaN(parseDateAsUTC("no-fecha").getTime())).toBe(true);
  });

  it("formatBusinessDate devuelve -- con entrada invalida", () => {
    expect(formatBusinessDate("")).toBe("--");
    expect(formatBusinessDate("zzz")).toBe("--");
    expect(formatBusinessDate("2026-03-01")).toContain("2026");
  });

  it("formatDateTime marca N/A sin fecha y formatea en Chile", () => {
    expect(formatDateTime(null)).toBe("N/A");
    expect(formatDateTime(undefined)).toBe("N/A");
    const out = formatDateTime("2026-03-01T12:00:00Z");
    expect(out).toContain("01-03-2026");
    expect(out).toContain("09:00:00");
  });

  it("getDaysInMonthArray respeta bisiestos con campos locales", () => {
    expect(getDaysInMonthArray(2024, 1)).toHaveLength(29);
    expect(getDaysInMonthArray(2026, 1)).toHaveLength(28);
    expect(getDaysInMonthArray(2026, 0).map((d) => d.getDate())).toEqual(
      Array.from({ length: 31 }, (_, i) => i + 1),
    );
  });

  it("getDaysInWeekArray devuelve 7 dias consecutivos", () => {
    const start = new Date(2026, 2, 2);
    const week = getDaysInWeekArray(start);
    expect(week).toHaveLength(7);
    expect(week[6].getDate() - week[0].getDate()).toBe(6);
  });

  it("generateCalendarGrid acolcha a multiplo de 7 (marzo 2026: domingo->6 nulls)", () => {
    const grid = generateCalendarGrid("month", new Date(2026, 2, 15));
    expect(grid.length % 7).toBe(0);
    expect(grid.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(grid.filter((c) => c !== null)).toHaveLength(31);
    const week = generateCalendarGrid("week", new Date(2026, 2, 4));
    expect(week).toHaveLength(7);
    // getWeekStartDate devuelve lunes UTC: getUTCDay es robusto al TZ local.
    expect(week[0]?.getUTCDay()).toBe(1);
  });

  it("getChileMidnight redondea a la fecha de negocio en Chile", () => {
    expect(toBusinessDateChile(getChileMidnight("2026-03-01"))).toBe("2026-03-01");
  });
});
