import { describe, expect, it, vi } from "vitest";
import { buildAttendanceHeatmap } from "../../../features/supervisor-dashboard/components/analytics/attendanceHeatmapData";

describe("datos del mapa de asistencia", () => {
  it("conserva los datos aportados y completa las semanas", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const item = { date: "2026-11-18", value: 0.42, count: 5 };
      const weeks = buildAttendanceHeatmap([item], 1, new Date(2026, 10, 21, 12));
      expect(weeks.every((week) => week.length === 7)).toBe(true);
      expect(weeks.flat().filter(Boolean)).toHaveLength(7);
      expect(weeks.flat()).toContainEqual(item);
      expect(weeks.flat()).toContainEqual({ date: "2026-11-21", value: 0.7, count: 25 });
    } finally {
      random.mockRestore();
    }
  });
});
