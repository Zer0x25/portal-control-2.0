/**
 * Frontend Test Suite Setup (Spec 035 - AC1, AC5, AC7)
 *
 * Guía de selección de entorno de ejecución:
 * ==========================================
 * 1. JSDOM (`src/tests/[dir]/[name].test.ts(x)`):
 *    - Entorno por defecto para tests unitarios y de integración de hooks, services y features.
 *    - Rápido, ligero y adecuado para aserciones de renderizado React, llamadas de red con MSW,
 *      estados de TanStack Query, ciclo de vida de componentes y lógica de negocio.
 *    - Limitación: No implementa motor de renderizado real (layout, cálculo de dimensiones con
 *      getBoundingClientRect no nulos, focus traps reales dependientes de tabIndex efectivo,
 *      scroll real de contenedores virtualizados o eventos de puntero compuestos).
 *
 * 2. Vitest Browser Mode (`src/tests/browser/[name].browser.spec.ts(x)`):
 *    - Ejecutado en Chromium real headless (via `@vitest/browser` + Playwright).
 *    - OBLIGATORIO para tests de comportamiento no observable fielmente en JSDOM:
 *      * `CinematicModal`: Focus trap real, ciclo de animación y retorno de foco al elemento disparador.
 *      * `DatePickerDialog`: Roving tabindex y navegación con flechas por la grilla APG.
 *      * `TabNav`: Roving tabindex, foco activo en tablist y navegación con flechas/Home/End.
 *      * `NumericKeypad`: Interacciones con Pointer Events en pantalla táctil/kiosco.
 *      * `SortableHeader`: Dimensiones reales de layout de tablas y ordenamiento interactivo.
 *      * `VirtualizedContainer`: Cálculo de alturas reales (`@tanstack/react-virtual`) y scroll de viewport.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { server } from "./mocks/server";
import { logger } from "../utils/logger";

// Mock Sentry in the test environment (AC7)
vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  init: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock("@sentry/browser", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  init: vi.fn(),
  setUser: vi.fn(),
}));

// MSW Server lifecycle (AC1) and Logger spies (AC7)
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  localStorage.setItem("authToken", "mock-jwt-token-xyz-123");
  sessionStorage.setItem("authToken", "mock-jwt-token-xyz-123");
  vi.spyOn(logger, "log").mockImplementation(() => {});
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "warn").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
  vi.spyOn(logger, "debug").mockImplementation(() => {});
});

// Limpiar el DOM y resetear handlers después de cada test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.setItem("authToken", "mock-jwt-token-xyz-123");
  sessionStorage.setItem("authToken", "mock-jwt-token-xyz-123");
});

afterAll(() => {
  server.close();
});

// Mock de matchMedia (requerido por algunos componentes de UI)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // depreciado
    removeListener: vi.fn(), // depreciado
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
// Mock de indexedDB completo para evitar errores de importación en servicios
vi.stubGlobal("indexedDB", {
  open: vi.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
});
vi.stubGlobal("IDBRequest", class {});
vi.stubGlobal("IDBTransaction", class {});
vi.stubGlobal("IDBDatabase", class {});
vi.stubGlobal("IDBIndex", class {});
vi.stubGlobal("IDBKeyRange", class {});
vi.stubGlobal("IDBObjectStore", class {});
vi.stubGlobal("IDBCursor", class {});

vi.mock("../utils/indexedDB.ts", () => ({
  initDB: vi.fn(),
  getDB: vi.fn(),
  // Valores literales (sin importar el módulo real): idbValidation.ts lee
  // STORES en top-level y el mock global no debe dejarlo en undefined.
  STORES: {
    EMPLOYEES: "employees",
    DAILY_TIME_RECORDS: "dailyTimeRecords",
    SHIFT_REPORTS: "shiftReports",
    APP_SETTINGS: "appSettings",
    AUDIT_LOGS: "auditLogs",
    USERS: "users",
    THEORETICAL_SHIFT_PATTERNS: "theoreticalShiftPatterns",
    ASSIGNED_SHIFTS: "assignedShifts",
    QUICK_NOTES: "quickNotes",
    METER_READINGS: "meterReadings",
    LEAVES: "leaves",
    HOLIDAYS: "holidays",
    CORRECTION_REQUESTS: "correctionRequests",
    KPI_CACHE: "kpiCache",
    CALENDAR_CACHE: "calendarCache",
  },
  clockingStore: {
    getAll: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
  authStore: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  },
}));
