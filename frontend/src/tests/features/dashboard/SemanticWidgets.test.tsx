import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Card from "../../../components/ui/Card";
import MetricCard from "../../../components/ui/MetricCard";
import { AlertsPanel } from "../../../features/dashboard/components/AlertsPanel";
import DashboardRow from "../../../features/dashboard/components/DashboardRow";
import AnimatedDashboardRow from "../../../features/dashboard/components/ui/DashboardRow";

describe("dashboard semantic controls", () => {
  it("renders a widget title at the requested level", () => {
    render(
      <Card title="Historial" headingAs="h2">
        Contenido
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Historial", level: 2 })).toBeInTheDocument();
  });

  it("exposes interactive metric as a button and its value as text", () => {
    const onClick = vi.fn();
    render(<MetricCard title="Anomalías" value={2} semanticValue onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Anomalías.*2/ }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("heading", { name: "2" })).not.toBeInTheDocument();
  });

  it.each([DashboardRow, AnimatedDashboardRow])(
    "allows keyboard activation of a double-click row",
    async (Row) => {
      const user = userEvent.setup();
      const open = vi.fn();
      render(<Row title="Folio 1" subtitle="Turno" onDoubleClick={open} />);
      const row = screen.getByRole("button", { name: /Folio 1/ });
      row.focus();
      await user.keyboard("{Enter} ");
      fireEvent.doubleClick(row);
      expect(open).toHaveBeenCalledTimes(3);
    },
  );

  it("exposes pressed state on AlertsPanel filter buttons and switches via keyboard", async () => {
    const user = userEvent.setup();
    render(
      <AlertsPanel
        upcomingEmployees={[]}
        missingClockOuts={[]}
        openClockInConfirmation={vi.fn()}
        onMissingClockOutDoubleClick={vi.fn()}
      />,
    );

    const upcoming = screen.getByRole("button", { name: /Ingresos \(0\)/ });
    const missing = screen.getByRole("button", { name: /Salidas \(0\)/ });
    expect(upcoming).toHaveAttribute("aria-pressed", "true");
    expect(missing).toHaveAttribute("aria-pressed", "false");

    missing.focus();
    await user.keyboard("{Enter}");
    expect(upcoming).toHaveAttribute("aria-pressed", "false");
    expect(missing).toHaveAttribute("aria-pressed", "true");
  });
});
