import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import axe from "axe-core";

// El componente decide desktop/mobile con `useMediaQuery`. En jsdom forzamos
// la rama desktop para poder auditar el `role="grid"` (la rama mobile son
// tarjetas y no forma parte de AC6).
vi.mock("../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));
import ReportTable from "../../components/ui/ReportTable";
import type { ReportSortConfig } from "../../hooks/useReportTable";
import type { DailyReportItem, ReportDataType, ReportStat, SortableReportKey } from "../../types";

/**
 * Spec 036 AC6 (T20): la tabla de reportes es accesible.
 *
 * axe-core corre sobre el DOM de jsdom: las reglas estructurales (roles,
 * `aria-*`, nombres accesibles) sí se evalúan; `color-contrast` se desactiva
 * porque jsdom no calcula layout/estilos reales (ese contraste lo cubre el
 * e2e de Playwright, T21). `region` también se desactiva: el componente se
 * renderiza aislado, sin los landmarks de la página.
 */

const justificationStyles: Record<string, string> = {
  Vacaciones: "bg-blue-100 text-blue-800",
  "Licencia Médica": "bg-purple-100 text-purple-800",
};

const summaryData: ReportStat[] = [
  {
    employeeId: "emp-1",
    name: "Ana Pérez",
    totalHoursWorked: 160,
    totalHoursScheduled: 168,
    differenceHours: -8,
    absenceDays: 1,
    tardinessIncidents: 0,
    tardinessMinutes: 0,
    scheduledDays: 21,
    workedDays: 20,
  },
  {
    employeeId: "emp-2",
    name: "Bruno Díaz",
    totalHoursWorked: 168,
    totalHoursScheduled: 168,
    differenceHours: 0,
    absenceDays: 0,
    tardinessIncidents: 2,
    tardinessMinutes: 15,
    scheduledDays: 21,
    workedDays: 21,
  },
  {
    employeeId: "emp-3",
    name: "Carla Soto",
    totalHoursWorked: 176,
    totalHoursScheduled: 168,
    differenceHours: 8,
    absenceDays: 0,
    tardinessIncidents: 0,
    tardinessMinutes: 0,
    scheduledDays: 21,
    workedDays: 22,
  },
];

const dailyData: DailyReportItem[] = [
  {
    date: "05/01/2026",
    isoDate: "2026-01-05",
    dayOfWeek: "Lunes",
    scheduledShift: "09:00-18:00",
    actualClocks: "09:00-18:00",
    scheduledHours: 8,
    colacionMinutes: 60,
    workedHours: 8,
    differenceHours: 0,
    justificationType: "Vacaciones",
  },
  {
    date: "06/01/2026",
    isoDate: "2026-01-06",
    dayOfWeek: "Martes",
    scheduledShift: "09:00-18:00",
    actualClocks: "09:10-18:00",
    scheduledHours: 8,
    colacionMinutes: 30,
    workedHours: 7.5,
    differenceHours: -0.5,
  },
];

interface HarnessProps {
  data: ReportDataType;
  single: boolean;
  initialSort?: ReportSortConfig;
}

const Harness: React.FC<HarnessProps> = ({ data, single, initialSort = null }) => {
  const [sortConfig, setSortConfig] = useState<ReportSortConfig>(initialSort);
  const [currentPage, setCurrentPage] = useState(1);

  const requestSort = (key: SortableReportKey) => {
    setSortConfig((previous) =>
      previous?.key === key
        ? {
            key,
            direction: previous.direction === "ascending" ? "descending" : "ascending",
          }
        : { key, direction: "ascending" },
    );
    setCurrentPage(1);
  };

  return (
    <ReportTable
      reportData={data}
      isSingleEmployeeReport={single}
      sortConfig={sortConfig}
      requestSort={requestSort}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      justificationStyles={justificationStyles}
    />
  );
};

const runAxe = async (container: HTMLElement) => {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
    },
  });
  return results.violations.map(
    (violation) => `${violation.id} [${violation.impact}]: ${violation.help}`,
  );
};

describe("ReportTable a11y (spec 036 AC6)", () => {
  it("la tabla resumen no tiene violaciones estructurales y expone el contrato ARIA", async () => {
    const { container } = render(<Harness data={summaryData} single={false} />);

    const grid = screen.getByRole("grid", { name: /resumen de reporte por empleado/i });
    expect(grid).toHaveAttribute("aria-rowcount", "4"); // 3 empleados + cabecera
    expect(grid).toHaveAttribute("aria-colcount", "8");

    const sortedHeader = screen
      .getByRole("button", { name: /ordenar por hrs\. trab\./i })
      .closest("th");
    expect(sortedHeader).toHaveAttribute("aria-sort", "none");

    await expect(runAxe(container)).resolves.toEqual([]);
    cleanup();
  });

  it("aria-sort refleja los 3 estados y el click alterna el orden", async () => {
    const { container } = render(
      <Harness
        data={summaryData}
        single={false}
        initialSort={{ key: "totalHoursWorked", direction: "descending" }}
      />,
    );

    const button = screen.getByRole("button", { name: /ordenar por hrs\. trab\./i });
    expect(button.closest("th")).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(button);
    expect(button.closest("th")).toHaveAttribute("aria-sort", "ascending");

    const otherButton = screen.getByRole("button", { name: /ordenar por nombre/i });
    expect(otherButton.closest("th")).toHaveAttribute("aria-sort", "none");

    await expect(runAxe(container)).resolves.toEqual([]);
    cleanup();
  });

  it("la tabla diaria con subtotales cuenta las filas y navega con teclado", async () => {
    const { container } = render(<Harness data={dailyData} single />);

    const grid = screen.getByRole("grid", { name: /reporte diario del empleado/i });
    // 2 días + 1 subtotal semanal + 1 total general + cabecera
    expect(grid).toHaveAttribute("aria-rowcount", "5");
    expect(grid).toHaveAttribute("aria-colcount", "9");

    const rows = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("data-row-index") !== null);
    expect(rows).toHaveLength(4);
    expect(screen.getByText("Resumen Semanal")).toBeInTheDocument();
    expect(screen.getByText("Corte de Periodo Finalizado")).toBeInTheDocument();

    grid.focus();
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[0]);

    fireEvent.keyDown(rows[0], { key: "End" });
    expect(document.activeElement).toBe(rows[rows.length - 1]);

    fireEvent.keyDown(rows[rows.length - 1], { key: "Home" });
    expect(document.activeElement).toBe(rows[0]);

    await expect(runAxe(container)).resolves.toEqual([]);
    cleanup();
  });
});
