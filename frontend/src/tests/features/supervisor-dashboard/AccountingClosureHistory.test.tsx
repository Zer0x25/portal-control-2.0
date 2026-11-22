import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AccountingClosureTab from "../../../features/supervisor-dashboard/components/AccountingClosureTab";

vi.mock("../../../features/supervisor-dashboard/hooks/useAccountingClosureTabController", () => ({
  useAccountingClosureTabController: () => ({
    accountingLockDate: null,
    closureHistory: [
      { id: "1", action: "CONFIG_SET", timestamp: "2026-11-21T12:00:00Z", actorUsername: "admin" },
    ],
    isHistoryModalOpen: true,
    isHistoryLoading: false,
    isLoading: false,
    validationResult: { status: "idle" },
    parseDetailsObject: () => ({ previousValue: "2026-10-01", newValue: "2026-11-01" }),
    setIsHistoryModalOpen: vi.fn(),
  }),
}));

describe("Accounting closure history", () => {
  it("makes the populated scrollable history reachable by keyboard", async () => {
    const user = userEvent.setup();
    render(<AccountingClosureTab />);

    const dialog = screen.getByRole("dialog", { name: "Historial de Cierres Contables" });
    const history = within(dialog).getByRole("region", {
      name: "Contenido del historial de cierres",
    });
    expect(within(history).getByText(/Cambio de cierre contable/)).toBeInTheDocument();
    await user.tab();
    await user.tab();
    expect(history).toHaveFocus();
  });

  it("exposes accessible cut-off date button label", () => {
    render(<AccountingClosureTab />);

    const cutoffButton = screen.getByRole("button", {
      name: /Nuevo Límite de Cierre \(CUT-OFF\)/i,
    });
    expect(cutoffButton).toBeInTheDocument();
    expect(cutoffButton).toHaveAttribute("type", "button");
  });
});
