import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MetricCard, { MetricStat } from "../../components/ui/MetricCard";

/**
 * Spec 031 T13 (AC9): primitiva unica de tarjeta de metrica.
 */

describe("MetricCard (spec 031 AC9)", () => {
  it("renderiza la ficha (kind=metric) con valor, label y tendencia", () => {
    render(
      <MetricCard
        kind="metric"
        title="Horas Trabajadas"
        value="142.5"
        label="vs. semana anterior"
        trend={{ value: 12.4, isPositive: true }}
      />,
    );

    expect(screen.getByText("Horas Trabajadas")).toBeInTheDocument();
    expect(screen.getByText("142.5")).toBeInTheDocument();
    expect(screen.getByText("vs. semana anterior")).toBeInTheDocument();
    expect(screen.getByText(/12\.4/)).toBeInTheDocument();
  });

  it("renderiza el panel (kind=panel) con icono y MetricStat", () => {
    render(
      <MetricCard kind="panel" title="Usuarios" icon={<span data-testid="icon" />}>
        <MetricStat label="Total Activos" value={12} />
        <MetricStat label="En Turno" value={7} isActive />
      </MetricCard>,
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Total Activos")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("aplica el tono mediante tokens semanticos, sin palette crudo", () => {
    const { container } = render(
      <MetricCard kind="metric" title="Anomalías" value={2} tone="danger" />,
    );
    const html = container.innerHTML;
    expect(html).toContain("token-status-error");
    expect(html).not.toMatch(/-(red|emerald|amber|sky|indigo)-[0-9]/);
  });

  it("MetricStat es activable con click", () => {
    const onClick = vi.fn();
    render(<MetricStat label="Total" value={3} onClick={onClick} />);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
