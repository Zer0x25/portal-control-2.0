import type { RouteEntry } from "./app";

export function assertMigratedRouteContracts(routes: readonly RouteEntry[]): void {
  const holidays = routes.filter((route) => route.url.startsWith("/api/holidays"));
  if (holidays.length === 0) throw new Error("Holiday route manifest is empty");
  const expected = [
    "GET /api/holidays",
    "POST /api/holidays",
    "POST /api/holidays/bulk",
    "POST /api/holidays/sync",
    "DELETE /api/holidays/:id",
  ].sort();
  if (
    JSON.stringify(holidays.map((route) => `${route.method} ${route.url}`).sort()) !==
    JSON.stringify(expected)
  )
    throw new Error("Holiday route manifest differs from the API contract");
  for (const route of holidays) {
    if (!route.authenticated)
      throw new Error(`Missing authentication contract: ${route.method} ${route.url}`);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(route.method) && !route.validated)
      throw new Error(`Unvalidated mutation: ${route.method} ${route.url}`);
  }
}
