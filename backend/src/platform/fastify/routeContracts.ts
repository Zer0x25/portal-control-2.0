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
  const employees = routes.filter(
    (route) => route.url === "/api/employees" || route.url.startsWith("/api/employees/"),
  );
  if (!employees.length) throw new Error("Employees route manifest is empty");
  const expectedEmployees = [
    "GET /api/employees",
    "GET /api/employees/kiosk",
    "POST /api/employees",
    "PUT /api/employees/:id",
    "POST /api/employees/bulk",
    "GET /api/employees/export",
  ].sort();
  if (
    JSON.stringify(employees.map((route) => `${route.method} ${route.url}`).sort()) !==
    JSON.stringify(expectedEmployees)
  )
    throw new Error("Employees route manifest differs from the API contract");
  for (const route of employees) {
    const kiosk = route.url === "/api/employees/kiosk";
    if (route.authenticated === kiosk)
      throw new Error(`Incorrect authentication contract: ${route.url}`);
    if (!kiosk && !route.validated)
      throw new Error(`Unvalidated employees route: ${route.method} ${route.url}`);
  }
  const configs = routes.filter(
    (route) => route.url === "/api/configs" || route.url.startsWith("/api/configs/"),
  );
  if (!configs.length) throw new Error("configs route manifest is empty");
  const expectedConfigs = [
    "GET /api/configs/public/company-policy",
    "GET /api/configs/public/company-policy/file",
    "POST /api/configs/company-policy",
    "GET /api/configs/server-time",
    "GET /api/configs/validate-closure",
    "GET /api/configs",
    "GET /api/configs/:key",
    "POST /api/configs/:key",
  ];
  if (
    JSON.stringify(configs.map((route) => `${route.method} ${route.url}`).sort()) !==
    JSON.stringify(expectedConfigs.sort())
  )
    throw new Error("configs route manifest differs from the API contract");
  for (const route of configs) {
    const isPublic = route.url.startsWith("/api/configs/public/");
    if (route.authenticated === isPublic)
      throw new Error(`Incorrect authentication contract: ${route.url}`);
    if (!route.validated) throw new Error(`Unvalidated configs route: ${route.url}`);
  }
  const records = routes.filter(
    (route) => route.url === "/api/records" || route.url.startsWith("/api/records/"),
  );
  if (!records.length) throw new Error("Records route manifest is empty");
  const expectedRecords = [
    "POST /api/records/punch",
    "GET /api/records",
    "GET /api/records/export",
    "POST /api/records",
    "POST /api/records/bulk",
    "POST /api/records/auto-close",
    "GET /api/records/integrity/verify",
    "POST /api/records/:id/resolve-anomaly",
    "DELETE /api/records/:id",
  ].sort();
  if (
    JSON.stringify(records.map((route) => `${route.method} ${route.url}`).sort()) !==
    JSON.stringify(expectedRecords)
  )
    throw new Error("Records route manifest differs from the API contract");
  for (const route of records) {
    if (!route.authenticated) throw new Error(`Missing authentication contract: ${route.url}`);
    if (!route.validated)
      throw new Error(`Unvalidated records route: ${route.method} ${route.url}`);
  }
  const shifts = routes.filter((route) => route.url.startsWith("/api/shifts/"));
  if (!shifts.length) throw new Error("Shifts route manifest is empty");
  const expectedShifts = [
    "GET /api/shifts/patterns",
    "POST /api/shifts/patterns",
    "PUT /api/shifts/patterns/:id",
    "DELETE /api/shifts/patterns/:id",
    "POST /api/shifts/patterns/bulk",
    "GET /api/shifts/assignments",
    "POST /api/shifts/assignments",
    "PUT /api/shifts/assignments/:id",
    "DELETE /api/shifts/assignments/:id",
    "POST /api/shifts/assignments/bulk",
    "GET /api/shifts/schedule/employee/:id",
    "GET /api/shifts/schedule/employees-on-date",
    "GET /api/shifts/schedule/employee/:id/month",
    "POST /api/shifts/schedule/matrix",
    "GET /api/shifts/monthly-plan/:employeeId/:year/:month",
    "POST /api/shifts/monthly-plan",
    "GET /api/shifts/suggest-pattern-name",
    "POST /api/shifts/validate-conflicts",
  ].sort();
  if (
    JSON.stringify(shifts.map((route) => `${route.method} ${route.url}`).sort()) !==
    JSON.stringify(expectedShifts)
  )
    throw new Error("Shifts route manifest differs from the API contract");
  for (const route of shifts) {
    if (!route.authenticated) throw new Error(`Missing authentication contract: ${route.url}`);
    if (!route.validated) throw new Error(`Unvalidated shifts route: ${route.method} ${route.url}`);
  }
  for (const [name, expected] of [
    [
      "audit-logs",
      [
        "GET /api/audit-logs",
        "POST /api/audit-logs",
        "GET /api/audit-logs/export",
        "GET /api/audit-logs/integrity-status",
        "GET /api/audit-logs/verify-integrity",
        "POST /api/audit-logs/cleanup",
      ],
    ],
    ["import", ["POST /api/import/preview"]],
    [
      "export",
      [
        "GET /api/export/calendar-pdf",
        "GET /api/export/report-pdf",
        "GET /api/export/shift-report-pdf/:id",
        "GET /api/export/report-excel",
      ],
    ],
    ["meters", ["GET /api/meters", "POST /api/meters/bulk"]],
    ["notes", ["GET /api/notes", "POST /api/notes", "PUT /api/notes/:id", "DELETE /api/notes/:id"]],

    [
      "email",
      [
        "POST /api/email/verify",
        "GET /api/email/config",
        "POST /api/email/config",
        "GET /api/email/rules",
        "POST /api/email/rules",
        "POST /api/email/send-test",
      ],
    ],
    [
      "scheduled-reports",
      [
        "GET /api/scheduled-reports",
        "GET /api/scheduled-reports/:id",
        "POST /api/scheduled-reports",
        "PUT /api/scheduled-reports/:id",
        "PATCH /api/scheduled-reports/:id/toggle",
        "DELETE /api/scheduled-reports/:id",
      ],
    ],

    [
      "kpis",
      [
        "POST /api/kpis/summary",
        "POST /api/kpis/detailed-report",
        "GET /api/kpis/overview",
        "GET /api/kpis/daily-planning",
      ],
    ],
    [
      "shift-reports",
      ["GET /api/shift-reports", "POST /api/shift-reports", "GET /api/shift-reports/export/:id"],
    ],
    ["leaves", ["GET /api/leaves", "POST /api/leaves", "DELETE /api/leaves/:id"]],
    [
      "corrections",
      [
        "GET /api/corrections",
        "GET /api/corrections/stats",
        "GET /api/corrections/:id/history",
        "POST /api/corrections",
        "PATCH /api/corrections/:id/status",
      ],
    ],
  ] as const) {
    const prefix = `/api/${name}`;
    const selected = routes.filter(
      (route) => route.url === prefix || route.url.startsWith(`${prefix}/`),
    );
    if (!selected.length) throw new Error(`${name} route manifest is empty`);
    if (
      JSON.stringify(selected.map((route) => `${route.method} ${route.url}`).sort()) !==
      JSON.stringify([...expected].sort())
    )
      throw new Error(`${name} route manifest differs from the API contract`);
    for (const route of selected) {
      if (!route.authenticated) throw new Error(`Missing authentication contract: ${route.url}`);
      if (!route.validated)
        throw new Error(`Unvalidated ${name} route: ${route.method} ${route.url}`);
    }
  }
}
