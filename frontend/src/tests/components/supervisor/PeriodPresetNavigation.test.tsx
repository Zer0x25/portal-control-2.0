import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import KpiFilterPanel from "../../../features/supervisor-dashboard/components/KpiFilterPanel";
import ReportFilterPanel from "../../../features/supervisor-dashboard/components/ReportFilterPanel";

const businessNow = new Date(2026, 10, 25);

vi.mock("../../../hooks/useBusinessNow", () => ({
  useBusinessNow: () => businessNow,
  getBusinessNow: () => businessNow,
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({ activeEmployees: [], isLoadingEmployees: false }),
}));

const periodLabel = () =>
  screen.getAllByText(/Periodo de Consulta/i).pop()?.parentElement?.textContent;

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
});
