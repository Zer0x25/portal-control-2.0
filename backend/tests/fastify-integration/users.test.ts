import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import type { FastifyInstance } from "fastify";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { UserService } from "../../src/services/UserService";
import { SocketService } from "../../src/services/socketService";
import { UserSchema } from "../../src/models/schemas/auth-user.schemas";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
let token: string;
let fastify: FastifyInstance;
const password = "user-dto-test-password";
function assertSafe(payload: Record<string, unknown>) {
  expect(UserSchema.safeParse(payload).success).toBe(true);
  for (const key of [
    "passwordHash",
    "password",
    "mfaSecret",
    "mfaFailedAttempts",
    "mfaBlockedUntil",
    "mfaFailureWindowStartedAt",
    "isForcePasswordChange",
  ])
    expect(payload).not.toHaveProperty(key);
  expect(JSON.stringify(payload)).not.toContain("private-admin-mfa");
  expect(UserSchema.safeParse({ ...payload, passwordHash: "leak" }).success).toBe(false);
}
beforeAll(async () => {
  await assertConnectedToTestDb();
  fastify = createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  });
  await fastify.ready();
});
beforeEach(async () => {
  await resetIntegrationDb();
  const admin = await prismaDirect.user.create({
    data: {
      username: "dto-admin",
      role: "Administrador",
      passwordHash: bcrypt.hashSync(password, 4),
      mfaEnabled: true,
      mfaSecret: "private-admin-mfa",
    },
  });
  token = (await AuthService.createSession(admin.id, admin.username, admin.role, null, "dto-test"))
    .token;
  vi.spyOn(SocketService, "emit").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
describe("Spec 012 users on Fastify HTTP and PostgreSQL", () => {
  async function http(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    body?: Record<string, unknown>,
    auth: string | null = token,
  ) {
    const headers = auth ? { authorization: `Bearer ${auth}` } : {};

    const response = await fastify.inject({ method, url, headers, payload: body });
    return {
      status: response.statusCode,
      body: response.body ? response.json() : undefined,
      text: response.body,
    };
  }

  it("list and pagination expose public MFA/force flags and normalized roles without secrets", async () => {
    const target = await prismaDirect.user.create({
      data: {
        username: "dto-target",
        role: "Supervisor_Elevado",
        passwordHash: "private-target-hash",
        mfaSecret: "private-target-mfa",
        mfaEnabled: true,
        isForcePasswordChange: true,
      },
    });
    const plain = await http("GET", "/api/users");
    expect(plain.status).toBe(200);
    expect(plain.body).toHaveLength(2);
    for (const item of plain.body) assertSafe(item);
    const paginated = await http("GET", "/api/users?page=1&pageSize=1&search=dto-target");
    expect(paginated.status).toBe(200);
    expect(paginated.body.pagination).toEqual({ total: 1, page: 1, totalPages: 1 });
    assertSafe(paginated.body.data[0]);
    expect(paginated.body.data[0]).toMatchObject({
      id: target.id,
      role: "Supervisor Elevado",
      mfaEnabled: true,
      mustChangePassword: true,
    });
  });
  it("HTTP create persists a usable hash while response and socket payload contain no credential", async () => {
    const response = await http("POST", "/api/users", {
      username: "dto-created",
      password,
      role: "Supervisor",
    });
    expect(response.status).toBe(201);
    assertSafe(response.body);
    expect(response.body).toMatchObject({
      mustChangePassword: true,
      mfaEnabled: false,
      employeeId: null,
    });
    const dbUser = await prismaDirect.user.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(bcrypt.compareSync(password, dbUser.passwordHash)).toBe(true);
    const emitted = vi.mocked(SocketService.emit).mock.calls[0];
    expect(emitted[0]).toBe("user:updated");
    expect(emitted[1]).toEqual(response.body);
    assertSafe(emitted[1] as Record<string, unknown>);
  });
  it("HTTP update preserves private MFA state and persists new password without emitting either", async () => {
    const actor = await prismaDirect.user.findUniqueOrThrow({ where: { username: "dto-admin" } });
    const changed = "changed-dto-password";
    const response = await http("PUT", `/api/users/${actor.id}`, { password: changed });
    expect(response.status).toBe(200);
    assertSafe(response.body);
    expect(response.body).toMatchObject({ mustChangePassword: false, mfaEnabled: true });
    const stored = await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } });
    expect(stored.mfaSecret).toBe("private-admin-mfa");
    expect(bcrypt.compareSync(changed, stored.passwordHash)).toBe(true);
    const emitted = vi.mocked(SocketService.emit).mock.calls[0][1];
    expect(emitted).toEqual(response.body);
    assertSafe(emitted as Record<string, unknown>);
  });
  it("linked employee creation/reuse stays public, stores password and emits only on creation", async () => {
    const employee = await prismaDirect.employee.create({
      data: {
        id: "dto-employee",
        name: "Ana Perez",
        rut: "12345678-9",
        position: "Operator",
        area: "Ops",
        workdayType: "Normal",
      },
    });
    const service = new UserService();
    const created = await service.ensureEmployeeUser(
      { employeeId: employee.id, fullName: employee.name, defaultPassword: password },
      "dto-admin",
    );
    const existing = await service.ensureEmployeeUser(
      { employeeId: employee.id, fullName: employee.name },
      "dto-admin",
    );
    assertSafe({ ...created });
    expect(existing).toEqual(created);
    expect(vi.mocked(SocketService.emit)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(SocketService.emit).mock.calls[0][1]).toEqual(created);
    const stored = await prismaDirect.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(bcrypt.compareSync(password, stored.passwordHash)).toBe(true);
  });
  it.each(["GET", "POST", "PUT", "DELETE"] as const)(
    "denies unauthenticated and persisted non-admin %s before effects",
    async (method) => {
      const url = method === "PUT" || method === "DELETE" ? "/api/users/missing" : "/api/users";
      const body =
        method === "POST" || method === "PUT"
          ? { username: "bad", password, role: "Supervisor" }
          : undefined;
      expect((await http(method, url, body, null)).status).toBe(401);
      const user = await prismaDirect.user.findUniqueOrThrow({
        where: { username: "dto-admin" },
      });
      // JWT still claims admin; authorization must consult the persisted role.
      await prismaDirect.user.update({ where: { id: user.id }, data: { role: "Supervisor" } });
      const denied = await http(method, url, body);
      expect(denied.status).toBe(403);
      expect(denied.body).toMatchObject({
        code: "FORBIDDEN",
        message: "Acceso denegado: Se requieren permisos de Administrador",
      });
      expect(await prismaDirect.user.count()).toBe(1);
      expect(vi.mocked(SocketService.emit)).not.toHaveBeenCalled();
    },
  );
  it("rejects invalid bodies/query and ignores injected security fields", async () => {
    expect(
      (
        await http("POST", "/api/users", {
          username: "x",
          password: "bad",
          role: "Administrador",
        })
      ).status,
    ).toBe(400);
    expect((await http("GET", "/api/users?role=a&role=b")).status).toBe(400);
    const response = await http("POST", "/api/users", {
      username: "secure-user",
      password,
      role: "Supervisor",
      mfaEnabled: true,
      mfaSecret: "injected",
      isForcePasswordChange: false,
    });
    expect(response.status).toBe(201);
    const stored = await prismaDirect.user.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored.mfaEnabled).toBe(false);
    expect(stored.mfaSecret).toBeNull();
    expect(stored.isForcePasswordChange).toBe(true);
  });
  it("returns conflicts/not-found and emits deletion tombstone only after success", async () => {
    expect(
      (await http("POST", "/api/users", { username: "dto-admin", password, role: "Supervisor" }))
        .status,
    ).toBe(409);
    expect((await http("PUT", "/api/users/missing", { username: "missing" })).status).toBe(404);
    expect((await http("DELETE", "/api/users/missing")).status).toBe(404);
    expect(vi.mocked(SocketService.emit)).not.toHaveBeenCalled();
    const created = await http("POST", "/api/users", {
      username: "delete-me",
      password,
      role: "Supervisor",
    });
    vi.mocked(SocketService.emit).mockClear();
    const deleted = await http("DELETE", `/api/users/${created.body.id}`);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(await prismaDirect.user.findUnique({ where: { id: created.body.id } })).toBeNull();
    expect(vi.mocked(SocketService.emit)).toHaveBeenCalledWith("user:updated", {
      id: created.body.id,
      isDeleted: true,
    });
    const entries = await prismaDirect.auditLog.findMany({
      where: { action: "USER_DELETE", category: "OPERATIONS" },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].actorUsername).toBe("dto-admin");
  });
  it("keeps employee search, role filter, delta and link disconnect semantics", async () => {
    const employee = await prismaDirect.employee.create({
      data: {
        id: "linked-user-employee",
        name: "Carla Navarro",
        rut: "11111111-1",
        position: "Operator",
        area: "Ops",
        workdayType: "Normal",
      },
    });
    const created = await http("POST", "/api/users", {
      username: "linked-user",
      password,
      role: "Supervisor_Elevado",
      employeeId: employee.id,
    });
    expect(created.status).toBe(201);
    const filtered = await http(
      "GET",
      "/api/users?search=Carla&role=Supervisor%20Elevado&page=1&pageSize=10",
    );
    expect(filtered.body.pagination).toEqual({ total: 1, page: 1, totalPages: 1 });
    expect(filtered.body.data[0].id).toBe(created.body.id);
    expect((await http("GET", "/api/users?page=1")).body).toHaveLength(2);
    expect((await http("GET", `/api/users?since=${Date.now() + 60000}`)).body).toEqual([]);
    const disconnected = await http("PUT", `/api/users/${created.body.id}`, { employeeId: "" });
    expect(disconnected.status).toBe(200);
    expect(disconnected.body.employeeId).toBeNull();
    expect(
      await prismaDirect.user.findUniqueOrThrow({ where: { id: created.body.id } }),
    ).toMatchObject({ employeeId: null });
  });
  it("preserves legacy explicit identifiers and password flag overrides", async () => {
    const created = await http("POST", "/api/users", {
      id: "legacy-user-id",
      username: "legacy-user",
      password,
      role: "Usuario",
    });
    expect(created.status).toBe(201);
    expect(created.body.id).toBe("legacy-user-id");
    const override = await http("PUT", "/api/users/legacy-user-id", {
      password: "override-password",
      mustChangePassword: false,
      isForcePasswordChange: true,
    });
    expect(override.status).toBe(200);
    expect(override.body.mustChangePassword).toBe(true);
    assertSafe(override.body);
    const stored = await prismaDirect.user.findUniqueOrThrow({ where: { id: "legacy-user-id" } });
    expect(bcrypt.compareSync("override-password", stored.passwordHash)).toBe(true);
  });
});
