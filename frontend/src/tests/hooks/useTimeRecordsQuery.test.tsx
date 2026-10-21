import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  useTimeRecordsQuery,
  useTimeRecordMutations,
} from "../../hooks/queries/useTimeRecordsQuery";
import { TEST_API_URL } from "../mocks/baseUrl";
import { server } from "../mocks/server";
import { recordRequests, type RequestRecorder } from "../mocks/requests";

const { idbGetAllMock, idbPutBulkMock, addToastMock } = vi.hoisted(() => ({
  idbGetAllMock: vi.fn(),
  idbPutBulkMock: vi.fn(),
  addToastMock: vi.fn(),
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../utils/indexedDB", () => ({
  STORES: { DAILY_TIME_RECORDS: "dailyTimeRecords" },
  idbGetAll: idbGetAllMock,
  idbPutBulk: idbPutBulkMock,
}));

/**
 * Spec 035, T4 (AC3): el filtro de anomalias se prueba contra el backend por
 * MSW.
 *
 * El service real (`timeRecordService.getAll`) habla HTTP de verdad: si el
 * contrato de la respuesta cambia, este test lo detecta. El mock de modulo
 * que se elimina era el que dejaba pasar exactamente esos cambios.
 */
describe("useTimeRecordsQuery anomaly filtering (spec 035 T4)", () => {
  let recorder: RequestRecorder;

  beforeEach(() => {
    vi.clearAllMocks();
    recorder = recordRequests();
  });

  afterEach(() => {
    recorder.stop();
  });

  it("filters cached fallback data when showAnomalies is enabled and backend fails", async () => {
    // El backend falla: el hook cae a la cache local (IndexedDB).
    server.use(
      http.get(`${TEST_API_URL}/records`, () =>
        HttpResponse.json({ message: "backend caido" }, { status: 500 }),
      ),
    );

    idbGetAllMock.mockResolvedValue([
      {
        id: "r-anomaly",
        employeeId: "e1",
        employeeName: "Ana",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: "2026-03-01",
        status: "AnomaliaManual",
      },
      {
        id: "r-ok",
        employeeId: "e2",
        employeeName: "Beto",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: "2026-03-01",
        status: "Completado",
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useTimeRecordsQuery({
          pageSize: 30,
          filters: {
            desde: "2026-03-01",
            hasta: "2026-03-01",
            showAnomalies: true,
          },
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data?.pages[0].data).toBeDefined();
    });

    const data = result.current.data?.pages[0].data || [];
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("r-anomaly");
    expect(data[0].status).toBe("AnomaliaManual");
    // El backend se llamo de verdad (y fallo): la cache local es el plan B.
    expect(recorder.countOf("GET", "/api/records")).toBeGreaterThan(0);
  });

  it("does not repopulate stale cached rows when backend returns empty for a manual status filter", async () => {
    idbGetAllMock.mockResolvedValue([
      {
        id: "r-stale",
        employeeId: "e1",
        employeeName: "Ana",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: "2026-03-01",
        status: "AnomaliaManual",
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useTimeRecordsQuery({
          pageSize: 30,
          filters: {
            desde: "2026-03-01",
            hasta: "2026-03-01",
            status: "AnomaliaManual",
          },
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data?.pages[0].data).toBeDefined();
    });

    const data = result.current.data?.pages[0].data || [];
    expect(data).toHaveLength(0);
    // El backend respondio vacio: una sola peticion, sin reintentos.
    expect(recorder.countOf("GET", "/api/records")).toBe(1);
  });
});

describe("useTimeRecordMutations punch error toast (spec 030 / spec 035 T4)", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  let punchBodies: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    punchBodies = [];
    server.use(
      http.post(`${TEST_API_URL}/records/punch`, async ({ request }) => {
        punchBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ message: "backend dice no" }, { status: 400 });
      }),
    );
  });

  it("toasts on punch failure by default (time-control path)", async () => {
    const { result } = renderHook(() => useTimeRecordMutations(), { wrapper });

    await act(async () => {
      await expect(
        result.current.punchMutation.mutateAsync({ employeeId: "e1" }),
      ).rejects.toThrow();
    });

    expect(addToastMock).toHaveBeenCalledWith("backend dice no", "error");
  });

  it("skips the toast when the caller handles the error itself", async () => {
    const { result } = renderHook(() => useTimeRecordMutations(), { wrapper });

    await act(async () => {
      await expect(
        result.current.punchMutation.mutateAsync({
          employeeId: "e1",
          suppressErrorToast: true,
        }),
      ).rejects.toThrow();
    });

    expect(addToastMock).not.toHaveBeenCalled();
    // El cuerpo sale al backend con el contrato real del endpoint.
    expect(punchBodies).toHaveLength(1);
    expect(punchBodies[0]).toMatchObject({ employeeId: "e1", source: "WEB" });
  });
});
