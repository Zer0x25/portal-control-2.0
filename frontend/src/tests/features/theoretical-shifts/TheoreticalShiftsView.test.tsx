import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TheoreticalShiftsView } from "../../../features/theoretical-shifts/views/TheoreticalShifts.view";

vi.mock("../../../features/theoretical-shifts/components/PatternManager", () => ({
  default: () => <div>PATTERN-MANAGER</div>,
}));
vi.mock("../../../features/theoretical-shifts/components/AssignmentManager", () => ({
  default: () => <div>ASSIGNMENT-MANAGER</div>,
}));
vi.mock("../../../features/theoretical-shifts/components/LeaveManager", () => ({
  default: () => <div>LEAVE-MANAGER</div>,
}));
vi.mock("../../../features/theoretical-shifts/components/HolidayManager", () => ({
  default: () => <div>HOLIDAY-MANAGER</div>,
}));

describe("TheoreticalShiftsView", () => {
  it("renders active tab manager and tab switch callback", async () => {
    const handleTabChange = vi.fn();

    render(
      (<TheoreticalShiftsView activeTab="patterns" handleTabChange={handleTabChange} />) as never,
    );

    expect(screen.getByText("Matriz de Turnos")).toBeInTheDocument();
    expect(await screen.findByText("PATTERN-MANAGER")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Asignación/i }));
    expect(handleTabChange).toHaveBeenCalledWith("assignments");
  });
});
