import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import expressApp from "../../src/app";
import { prismaDirect, closeDatabase } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { UserService } from "../../src/services/UserService";
import { SocketService } from "../../src/services/socketService";
import { UserSchema } from "../../src/models/schemas/auth-user.schemas";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
let token: string;
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
beforeAll(assertConnectedToTestDb);
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
  await closeDatabase();
});
describe("Spec 011 public users on actual Express HTTP and PostgreSQL", () => {
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
    const plain = await request(expressApp)
      .get("/api/users")
      .set("authorization", `Bearer ${token}`);
    expect(plain.status).toBe(200);
    expect(plain.body).toHaveLength(2);
    for (const item of plain.body) assertSafe(item);
    const paginated = await request(expressApp)
      .get("/api/users?page=1&pageSize=1&search=dto-target")
      .set("authorization", `Bearer ${token}`);
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
    const response = await request(expressApp)
      .post("/api/users")
      .set("authorization", `Bearer ${token}`)
      .send({ username: "dto-created", password, role: "Supervisor" });
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
    const response = await request(expressApp)
      .put(`/api/users/${actor.id}`)
      .set("authorization", `Bearer ${token}`)
      .send({ password: changed });
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
});
