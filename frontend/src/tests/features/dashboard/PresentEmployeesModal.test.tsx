import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PresentEmployeesModal from "../../../features/dashboard/components/PresentEmployeesModal";
import type { EmployeeWithClockingStatus } from "../../../types";

vi.mock("../../../components/ui/CinematicModal", () => ({
  default: ({
    children,
    isOpen,
    title,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    title?: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="cinematic-modal">
        {title}
        {children}
      </div>
    ) : null,
}));

const makeEntry = (
  id: string,
  name: string,
  status: EmployeeWithClockingStatus["status"],
  position = "Operador",
): EmployeeWithClockingStatus => ({
  employee: { id, name, position } as EmployeeWithClockingStatus["employee"],
  status,
});

const noop = vi.fn();

describe("PresentEmployeesModal", () => {
  it("no renderiza nada cuando esta cerrado", () => {
    render(
      <PresentEmployeesModal
        isOpen={false}
        onClose={noop}
        employeeStatuses={[makeEntry("EMP001", "Juan Perez", "en_jornada")]}
        onEmployeeDoubleClick={noop}
      />,
    );

    expect(screen.queryByTestId("cinematic-modal")).not.toBeInTheDocument();
  });

  it("lista solo a los empleados con jornada activa", () => {
    render(
      <PresentEmployeesModal
        isOpen
        onClose={noop}
        employeeStatuses={[
          makeEntry("EMP001", "Juan Perez", "en_jornada"),
          makeEntry("EMP002", "Ana Soto", "en_colacion"),
          makeEntry("EMP003", "Pedro Rios", "en_jornada_post_colacion"),
          makeEntry("EMP004", "Luis Vera", "terminada"),
          makeEntry("EMP005", "Sofia Paz", "no_programado"),
          makeEntry("EMP006", "Diez Wells", "por_iniciar"),
        ]}
        onEmployeeDoubleClick={noop}
      />,
    );

    const modal = screen.getByTestId("cinematic-modal");
    expect(within(modal).getByText("Juan Perez")).toBeInTheDocument();
    expect(within(modal).getByText("Ana Soto")).toBeInTheDocument();
    expect(within(modal).getByText("Pedro Rios")).toBeInTheDocument();
    expect(within(modal).queryByText("Luis Vera")).not.toBeInTheDocument();
    expect(within(modal).queryByText("Sofia Paz")).not.toBeInTheDocument();
    expect(within(modal).queryByText("Diez Wells")).not.toBeInTheDocument();
  });

  it("muestra el conteo de presentes sobre el total de empleados activos", () => {
    render(
      <PresentEmployeesModal
        isOpen
        onClose={noop}
        employeeStatuses={[
          makeEntry("EMP001", "Juan Perez", "en_jornada"),
          makeEntry("EMP004", "Luis Vera", "terminada"),
        ]}
        onEmployeeDoubleClick={noop}
      />,
    );

    expect(screen.getByText(/1 de 2 en jornada/)).toBeInTheDocument();
  });

  it("muestras el estado de jornada como etiqueta legible", () => {
    render(
      <PresentEmployeesModal
        isOpen
        onClose={noop}
        employeeStatuses={[makeEntry("EMP002", "Ana Soto", "en_colacion")]}
        onEmployeeDoubleClick={noop}
      />,
    );

    expect(screen.getByText("En Colación")).toBeInTheDocument();
  });

  it("muestra el empty state cuando nadie esta en jornada", () => {
    render(
      <PresentEmployeesModal
        isOpen
        onClose={noop}
        employeeStatuses={[makeEntry("EMP004", "Luis Vera", "terminada")]}
        onEmployeeDoubleClick={noop}
      />,
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Sin Personal Ingresado")).toBeInTheDocument();
  });

  it("informa al usuario mientras resuelve el registro del empleado", () => {
    render(
      <PresentEmployeesModal
        isOpen
        onClose={noop}
        employeeStatuses={[makeEntry("EMP001", "Juan Perez", "en_jornada")]}
        isResolvingRecord
        onEmployeeDoubleClick={noop}
      />,
    );

    const statuses = screen.getAllByRole("status");
    expect(
      statuses.some((status) => status.textContent?.includes("Abriendo gestión de jornada")),
    ).toBe(true);
  });

  it("expone el doble clic con el id del empleado", async () => {
    const onEmployeeDoubleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <PresentEmployeesModal
        isOpen
        onClose={noop}
        employeeStatuses={[makeEntry("EMP001", "Juan Perez", "en_jornada")]}
        onEmployeeDoubleClick={onEmployeeDoubleClick}
      />,
    );

    await user.dblClick(screen.getByText("Juan Perez"));
    expect(onEmployeeDoubleClick).toHaveBeenCalledWith("EMP001", "Juan Perez");
  });
});
