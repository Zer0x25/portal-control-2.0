import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, afterEach } from "vitest";

import { useReportMutations } from "../../hooks/useReportMutations";
import { queryKeys } from "../../lib/queryKeys";
import { recordRequests, type RequestRecorder } from "../mocks/requests";
import type { ShiftReport } from "../../types";

/**
 * Spec 035, T4 (AC3): la bitácora de turno se prueba contra el backend por
 * MSW, no contra un modulo mockeado.
 *
 * El test sigue verificando lo importante (spec 034, T17): las 3 mutaciones
 * invalidan la **raiz canonica** `shiftReports`, de modo que la query de
 * reportes cerrados deja de mostrar datos stale. Ahora, ademas, comprueba que
 * la peticion HTTP sale con el verbo y el path correctos.
 */
describe("useReportMutations: invalidacion de la bitacora de turno (spec 034 T17 / spec 035 T4)", () => {
  let recorder: RequestRecorder;

  afterEach(() => {
    recorder?.stop();
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
    recorder = recordRequests();
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

    expect(recorder.countOf("POST", "/api/shift-reports")).toBe(1);
    expect(queryClient.getQueryState(closedKey)?.isInvalidated).toBe(true);
  });

  it("updateReport invalida la query de reportes cerrados", async () => {
    const { queryClient, closedKey, wrapper } = setup();

    const { result } = renderHook(() => useReportMutations(), { wrapper });

    await act(async () => {
      await result.current.updateReport(buildReport());
    });

    expect(recorder.countOf("PATCH", "/api/shift-reports/r-1")).toBe(1);
    expect(queryClient.getQueryState(closedKey)?.isInvalidated).toBe(true);
  });

  it("deleteReport invalida la query de reportes cerrados", async () => {
    const { queryClient, closedKey, wrapper } = setup();

    const { result } = renderHook(() => useReportMutations(), { wrapper });

    await act(async () => {
      await result.current.deleteReport("r-1");
    });

    expect(recorder.countOf("DELETE", "/api/shift-reports/r-1")).toBe(1);
    expect(queryClient.getQueryState(closedKey)?.isInvalidated).toBe(true);
  });

  it("la raiz canonica es una sola: `shiftReports` (no `reports`)", () => {
    // La tabla canonica no expone la raiz legacy `reports`.
    expect(Object.keys(queryKeys)).not.toContain("reports");
    expect(queryKeys.shiftReports()).toEqual(["shiftReports"]);
    expect(queryKeys.shiftReportsList({ status: "closed" })[0]).toBe("shiftReports");
  });
});
