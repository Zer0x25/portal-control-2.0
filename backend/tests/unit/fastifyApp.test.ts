import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";
import {
  buildFastifyApp,
  type FastifyConfig,
  type FastifyDependencies,
} from "../../src/platform/fastify/app";
import {
  createAuthenticate,
  createAuthFlows,
  verifyAccessToken,
  type AuthUser,
} from "../../src/modules/auth";
import { createHolidayCommands } from "../../src/modules/holidays";
import { requestContext } from "../../src/utils/context";
import { Prisma } from "../../src/generated/prisma/client";

const secret = "test-only-fastify-http-secret";
const apps: FastifyInstance[] = [];
const body = { date: "2026-10-10", name: "Feriado de prueba", type: "Civil" };
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function fixture(config: Partial<FastifyConfig> = {}) {
  const users = new Map<string, AuthUser>();
  const sessions = new Map<
    string,
    { id: string; userId: string; lastActive: Date; expiresAt: Date }
  >();
  const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
  function token(username = "supervisor", role = "Supervisor", claimRole = role) {
    const user = { id: username, username, role, employeeId: null };
    users.set(username, user);
    const value = jwt.sign({ ...user, role: claimRole }, secret, { expiresIn: "1h" });
    sessions.set(hash(value), {
      id: username,
      userId: username,
      lastActive: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });
    return value;
  }
  const seenContexts: (string | undefined)[] = [];
  const repository = {
    upsert: vi.fn(async (data: { id: string; date: string; name: string; type: string }) => {
      seenContexts.push(requestContext.getStore()?.username);
      await new Promise((resolve) => setTimeout(resolve, 2));
      seenContexts.push(requestContext.getStore()?.username);
      return { ...data, createdAt: new Date(0), updatedAt: new Date(0) };
    }),
    findSummary: vi.fn(async () => ({ date: body.date, name: body.name })),
    delete: vi.fn(async () => ({})),
  };
  const audit = vi.fn(async () => {});
  const emit = vi.fn();
  const provider = {
    list: vi.fn(async () => [{ date: body.date, title: body.name, inalienable: true }]),
  };
  const commands = createHolidayCommands({
    repository,
    provider,
    audit,
    emit,
    year: () => 2026,
    id: () => "holiday-id",
  });
  const deps: FastifyDependencies = {
    authenticate: createAuthenticate({
      verify: (value) => verifyAccessToken(value, secret),
      hash,
      now: () => new Date(),
      sessions: {
        find: async (key) => sessions.get(key) ?? null,
        remove: async (id) => {
          for (const [key, value] of sessions) if (value.id === id) sessions.delete(key);
        },
        touch: async () => {},
      },
      users: { find: async (id) => users.get(id) ?? null },
    }),
    auth: {
      inspectFailures: async () => null,
      flows: createAuthFlows({
        service: {
          authenticate: async () => ({ success: false, reason: "INVALID_CREDENTIALS" }),
          generateMFAPendingToken: () => "pending",
          manageSessionLimit: async () => {},
          createSession: async () => ({ token: "token", role: "Usuario" }),
          verifyKioskPin: async () => ({ success: false, reason: "NOT_FOUND" }),
          revokeSession: async () => {},
          setupMFA: async () => ({ qrCode: "qr", secret: "secret" }),
          confirmMFASetup: async () => false,
          validateMFALogin: async () => ({ success: false }),
        },
        failures: { record: async () => {}, clear: async () => {} },
        audit: async () => {},
        log: () => {},
      }),
    },
    holidays: {
      getHolidays: vi.fn(async () => []),
      upsertHoliday: commands.upsert,
      bulkUpsertHolidays: commands.bulk,
      deleteHoliday: commands.delete,
      syncExternalHolidays: commands.sync,
    },
    users: {
      getAllUsers: vi.fn(async () => ({ users: [], total: 0, isPaginated: false })),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    },
    emailReports: {
      verify: vi.fn(),
      saveConfig: vi.fn(),
      config: vi.fn(),
      rules: vi.fn(),
      saveRules: vi.fn(),
      send: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    },
    kpis: { summary: vi.fn(), detailed: vi.fn(), overview: vi.fn(), daily: vi.fn() },
    shiftReports: { list: vi.fn(), save: vi.fn(), exportStream: vi.fn() },
    leaves: { list: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    corrections: {
      list: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      stats: vi.fn(),
      history: vi.fn(),
    },
    shifts: {
      patterns: vi.fn(),
      createPattern: vi.fn(),
      updatePattern: vi.fn(),
      deletePattern: vi.fn(),
      bulkPatterns: vi.fn(),
      assignments: vi.fn(),
      assign: vi.fn(),
      updateAssignment: vi.fn(),
      deleteAssignment: vi.fn(),
      bulkAssignments: vi.fn(),
      daily: vi.fn(),
      scheduled: vi.fn(),
      month: vi.fn(),
      matrix: vi.fn(),
      conflicts: vi.fn(),
      monthlyPlan: vi.fn(),
      saveMonthlyPlan: vi.fn(),
      suggest: vi.fn(),
    },
    records: {
      punch: vi.fn(),
      list: vi.fn(),
      save: vi.fn(),
      bulk: vi.fn(),
      delete: vi.fn(),
      autoClose: vi.fn(),
      verify: vi.fn(),
      resolve: vi.fn(),
      prepareExport: vi.fn(),
      exportJson: vi.fn(),
      exportStream: vi.fn(),
    },
    employees: {
      list: vi.fn(async () => []),
      create: vi.fn(),
      update: vi.fn(),
      bulk: vi.fn(),
      exportExcel: vi.fn(),
    },
    health: {
      checkDbReady: vi.fn(async () => true),
      getDetailedHealth: vi.fn(async () => ({ database: { status: "OK" } })),
    },
    maintenance: vi.fn(() => null),
    auditError: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  const app = buildFastifyApp(deps, {
    allowedOrigins: ["https://portal.test"],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
    ...config,
  });
  apps.push(app);
  return { app, deps, repository, audit, emit, provider, token, sessions, hash, seenContexts };
}

describe("Fastify foundation with real JWT/session rules", () => {
  it.each([
    ["GET", "/api/holidays", undefined],
    ["POST", "/api/holidays", body],
    ["POST", "/api/holidays/bulk", [body]],
    ["POST", "/api/holidays/sync", { year: 2026 }],
    ["DELETE", "/api/holidays/id", undefined],
  ] as const)("rejects unauthenticated %s %s before effects", async (method, url, payload) => {
    const f = fixture();
    expect((await f.app.inject({ method, url, payload })).statusCode).toBe(401);
    expect(f.repository.upsert).not.toHaveBeenCalled();
    expect(f.repository.delete).not.toHaveBeenCalled();
    expect(f.provider.list).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON with stable parser error mapping", async () => {
    const f = fixture();
    const response = await f.app.inject({
      method: "POST",
      url: "/api/holidays",
      payload: "{broken",
      headers: { authorization: `Bearer ${f.token()}`, "content-type": "application/json" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("INVALID_JSON");
    expect(f.repository.upsert).not.toHaveBeenCalled();
  });
  it("builds without listening or database activity", () => {
    const f = fixture();
    expect(f.app.server.listening).toBe(false);
    expect(f.repository.upsert).not.toHaveBeenCalled();
  });
  it("serves authenticated GET and legacy pagination mapping", async () => {
    const f = fixture();
    const response = await f.app.inject({
      url: "/api/holidays?page=2&pageSize=10&showArchived=true",
      headers: { authorization: `Bearer ${f.token()}` },
    });
    expect(response.statusCode).toBe(200);
    expect(f.deps.holidays.getHolidays).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      showArchived: true,
      since: undefined,
      search: undefined,
    });
  });
  it.each([
    undefined,
    "invalid",
    jwt.sign({ id: "u", username: "u", role: "Supervisor", exp: 1 }, secret),
    jwt.sign({ id: "u", username: "u", role: "Supervisor" }, "wrong-secret"),
    jwt.sign({ id: 42, username: "u", role: "Supervisor" }, secret),
  ])("rejects bad JWT before invoking GET (%s)", async (value) => {
    const f = fixture();
    const response = await f.app.inject({
      url: "/api/holidays",
      headers: value ? { authorization: `Bearer ${value}` } : {},
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("UNAUTHORIZED");
    expect(f.deps.holidays.getHolidays).not.toHaveBeenCalled();
  });
  it("rejects revoked and expired sessions", async () => {
    const f = fixture();
    const token = f.token();
    const session = f.sessions.get(f.hash(token))!;
    session.expiresAt = new Date(0);
    expect(
      (await f.app.inject({ url: "/api/holidays", headers: { authorization: `Bearer ${token}` } }))
        .statusCode,
    ).toBe(401);
    expect(f.sessions.has(f.hash(token))).toBe(false);
    expect(
      (await f.app.inject({ url: "/api/holidays", headers: { authorization: `Bearer ${token}` } }))
        .statusCode,
    ).toBe(401);
  });
  it.each([
    ["POST", "/api/holidays", body],
    ["POST", "/api/holidays/bulk", [body]],
    ["POST", "/api/holidays/sync", { year: 2026 }],
    ["DELETE", "/api/holidays/id", undefined],
  ] as const)(
    "uses persisted role to deny %s %s, with no effects",
    async (method, url, payload) => {
      const f = fixture();
      const response = await f.app.inject({
        method,
        url,
        payload,
        headers: { authorization: `Bearer ${f.token("reader", "Usuario", "Administrador")}` },
      });
      expect(response.statusCode).toBe(403);
      expect(f.repository.upsert).not.toHaveBeenCalled();
      expect(f.repository.delete).not.toHaveBeenCalled();
      expect(f.provider.list).not.toHaveBeenCalled();
      expect(f.audit).not.toHaveBeenCalled();
      expect(f.emit).not.toHaveBeenCalled();
    },
  );
  it("creates/bulk/sync/deletes with actor, expected status and event", async () => {
    const f = fixture();
    const headers = { authorization: `Bearer ${f.token()}` };
    const created = await f.app.inject({
      method: "POST",
      url: "/api/holidays",
      payload: body,
      headers,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject(body);
    const bulk = await f.app.inject({
      method: "POST",
      url: "/api/holidays/bulk",
      payload: [body, { ...body, date: "2026-10-11" }],
      headers,
    });
    expect(bulk.statusCode).toBe(201);
    expect(bulk.json()).toEqual({ count: 2 });
    const sync = await f.app.inject({
      method: "POST",
      url: "/api/holidays/sync",
      payload: { year: 2026 },
      headers,
    });
    expect(sync.statusCode).toBe(200);
    expect(sync.json()).toEqual({ success: true, total: 1, year: 2026 });
    const deleted = await f.app.inject({
      method: "DELETE",
      url: "/api/holidays/holiday-id",
      headers,
    });
    expect(deleted.statusCode).toBe(204);
    expect(deleted.body).toBe("");
    expect(f.audit.mock.calls).toHaveLength(4);
    expect(f.audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUsername: "supervisor", action: "HOLIDAY_DELETE" }),
    );
    expect(f.emit).toHaveBeenCalledWith({ id: "holiday-id", isDeleted: true });
  });
  it.each([
    ["/api/holidays", { ...body, name: "X" }],
    ["/api/holidays/bulk", [body, { ...body, date: "bad" }]],
    ["/api/holidays/sync", { year: 1999 }],
  ])("validates entire body before writing %s", async (url, payload) => {
    const f = fixture();
    const response = await f.app.inject({
      method: "POST",
      url,
      payload,
      headers: { authorization: `Bearer ${f.token()}` },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
    expect(f.repository.upsert).not.toHaveBeenCalled();
    expect(f.provider.list).not.toHaveBeenCalled();
  });
  it("keeps request context isolated across concurrent awaits", async () => {
    const f = fixture();
    const actors: string[] = [];
    f.repository.upsert.mockImplementation(async (row) => {
      const before = requestContext.getStore()?.username;
      await new Promise((resolve) => setTimeout(resolve, before === "alice" ? 15 : 1));
      expect(requestContext.getStore()?.username).toBe(before);
      actors.push(before!);
      return { ...row, createdAt: new Date(0), updatedAt: new Date(0) };
    });
    const responses = await Promise.all(
      ["alice", "bob"].map((actor) =>
        f.app.inject({
          method: "POST",
          url: "/api/holidays",
          payload: body,
          headers: { authorization: `Bearer ${f.token(actor)}` },
        }),
      ),
    );
    expect(responses.map((response) => response.statusCode)).toEqual([201, 201]);
    expect(actors.sort()).toEqual(["alice", "bob"]);
    expect(requestContext.getStore()).toBeUndefined();
  });
  it("attributes kiosk request context without requiring active session", async () => {
    const f = fixture();
    const headers = {
      authorization: `Bearer ${jwt.sign({ id: "k", username: "kiosk", role: "Kiosk_Employee" }, secret, { expiresIn: "2m" })}`,
    };
    vi.mocked(f.deps.holidays.getHolidays).mockImplementation(async () => {
      expect(requestContext.getStore()?.username).toBe("kiosk");
      return [];
    });
    expect((await f.app.inject({ url: "/api/holidays", headers })).statusCode).toBe(200);
    expect(
      (await f.app.inject({ method: "POST", url: "/api/holidays", payload: body, headers }))
        .statusCode,
    ).toBe(403);
  });
  it("health bypasses maintenance and rate limits", async () => {
    const f = fixture({ rateLimit: { max: 1, timeWindow: 900000 } });
    vi.mocked(f.deps.maintenance).mockReturnValue({ type: "restore" });
    expect((await f.app.inject({ url: "/api/holidays" })).statusCode).toBe(503);
    expect((await f.app.inject({ url: "/api/holidays" })).statusCode).toBe(429);
    for (let i = 0; i < 3; i++)
      expect((await f.app.inject({ url: "/api/health/ready" })).statusCode).toBe(200);
    expect((await f.app.inject({ url: "/api/health" })).statusCode).toBe(200);
  });
  it("readiness and health expose database failure", async () => {
    const f = fixture();
    vi.mocked(f.deps.health.checkDbReady).mockRejectedValue(new Error("db down"));
    expect((await f.app.inject({ url: "/api/health/ready" })).json()).toMatchObject({
      code: "NOT_READY",
    });
    vi.mocked(f.deps.health.getDetailedHealth).mockResolvedValue({ database: { status: "ERROR" } });
    expect((await f.app.inject({ url: "/api/health" })).statusCode).toBe(503);
  });
  it("enforces 1MiB body limit and 10MiB bulk override", async () => {
    const f = fixture();
    const headers = { authorization: `Bearer ${f.token()}` };
    const large = { ...body, name: "x".repeat(1024 * 1024) };
    expect(
      (await f.app.inject({ method: "POST", url: "/api/holidays", payload: large, headers }))
        .statusCode,
    ).toBe(413);
    expect(
      (await f.app.inject({ method: "POST", url: "/api/holidays/bulk", payload: [large], headers }))
        .statusCode,
    ).toBe(201);
    expect(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/holidays/bulk",
          payload: [{ ...body, name: "x".repeat(10 * 1024 * 1024) }],
          headers,
        })
      ).statusCode,
    ).toBe(413);
  });
  it("uses allowlisted CORS without credentials and security headers", async () => {
    const f = fixture();
    const response = await f.app.inject({
      url: "/api/health",
      headers: { origin: "https://portal.test" },
    });
    expect(response.headers["access-control-allow-origin"]).toBe("https://portal.test");
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(
      (await f.app.inject({ url: "/api/health", headers: { origin: "https://evil.test" } }))
        .headers["access-control-allow-origin"],
    ).toBeUndefined();
    const preflight = await f.app.inject({
      method: "OPTIONS",
      url: "/api/holidays",
      headers: {
        origin: "https://portal.test",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    expect(preflight.statusCode).toBe(204);
  });
  it.each([
    ["P2025", 404],
    ["P2002", 409],
    ["P2024", 503],
  ] as const)("preserves Prisma %s mapping to %s", async (code, status) => {
    const f = fixture();
    f.repository.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("failure", {
        code,
        clientVersion: "7.10.0",
        meta: { target: ["date"] },
      }),
    );
    const response = await f.app.inject({
      method: "DELETE",
      url: "/api/holidays/id",
      headers: { authorization: `Bearer ${f.token()}` },
    });
    expect(response.statusCode).toBe(status);
  });
  it("audits unexpected error with actor/request metadata and keeps original error", async () => {
    const f = fixture();
    const error = new Error("provider unavailable");
    f.provider.list.mockRejectedValue(error);
    const response = await f.app.inject({
      method: "POST",
      url: "/api/holidays/sync",
      payload: { year: 2026 },
      headers: { authorization: `Bearer ${f.token()}` },
    });
    expect(response.statusCode).toBe(500);
    expect(f.deps.auditError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        user: expect.objectContaining({ username: "supervisor" }),
        path: "/api/holidays/sync",
        body: { year: 2026 },
      }),
      "SYSTEM_ERROR",
    );
    expect(f.emit).not.toHaveBeenCalled();
  });
  it("enumerates five actual holiday routes and validates every mutation", async () => {
    const f = fixture();
    await f.app.ready();
    const routes = f.app.routeManifest.filter((route) => route.url.startsWith("/api/holidays"));
    expect(routes).toHaveLength(5);
    expect(routes.every((route) => route.authenticated)).toBe(true);
    expect(routes.filter((route) => route.method !== "GET").every((route) => route.validated)).toBe(
      true,
    );
  });
  it("returns consistent not-found payload and closes resources once", async () => {
    const f = fixture();
    const response = await f.app.inject({ url: "/missing?secret=redacted" });
    expect(response.statusCode).toBe(404);
    expect(response.json().message).toBe("Ruta no encontrada: GET /missing");
    await f.app.close();
    await f.app.close();
    expect(f.deps.close).toHaveBeenCalledTimes(1);
  });
});

it("employees enforce simple/bulk body limits before effects", async () => {
  const f = fixture();
  const headers = { authorization: `Bearer ${f.token()}` };
  const large = {
    id: "EMP-big",
    name: "x".repeat(1024 * 1024),
    rut: "12345678-9",
    position: "Operator",
    area: "Ops",
    workdayType: "Normal",
  };
  vi.mocked(f.deps.employees.bulk).mockResolvedValue({ success: true, count: 1 });
  expect(
    (await f.app.inject({ method: "POST", url: "/api/employees", headers, payload: large }))
      .statusCode,
  ).toBe(413);
  expect(f.deps.employees.create).not.toHaveBeenCalled();
  expect(
    (await f.app.inject({ method: "POST", url: "/api/employees/bulk", headers, payload: [large] }))
      .statusCode,
  ).toBe(200);
  expect(f.deps.employees.bulk).toHaveBeenCalledTimes(1);
  vi.mocked(f.deps.employees.bulk).mockClear();
  expect(
    (
      await f.app.inject({
        method: "POST",
        url: "/api/employees/bulk",
        headers,
        payload: [{ ...large, name: "x".repeat(10 * 1024 * 1024) }],
      })
    ).statusCode,
  ).toBe(413);
  expect(f.deps.employees.bulk).not.toHaveBeenCalled();
});
it("employees Excel handles pre-stream failure without hanging the request", async () => {
  const f = fixture();
  vi.mocked(f.deps.employees.exportExcel).mockRejectedValue(new Error("export unavailable"));
  const response = await f.app.inject({
    url: "/api/employees/export",
    headers: { authorization: `Bearer ${f.token()}` },
  });
  expect(response.statusCode).toBe(500);
  expect(response.body).toContain("Error al exportar empleados");
});

it("employees Excel preserves an error response already ended by its exporter", async () => {
  const f = fixture();
  vi.mocked(f.deps.employees.exportExcel).mockImplementation(async (output) => {
    output.status(500).json({ message: "Error al exportar empleados" });
    throw new Error("export failed after ending error response");
  });
  const response = await f.app.inject({
    url: "/api/employees/export",
    headers: { authorization: `Bearer ${f.token()}` },
  });
  expect(response.statusCode).toBe(500);
  expect(response.body).toBe(JSON.stringify({ message: "Error al exportar empleados" }));
});

it.each([
  {
    single: "/api/records",
    bulk: "/api/records/bulk",
    key: "records" as const,
    method: "bulk" as const,
    status: 200,
    body: { employeeId: "e", date: "2026-10-06" },
  },
  {
    single: "/api/shifts/patterns",
    bulk: "/api/shifts/patterns/bulk",
    key: "shifts" as const,
    method: "bulkPatterns" as const,
    status: 201,
    body: {
      name: "Pattern",
      cycleLengthDays: 7,
      startDayOfWeek: 0,
      dailySchedules: [],
      color: "red",
      maxHoursPattern: 40,
    },
  },
  {
    single: "/api/shifts/assignments",
    bulk: "/api/shifts/assignments/bulk",
    key: "shifts" as const,
    method: "bulkAssignments" as const,
    status: 201,
    body: { employeeId: "e", shiftPatternId: "p", startDate: "2026-10-06" },
  },
])(
  "$bulk enforces 1/10 MiB limits before invoking application",
  async ({ single, bulk, key, method, status, body }) => {
    const f = fixture();
    const headers = { authorization: `Bearer ${f.token()}` };
    const effect =
      key === "records"
        ? f.deps.records.bulk
        : method === "bulkPatterns"
          ? f.deps.shifts.bulkPatterns
          : f.deps.shifts.bulkAssignments;
    vi.mocked(effect).mockResolvedValue({ count: 1 });
    const large = { ...body, extra: "x".repeat(1024 * 1024) };
    expect(
      (await f.app.inject({ method: "POST", url: single, headers, payload: large })).statusCode,
    ).toBe(413);
    expect(effect).not.toHaveBeenCalled();
    expect(
      (await f.app.inject({ method: "POST", url: bulk, headers, payload: [large] })).statusCode,
    ).toBe(status);
    expect(effect).toHaveBeenCalledTimes(1);
    vi.mocked(effect).mockClear();
    expect(
      (
        await f.app.inject({
          method: "POST",
          url: bulk,
          headers,
          payload: [{ ...large, extra: "x".repeat(10 * 1024 * 1024) }],
        })
      ).statusCode,
    ).toBe(413);
    expect(effect).not.toHaveBeenCalled();
  },
);

it.each([
  "/api/leaves",
  "/api/corrections",
  "/api/kpis/summary",
  "/api/kpis/detailed-report",
  "/api/email/verify",
  "/api/email/config",
  "/api/email/rules",
  "/api/email/send-test",
  "/api/scheduled-reports",
])("%s enforces 1 MiB before effects", async (url) => {
  const f = fixture();
  const response = await f.app.inject({
    method: "POST",
    url,
    headers: { authorization: `Bearer ${f.token("admin", "Administrador")}` },
    payload: { extra: "x".repeat(1024 * 1024) },
  });
  expect(response.statusCode).toBe(413);
  expect(f.deps.leaves.upsert).not.toHaveBeenCalled();
  expect(f.deps.corrections.create).not.toHaveBeenCalled();
  expect(f.deps.kpis.summary).not.toHaveBeenCalled();
  expect(f.deps.kpis.detailed).not.toHaveBeenCalled();
  expect(f.deps.emailReports.verify).not.toHaveBeenCalled();
  expect(f.deps.emailReports.saveConfig).not.toHaveBeenCalled();
  expect(f.deps.emailReports.saveRules).not.toHaveBeenCalled();
  expect(f.deps.emailReports.send).not.toHaveBeenCalled();
  expect(f.deps.emailReports.create).not.toHaveBeenCalled();
});

it("shift reports reject oversized bodies and terminate unexpected pre-stream failure", async () => {
  const f = fixture();
  const headers = { authorization: `Bearer ${f.token()}` };
  expect(
    (
      await f.app.inject({
        method: "POST",
        url: "/api/shift-reports",
        headers,
        payload: { extra: "x".repeat(1024 * 1024) },
      })
    ).statusCode,
  ).toBe(413);
  expect(f.deps.shiftReports.save).not.toHaveBeenCalled();
  vi.mocked(f.deps.shiftReports.exportStream).mockRejectedValue(new Error("export unavailable"));
  const response = await f.app.inject({ url: "/api/shift-reports/export/missing", headers });
  expect(response.statusCode).toBe(500);
  expect(response.headers["content-type"]).toContain("application/json");
  expect(response.json().message).toBe("Error al exportar reporte de turno");
});
