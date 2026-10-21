import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { useStore } from "../../store/useStore";
import { authTokenStore } from "../../services/authToken";
import { setCatalogPayload } from "../mocks/catalog";
import { recordRequests, type RequestRecorder } from "../mocks/requests";
import type { User } from "../../types";

import { useAuditLogMutations } from "../../hooks/useAuditLogMutations";
import { useConfigMutations } from "../../hooks/useConfigMutations";
import { useCorrectionRequestMutations } from "../../hooks/useCorrectionRequestMutations";
import { useHolidayMutations } from "../../hooks/useHolidayMutations";
import { useLeaveMutations } from "../../hooks/useLeaveMutations";
import { useMeterMutations } from "../../hooks/useMeterMutations";
import { useNoteMutations } from "../../hooks/useNoteMutations";
import { useReportMutations } from "../../hooks/useReportMutations";
import { useShiftMutations } from "../../hooks/useShiftMutations";

import { useAuditLogsInfinite } from "../../hooks/queries/useAuditLogsInfinite";
import { useBrandLogoQuery, useConfigQuery } from "../../hooks/queries/useConfigQuery";
import { useCalendarMatrixQuery } from "../../hooks/queries/useCalendarMatrixQuery";
import { useCorrectionRequestsQuery } from "../../hooks/queries/useCorrectionRequestsQuery";
import { useHolidaysQuery } from "../../hooks/queries/useHolidaysQuery";
import { useIntegrityStatus } from "../../hooks/queries/useIntegrityStatus";
import { useLeavesQuery } from "../../hooks/queries/useLeavesQuery";
import {
  useMeterConfigsQuery,
  useMeterReadingsQuery,
} from "../../hooks/queries/useMeterReadingsQuery";
import { useNotesQuery } from "../../hooks/queries/useNotesQuery";
import { useAssignedShiftsQuery } from "../../hooks/queries/useAssignedShiftsQuery";
import { useReportsQuery } from "../../hooks/queries/useReportsQuery";
import { useShiftPatternsQuery } from "../../hooks/queries/useShiftPatternsQuery";

/**
 * Contrato de invalidacion de las mutaciones (spec 035, T5, AC2).
 *
 * El patron es el del bug P0 de la spec 034: **montar un `QueryClient` real →
 * sembrar la query → ejecutar la mutacion → verificar el re-fetch → verificar
 * el dato nuevo**.
 *
 * Antes, la invalidacion de la bitacora apuntaba a `["reports"]` mientras la
 * query vivia en `["shiftReports"]`: la invalidacion no alcanzaba a la query
 * y el modal de reportes cerrados mostraba datos stale. Este test es la red
 * que prevents que algo asi vuelva: para **cada** mutacion que declara
 * `invalidateQueries`, se comprueba que la query que lee ese recurso se
 * vuelve a pedir y trae el dato nuevo.
 *
 * La mutacion y la lectura hablan con el backend por MSW (spec 035, T4): lo
 * que se verifica es el camino real (service -> cliente HTTP -> backend).
 */

type Wrapper = React.ComponentType<{ children: React.ReactNode }>;

/** Recurso cuya query se invalida. */
interface ResourceSpec {
  /** Nombre del recurso (etiqueta del test). */
  name: string;
  /** Pathname del endpoint que sirve la query (clave del catalogo). */
  path: string;
  /** Verbo del endpoint. */
  method: "GET" | "POST";
  /** Hook lector real: deja la query **activa** (con observador). */
  useReader: () => { data?: unknown };
  /** Payload crudo que devuelve el endpoint en la primera lectura. */
  oldPayload: unknown;
  /** Payload crudo que devuelve el endpoint tras la mutacion. */
  newPayload: unknown;
  /** Verifica el dato que el lector tiene tras el re-fetch. */
  expectNew: (data: unknown) => void;
}

/** Mutacion que dispara la invalidacion. */
interface MutationSpec {
  /** Nombre de la mutacion (etiqueta del test). */
  name: string;
  /** Peticion HTTP que la mutacion debe hacer. */
  request: { method: string; path: string };
  /** Ejecuta la mutacion con el `QueryClient` compartido. */
  run: (ctx: { wrapper: Wrapper }) => Promise<unknown>;
}

/** Caso = mutacion + recurso cuya query debe quedar invalidada. */
interface InvalidationCase extends MutationSpec {
  /** Recurso objetivo. */
  resource: string;
}

/* -------------------------------------------------------------------------- */
/* Recursos                                                                    */
/* -------------------------------------------------------------------------- */

const pageMeta = { total: 1, page: 1, pageSize: 30, totalPages: 1 };

const RESOURCES: ResourceSpec[] = [
  {
    name: "auditLogs",
    path: "/api/audit-logs",
    method: "GET",
    useReader: () => useAuditLogsInfinite({ pageSize: 20, filters: {} }),
    oldPayload: { success: true, data: [], pagination: { total: 0, page: 1, totalPages: 1 } },
    newPayload: {
      success: true,
      data: [{ id: "log-nuevo" }],
      pagination: { total: 1, page: 1, totalPages: 1 },
    },
    expectNew: (data) => {
      const pages = (data as { pages?: Array<{ data?: unknown[] }> })?.pages ?? [];
      expect(pages[0]?.data).toEqual([{ id: "log-nuevo" }]);
    },
  },
  {
    name: "integrityStatus",
    path: "/api/audit-logs/integrity-status",
    method: "GET",
    useReader: () => useIntegrityStatus(),
    oldPayload: { status: "ok" },
    newPayload: { status: "degraded" },
    expectNew: (data) => {
      expect(data).toMatchObject({ status: "degraded" });
    },
  },
  {
    name: "config",
    path: "/api/configs/global_max_hours",
    method: "GET",
    useReader: () => useConfigQuery<string>("global_max_hours"),
    oldPayload: 40,
    newPayload: 48,
    expectNew: (data) => {
      expect(data).toBe(48);
    },
  },
  {
    name: "configPublic",
    path: "/api/configs/public/brand-logo",
    method: "GET",
    useReader: () => useBrandLogoQuery(),
    oldPayload: null,
    newPayload: { source: "default", url: "/logo.png" },
    expectNew: (data) => {
      expect(data).toMatchObject({ source: "default" });
    },
  },
  {
    name: "correctionRequests",
    path: "/api/corrections",
    method: "GET",
    useReader: () => useCorrectionRequestsQuery(),
    oldPayload: { requests: [], total: 0 },
    newPayload: { requests: [{ id: "c-nuevo", status: "pending" }], total: 1 },
    expectNew: (data) => {
      const pages = (data as { pages?: Array<{ requests?: unknown[] }> })?.pages ?? [];
      expect(pages[0]?.requests).toHaveLength(1);
    },
  },
  {
    name: "holidays",
    path: "/api/holidays",
    method: "GET",
    useReader: () => useHolidaysQuery(),
    oldPayload: [],
    newPayload: [{ id: "h-nuevo", name: "Feriado", date: "2026-03-01", type: "Nacional" }],
    expectNew: (data) => {
      expect(data).toEqual([
        { id: "h-nuevo", name: "Feriado", date: "2026-03-01", type: "Nacional" },
      ]);
    },
  },
  {
    name: "calendarMatrix",
    path: "/api/shifts/schedule/matrix",
    method: "POST",
    useReader: () => useCalendarMatrixQuery("2026-03-01", "2026-03-31"),
    oldPayload: {},
    newPayload: { "2026-03-02": { employeeId: "e-1" } },
    expectNew: (data) => {
      expect(data).toEqual({ "2026-03-02": { employeeId: "e-1" } });
    },
  },
  {
    name: "leaves",
    path: "/api/leaves",
    method: "GET",
    useReader: () => useLeavesQuery(),
    oldPayload: { success: true, data: [], meta: { ...pageMeta, total: 0 } },
    newPayload: { success: true, data: [{ id: "l-nuevo" }], meta: pageMeta },
    expectNew: (data) => {
      expect((data as { data?: unknown[] })?.data).toHaveLength(1);
    },
  },
  {
    name: "meterReadings",
    path: "/api/meters",
    method: "GET",
    useReader: () => useMeterReadingsQuery(),
    oldPayload: { success: true, data: [] },
    newPayload: { success: true, data: [{ id: "m-nuevo", timestamp: 1 }] },
    expectNew: (data) => {
      expect(data).toHaveLength(1);
    },
  },
  {
    name: "meterConfigs",
    path: "/api/configs/meter_configs",
    method: "GET",
    useReader: () => useMeterConfigsQuery(),
    oldPayload: [],
    newPayload: [{ id: "mc-nuevo" }],
    expectNew: (data) => {
      expect(data).toHaveLength(1);
    },
  },
  {
    name: "notes",
    path: "/api/notes",
    method: "GET",
    useReader: () => useNotesQuery(),
    oldPayload: { success: true, data: [] },
    newPayload: { success: true, data: [{ id: "n-nuevo", content: "Nota nueva" }] },
    expectNew: (data) => {
      expect(data).toHaveLength(1);
    },
  },
  {
    name: "shiftReports",
    path: "/api/shift-reports",
    method: "GET",
    useReader: () => useReportsQuery({ status: "closed" }),
    oldPayload: { data: [], total: 0, page: 1, totalPages: 1 },
    newPayload: { data: [{ id: "sr-nuevo" }], total: 1, page: 1, totalPages: 1 },
    expectNew: (data) => {
      expect(data).toHaveLength(1);
    },
  },
  {
    name: "shiftPatterns",
    path: "/api/shifts/patterns",
    method: "GET",
    useReader: () => useShiftPatternsQuery(),
    oldPayload: [],
    newPayload: [{ id: "sp-nuevo", name: "Turno A" }],
    expectNew: (data) => {
      expect(data).toHaveLength(1);
    },
  },
  {
    name: "assignedShifts",
    path: "/api/shifts/assignments",
    method: "GET",
    useReader: () => useAssignedShiftsQuery(),
    oldPayload: { data: [], meta: { ...pageMeta, total: 0 } },
    newPayload: { data: [{ id: "as-nuevo" }], meta: pageMeta },
    expectNew: (data) => {
      expect(data).toHaveLength(1);
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Mutaciones                                                                  */
/* -------------------------------------------------------------------------- */

const MUTATIONS: MutationSpec[] = [
  {
    name: "verifyIntegrity",
    request: { method: "GET", path: "/api/audit-logs/verify-integrity" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useAuditLogMutations(), { wrapper });
      await act(async () => {
        await result.current.verifyIntegrity.mutateAsync();
      });
    },
  },
  {
    name: "cleanupLogs",
    request: { method: "POST", path: "/api/audit-logs/cleanup" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useAuditLogMutations(), { wrapper });
      await act(async () => {
        await result.current.cleanupLogs.mutateAsync(6);
      });
    },
  },
  {
    name: "updateConfig",
    request: { method: "POST", path: "/api/configs/global_max_hours" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useConfigMutations(), { wrapper });
      await act(async () => {
        await result.current.updateConfig({ key: "global_max_hours", value: 48 });
      });
    },
  },
  {
    name: "updateConfigBrandLogo",
    request: { method: "POST", path: "/api/configs/branding_logo" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useConfigMutations(), { wrapper });
      await act(async () => {
        await result.current.updateConfig({ key: "branding_logo", value: "logo.png" });
      });
    },
  },
  {
    name: "addCorrectionRequest",
    request: { method: "POST", path: "/api/corrections" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useCorrectionRequestMutations(), { wrapper });
      await act(async () => {
        await result.current.addCorrectionRequest({
          employeeId: "e-1",
          timeRecordId: "r-1",
          recordField: "entrada",
          originalValue: "08:00",
          requestedValue: "08:30",
          reason: "Prueba",
        } as never);
      });
    },
  },
  {
    name: "updateRequestStatus",
    request: { method: "PATCH", path: "/api/corrections/c-1/status" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useCorrectionRequestMutations(), { wrapper });
      await act(async () => {
        await result.current.updateRequestStatus({
          id: "c-1",
          status: "approved",
          resolvedBy: "tester",
        });
      });
    },
  },
  {
    name: "createHoliday",
    request: { method: "POST", path: "/api/holidays" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useHolidayMutations(), { wrapper });
      await act(async () => {
        await result.current.createHoliday({
          name: "Feriado",
          date: "2026-03-01",
          type: "Nacional",
        });
      });
    },
  },
  {
    name: "updateHoliday",
    request: { method: "POST", path: "/api/holidays" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useHolidayMutations(), { wrapper });
      await act(async () => {
        await result.current.updateHoliday({
          id: "h-1",
          holiday: { name: "Feriado 2" },
        });
      });
    },
  },
  {
    name: "deleteHoliday",
    request: { method: "DELETE", path: "/api/holidays/h-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useHolidayMutations(), { wrapper });
      await act(async () => {
        await result.current.deleteHoliday("h-1");
      });
    },
  },
  {
    name: "syncHolidays",
    request: { method: "POST", path: "/api/holidays/sync" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useHolidayMutations(), { wrapper });
      await act(async () => {
        await result.current.syncHolidays();
      });
    },
  },
  {
    name: "createBulkHolidays",
    request: { method: "POST", path: "/api/holidays/bulk" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useHolidayMutations(), { wrapper });
      await act(async () => {
        await result.current.createBulkHolidays([
          { name: "Feriado", date: "2026-03-01", type: "Nacional" },
        ] as never);
      });
    },
  },
  {
    name: "createLeave",
    request: { method: "POST", path: "/api/leaves" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useLeaveMutations(), { wrapper });
      await act(async () => {
        await result.current.createLeave({
          employeeId: "e-1",
          type: "Permiso",
          startDate: "2026-03-01",
          endDate: "2026-03-02",
        } as never);
      });
    },
  },
  {
    name: "deleteLeave",
    request: { method: "DELETE", path: "/api/leaves/l-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useLeaveMutations(), { wrapper });
      await act(async () => {
        await result.current.deleteLeave("l-1");
      });
    },
  },
  {
    name: "addReading",
    request: { method: "POST", path: "/api/meters/bulk" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useMeterMutations(), { wrapper });
      await act(async () => {
        await result.current.addReading([{ meterId: "m-1", value: 10 }] as never);
      });
    },
  },
  {
    name: "createNote",
    request: { method: "POST", path: "/api/notes" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useNoteMutations(), { wrapper });
      await act(async () => {
        await result.current.createNote({
          id: "n-1",
          content: "Nota",
          authorUsername: "tester",
          isArchived: false,
          color: "amber",
          reminderEnabled: false,
          createdAt: 0,
          lastModified: 0,
          syncStatus: "synced",
          isDeleted: false,
        });
      });
    },
  },
  {
    name: "archiveNote",
    request: { method: "PUT", path: "/api/notes/n-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useNoteMutations(), { wrapper });
      await act(async () => {
        await result.current.archiveNote("n-1");
      });
    },
  },
  {
    name: "deleteNote",
    request: { method: "DELETE", path: "/api/notes/n-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useNoteMutations(), { wrapper });
      await act(async () => {
        await result.current.deleteNote("n-1");
      });
    },
  },
  {
    name: "addReport",
    request: { method: "POST", path: "/api/shift-reports" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useReportMutations(), { wrapper });
      await act(async () => {
        await result.current.addReport({
          id: "sr-1",
          folio: "F-001",
          date: "2026-03-01",
          shiftName: "Turno A",
          responsibleUser: "tester",
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
      });
    },
  },
  {
    name: "updateReport",
    request: { method: "PATCH", path: "/api/shift-reports/sr-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useReportMutations(), { wrapper });
      await act(async () => {
        await result.current.updateReport({
          id: "sr-1",
          folio: "F-001",
          date: "2026-03-01",
          shiftName: "Turno A",
          responsibleUser: "tester",
          startTime: "08:00",
          status: "closed",
          logEntries: [],
          supplierEntries: [],
          reportCreatedAt: "2026-03-01T08:00:00.000Z",
          updatedAt: "2026-03-01T08:00:00.000Z",
          lastModified: "2026-03-01T08:00:00.000Z",
          syncStatus: "synced",
          isDeleted: false,
        });
      });
    },
  },
  {
    name: "deleteReport",
    request: { method: "DELETE", path: "/api/shift-reports/sr-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useReportMutations(), { wrapper });
      await act(async () => {
        await result.current.deleteReport("sr-1");
      });
    },
  },
  {
    name: "createPattern",
    request: { method: "POST", path: "/api/shifts/patterns" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useShiftMutations(), { wrapper });
      await act(async () => {
        await result.current.createPattern({ id: "sp-1", name: "Turno A" } as never);
      });
    },
  },
  {
    name: "updatePattern",
    request: { method: "PUT", path: "/api/shifts/patterns/sp-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useShiftMutations(), { wrapper });
      await act(async () => {
        await result.current.updatePattern({ id: "sp-1", name: "Turno B" } as never);
      });
    },
  },
  {
    name: "deletePattern",
    request: { method: "DELETE", path: "/api/shifts/patterns/sp-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useShiftMutations(), { wrapper });
      await act(async () => {
        await result.current.deletePattern("sp-1");
      });
    },
  },
  {
    name: "assignShift",
    request: { method: "POST", path: "/api/shifts/assignments" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useShiftMutations(), { wrapper });
      await act(async () => {
        await result.current.assignShift({ id: "as-1", date: "2026-03-01" } as never);
      });
    },
  },
  {
    name: "updateAssignment",
    request: { method: "PUT", path: "/api/shifts/assignments/as-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useShiftMutations(), { wrapper });
      await act(async () => {
        await result.current.updateAssignment({
          id: "as-1",
          assignment: { id: "as-1", date: "2026-03-02" } as never,
        });
      });
    },
  },
  {
    name: "deleteAssignment",
    request: { method: "DELETE", path: "/api/shifts/assignments/as-1" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useShiftMutations(), { wrapper });
      await act(async () => {
        await result.current.deleteAssignment("as-1");
      });
    },
  },
  {
    name: "createMonthlyPlan",
    request: { method: "POST", path: "/api/shifts/monthly-plan" },
    run: async ({ wrapper }) => {
      const { result } = renderHook(() => useShiftMutations(), { wrapper });
      await act(async () => {
        await result.current.createMonthlyPlan({ year: 2026, month: 3 });
      });
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Casos: cada mutacion, contra cada query que debe invalidar                   */
/* -------------------------------------------------------------------------- */

/** Que query debe invalidar cada mutacion (declarado en el hook). */
const INVALIDATION_TARGETS: Record<string, string[]> = {
  verifyIntegrity: ["integrityStatus", "auditLogs"],
  cleanupLogs: ["auditLogs"],
  updateConfig: ["config"],
  updateConfigBrandLogo: ["configPublic"],
  addCorrectionRequest: ["correctionRequests"],
  updateRequestStatus: ["correctionRequests"],
  createHoliday: ["holidays", "calendarMatrix"],
  updateHoliday: ["holidays", "calendarMatrix"],
  deleteHoliday: ["holidays", "calendarMatrix"],
  syncHolidays: ["holidays", "calendarMatrix"],
  createBulkHolidays: ["holidays", "calendarMatrix"],
  createLeave: ["leaves", "calendarMatrix"],
  deleteLeave: ["leaves", "calendarMatrix"],
  addReading: ["meterReadings", "meterConfigs"],
  createNote: ["notes"],
  archiveNote: ["notes"],
  deleteNote: ["notes"],
  addReport: ["shiftReports"],
  updateReport: ["shiftReports"],
  deleteReport: ["shiftReports"],
  createPattern: ["shiftPatterns"],
  updatePattern: ["shiftPatterns"],
  deletePattern: ["shiftPatterns", "assignedShifts"],
  assignShift: ["assignedShifts"],
  updateAssignment: ["assignedShifts"],
  deleteAssignment: ["assignedShifts"],
  createMonthlyPlan: ["assignedShifts", "shiftPatterns", "calendarMatrix"],
};

const CASES: InvalidationCase[] = MUTATIONS.flatMap((mutation) =>
  (INVALIDATION_TARGETS[mutation.name] ?? []).map((resource) => ({
    ...mutation,
    resource,
  })),
);

const RESOURCE_BY_NAME = new Map(RESOURCES.map((resource) => [resource.name, resource]));

/* -------------------------------------------------------------------------- */
/* Test                                                                         */
/* -------------------------------------------------------------------------- */

describe("Invalidacion de queries tras mutacion (spec 035 T5, AC2)", () => {
  let recorder: RequestRecorder;

  beforeEach(() => {
    // Los hooks lectores que dependen de la sesion: sin usuario y sin token
    // la query queda **deshabilitada** y no habria re-fetch que verificar.
    useStore.setState({
      currentUser: { id: "u-1", username: "tester", role: "Administrador" } as unknown as User,
      isAuthenticated: true,
    });
    authTokenStore.setToken("token-de-prueba");
    recorder = recordRequests();
  });

  afterEach(() => {
    recorder.stop();
    useStore.setState({ currentUser: null, isAuthenticated: false });
    authTokenStore.removeToken();
  });

  it.each(CASES)(
    "$name invalida la query de $resource (re-fetch + dato nuevo)",
    async (testCase) => {
      const resource = RESOURCE_BY_NAME.get(testCase.resource);
      if (!resource) throw new Error(`Recurso desconocido: ${testCase.resource}`);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // 1. Sembrar: el endpoint devuelve el dato viejo.
      setCatalogPayload(resource.path, resource.oldPayload);

      // 2. Montar el lector: la query queda activa (con observador).
      const reader = renderHook(resource.useReader, { wrapper });
      await waitFor(() => expect(reader.result.current.data).toBeDefined());

      // 3. El backend pasa a devolver el dato nuevo.
      setCatalogPayload(resource.path, resource.newPayload);

      // 4. Ejecutar la mutacion.
      await testCase.run({ wrapper });

      // 5. La mutacion salio con el verbo y el path correctos.
      expect(recorder.countOf(testCase.request.method, testCase.request.path)).toBe(1);

      // 6. La query se **volvio a pedir** (re-fetch) y trae el dato nuevo.
      await waitFor(() => {
        expect(recorder.countOf(resource.method, resource.path)).toBe(2);
      });
      resource.expectNew(reader.result.current.data);
    },
  );

  it("la tabla de casos cubre todas las mutaciones con invalidacion", () => {
    // Si alguien anade una mutacion con `invalidateQueries` y no la declara
    // aqui, el test lo delata: la lista de mutaciones y la de casos deben
    // seguir en paralelo.
    const declared = new Set(CASES.map((testCase) => testCase.name));
    const all = new Set(MUTATIONS.map((mutation) => mutation.name));
    expect([...all].filter((name) => !declared.has(name))).toEqual([]);
  });
});
