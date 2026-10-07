import { describe, expect, it } from "vitest";
import { assertMigratedRouteContracts } from "../../src/platform/fastify/routeContracts";
import type { RouteEntry } from "../../src/platform/fastify/app";

const routes: RouteEntry[] = [
  ["GET", "/api/holidays"],
  ["POST", "/api/holidays"],
  ["POST", "/api/holidays/bulk"],
  ["POST", "/api/holidays/sync"],
  ["DELETE", "/api/holidays/:id"],
].map(([method, url]) => ({ method, url, authenticated: true, validated: true }));
routes.push(
  ...["login", "kiosk-login", "logout", "mfa/setup", "mfa/verify", "mfa/validate"].map((path) => ({
    method: "POST",
    url: `/api/auth/${path}`,
    authenticated: ["mfa/setup", "mfa/verify"].includes(path),
    validated: true,
  })),
);
routes.push(
  ...[
    ["GET", "/api/users"],
    ["POST", "/api/users"],
    ["PUT", "/api/users/:id"],
    ["DELETE", "/api/users/:id"],
  ].map(([method, url]) => ({
    method,
    url,
    authenticated: true,
    validated: true,
  })),
);
routes.push(
  ...[
    ["GET", "/api/employees"],
    ["GET", "/api/employees/kiosk"],
    ["POST", "/api/employees"],
    ["PUT", "/api/employees/:id"],
    ["POST", "/api/employees/bulk"],
    ["GET", "/api/employees/export"],
  ].map(([method, url]) => ({
    method,
    url,
    authenticated: url !== "/api/employees/kiosk",
    validated: url !== "/api/employees/kiosk",
  })),
);
routes.push(
  ...[
    ["POST", "/api/records/punch"],
    ["GET", "/api/records"],
    ["GET", "/api/records/export"],
    ["POST", "/api/records"],
    ["POST", "/api/records/bulk"],
    ["POST", "/api/records/auto-close"],
    ["GET", "/api/records/integrity/verify"],
    ["POST", "/api/records/:id/resolve-anomaly"],
    ["DELETE", "/api/records/:id"],
  ].map(([method, url]) => ({
    method,
    url,
    authenticated: true,
    validated: true,
  })),
);
routes.push(
  ...[
    ["GET", "/api/shifts/patterns"],
    ["POST", "/api/shifts/patterns"],
    ["PUT", "/api/shifts/patterns/:id"],
    ["DELETE", "/api/shifts/patterns/:id"],
    ["POST", "/api/shifts/patterns/bulk"],
    ["GET", "/api/shifts/assignments"],
    ["POST", "/api/shifts/assignments"],
    ["PUT", "/api/shifts/assignments/:id"],
    ["DELETE", "/api/shifts/assignments/:id"],
    ["POST", "/api/shifts/assignments/bulk"],
    ["GET", "/api/shifts/schedule/employee/:id"],
    ["GET", "/api/shifts/schedule/employees-on-date"],
    ["GET", "/api/shifts/schedule/employee/:id/month"],
    ["POST", "/api/shifts/schedule/matrix"],
    ["GET", "/api/shifts/monthly-plan/:employeeId/:year/:month"],
    ["POST", "/api/shifts/monthly-plan"],
    ["GET", "/api/shifts/suggest-pattern-name"],
    ["POST", "/api/shifts/validate-conflicts"],
  ].map(([method, url]) => ({
    method,
    url,
    authenticated: true,
    validated: true,
  })),
);

routes.push(
  ...[
    ["GET", "/api/leaves"],
    ["POST", "/api/leaves"],
    ["DELETE", "/api/leaves/:id"],
    ["GET", "/api/audit-logs"],
    ["POST", "/api/audit-logs"],
    ["GET", "/api/audit-logs/export"],
    ["GET", "/api/audit-logs/integrity-status"],
    ["GET", "/api/audit-logs/verify-integrity"],
    ["POST", "/api/audit-logs/cleanup"],
    ["GET", "/api/admin/stats"],
    ["GET", "/api/admin/diagnose-autoclose"],
    ["GET", "/api/admin/security-insights"],
    ["GET", "/api/admin/integrity-status"],
    ["GET", "/api/admin/backups"],
    ["POST", "/api/admin/trigger-autoclose"],
    ["POST", "/api/admin/trigger-accounting-autoclose"],
    ["POST", "/api/admin/trigger-backup"],
    ["POST", "/api/admin/purge-sessions"],
    ["POST", "/api/admin/reset-password"],
    ["POST", "/api/admin/restore"],
    ["POST", "/api/admin/restart"],
    ["DELETE", "/api/maintenance/clear-database"],
    ["POST", "/api/maintenance/seed"],
    ["POST", "/api/maintenance/seed/phase1"],
    ["POST", "/api/maintenance/seed/phase2/start"],
    ["POST", "/api/maintenance/seed/phase2/pause"],
    ["POST", "/api/maintenance/seed/phase2/resume"],
    ["POST", "/api/maintenance/seed/phase2/stop"],
    ["GET", "/api/maintenance/seed/phase2/status"],
    ["GET", "/api/maintenance/seed/phase2/logs"],
    ["POST", "/api/import/preview"],
    ["GET", "/api/export/calendar-pdf"],
    ["GET", "/api/export/report-pdf"],
    ["GET", "/api/export/shift-report-pdf/:id"],
    ["GET", "/api/export/report-excel"],
    ["GET", "/api/meters"],
    ["POST", "/api/meters/bulk"],
    ["GET", "/api/notes"],
    ["POST", "/api/notes"],
    ["PUT", "/api/notes/:id"],
    ["DELETE", "/api/notes/:id"],
    ["GET", "/api/configs/public/company-policy"],
    ["GET", "/api/configs/public/company-policy/file"],
    ["POST", "/api/configs/company-policy"],
    ["GET", "/api/configs/server-time"],
    ["GET", "/api/configs/validate-closure"],
    ["GET", "/api/configs"],
    ["GET", "/api/configs/:key"],
    ["POST", "/api/configs/:key"],
    ["POST", "/api/email/verify"],
    ["GET", "/api/email/config"],
    ["POST", "/api/email/config"],
    ["GET", "/api/email/rules"],
    ["POST", "/api/email/rules"],
    ["POST", "/api/email/send-test"],
    ["GET", "/api/scheduled-reports"],
    ["GET", "/api/scheduled-reports/:id"],
    ["POST", "/api/scheduled-reports"],
    ["PUT", "/api/scheduled-reports/:id"],
    ["PATCH", "/api/scheduled-reports/:id/toggle"],
    ["DELETE", "/api/scheduled-reports/:id"],
    ["POST", "/api/kpis/summary"],
    ["POST", "/api/kpis/detailed-report"],
    ["GET", "/api/kpis/overview"],
    ["GET", "/api/kpis/daily-planning"],
    ["GET", "/api/corrections"],
    ["GET", "/api/corrections/stats"],
    ["GET", "/api/corrections/:id/history"],
    ["POST", "/api/corrections"],
    ["PATCH", "/api/corrections/:id/status"],
  ].map(([method, url]) => ({
    method,
    url,
    authenticated: !url.startsWith("/api/configs/public/"),
    validated: true,
  })),
);
routes.push(
  ...[
    ["GET", "/api/shift-reports"],
    ["POST", "/api/shift-reports"],
    ["GET", "/api/shift-reports/export/:id"],
  ].map(([method, url]) => ({
    method,
    url,
    authenticated: true,
    validated: true,
  })),
);
describe("Fastify route guard anti-vacuity", () => {
  it("accepts a complete validated authenticated route surface", () =>
    expect(() => assertMigratedRouteContracts(routes)).not.toThrow());
  it("rejects an empty enumerator", () =>
    expect(() => assertMigratedRouteContracts([])).toThrow("empty"));
  it("rejects missing/extra routes", () =>
    expect(() => assertMigratedRouteContracts(routes.slice(1))).toThrow("differs"));
  it("rejects missing auth", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route, index) => (index === 0 ? { ...route, authenticated: false } : route)),
      ),
    ).toThrow("authentication"));
  it("rejects missing mutating validator", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route, index) => (index === 1 ? { ...route, validated: false } : route)),
      ),
    ).toThrow("Unvalidated"));
  it("rejects empty auth surface", () =>
    expect(() => assertMigratedRouteContracts(routes.slice(0, 5))).toThrow(
      "Auth route manifest is empty",
    ));
  it("rejects auth route missing", () =>
    expect(() =>
      assertMigratedRouteContracts(routes.filter((route) => route.url !== "/api/auth/login")),
    ).toThrow("differs"));
  it("rejects public auth route marked protected", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route) =>
          route.url === "/api/auth/login" ? { ...route, authenticated: true } : route,
        ),
      ),
    ).toThrow("authentication"));
  it("rejects protected MFA route marked public", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route) =>
          route.url === "/api/auth/mfa/setup" ? { ...route, authenticated: false } : route,
        ),
      ),
    ).toThrow("authentication"));
  it("rejects auth route missing validator", () =>
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((route) =>
          route.url === "/api/auth/logout" ? { ...route, validated: false } : route,
        ),
      ),
    ).toThrow("Unvalidated"));
});

it("rejects missing users surface", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => !route.url.startsWith("/api/users"))),
  ).toThrow("Users route manifest is empty"));
it("rejects users route without authentication", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/users" ? { ...route, authenticated: false } : route,
      ),
    ),
  ).toThrow("authentication"));
it("rejects users path mutation without validator", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.method === "DELETE" && route.url.startsWith("/api/users")
          ? { ...route, validated: false }
          : route,
      ),
    ),
  ).toThrow("Unvalidated"));

it("rejects empty employees surface", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => !route.url.startsWith("/api/employees"))),
  ).toThrow("Employees route manifest is empty"));
it("rejects missing employees route", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => route.url !== "/api/employees/export")),
  ).toThrow("differs"));
it("rejects kiosk marked protected", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/employees/kiosk" ? { ...route, authenticated: true } : route,
      ),
    ),
  ).toThrow("authentication"));
it("rejects employees missing validator", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/employees/export" ? { ...route, validated: false } : route,
      ),
    ),
  ).toThrow("Unvalidated"));

it("rejects empty records surface", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => !route.url.startsWith("/api/records"))),
  ).toThrow("Records route manifest is empty"));
it("rejects unvalidated auto-close despite ignored body", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/records/auto-close" ? { ...route, validated: false } : route,
      ),
    ),
  ).toThrow("Unvalidated"));

it("rejects missing shifts surface", () =>
  expect(() =>
    assertMigratedRouteContracts(routes.filter((route) => !route.url.startsWith("/api/shifts/"))),
  ).toThrow("Shifts route manifest is empty"));
it("rejects unvalidated schedule route", () =>
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((route) =>
        route.url === "/api/shifts/schedule/matrix" ? { ...route, validated: false } : route,
      ),
    ),
  ).toThrow("Unvalidated"));

it.each([
  "leaves",
  "corrections",
  "shift-reports",
  "kpis",
  "email",
  "scheduled-reports",
  "meters",
  "import",
  "export",
  "admin",
  "maintenance",
  "audit-logs",
  "notes",
])("rejects empty/missing/extra/unsecured/unvalidated %s routes", (name) => {
  const prefix = `/api/${name}`;
  const belongs = (r: RouteEntry) => r.url === prefix || r.url.startsWith(`${prefix}/`);
  expect(() => assertMigratedRouteContracts(routes.filter((r) => !belongs(r)))).toThrow("empty");
  expect(() =>
    assertMigratedRouteContracts(routes.filter((r) => r !== routes.find(belongs))),
  ).toThrow(/differs|empty/);
  expect(() =>
    assertMigratedRouteContracts([
      ...routes,
      { method: "POST", url: `${prefix}/extra`, authenticated: true, validated: true },
    ]),
  ).toThrow("differs");
  expect(() =>
    assertMigratedRouteContracts(
      routes.map((r) => (belongs(r) ? { ...r, authenticated: false } : r)),
    ),
  ).toThrow("authentication");
  expect(() =>
    assertMigratedRouteContracts(routes.map((r) => (belongs(r) ? { ...r, validated: false } : r))),
  ).toThrow("Unvalidated");
});

it("configs rejects empty/missing/extra/public auth drift and missing validation", () => {
  const selected = (r: { url: string }) =>
    r.url === "/api/configs" || r.url.startsWith("/api/configs/");
  expect(() => assertMigratedRouteContracts(routes.filter((r) => !selected(r)))).toThrow("empty");
  expect(() =>
    assertMigratedRouteContracts(routes.filter((r) => r.url !== "/api/configs/server-time")),
  ).toThrow("differs");
  expect(() =>
    assertMigratedRouteContracts([
      ...routes,
      { method: "GET", url: "/api/configs/extra", authenticated: true, validated: true },
    ]),
  ).toThrow("differs");
  for (const target of routes.filter(selected)) {
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((r) => (r === target ? { ...r, authenticated: !r.authenticated } : r)),
      ),
    ).toThrow("authentication");
    expect(() =>
      assertMigratedRouteContracts(
        routes.map((r) => (r === target ? { ...r, validated: false } : r)),
      ),
    ).toThrow("Unvalidated");
  }
});
