import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useReportMutations } from "../../hooks/useReportMutations";
import { queryKeys } from "../../lib/queryKeys";
import type { ShiftReport } from "../../types";

const { saveMock, updateMock, deleteMock } = vi.hoisted(() => ({
  saveMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("../../services/shiftReportService", () => ({
  shiftReportService: {
    save: saveMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

/**
 * Spec 034, T17 (AC5): las 4 invalidaciones de la bitacora de turno apuntan a
 * **una sola raiz canonica** (`shiftReports`).
 *
 * Antes de la unificacion, la query de reportes cerrados (la que consume
 * `features/logbook/components/ClosedReportsModal.tsx`) usaba la raiz
 * `shiftReports` mientras las 4 invalidaciones usaban `reports`: la
 * invalidacion no alcanzaba a la query y el modal mostraba datos stale.
 */
describe("useReportMutations: invalidacion de la bitacora de turno (spec 034 T17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue({} as ShiftReport);
    updateMock.mockResolvedValue({} as ShiftReport);
    deleteMock.mockResolvedValue(undefined);
  });

  const buildReport = (): ShiftReport => ({
    id: "r-1",
    folio: "F-001",
    date: "2026-03-01",
    shiftName: "Turno A",
    responsibleUser: "ana",
    startTime: "08:00",
    status: "open",
    logEntries: [],
    supplierEntries: [],
    reportCreatedAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-01T08:00:00.000Z",
    lastModified: "2026-03-01T08:00:00.000Z",
    syncStatus: "synced",
    isDeleted: false,
  });

  const setup = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // La query de reportes cerrados (la del modal de bitacora cerrada).
    const closedKey = queryKeys.shiftReportsList({ status: "closed", pageSize: 20 });
    queryClient.setQueryData(closedKey, [{ id: "r-1", status: "closed" }]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return { queryClient, closedKey, wrapper };
  };

  it("addReport invalida la query de reportes cerrados", async () => {
    const { queryClient, closedKey, wrapper } = setup();

    const { result } = renderHook(() => useReportMutations(), { wrapper });

    await act(async () => {
      await result.current.addReport(buildReport());
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(closedKey)?.isInvalidated).toBe(true);
  });

  it("updateReport invalida la query de reportes cerrados", async () => {
    const { queryClient, closedKey, wrapper } = setup();

    const { result } = renderHook(() => useReportMutations(), { wrapper });

    await act(async () => {
      await result.current.updateReport(buildReport());
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(closedKey)?.isInvalidated).toBe(true);
  });

  it("deleteReport invalida la query de reportes cerrados", async () => {
    const { queryClient, closedKey, wrapper } = setup();

    const { result } = renderHook(() => useReportMutations(), { wrapper });

    await act(async () => {
      await result.current.deleteReport("r-1");
    });

    expect(deleteMock).toHaveBeenCalledWith("r-1");
    expect(queryClient.getQueryState(closedKey)?.isInvalidated).toBe(true);
  });

  it("la raiz canonica es una sola: `shiftReports` (no `reports`)", () => {
    // La tabla canonica no expone la raiz legacy `reports`.
    expect(Object.keys(queryKeys)).not.toContain("reports");
    expect(queryKeys.shiftReports()).toEqual(["shiftReports"]);
    expect(queryKeys.shiftReportsList({ status: "closed" })[0]).toBe("shiftReports");
  });
});
