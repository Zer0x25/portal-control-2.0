import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AnomaliesModal from "../../../features/dashboard/components/AnomaliesModal";
import type { TeamAnomalyRecord } from "../../../types";

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

const noop = vi.fn();

const storedAnomaly = (overrides: Partial<TeamAnomalyRecord> = {}): TeamAnomalyRecord => ({
  id: "record-1",
  employeeId: "EMP001",
  employeeName: "Juan Perez",
  date: "2026-11-26",
  status: "AnomaliaManual",
  ...overrides,
});

const missingMarkAnomaly = (overrides: Partial<TeamAnomalyRecord> = {}): TeamAnomalyRecord => ({
  id: "MISSING-EMP002-2026-11-25",
  employeeId: "EMP002",
  employeeName: "Ana Soto",
  date: "2026-11-25",
  status: "SinMarcajeTurnoAsignado",
  justification: {
    type: "SYSTEM_ANOMALY",
    reason: "NO_TIME_RECORD_WITH_ASSIGNED_SHIFT",
    comment: "Falta marcaje para el turno asignado ayer.",
  },
  ...overrides,
});

describe("AnomaliesModal", () => {
  it("no renderiza nada cuando esta cerrado", () => {
    render(
      <AnomaliesModal
        isOpen={false}
        onClose={noop}
        anomalies={[storedAnomaly()]}
        count={1}
        isLoading={false}
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={noop}
      />,
    );

    expect(screen.queryByTestId("cinematic-modal")).not.toBeInTheDocument();
  });

  it("clasifica las faltas de marcaje con su etiqueta y detalle de fecha", () => {
    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[missingMarkAnomaly()]}
        count={1}
        isLoading={false}
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={noop}
      />,
    );

    const modal = screen.getByTestId("cinematic-modal");
    expect(within(modal).getByText("Ana Soto")).toBeInTheDocument();
    expect(within(modal).getByText("Falta Marcaje")).toBeInTheDocument();
    expect(
      within(modal).getByText(/Turno asignado del 2026-11-25 sin marcaje registrado\./),
    ).toBeInTheDocument();
  });

  it("clasifica las jornadas excedidas (abierto mas de 14h)", () => {
    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[storedAnomaly({ status: "Laborando", id: "open-1" })]}
        count={1}
        isLoading={false}
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={noop}
      />,
    );

    const modal = screen.getByTestId("cinematic-modal");
    expect(within(modal).getByText("Jornada Excedida")).toBeInTheDocument();
    expect(within(modal).getByText(/más de 14 horas sin justificación\./)).toBeInTheDocument();
  });

  it("clasifica los cierres con anomalía con la etiqueta del estado", () => {
    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[storedAnomaly()]}
        count={1}
        isLoading={false}
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={noop}
      />,
    );

    expect(screen.getByText("Anomalía Manual")).toBeInTheDocument();
  });

  it("muestra el conteo en el subtitulo", () => {
    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[storedAnomaly(), missingMarkAnomaly()]}
        count={2}
        isLoading={false}
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={noop}
      />,
    );

    expect(screen.getByText(/2 registro\(s\) por resolver/)).toBeInTheDocument();
  });

  it("muestra el estado de carga mientras sincroniza", () => {
    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[]}
        count={0}
        isLoading
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={noop}
      />,
    );

    expect(screen.getByText("Sincronizando anomalías...")).toBeInTheDocument();
  });

  it("muestra empty state sin anomalias", () => {
    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[]}
        count={0}
        isLoading={false}
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={noop}
      />,
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Sin Anomalías")).toBeInTheDocument();
  });

  it("ofre reintentar cuando la carga falla", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[]}
        count={0}
        isLoading={false}
        isError
        onRetry={onRetry}
        onAnomalyDoubleClick={noop}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("expone el doble clic con el registro de anomalia", async () => {
    const onAnomalyDoubleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <AnomaliesModal
        isOpen
        onClose={noop}
        anomalies={[missingMarkAnomaly()]}
        count={1}
        isLoading={false}
        isError={false}
        onRetry={noop}
        onAnomalyDoubleClick={onAnomalyDoubleClick}
      />,
    );

    await user.dblClick(screen.getByText("Ana Soto"));
    expect(onAnomalyDoubleClick).toHaveBeenCalledWith(missingMarkAnomaly());
  });
});
