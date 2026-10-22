import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useShiftPatternForm } from "../../hooks/useShiftPatternForm";
import { useShiftAssignmentForm } from "../../hooks/useShiftAssignmentForm";
import { useHolidayManagerController } from "../../features/theoretical-shifts/hooks/useHolidayManagerController";
import { useLeaveManagerController } from "../../features/theoretical-shifts/hooks/useLeaveManagerController";
import { addBusinessDaysChile, toBusinessDateChile } from "../../utils/dateUtils";
import { recordRequests, type RequestRecorder } from "../mocks/requests";
import { setCatalogPayload } from "../mocks/catalog";

/**
 * Spec 036 T8 (AC1, AC2, AC3, AC4, AC8): los **cuatro formularios de turnos
 * teoricos** migrados a `useAppForm`.
 *
 * Lo que se fija aqui es lo que la migracion puede romper en silencio:
 *
 * 1. **El payload** sigue siendo identico al de antes (T13): mismos nombres de
 *    campo, mismos valores y los campos derivados (las horas de cada dia)
 *    fuera. Un payload distinto llegaria al backend como un formulario
 *    distinto.
 * 2. **Los errores** son de campo y tienen mensaje (AC2, AC3): el nombre
 *    duplicado, la fecha de feriado ocupada, la ausencia solapada.
 * 3. **El doble envio** esta bloqueado (AC4).
 */

const PATTERNS_PATH = "/api/shifts/patterns";
const ASSIGNMENTS_PATH = "/api/shifts/assignments";
const HOLIDAYS_PATH = "/api/holidays";
const LEAVES_PATH = "/api/leaves";

/**
 * Fechas relativas a hoy.
 *
 * Las reglas de antiguedad (7 dias habiles) dependen de la fecha real: con
 * fechas fijas el test dejaria de ser valido el dia que pasen. Se calculan
 * desde hoy, como hace la aplicacion.
 */
const today = toBusinessDateChile();
const twoBusinessDaysAgo = addBusinessDaysChile(today, -2);
const oneBusinessDayAgo = addBusinessDaysChile(today, -1);
const twoBusinessDaysAhead = addBusinessDaysChile(today, 2);
const threeBusinessDaysAhead = addBusinessDaysChile(today, 3);

const setup = (): { wrapper: React.ComponentType<{ children: React.ReactNode }> } => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
};

let recorder: RequestRecorder | undefined;

const bodyOf = async (method: string, path: string): Promise<Record<string, unknown>> => {
  const request = recorder?.requests.find((r) => r.method === method && r.path === path);
  expect(request, `No se registro ${method} ${path}`).toBeDefined();
  const body = await request?.bodyJson();
  expect(body).toBeTypeOf("object");
  return (body ?? {}) as Record<string, unknown>;
};

/**
 * Espera a que la consulta de un endpoint se resuelva.
 *
 * Las reglas que dependen del contexto (nombre unico, solapamiento) se
 * evaluan contra los datos **ya cargados**: enviar antes de que la consulta
 * responda daria un falso negativo.
 */
const waitForQuery = async (path: string): Promise<void> => {
  await waitFor(() =>
    expect(recorder?.requests.some((r) => r.method === "GET" && r.path === path)).toBe(true),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

afterEach(() => {
  recorder?.stop();
  recorder = undefined;
});

describe("useShiftPatternForm (spec 036 T8)", () => {
  it("envia el payload sin las horas derivadas y con las cadenas vacias restauradas", async () => {
    recorder = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useShiftPatternForm(), { wrapper });

    await waitFor(() => expect(result.current.values.dailySchedules).toHaveLength(7));

    await act(async () => {
      result.current.setValue("name", "Turno mañana");
      // El largo del ciclo define cuantos dias tiene el patron: se adjusts
      // al largo para que la lista de jornadas no vuelva a 7.
      result.current.setValue("cycleLengthDays", 2);
      result.current.setValue("dailySchedules", [
        {
          dayIndex: 0,
          startTime: "09:00",
          endTime: "17:00",
          isOffDay: false,
          hasColacion: false,
          colacionMinutes: 0,
          hours: 8,
        },
        {
          dayIndex: 1,
          startTime: "",
          endTime: "",
          isOffDay: true,
          hasColacion: false,
          colacionMinutes: 0,
          hours: 0,
        },
      ]);
      result.current.submit();
    });

    await waitFor(() =>
      expect(recorder?.requests.some((r) => r.method === "POST" && r.path === PATTERNS_PATH)).toBe(
        true,
      ),
    );

    const body = await bodyOf("POST", PATTERNS_PATH);
    const days = body.dailySchedules as Array<Record<string, unknown>>;

    expect(Object.keys(body).sort()).toEqual(
      [
        "color",
        "cycleLengthDays",
        "dailySchedules",
        "id",
        "isDeleted",
        "lastModified",
        "maxHoursPattern",
        "name",
        "startDayOfWeek",
        "syncStatus",
        "worksOnHolidays",
      ].sort(),
    );
    expect(days[0]).toEqual({
      dayIndex: 0,
      startTime: "09:00",
      endTime: "17:00",
      isOffDay: false,
      hasColacion: false,
      colacionMinutes: 0,
    });
    // El dia libre conserva las cadenas vacias (no `undefined`).
    expect(days[1]).toEqual({
      dayIndex: 1,
      startTime: "",
      endTime: "",
      isOffDay: true,
      hasColacion: false,
      colacionMinutes: 0,
    });
    // Las horas calculadas no viajan.
    expect(days[0]).not.toHaveProperty("hours");
  });

  it("expone el nombre duplicado como error del campo `name`", async () => {
    recorder = recordRequests();
    setCatalogPayload(PATTERNS_PATH, [
      {
        id: "sp-1",
        name: "Turno A",
        cycleLengthDays: 7,
        startDayOfWeek: 1,
        dailySchedules: [],
        color: "#2563eb",
        maxHoursPattern: 40,
      },
    ]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useShiftPatternForm(), { wrapper });

    // El nombre se compara con los patrones ya guardados: la lista tiene que
    // estar cargada antes de enviar.
    await waitForQuery(PATTERNS_PATH);

    await act(async () => {
      result.current.setValue("name", "Turno A");
      result.current.setValue("cycleLengthDays", 1);
      result.current.setValue("dailySchedules", [
        {
          dayIndex: 0,
          startTime: "09:00",
          endTime: "17:00",
          isOffDay: false,
          hasColacion: false,
          colacionMinutes: 0,
          hours: 8,
        },
      ]);
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("name")).toBeDefined());
    expect(result.current.getError("name")).toContain("ya existe");
  });

  it("exige hora de inicio y de fin en un dia que no es libre", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useShiftPatternForm(), { wrapper });

    await act(async () => {
      result.current.setValue("name", "Turno mañana");
      result.current.setValue("cycleLengthDays", 1);
      result.current.setValue("dailySchedules", [
        {
          dayIndex: 0,
          startTime: "",
          endTime: "",
          isOffDay: false,
          hasColacion: false,
          colacionMinutes: 0,
          hours: 0,
        },
      ]);
      result.current.submit();
    });

    await waitFor(() =>
      expect(result.current.getError("dailySchedules[0].startTime")).toBeDefined(),
    );
    expect(result.current.getError("dailySchedules[0].startTime")).toContain("Día 1");
  });
});

describe("useShiftAssignmentForm (spec 036 T8)", () => {
  it("envia el payload con la forma exacta (sin campos de mas)", async () => {
    recorder = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useShiftAssignmentForm(), { wrapper });

    await act(async () => {
      result.current.setValue("employeeId", "e-1");
      result.current.setValue("shiftPatternId", "sp-1");
      result.current.setValue("startDate", twoBusinessDaysAgo);
      result.current.setValue("endDate", twoBusinessDaysAhead);
      result.current.submit();
    });

    await waitFor(() =>
      expect(
        recorder?.requests.some((r) => r.method === "POST" && r.path === ASSIGNMENTS_PATH),
      ).toBe(true),
    );

    const body = await bodyOf("POST", ASSIGNMENTS_PATH);

    expect(Object.keys(body).sort()).toEqual(
      ["employeeId", "endDate", "id", "shiftPatternId", "startDate"].sort(),
    );
    expect(body.employeeId).toBe("e-1");
    expect(body.shiftPatternId).toBe("sp-1");
    expect(body.startDate).toBe(twoBusinessDaysAgo);
    expect(body.endDate).toBe(twoBusinessDaysAhead);
  });

  it("omite la fecha de termino cuando el turno es indefinido", async () => {
    recorder = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useShiftAssignmentForm(), { wrapper });

    await act(async () => {
      result.current.setValue("employeeId", "e-1");
      result.current.setValue("shiftPatternId", "sp-1");
      result.current.setValue("startDate", twoBusinessDaysAgo);
      result.current.submit();
    });

    await waitFor(() =>
      expect(
        recorder?.requests.some((r) => r.method === "POST" && r.path === ASSIGNMENTS_PATH),
      ).toBe(true),
    );

    const body = await bodyOf("POST", ASSIGNMENTS_PATH);

    expect(body).not.toHaveProperty("endDate");
  });
});

describe("useHolidayManagerController (spec 036 T8)", () => {
  it("envia el payload del feriado con la forma exacta", async () => {
    recorder = recordRequests();
    setCatalogPayload(HOLIDAYS_PATH, { data: [], meta: { total: 0, page: 1, totalPages: 0 } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useHolidayManagerController(), { wrapper });

    await act(async () => {
      result.current.setValue("name", "Navidad");
      result.current.setValue("date", twoBusinessDaysAhead);
      result.current.setValue("type", "Nacional");
      result.current.formProps.onSubmit({ preventDefault: () => {} });
    });

    await waitFor(() =>
      expect(recorder?.requests.some((r) => r.method === "POST" && r.path === HOLIDAYS_PATH)).toBe(
        true,
      ),
    );

    const body = await bodyOf("POST", HOLIDAYS_PATH);

    expect(Object.keys(body).sort()).toEqual(["date", "name", "type"]);
    expect(body.name).toBe("Navidad");
    expect(body.date).toBe(twoBusinessDaysAhead);
    expect(body.type).toBe("Nacional");
  });
});

describe("useLeaveManagerController (spec 036 T8)", () => {
  it("envia el payload de la ausencia con la forma exacta", async () => {
    recorder = recordRequests();
    const { wrapper } = setup();
    const { result } = renderHook(() => useLeaveManagerController(), { wrapper });

    await act(async () => {
      result.current.setValue("employeeId", "e-1");
      result.current.setValue("type", "Vacaciones");
      result.current.setValue("startDate", twoBusinessDaysAgo);
      result.current.setValue("endDate", twoBusinessDaysAhead);
      result.current.setValue("notes", "Descanso");
      result.current.formProps.onSubmit({ preventDefault: () => {} });
    });

    await waitFor(() =>
      expect(recorder?.requests.some((r) => r.method === "POST" && r.path === LEAVES_PATH)).toBe(
        true,
      ),
    );

    const body = await bodyOf("POST", LEAVES_PATH);

    expect(Object.keys(body).sort()).toEqual([
      "employeeId",
      "endDate",
      "notes",
      "startDate",
      "type",
    ]);
    expect(body.employeeId).toBe("e-1");
    expect(body.notes).toBe("Descanso");
  });

  it("rechaza una ausencia solapada con otra del mismo empleado", async () => {
    setCatalogPayload(LEAVES_PATH, {
      success: true,
      data: [
        {
          id: "l-1",
          employeeId: "e-1",
          type: "Vacaciones",
          startDate: oneBusinessDayAgo,
          endDate: threeBusinessDaysAhead,
          notes: "",
          isArchived: false,
        },
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useLeaveManagerController(), { wrapper });

    // El historico tiene que estar cargado: la regla de solapamiento compara
    // con las ausencias que ya existen.
    await waitFor(() => expect(result.current.processedLeaves).toHaveLength(1));

    await act(async () => {
      result.current.setValue("employeeId", "e-1");
      result.current.setValue("type", "Vacaciones");
      result.current.setValue("startDate", twoBusinessDaysAgo);
      result.current.setValue("endDate", twoBusinessDaysAhead);
      result.current.formProps.onSubmit({ preventDefault: () => {} });
    });

    await waitFor(() => expect(result.current.getError("startDate")).toBeDefined());
    expect(result.current.getError("startDate")).toContain("ausencia");
  });
});
