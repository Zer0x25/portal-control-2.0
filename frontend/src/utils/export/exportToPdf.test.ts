import { afterEach, describe, expect, it, vi } from "vitest";
import { exportCalendarToPDF } from "./exportToPdf";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("calendar print", () => {
  it("reports when the browser blocks the print window", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    expect(exportCalendarToPDF("Turnos", "marzo", "", [], [], () => "")).toBe(false);
  });
  it("escapes title, period, filters and headings", () => {
    const write = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({
      document: { open: vi.fn(), write, close: vi.fn() },
    } as unknown as Window);
    expect(exportCalendarToPDF("<title>", "<period>", '"filtro"', ["<día>"], [], () => "")).toBe(
      true,
    );
    const html = String(write.mock.calls[0][0]);
    expect(html).toContain("&lt;title&gt;");
    expect(html).toContain("&lt;period&gt;");
    expect(html).toContain("&quot;filtro&quot;");
    expect(html).toContain("&lt;día&gt;");
  });
  it("marks only the local current calendar date, not the adjacent UTC anchor", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 12));
    const write = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({
      document: { open: vi.fn(), write, close: vi.fn() },
    } as unknown as Window);
    exportCalendarToPDF(
      "Turnos",
      "noviembre",
      "",
      [],
      [new Date("2026-11-16T00:00:00Z"), new Date("2026-11-17T00:00:00Z")],
      () => "",
    );
    const html = String(write.mock.calls[0][0]);
    expect(html).toMatch(/calendar-cell today[^]*?day-number">16<\/div>/);
    expect(html).toMatch(/calendar-cell "[^]*?day-number">17<\/div>/);
  });
});
