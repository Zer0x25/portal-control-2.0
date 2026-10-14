import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Limpiar el DOM después de cada test
afterEach(() => {
  cleanup();
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
