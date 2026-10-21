import { http, HttpResponse } from "msw";

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
 * Las respuestas son deterministas (fixtures sin reloj) y los listados
 * responden a los filtros que usan los tests, de modo que un handler no
 * "acepte cualquier cosa".
 */

/**
 * Rutas segun el contrato OpenAPI (`backend/docs/swagger.json`).
 *
 * Se declaran aqui (y no dentro de cada handler) para que el test de
 * contrato pueda compararlas con el swagger y detectar una ruta inventada.
 */
export const ROUTES = {
  timeRecords: "/api/records",
  shiftReports: "/api/shift-reports",
  shiftReportById: "/api/shift-reports/{id}",
  kpiSummary: "/api/kpis/summary",
} as const;

/**
 * URL de MSW a partir de la ruta OpenAPI.
 *
 * `TEST_API_URL` ya termina en `/api`, asi que la ruta OpenAPI `/api/x` se
 * convierte en `/x`; los parametros `{id}` pasan a `:id` (sintaxis de MSW).
 */
export const mockUrl = (openApiPath: string): string =>
  `${TEST_API_URL}${openApiPath.replace(/^\/api/, "").replace(/\{(\w+)\}/g, ":$1")}`;

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

/* -------------------------------------------------------------------------- */
/* Marcaciones de tiempo (`/api/records`)                                      */
/* -------------------------------------------------------------------------- */

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
/* Bitácora de turno (`/api/shift-reports`)                                   */
/* -------------------------------------------------------------------------- */

export const shiftReportHandlers = [
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
];

/* -------------------------------------------------------------------------- */
/* KPIs (`/api/kpis/summary`)                                                  */
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

/* -------------------------------------------------------------------------- */
/* Contrato de los handlers (verificado contra el swagger)                     */
/* -------------------------------------------------------------------------- */

/** Verbos HTTP soportados por los handlers. */
export type MockHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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
}

/** Contrato de todas las rutas mockeadas (una entrada por handler). */
export const routeContracts: MockRouteContract[] = [
  {
    method: "GET",
    path: ROUTES.timeRecords,
    responseBody: timeRecordsListBody(),
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
    method: "POST",
    path: ROUTES.kpiSummary,
    requestBody: {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      employeeIds: ["e-fixture-1"],
    },
    responseBody: kpiSummaryBody(),
  },
];

/** Conjunto completo de handlers por defecto. */
export const handlers = [...timeRecordHandlers, ...shiftReportHandlers, ...kpiHandlers];
