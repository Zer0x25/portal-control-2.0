import { describe, expect, it } from "vitest";
import { calendarGrid } from "./calendarGrid";
import { formatDateUTCISO } from "./dateUtils";

describe("calendar grid", () => {
  it("keeps consecutive visible dates across Chile's DST transition", () => {
    const cells = calendarGrid("week", new Date(2026, 8, 6)).filter(
      (date): date is Date => date !== null,
    );
    expect(cells.map(formatDateUTCISO)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });
});
