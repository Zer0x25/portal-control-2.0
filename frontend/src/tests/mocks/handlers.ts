import { http, HttpResponse } from "msw";

import { getCatalogPayload } from "./catalog";
import { TEST_API_URL } from "./baseUrl";
import {
  attendanceRecordFixture,
  kpiDetailsFixture,
  reportStatKpisFixture,
  shiftReportFixture,
} from "./fixtures";

/**
 * Handlers MSW del backend (spec 035, T1).
 *
 * Cada handler **habla el contrato real**: mismo path, mismo verbo y misma
 * forma de body que el backend documentado en `backend/docs/swagger.json`.
 * El contrato se verifica solo con `src/tests/contracts/swagger-alignment.test.ts`.
 *
 * Los cuerpos reproducen la **respuesta real del runtime** del backend (la
 * que el frontend consume). Cuando el `swagger.json` y el runtime discrepan,
 * la discrepancia queda **documentada** en `MockRouteContract.divergence` con
 * la cita `file:line` de la ruta que manda (ver el contrato de swagger).
 */

/**
 * Rutas segun el contrato OpenAPI (`backend/docs/swagger.json`).
 *
 * Se declaran aqui (y no dentro de cada handler) para que el test de
 * contrato pueda compararlas con el swagger y detectar una ruta inventada.
 */
export const ROUTES = {
  timeRecords: "/api/records",
  kpiSummary: "/api/kpis/summary",

  shiftReports: "/api/shift-reports",
  shiftReportById: "/api/shift-reports/{id}",

  auditLogs: "/api/audit-logs",
  integrityStatus: "/api/audit-logs/integrity-status",
  verifyIntegrity: "/api/audit-logs/verify-integrity",
  auditCleanup: "/api/audit-logs/cleanup",

  config: "/api/configs/{key}",
  publicBrandLogo: "/api/configs/public/brand-logo",

  corrections: "/api/corrections",
  correctionStatus: "/api/corrections/{id}/status",

  holidays: "/api/holidays",
  holidayBulk: "/api/holidays/bulk",
  holidaySync: "/api/holidays/sync",
  holidayById: "/api/holidays/{id}",

  leaves: "/api/leaves",
  leaveById: "/api/leaves/{id}",

  meters: "/api/meters",
  metersBulk: "/api/meters/bulk",

  notes: "/api/notes",
  noteById: "/api/notes/{id}",

  shiftPatterns: "/api/shifts/patterns",
  shiftPatternById: "/api/shifts/patterns/{id}",
  shiftAssignments: "/api/shifts/assignments",
  shiftAssignmentById: "/api/shifts/assignments/{id}",
  monthlyPlan: "/api/shifts/monthly-plan",
  calendarMatrix: "/api/shifts/schedule/matrix",
} as const;

/**
 * URL de MSW a partir de la ruta OpenAPI.
 *
 * `TEST_API_URL` ya termina en `/api`, asi que la ruta OpenAPI `/api/x` se
 * convierte en `/x`; los parametros `{id}` pasan a `:id` (sintaxis de MSW).
 */
export const mockUrl = (openApiPath: string): string =>
  `${TEST_API_URL}${openApiPath.replace(/^\/api/, "").replace(/\{(\w+)\}/g, ":$1")}`;

/* -------------------------------------------------------------------------- */
/* Payloads por defecto (tambien son las muestras del contrato)                */
/* -------------------------------------------------------------------------- */

/** Envoltura paginada estandar del backend (`meta` de la lista). */
const pageMeta = { total: 0, page: 1, pageSize: 30, totalPages: 0 };

/** Cuerpo de ejemplo de `GET /api/records`. */
export const timeRecordsListBody = (): Record<string, unknown> => ({
  data: [attendanceRecordFixture],
  total: 1,
  page: 1,
  totalPages: 1,
});

/** Cuerpo de ejemplo de `POST /api/kpis/summary`. */
export const kpiSummaryBody = (): Record<string, unknown> => ({
  kpis: reportStatKpisFixture,
  kpiDetails: kpiDetailsFixture,
});

/**
 * Cuerpo de ejemplo de `GET /api/shift-reports`.
 *
 * El runtime devuelve `{ data, total, page, totalPages }`
 * (`backend/src/services/ShiftReportService.ts:134-139`), no la envoltura
 * `{ success, data }` del swagger: ver `SHIFT_REPORTS_DIVERGENCE`.
 */
export const shiftReportsListBody = (): Record<string, unknown> => ({
  data: [shiftReportFixture],
  total: 1,
  page: 1,
  totalPages: 1,
});

/** Cuerpo de ejemplo de `GET /api/audit-logs` (runtime: `{ success, data, pagination }`). */
export const auditLogsListBody = (): Record<string, unknown> => ({
  success: true,
  data: [],
  pagination: { total: 0, page: 1, totalPages: 1 },
});

/** Cuerpo de ejemplo de `GET /api/audit-logs/integrity-status`. */
export const integrityStatusBody = (): Record<string, unknown> => ({
  status: "ok",
  lastRunAt: null,
  lastCheckedCount: 0,
  lastBrokenCount: 0,
  bulkModeLastRun: false,
  lastBrokenByReason: { missingHash: 0, hashMismatch: 0, prevHashMismatch: 0 },
  lastBackfillAt: null,
  lastBackfillProcessed: 0,
  lastBackfillErrors: 0,
  bulkAlert: { lastSignature: null, lastAlertAt: null, suppressedCount: 0 },
});

/** Cuerpo de ejemplo de `GET /api/corrections` (runtime: `{ requests, total }`). */
export const correctionsListBody = (): Record<string, unknown> => ({ requests: [], total: 0 });

/** Cuerpo de ejemplo de `GET /api/leaves` (runtime: `{ success, data, meta }`). */
export const leavesListBody = (): Record<string, unknown> => ({
  success: true,
  data: [],
  meta: { ...pageMeta },
});

/** Cuerpo de ejemplo de `GET /api/meters` (runtime: `{ success, data }`). */
export const metersListBody = (): Record<string, unknown> => ({ success: true, data: [] });

/** Cuerpo de ejemplo de `GET /api/notes` (runtime: `{ success, data }`). */
export const notesListBody = (): Record<string, unknown> => ({ success: true, data: [] });

/** Cuerpo de ejemplo de `GET /api/shifts/assignments` (runtime: `{ data, meta }`). */
export const shiftAssignmentsListBody = (): Record<string, unknown> => ({
  data: [],
  meta: { ...pageMeta },
});

/** Nota rapida de ejemplo (cumple el schema OpenAPI de `QuickNote`). */
export const quickNoteFixture = {
  id: "n-1",
  content: "Nota de prueba",
  authorUsername: "tester",
  isArchived: false,
  color: "amber",
  reminderEnabled: false,
  createdAt: "2026-03-01T08:00:00.000Z",
  updatedAt: "2026-03-01T08:00:00.000Z",
  isDeleted: false,
  syncStatus: "synced",
  lastModified: 1772361600000,
};

/** Patron teorico de turno de ejemplo (cumple el schema OpenAPI del patron). */
export const shiftPatternFixture = {
  id: "sp-1",
  name: "Turno A",
  cycleLengthDays: 7,
  startDayOfWeek: 1,
  dailySchedules: [
    { dayIndex: 0, startTime: "08:00", endTime: "17:00", isOffDay: false, hours: 8 },
  ],
  color: "#2563eb",
  maxHoursPattern: 48,
};

/** Asignacion de turno de ejemplo (cumple el schema OpenAPI de la asignacion). */
export const shiftAssignmentFixture = {
  id: "as-1",
  employeeId: "e-1",
  shiftPatternId: "sp-1",
  startDate: "2026-03-01",
  endDate: null,
  isDeleted: false,
  lastModified: 1772361600000,
};

/** Ausencia de ejemplo (cumple el schema OpenAPI de `Leave`). */
export const leaveFixture = {
  id: "l-1",
  employeeId: "e-1",
  type: "Permiso",
  startDate: "2026-03-01",
  endDate: "2026-03-02",
  notes: null,
  createdAt: "2026-03-01T08:00:00.000Z",
  updatedAt: "2026-03-01T08:00:00.000Z",
  isDeleted: false,
  syncStatus: "synced",
  lastModified: 1772361600000,
};

/** Lectura de medidor de ejemplo (cumple el schema OpenAPI de la lectura). */
export const meterReadingFixture = {
  id: "m-1",
  meterConfigId: "mc-1",
  authorUsername: "tester",
  value: 10,
  timestamp: "2026-03-01T08:00:00.000Z",
  isRecharge: false,
  notes: null,
  createdAt: "2026-03-01T08:00:00.000Z",
  isDeleted: false,
  syncStatus: "synced",
  lastModified: 1772361600000,
};

/** Solicitud de correccion de ejemplo (cumple el schema OpenAPI de la solicitud). */
export const correctionRequestFixture = {
  employeeId: "e-1",
  timeRecordId: "r-1",
  recordField: "entrada",
  currentValue: "08:00",
  requestedValue: "08:30",
  reason: "Prueba",
  attachment: null,
};

/** Feriado de ejemplo (cumple el schema OpenAPI de `Holiday`). */
export const holidayFixture = {
  id: "h-1",
  date: "2026-03-01",
  name: "Feriado",
  type: "Nacional",
  isRenounceable: false,
  syncStatus: "synced",
  isDeleted: false,
};

/* -------------------------------------------------------------------------- */
/* Handlers de lectura (el payload lo controla el catalogo)                     */
/* -------------------------------------------------------------------------- */

/**
 * Handler de lectura del catalogo: devuelve el payload fijado para el
 * pathname pedido y, si no hay, el valor por defecto del recurso.
 */
const catalogReader = (openApiPath: string, fallback: unknown) =>
  http.get(mockUrl(openApiPath), ({ request }) => {
    const pathname = new URL(request.url).pathname;
    const payload = getCatalogPayload(pathname);
    return HttpResponse.json(payload === undefined ? fallback : payload);
  });

/** Handler de lectura por POST (la matriz de calendario). */
const catalogPostReader = (openApiPath: string, fallback: unknown) =>
  http.post(mockUrl(openApiPath), ({ request }) => {
    const pathname = new URL(request.url).pathname;
    const payload = getCatalogPayload(pathname);
    return HttpResponse.json(payload === undefined ? fallback : payload);
  });

export const catalogHandlers = [
  // Los handlers **especificos** se registran antes que los genericos: MSW
  // resuelve el primer handler que coincide con la peticion.
  catalogReader(ROUTES.publicBrandLogo, null),
  catalogReader(ROUTES.integrityStatus, integrityStatusBody()),
  catalogReader(ROUTES.auditLogs, auditLogsListBody()),
  catalogReader(ROUTES.corrections, correctionsListBody()),
  catalogReader(ROUTES.holidays, []),
  catalogReader(ROUTES.leaves, leavesListBody()),
  catalogReader(ROUTES.meters, metersListBody()),
  catalogReader(ROUTES.notes, notesListBody()),
  catalogReader(ROUTES.shiftPatterns, []),
  catalogReader(ROUTES.shiftAssignments, shiftAssignmentsListBody()),
  catalogReader(ROUTES.shiftReports, shiftReportsListBody()),

  // Genericos al final.
  catalogReader(ROUTES.config, null),

  // La matriz de calendario se pide por POST.
  catalogPostReader(ROUTES.calendarMatrix, {}),
];

/* -------------------------------------------------------------------------- */
/* Handlers de escritura (respuestas fijas: el test no depende de ellas)       */
/* -------------------------------------------------------------------------- */

export const mutationHandlers = [
  // Auditoria.
  http.get(mockUrl(ROUTES.verifyIntegrity), () =>
    HttpResponse.json({ message: "Auditoria de integridad iniciada", status: "started" }),
  ),
  http.post(mockUrl(ROUTES.auditCleanup), () =>
    HttpResponse.json({ message: "Limpieza completada", removed: 0 }),
  ),

  // Configuracion.
  http.post(mockUrl(ROUTES.config), () => HttpResponse.json({ data: null })),

  // Correcciones.
  http.post(mockUrl(ROUTES.corrections), () => HttpResponse.json(correctionRequestFixture)),
  http.patch(mockUrl(ROUTES.correctionStatus), () =>
    HttpResponse.json({ ...correctionRequestFixture, status: "approved" }),
  ),

  // Feriados.
  http.post(mockUrl(ROUTES.holidays), () => HttpResponse.json(holidayFixture)),
  http.post(mockUrl(ROUTES.holidayBulk), () => HttpResponse.json({ count: 0 })),
  http.post(mockUrl(ROUTES.holidaySync), () =>
    HttpResponse.json({ total: 0, added: 0, skipped: 0 }),
  ),
  http.delete(mockUrl(ROUTES.holidayById), () => new HttpResponse(null, { status: 204 })),

  // Ausencias.
  http.post(mockUrl(ROUTES.leaves), () => HttpResponse.json({ success: true, data: leaveFixture })),
  http.delete(mockUrl(ROUTES.leaveById), () => HttpResponse.json({ success: true })),

  // Medidores.
  http.post(mockUrl(ROUTES.metersBulk), () =>
    HttpResponse.json({ success: true, data: [meterReadingFixture] }),
  ),

  // Notas rapidas.
  http.post(mockUrl(ROUTES.notes), () =>
    HttpResponse.json({ success: true, data: quickNoteFixture }),
  ),
  http.put(mockUrl(ROUTES.noteById), () =>
    HttpResponse.json({ success: true, data: { ...quickNoteFixture, isArchived: true } }),
  ),
  http.delete(mockUrl(ROUTES.noteById), () => HttpResponse.json({ success: true })),

  // Bitacora de turno.
  http.post(mockUrl(ROUTES.shiftReports), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...shiftReportFixture, ...body }, { status: 201 });
  }),
  http.patch(mockUrl(ROUTES.shiftReportById), async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...shiftReportFixture,
      ...body,
      id: String(params.id),
      updatedAt: "2026-03-02T08:00:00.000Z",
    });
  }),
  http.delete(mockUrl(ROUTES.shiftReportById), () => new HttpResponse(null, { status: 204 })),

  // Patrones y asignaciones de turno.
  http.post(mockUrl(ROUTES.shiftPatterns), () => HttpResponse.json(shiftPatternFixture)),
  http.put(mockUrl(ROUTES.shiftPatternById), () => HttpResponse.json(shiftPatternFixture)),
  http.delete(mockUrl(ROUTES.shiftPatternById), () => new HttpResponse(null, { status: 204 })),
  http.post(mockUrl(ROUTES.shiftAssignments), () => HttpResponse.json(shiftAssignmentFixture)),
  http.put(mockUrl(ROUTES.shiftAssignmentById), () => HttpResponse.json(shiftAssignmentFixture)),
  http.delete(mockUrl(ROUTES.shiftAssignmentById), () => new HttpResponse(null, { status: 204 })),
  http.post(mockUrl(ROUTES.monthlyPlan), () => HttpResponse.json({ success: true })),
];

/* -------------------------------------------------------------------------- */
/* Handlers de KPI y marcaciones (payload propio)                              */
/* -------------------------------------------------------------------------- */

export const kpiHandlers = [
  http.post(mockUrl(ROUTES.kpiSummary), async ({ request }) => {
    const body = (await request.json()) as {
      startDate?: string;
      endDate?: string;
      employeeIds?: string[];
    };

    // Sin empleados no hay calculo: el backend responde el agregado vacio.
    if (!body.employeeIds || body.employeeIds.length === 0) {
      return HttpResponse.json({
        kpis: { ...reportStatKpisFixture, tardinessCount: 0, absenceCount: 0 },
        kpiDetails: kpiDetailsFixture,
      });
    }

    return HttpResponse.json(kpiSummaryBody());
  }),
];

export const timeRecordHandlers = [
  http.get(mockUrl(ROUTES.timeRecords), ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    // El filtro por anomalía manual no trae registros en el backend: el test
    // verifica que la cache local no repuebla filas obsoletas.
    const data = status === "AnomaliaManual" ? [] : [attendanceRecordFixture];

    return HttpResponse.json({ data, total: data.length, page: 1, totalPages: 1 });
  }),
];

/* -------------------------------------------------------------------------- */
/* Contrato de los handlers (verificado contra el swagger)                     */
/* -------------------------------------------------------------------------- */

/** Verbos HTTP soportados por los handlers. */
export type MockHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Divergencia entre `backend/docs/swagger.json` y la respuesta real del
 * backend.
 *
 * El swagger se genera desde `backend/src/platform/openapi/operations.ts`,
 * que en algunos listados quedó desfasado respecto a la implementacion. El
 * frontend consume el **runtime**, asi que el mock reproduce el runtime y la
 * discrepancia queda documentada aqui (con la cita de la ruta que manda) en
 * lugar de propagarse como un fallo rojo permanente.
 */
export interface MockRouteDivergence {
  /** Cita `file:line` del backend cuya implementacion manda. */
  source: string;
  /** Que dice el swagger y que dice el runtime. */
  detail: string;
}

/**
 * Contrato declarado de una ruta mockeada.
 *
 * `requestBody` / `responseBody` son los cuerpos de ejemplo que el handler
 * usa: el test de contrato los valida contra los schemas OpenAPI, de modo que
 * un fixture que se desincronice del backend falla el CI.
 */
export interface MockRouteContract {
  method: MockHttpMethod;
  /** Ruta segun el contrato OpenAPI (p. ej. `/api/shift-reports/{id}`). */
  path: string;
  /** Cuerpo de ejemplo que el handler **envia**. */
  requestBody?: unknown;
  /** Cuerpo de ejemplo que el handler **devuelve**. */
  responseBody?: unknown;
  /** Divergencia documentada con el runtime del backend (si la hay). */
  divergence?: MockRouteDivergence;
}

/** Divergencia conocida de `GET /api/shift-reports`. */
export const SHIFT_REPORTS_DIVERGENCE: MockRouteDivergence = {
  source: "backend/src/services/ShiftReportService.ts:134-139",
  detail:
    "El runtime devuelve `{ data, total, page, totalPages }`; el swagger declara `{ success, data }`.",
};

/** Divergencia conocida de `GET /api/configs/{key}`. */
export const CONFIG_VALUE_DIVERGENCE: MockRouteDivergence = {
  source: "backend/src/services/ConfigService.ts:34-61",
  detail:
    "El runtime devuelve el **valor** crudo de la configuracion (o `null`); el swagger declara `ConfigEntry` (`{ key, value, ... }`).",
};

/** Divergencia conocida de `GET /api/configs/public/brand-logo`. */
export const BRAND_LOGO_DIVERGENCE: MockRouteDivergence = {
  source: "backend/src/modules/configs/http/routes.ts:57-62",
  detail:
    "El runtime devuelve el objeto del logo (o `null`) sin envoltura; el swagger declara `{ success, data }`.",
};

/** Divergencia conocida de `GET /api/corrections`. */
export const CORRECTIONS_DIVERGENCE: MockRouteDivergence = {
  source: "backend/src/services/CorrectionService.ts:92-93",
  detail: "El runtime devuelve `{ requests, total }`; el swagger declara `{ success, data }`.",
};

/** Contrato de todas las rutas mockeadas (una entrada por handler). */
export const routeContracts: MockRouteContract[] = [
  {
    method: "GET",
    path: ROUTES.timeRecords,
    responseBody: timeRecordsListBody(),
  },
  {
    method: "POST",
    path: ROUTES.kpiSummary,
    requestBody: {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      employeeIds: ["e-fixture-1"],
    },
    responseBody: kpiSummaryBody(),
  },
  {
    method: "GET",
    path: ROUTES.shiftReports,
    responseBody: shiftReportsListBody(),
    divergence: SHIFT_REPORTS_DIVERGENCE,
  },
  {
    method: "POST",
    path: ROUTES.shiftReports,
    requestBody: shiftReportFixture,
    responseBody: shiftReportFixture,
  },
  {
    method: "PATCH",
    path: ROUTES.shiftReportById,
    requestBody: shiftReportFixture,
    responseBody: shiftReportFixture,
  },
  {
    method: "DELETE",
    path: ROUTES.shiftReportById,
  },
  {
    method: "GET",
    path: ROUTES.auditLogs,
    responseBody: auditLogsListBody(),
  },
  {
    method: "GET",
    path: ROUTES.integrityStatus,
    responseBody: integrityStatusBody(),
  },
  {
    method: "GET",
    path: ROUTES.verifyIntegrity,
    responseBody: { message: "Auditoria de integridad iniciada", status: "started" },
  },
  {
    method: "POST",
    path: ROUTES.auditCleanup,
    responseBody: { message: "Limpieza completada", removed: 0 },
  },
  {
    method: "GET",
    path: ROUTES.config,
    responseBody: null,
    divergence: CONFIG_VALUE_DIVERGENCE,
  },
  {
    method: "POST",
    path: ROUTES.config,
    requestBody: { value: 48 },
    responseBody: { data: null },
  },
  {
    method: "GET",
    path: ROUTES.publicBrandLogo,
    responseBody: null,
    divergence: BRAND_LOGO_DIVERGENCE,
  },
  {
    method: "GET",
    path: ROUTES.corrections,
    responseBody: correctionsListBody(),
    divergence: CORRECTIONS_DIVERGENCE,
  },
  {
    method: "POST",
    path: ROUTES.corrections,
    requestBody: correctionRequestFixture,
    responseBody: correctionRequestFixture,
  },
  {
    method: "PATCH",
    path: ROUTES.correctionStatus,
    requestBody: { status: "approved", resolvedBy: "tester" },
    responseBody: { ...correctionRequestFixture, status: "approved" },
  },
  {
    method: "GET",
    path: ROUTES.holidays,
    responseBody: [],
  },
  {
    method: "POST",
    path: ROUTES.holidays,
    requestBody: holidayFixture,
    responseBody: holidayFixture,
  },
  {
    method: "POST",
    path: ROUTES.holidayBulk,
    requestBody: [holidayFixture],
    responseBody: { count: 0 },
  },
  {
    method: "POST",
    path: ROUTES.holidaySync,
    requestBody: { year: 2026 },
    responseBody: { total: 0, added: 0, skipped: 0 },
  },
  {
    method: "DELETE",
    path: ROUTES.holidayById,
  },
  {
    method: "GET",
    path: ROUTES.leaves,
    responseBody: leavesListBody(),
  },
  {
    method: "POST",
    path: ROUTES.leaves,
    requestBody: leaveFixture,
    responseBody: { success: true, data: leaveFixture },
  },
  {
    method: "DELETE",
    path: ROUTES.leaveById,
    responseBody: { success: true },
  },
  {
    method: "GET",
    path: ROUTES.meters,
    responseBody: metersListBody(),
  },
  {
    method: "POST",
    path: ROUTES.metersBulk,
    requestBody: [meterReadingFixture],
    responseBody: { success: true, data: [meterReadingFixture] },
  },
  {
    method: "GET",
    path: ROUTES.notes,
    responseBody: notesListBody(),
  },
  {
    method: "POST",
    path: ROUTES.notes,
    requestBody: quickNoteFixture,
    responseBody: { success: true, data: quickNoteFixture },
  },
  {
    method: "PUT",
    path: ROUTES.noteById,
    responseBody: { success: true, data: { ...quickNoteFixture, isArchived: true } },
  },
  {
    method: "DELETE",
    path: ROUTES.noteById,
    responseBody: { success: true },
  },
  {
    method: "GET",
    path: ROUTES.shiftPatterns,
    responseBody: [],
  },
  {
    method: "POST",
    path: ROUTES.shiftPatterns,
    requestBody: shiftPatternFixture,
    responseBody: shiftPatternFixture,
  },
  {
    method: "PUT",
    path: ROUTES.shiftPatternById,
    requestBody: shiftPatternFixture,
    responseBody: shiftPatternFixture,
  },
  {
    method: "DELETE",
    path: ROUTES.shiftPatternById,
  },
  {
    method: "GET",
    path: ROUTES.shiftAssignments,
    responseBody: shiftAssignmentsListBody(),
  },
  {
    method: "POST",
    path: ROUTES.shiftAssignments,
    requestBody: shiftAssignmentFixture,
    responseBody: shiftAssignmentFixture,
  },
  {
    method: "PUT",
    path: ROUTES.shiftAssignmentById,
    requestBody: shiftAssignmentFixture,
    responseBody: shiftAssignmentFixture,
  },
  {
    method: "DELETE",
    path: ROUTES.shiftAssignmentById,
  },
  {
    method: "POST",
    path: ROUTES.monthlyPlan,
    requestBody: { month: "3", year: "2026", patternName: "Turno A", dailySchedules: [] },
    responseBody: { success: true },
  },
  {
    method: "POST",
    path: ROUTES.calendarMatrix,
    requestBody: { startDate: "2026-03-01", endDate: "2026-03-31", employeeIds: [] },
    responseBody: {},
  },
];

/** Conjunto completo de handlers por defecto. */
export const handlers = [
  ...catalogHandlers,
  ...mutationHandlers,
  ...kpiHandlers,
  ...timeRecordHandlers,
];
