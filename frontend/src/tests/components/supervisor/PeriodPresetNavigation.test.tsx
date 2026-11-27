import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import KpiFilterPanel from "../../../features/supervisor-dashboard/components/KpiFilterPanel";
import ReportFilterPanel from "../../../features/supervisor-dashboard/components/ReportFilterPanel";

// Instante anclado en UTC a mediodia de Chile (09:00 America/Santiago) del
// 2026-11-25: getChileDateISO formatea en zona Chile, y new Date(y, m, d) usa
// la zona local del runner (UTC en CI), donde la medianoche local cae el dia
// anterior en Chile.
const businessNow = new Date("2026-11-25T12:00:00Z");

vi.mock("../../../hooks/useBusinessNow", () => ({
  useBusinessNow: () => businessNow,
  getBusinessNow: () => businessNow,
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({ activeEmployees: [], isLoadingEmployees: false }),
}));

const periodLabel = () =>
  screen.getAllByText(/Periodo de Consulta/i).pop()?.parentElement?.textContent;

const customDateInput = (which: "start" | "end") =>
  screen.getByLabelText(which === "start" ? /inicio/i : /término/i);

describe("navegación de presets de periodo", () => {
  it("KpiFilterPanel navega entre trimestres y no pasa del periodo en curso", async () => {
    const user = userEvent.setup();
    render(<KpiFilterPanel onFiltersChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Trimestral" }));
    expect(periodLabel()).toContain("Trimestre 4 2026");

    const next = screen.getByTitle("Siguiente");
    expect(next).toBeDisabled();

    await user.click(screen.getByTitle("Anterior"));
    expect(periodLabel()).toContain("Trimestre 3 2026");
    expect(screen.getByTitle("Siguiente")).toBeEnabled();

    await user.click(screen.getByTitle("Anterior"));
    expect(periodLabel()).toContain("Trimestre 2 2026");
  });

  it("KpiFilterPanel navega semestres y años", async () => {
    const user = userEvent.setup();
    render(<KpiFilterPanel onFiltersChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Semestral" }));
    expect(periodLabel()).toContain("Semestre 2 2026");
    await user.click(screen.getByTitle("Anterior"));
    expect(periodLabel()).toContain("Semestre 1 2026");

    await user.click(screen.getByRole("button", { name: "Anual" }));
    expect(periodLabel()).toContain("Año 2026");
    await user.click(screen.getByTitle("Anterior"));
    expect(periodLabel()).toContain("Año 2025");
    expect(screen.getByTitle("Siguiente")).toBeEnabled();
  });

  it("ReportFilterPanel navega entre trimestres y no pasa del periodo en curso", async () => {
    const user = userEvent.setup();
    render(<ReportFilterPanel onFiltersChange={vi.fn()} onGenerate={vi.fn()} isLoading={false} />);

    await user.click(screen.getByRole("button", { name: "Trimestral" }));
    expect(periodLabel()).toContain("Trimestre 4 2026");
    expect(screen.getByTitle("Siguiente")).toBeDisabled();

    await user.click(screen.getByTitle("Anterior"));
    expect(periodLabel()).toContain("Trimestre 3 2026");

    await user.click(screen.getByRole("button", { name: "Anual" }));
    await user.click(screen.getByTitle("Anterior"));
    expect(periodLabel()).toContain("Año 2025");
  });

  it("KpiFilterPanel desplaza el rango personalizado manteniendo su duración", async () => {
    const user = userEvent.setup();
    render(<KpiFilterPanel onFiltersChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Personalizado" }));

    // Estado inicial: rango de un dia anclado al dia en curso (2026-11-25).
    expect(customDateInput("start")).toHaveValue("2026-11-25");
    expect(customDateInput("end")).toHaveValue("2026-11-25");
    expect(screen.getByTitle("Siguiente")).toBeDisabled(); // Rango pasado de 3 dias: la navegacion queda habilitada en ambos sentidos.
    await user.clear(customDateInput("start"));
    await user.type(customDateInput("start"), "2026-11-20");
    await user.clear(customDateInput("end"));
    await user.type(customDateInput("end"), "2026-11-22");
    expect(customDateInput("start")).toHaveValue("2026-11-20");
    expect(screen.getByTitle("Siguiente")).toBeEnabled();

    await user.click(screen.getByTitle("Anterior"));
    expect(customDateInput("start")).toHaveValue("2026-11-17");
    expect(customDateInput("end")).toHaveValue("2026-11-19");

    await user.click(screen.getByTitle("Siguiente"));
    expect(customDateInput("start")).toHaveValue("2026-11-20");
    expect(customDateInput("end")).toHaveValue("2026-11-22");

    // El avance nunca proyecta el termino mas alla del dia en curso.
    await user.click(screen.getByTitle("Siguiente"));
    expect(customDateInput("start")).toHaveValue("2026-11-23");
    expect(customDateInput("end")).toHaveValue("2026-11-25");
    expect(screen.getByTitle("Siguiente")).toBeDisabled();
  });
});
