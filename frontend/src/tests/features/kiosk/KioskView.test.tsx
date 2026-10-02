import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import KioskView from "../../../features/kiosk/views/Kiosk.view";

vi.mock("../../../components/ui/NumericKeypad", () => ({
  default: () => <div>NUMERIC-KEYPAD</div>,
}));

vi.mock("../../../components/ui/SimpleConnectionIndicator", () => ({
  default: () => <div>CONNECTION-INDICATOR</div>,
}));

describe("KioskView", () => {
  it("renders RUT step and transitions to employee list", () => {
    const setStep = vi.fn();

    render(
      <KioskView
        step={"rut_input" as never}
        setStep={setStep}
        rutInput=""
        setRutInput={vi.fn()}
        formattedRutDisplay="12.345.678-9"
      />,
    );

    expect(screen.getByText("Identificación")).toBeInTheDocument();
    expect(screen.getByText("NUMERIC-KEYPAD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Seleccionar de la lista/i }));
    expect(setStep).toHaveBeenCalledWith("employee_list");
  });

  it("disables unavailable kiosk actions based on clock status", () => {
    render(
      <KioskView
        step={"actions" as never}
        setStep={vi.fn()}
        selectedEmployee={{ id: "emp-1", name: "Ana Test" } as never}
        isKioskArmed={true}
        clockStatusConfig={{
          label: "En Jornada",
          bg: "bg-green-100",
          text: "text-green-800",
          description: "Trabajando",
        }}
        kioskActions={[
          {
            id: "jornada_inicio",
            label: "Inicio Jornada",
            color: "green",
            enabled: false,
            actionType: "jornada_inicio",
          },
          {
            id: "colacion_inicio",
            label: "Inicio Colación",
            color: "yellow",
            enabled: true,
            actionType: "colacion_inicio",
          },
          {
            id: "colacion_fin",
            label: "Fin Colación",
            color: "blue",
            enabled: false,
            actionType: "colacion_fin",
          },
          {
            id: "jornada_fin",
            label: "Fin Jornada",
            color: "red",
            enabled: false,
            actionType: "jornada_fin",
          },
        ]}
        handleClockingAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Estado actual")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inicio Colación" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Inicio Jornada" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fin Colación" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fin Jornada" })).toBeDisabled();
  });
});
