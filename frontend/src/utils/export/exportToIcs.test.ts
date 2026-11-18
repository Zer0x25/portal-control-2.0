import { describe, expect, it, vi } from "vitest";
import { exportShiftScheduleToICS } from "./exportToIcs";
import { triggerBrowserDownload } from "../triggerBrowserDownload";

vi.mock("../triggerBrowserDownload", () => ({ triggerBrowserDownload: vi.fn() }));

describe("ICS export", () => {
  it("exports Chilean instants, overnight shifts and escaped text", async () => {
    expect(
      exportShiftScheduleToICS(
        [
          {
            date: "2026-11-16",
            startTime: "08:00",
            endTime: "17:00",
            patternName: "Día, especial;\\\nBEGIN:VEVENT",
          },
          { date: "2026-06-16", startTime: "22:00", endTime: "06:00", patternName: "Noche" },
        ],
        { calendarName: "Turnos", filename: "turnos", employeeName: "Ana" },
      ),
    ).toBe(true);
    const blob = vi.mocked(triggerBrowserDownload).mock.calls.at(-1)?.[0];
    expect(blob).toBeDefined();
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(blob!);
    });
    expect(content).toContain("DTSTART:20261116T110000Z");
    expect(content).toContain("DTEND:20261116T200000Z");
    expect(content).toContain("DTSTART:20260617T020000Z");
    expect(content).toContain("DTEND:20260617T100000Z");
    expect(content).toContain("SUMMARY:Día\\, especial\\;\\\\\\nBEGIN:VEVENT");
  });
  it("does not download when no event is exportable", () => {
    vi.mocked(triggerBrowserDownload).mockClear();
    expect(
      exportShiftScheduleToICS([{ date: "2026-11-16", patternName: "Libre" }], {
        calendarName: "Turnos",
        filename: "turnos",
        employeeName: "Ana",
      }),
    ).toBe(false);
    expect(triggerBrowserDownload).not.toHaveBeenCalled();
  });

  it("sanitizes unsafe filename characters and trims shift times", () => {
    vi.mocked(triggerBrowserDownload).mockClear();
    expect(
      exportShiftScheduleToICS(
        [{ date: "2026-11-16", startTime: " 08:00 ", endTime: " 17:00 ", patternName: "Día" }],
        { calendarName: "Turnos", filename: "Turnos_Ana/Soto:Test", employeeName: "Ana/Soto" },
      ),
    ).toBe(true);
    expect(triggerBrowserDownload).toHaveBeenCalledWith(
      expect.any(Blob),
      "Turnos_Ana_Soto_Test.ics",
    );
  });
});
