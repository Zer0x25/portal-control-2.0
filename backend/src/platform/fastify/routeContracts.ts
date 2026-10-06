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
  const auth = routes.filter((route) => route.url.startsWith("/api/auth/"));
  if (auth.length === 0) throw new Error("Auth route manifest is empty");
  const expectedAuth = [
    "/api/auth/login",
    "/api/auth/kiosk-login",
    "/api/auth/logout",
    "/api/auth/mfa/setup",
    "/api/auth/mfa/verify",
    "/api/auth/mfa/validate",
  ].sort();
  if (
    JSON.stringify(auth.map((route) => `${route.method} ${route.url}`).sort()) !==
    JSON.stringify(expectedAuth.map((url) => `POST ${url}`))
  )
    throw new Error("Auth route manifest differs from the API contract");
  for (const route of auth) {
    const protectedRoute = ["/api/auth/mfa/setup", "/api/auth/mfa/verify"].includes(route.url);
    if (route.authenticated !== protectedRoute)
      throw new Error(`Incorrect authentication contract: ${route.url}`);
    if (!route.validated) throw new Error(`Unvalidated mutation: ${route.method} ${route.url}`);
  }
  const users = routes.filter(
    (route) => route.url === "/api/users" || route.url.startsWith("/api/users/"),
  );
  if (!users.length) throw new Error("Users route manifest is empty");
  const expectedUsers = [
    "GET /api/users",
    "POST /api/users",
    "PUT /api/users/:id",
    "DELETE /api/users/:id",
  ].sort();
  if (
    JSON.stringify(users.map((route) => `${route.method} ${route.url}`).sort()) !==
    JSON.stringify(expectedUsers)
  )
    throw new Error("Users route manifest differs from the API contract");
  for (const route of users) {
    if (!route.authenticated)
      throw new Error(`Missing authentication contract: ${route.method} ${route.url}`);
    if (!route.validated) throw new Error(`Unvalidated users route: ${route.method} ${route.url}`);
  }
}
