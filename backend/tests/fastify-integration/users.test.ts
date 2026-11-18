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
      role: "Supervisor_Elevado",
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

  it("enforces admin-only mustChangePassword and revokes sessions/sockets on password or role change", async () => {
    const crypto = await import("node:crypto");
    const forceLogoutSpy = vi
      .spyOn(SocketService, "emitForceLogoutToUser")
      .mockImplementation(() => {});

    const created = await http("POST", "/api/users", {
      username: "revoke-target",
      password: "initial-password-1",
      role: "Reloj_Control",
    });
    expect(created.status).toBe(201);
    const targetId = created.body.id as string;

    const firstSess = await AuthService.createSession(
      targetId,
      "revoke-target",
      "Reloj_Control",
      null,
      "browser-1",
    );
    const secondSess = await AuthService.createSession(
      targetId,
      "revoke-target",
      "Reloj_Control",
      null,
      "browser-2",
    );

    // Non-admin attempting to set mustChangePassword must be rejected with 403
    const nonAdminAttempt = await http(
      "PUT",
      `/api/users/${targetId}`,
      { password: "changed-self-1", mustChangePassword: false },
      firstSess.token,
    );
    expect(nonAdminAttempt.status).toBe(403);

    // Voluntary self-password change revokes EXCEPT_CURRENT session
    const selfChange = await http(
      "PUT",
      `/api/users/${targetId}`,
      { password: "changed-self-2" },
      firstSess.token,
    );
    expect(selfChange.status).toBe(200);
    const firstHash = crypto.createHash("sha256").update(firstSess.token).digest("hex");
    const secondHash = crypto.createHash("sha256").update(secondSess.token).digest("hex");
    expect(
      await prismaDirect.activeSession.findUnique({ where: { tokenHash: firstHash } }),
    ).not.toBeNull();
    expect(
      await prismaDirect.activeSession.findUnique({ where: { tokenHash: secondHash } }),
    ).toBeNull();
    expect(forceLogoutSpy).toHaveBeenCalledWith(
      targetId,
      expect.objectContaining({
        reason: "SESSION_INVALIDATED",
        exceptTokenHash: firstHash,
      }),
    );

    // Admin changing role or archiving revokes ALL sessions
    forceLogoutSpy.mockClear();
    const adminRoleChange = await http("PUT", `/api/users/${targetId}`, {
      role: "Supervisor_Elevado",
      mustChangePassword: true,
    });
    expect(adminRoleChange.status).toBe(200);
    expect(adminRoleChange.body.mustChangePassword).toBe(true);
    expect(await prismaDirect.activeSession.count({ where: { userId: targetId } })).toBe(0);
    expect(forceLogoutSpy).toHaveBeenCalledWith(
      targetId,
      expect.objectContaining({ reason: "SESSION_INVALIDATED" }),
    );
  });

  it("[Spec 116] validates pagination, supports employeeId: null, blocks self-delete, and enforces Supervisor_Elevado hierarchy", async () => {
    // 1. Invalid pagination -> 400 VALIDATION_ERROR
    for (const qs of [
      "page=0&pageSize=1",
      "page=-1&pageSize=1",
      "page=abc&pageSize=1",
      "page=1&pageSize=201",
    ]) {
      const bad = await http("GET", `/api/users?${qs}`);
      expect(bad.status).toBe(400);
      expect(bad.body.code).toBe("VALIDATION_ERROR");
    }

    // 2. Self-delete blocked
    const admin = await prismaDirect.user.findUniqueOrThrow({ where: { username: "dto-admin" } });
    const selfDelete = await http("DELETE", `/api/users/${admin.id}`);
    expect(selfDelete.status).toBe(400);
    expect(await prismaDirect.user.findUnique({ where: { id: admin.id } })).not.toBeNull();

    // 3. employeeId: null unlinks employee & blank username rejected
    const emp = await prismaDirect.employee.create({
      data: {
        id: "EMP-UNLINK-1",
        name: "Unlink Test",
        rut: "55555555-5",
        position: "Op",
        area: "Ops",
        workdayType: "Normal",
      },
    });
    const linked = await http("POST", "/api/users", {
      username: "unlink-user",
      password,
      role: "Usuario",
      employeeId: emp.id,
    });
    expect(linked.status).toBe(201);
    expect((await http("PUT", `/api/users/${linked.body.id}`, { username: "   " })).status).toBe(
      400,
    );
    const unlinked = await http("PUT", `/api/users/${linked.body.id}`, { employeeId: null });
    expect(unlinked.status).toBe(200);
    expect(unlinked.body.employeeId).toBeNull();

    // 4. Supervisor_Elevado can manage non-Admin users but gets 403 for Admin targets/escalation
    const elevated = await prismaDirect.user.create({
      data: {
        username: "elevated-mgr",
        role: "Supervisor_Elevado",
        passwordHash: "hash",
      },
    });
    const elevatedToken = (
      await AuthService.createSession(
        elevated.id,
        elevated.username,
        elevated.role,
        null,
        "elevated-test",
      )
    ).token;

    // Allowed: create Usuario
    const createdByElevated = await http(
      "POST",
      "/api/users",
      { username: "by-elevated", password, role: "Usuario" },
      elevatedToken,
    );
    expect(createdByElevated.status).toBe(201);

    // Forbidden: create Administrador
    expect(
      (
        await http(
          "POST",
          "/api/users",
          { username: "forged-admin", password, role: "Administrador" },
          elevatedToken,
        )
      ).status,
    ).toBe(403);

    // Allowed: edit non-Admin
    expect(
      (
        await http(
          "PUT",
          `/api/users/${createdByElevated.body.id}`,
          { role: "Supervisor" },
          elevatedToken,
        )
      ).status,
    ).toBe(200);

    // Forbidden: escalate to Administrador or edit Administrador
    expect(
      (
        await http(
          "PUT",
          `/api/users/${createdByElevated.body.id}`,
          { role: "Administrador" },
          elevatedToken,
        )
      ).status,
    ).toBe(403);
    expect(
      (await http("PUT", `/api/users/${admin.id}`, { username: "hacked" }, elevatedToken)).status,
    ).toBe(403);

    // Forbidden: delete Administrador
    expect((await http("DELETE", `/api/users/${admin.id}`, undefined, elevatedToken)).status).toBe(
      403,
    );

    // Allowed: delete non-Admin
    expect(
      (await http("DELETE", `/api/users/${createdByElevated.body.id}`, undefined, elevatedToken))
        .status,
    ).toBe(204);
  });
});
