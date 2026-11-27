import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidacion de datos tras un seed (fase 1 / fase 2).
 *
 * El seeder escribe directamente en el servidor mientras el cliente sigue
 * sirviendo su cache de TanStack Query (staleTime 5 min + cache persistido
 * en IndexedDB). Sin esta invalidacion, "la data no se actualiza en la app"
 * tras terminar una simulacion.
 *
 * Se invalida por raiz para cubrir todas las listas/parametrizadas de cada
 * recurso que el seeder toca (ver `Phase1Service` / `Phase2Service`).
 */

/** Raices de queries escritas por el seeder (fase 1 y fase 2). */
const SEED_MUTATED_QUERY_ROOTS: readonly string[] = [
  "assignedShifts",
  "attendanceAnalytics",
  "calendarMatrix",
  "correctionRequests",
  "dashboard",
  "employees",
  "employeesKiosk",
  "holidays",
  "leaves",
  "monthlyPlan",
  "notes",
  "recordHistory",
  "shiftPatterns",
  "shiftReports",
  "timeRecords",
  "users",
] as const;

/**
 * Marca como stale todo lo que el seeder pudo escribir y refresca las
 * queries activas. `invalidateQueries` es seguro en raices inexistentes.
 */
export const invalidateSeedDataQueries = (client: QueryClient): void => {
  for (const root of SEED_MUTATED_QUERY_ROOTS) {
    void client.invalidateQueries({ queryKey: [root] });
  }
};
