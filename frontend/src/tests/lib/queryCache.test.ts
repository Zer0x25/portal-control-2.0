import { describe, expect, it } from "vitest";
import type { Query } from "@tanstack/react-query";

import {
  PERSISTED_QUERY_ROOTS,
  QUERY_CACHE_BUSTER,
  SENSITIVE_QUERY_ROOTS,
  shouldDehydrateQuery,
} from "../../lib/queryCache";

const queryWith = (queryKey: unknown[], status: string = "success"): Query =>
  ({ queryKey, state: { status } }) as unknown as Query;

describe("persistencia del cache de queries (spec 032 AC2.2/AC2.3)", () => {
  it("persiste solo raices de la allowlist", () => {
    for (const root of [
      "config",
      "employees",
      "holidays",
      "leaves",
      "shiftPatterns",
      "assignedShifts",
      "calendarMatrix",
      "meterReadings",
      "timeRecords",
      "shiftReports",
      "attendanceAnalytics",
      "dashboard",
      "correctionRequests",
      "notes",
      "recordHistory",
    ]) {
      expect(shouldDehydrateQuery(queryWith([root, "x"])), root).toBe(true);
    }
  });

  /**
   * Spec 034, T17/T22/T23: `calendar` y `reports` son raices **retiradas**.
   *
   * - `calendar` no tenia ninguna query (las invalidaciones apuntaban a un
   *   arbol vacio); ahora apuntan a `calendarMatrix`.
   * - `reports` se unifico con `shiftReports` (un unico recurso).
   */
  it("no persiste las raices retiradas (`calendar`, `reports`)", () => {
    expect(shouldDehydrateQuery(queryWith(["calendar", "x"]))).toBe(false);
    expect(shouldDehydrateQuery(queryWith(["reports", "x"]))).toBe(false);
  });

  it("no persiste cuentas, auditoria ni diagnostico", () => {
    for (const root of SENSITIVE_QUERY_ROOTS) {
      expect(shouldDehydrateQuery(queryWith([root])), root).toBe(false);
    }
  });

  it("no persiste raices desconocidas (allowlist, no blocklist)", () => {
    expect(shouldDehydrateQuery(queryWith(["unknown-domain"]))).toBe(false);
    expect(shouldDehydrateQuery(queryWith([{ nested: true }]))).toBe(false);
    expect(shouldDehydrateQuery(queryWith([]))).toBe(false);
  });

  it("no persiste queries que no terminaron en exito", () => {
    for (const status of ["pending", "error", "fetching"]) {
      expect(shouldDehydrateQuery(queryWith(["config"], status)), status).toBe(false);
    }
  });

  it("allowlist y lista sensible no se solapan", () => {
    const overlap = PERSISTED_QUERY_ROOTS.filter((root) => SENSITIVE_QUERY_ROOTS.includes(root));
    expect(overlap).toEqual([]);
  });

  it("el buster deriva de la version de build y nunca queda vacio", () => {
    expect(typeof QUERY_CACHE_BUSTER).toBe("string");
    expect(QUERY_CACHE_BUSTER.length).toBeGreaterThan(0);
  });
});
