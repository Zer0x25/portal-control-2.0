import React, { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EmployeeCalendarModal from "../../../features/supervisor-dashboard/components/EmployeeCalendarModal";
import type { Employee } from "../../../types";

vi.mock("../../../hooks/useCalendarData", () => ({
  useCalendarData: () => ({ scheduleMap: {}, isLoadingCalendar: false }),
}));
vi.mock("../../../components/ui/ShiftCalendarView", () => ({
  default: () => <div>Calendario</div>,
}));

const employee = { id: "1", name: "Juan Pérez", position: "Operador" } as Employee;

function Fixture() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir expediente</button>
      {open && <EmployeeCalendarModal employee={employee} isOpen onClose={() => setOpen(false)} />}
    </>
  );
}

describe("EmployeeCalendarModal", () => {
  it("names the dialog, contains keyboard focus, closes with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    const opener = screen.getByRole("button", { name: "Abrir expediente" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "EXPEDIENTE: Juan Pérez" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
    const close = within(dialog).getByRole("button", { name: "Cerrar calendario" });
    const finish = within(dialog).getByRole("button", { name: /finalizar revisión/i });
    await user.tab({ shift: true });
    expect(finish).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
