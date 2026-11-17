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
    expect(screen.getByTestId("page-container")).toBeInTheDocument();
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
            enabled: false,
            actionType: "jornada_inicio",
          },
          {
            id: "colacion_inicio",
            label: "Inicio Colación",
            enabled: true,
            actionType: "colacion_inicio",
          },
          {
            id: "colacion_fin",
            label: "Fin Colación",
            enabled: false,
            actionType: "colacion_fin",
          },
          {
            id: "jornada_fin",
            label: "Fin Jornada",
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

  it("invokes onLogout when clicking kiosk-exit-button", () => {
    const onLogout = vi.fn();

    render(
      <KioskView
        step={"rut_input" as never}
        setStep={vi.fn()}
        rutInput=""
        setRutInput={vi.fn()}
        formattedRutDisplay=""
        onLogout={onLogout}
      />,
    );

    fireEvent.click(screen.getByTestId("kiosk-exit-button"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("renders main landmark, alert roles on errors, and retry state on employee load error", () => {
    const refetch = vi.fn();

    const { rerender } = render(
      <KioskView
        step={"rut_input" as never}
        setStep={vi.fn()}
        rutInput=""
        setRutInput={vi.fn()}
        rutError="RUT no es válido."
        pinError="PIN incorrecto."
      />,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByTestId("kiosk-rut-error")).toHaveAttribute("role", "alert");

    rerender(
      <KioskView
        step={"pin_input" as never}
        setStep={vi.fn()}
        selectedEmployee={{ id: "emp-1", name: "Ana Test" } as never}
        pinInput="12"
        setPinInput={vi.fn()}
        pinError="PIN incorrecto."
      />,
    );

    expect(screen.getByTestId("kiosk-pin-error")).toHaveAttribute("role", "alert");
    expect(screen.getByRole("status", { name: "2 de 4 dígitos ingresados" })).toBeInTheDocument();

    rerender(
      <KioskView
        step={"rut_input" as never}
        setStep={vi.fn()}
        isErrorEmployees={true}
        refetchKioskEmployees={refetch}
      />,
    );

    expect(screen.getByText("Error al cargar empleados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("disables actions with aria-busy when isSubmitting is true and supports change_pin button", () => {
    const setStep = vi.fn();

    render(
      <KioskView
        step={"actions" as never}
        setStep={setStep}
        selectedEmployee={{ id: "emp-1", name: "Ana Test" } as never}
        isKioskArmed={true}
        isSubmitting={true}
        kioskActions={[
          {
            id: "jornada_inicio",
            label: "Inicio Jornada",
            enabled: true,
            actionType: "jornada_inicio",
          },
        ]}
        handleClockingAction={vi.fn()}
      />,
    );

    const actionButton = screen.getByRole("button", { name: "Inicio Jornada" });
    expect(actionButton).toBeDisabled();
    expect(actionButton).toHaveTextContent("Registrando...");
    expect(screen.getByTestId("kiosk-change-pin-button")).toBeDisabled();
    expect(actionButton.closest("[aria-busy='true']")).toBeInTheDocument();
  });

  it("navigates to change_pin when clicking kiosk-change-pin-button", () => {
    const setStep = vi.fn();

    render(
      <KioskView
        step={"actions" as never}
        setStep={setStep}
        selectedEmployee={{ id: "emp-1", name: "Ana Test" } as never}
        isKioskArmed={true}
        isSubmitting={false}
        kioskActions={[]}
      />,
    );

    fireEvent.click(screen.getByTestId("kiosk-change-pin-button"));
    expect(setStep).toHaveBeenCalledWith("change_pin");
  });
});
