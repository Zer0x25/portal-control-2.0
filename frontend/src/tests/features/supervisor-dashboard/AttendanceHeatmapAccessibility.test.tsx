import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttendanceHeatmap } from "../../../features/supervisor-dashboard/components/analytics/AttendanceHeatmap";

vi.mock("../../../hooks/useBusinessNow", () => ({
  useBusinessNow: () => new Date("2026-11-21T12:00:00Z"),
}));

describe("AttendanceHeatmap accessibility", () => {
  it("exposes a keyboard-focusable horizontal scroll region", () => {
    render(<AttendanceHeatmap data={[{ date: "2026-11-20", value: 0.9 }]} weeks={4} />);

    const region = screen.getByRole("region", { name: "Mapa de calor de asistencia" });
    expect(region).toHaveAttribute("tabindex", "0");
  });
});
