import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MeterReadingsView } from "../../../features/meters/views/MeterReadings.view";

vi.mock("../../../features/meters/components/MeterHistory", () => ({
  default: () => <div>METER-HISTORY</div>,
}));
vi.mock("../../../features/meters/components/MeterForm", () => ({
  default: () => <div>METER-FORM</div>,
}));
vi.mock("../../../features/meters/components/MeterConfigPanel", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div>{isOpen ? "CONFIG-OPEN" : "CONFIG-CLOSED"}</div>
  ),
}));

describe("MeterReadingsView", () => {
  const baseProps: React.ComponentProps<typeof MeterReadingsView> = {
    isLoadingReadings: false,
    isConfigPanelOpen: false,
    isFormOpen: false,
    setIsConfigPanelOpen: vi.fn(),
    setIsFormOpen: vi.fn(),
  };

  it("renders history and delegates actions", () => {
    render(<MeterReadingsView {...baseProps} />);

    expect(screen.getByText("Registro de Medidores")).toBeInTheDocument();
    expect(screen.getByTestId("page-container")).toBeInTheDocument();
    expect(screen.getByText("METER-HISTORY")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ingresar Lecturas/i }));
    expect(baseProps.setIsFormOpen).toHaveBeenCalledWith(true);
  });
});
