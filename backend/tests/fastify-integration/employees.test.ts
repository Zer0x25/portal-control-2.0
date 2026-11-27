import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { userService } from "../../src/services/UserService";
import { SocketService } from "../../src/services/socketService";
import { requestContext } from "../../src/utils/context";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
let fastify: FastifyInstance;
let token: string;
let actorId: string;
const input = {
  id: "EMP-2001",
  name: "Ana Perez",
  rut: "12345678-9",
  email: "ana@example.test",
  position: "Operator",
  area: "Ops",
  workdayType: "Normal",
  pin: "9876",
};
const employeeEvents = () =>
  vi.mocked(SocketService.emit).mock.calls.filter(([event]) => event === "employee:updated");
function withoutPin(body: Record<string, unknown>) {
  expect(body).not.toHaveProperty("pin");
  expect(JSON.stringify(body)).not.toContain('"9876"');
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
  const user = await prismaDirect.user.create({
    data: { username: "employee-admin", role: "Super_Administrador", passwordHash: "test-only" },
  });
  actorId = user.id;
  token = (
    await AuthService.createSession(user.id, user.username, user.role, null, "employee-test")
  ).token;
  vi.spyOn(SocketService, "emit").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});

describe("Spec 013 employees on Fastify", () => {
  async function http(
    method: "GET" | "POST" | "PUT",
    url: string,
    payload?: Record<string, unknown> | Record<string, unknown>[],
    auth: string | null = token,
  ) {
    const headers = auth ? { authorization: `Bearer ${auth}` } : {};

    const response = await fastify.inject({ method, url, payload, headers });
    return { status: response.statusCode, body: response.body ? response.json() : undefined };
  }
  it("creates employee and linked user with usable forced-change credentials and no PIN exposure", async () => {
    const response = await http("POST", "/api/employees", { ...input, createUserAccount: true });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: input.id,
      area: "Ops",
      workdayType: "Normal",
      email: input.email,
    });
    withoutPin(response.body);
    const stored = await prismaDirect.employee.findUniqueOrThrow({ where: { id: input.id } });
    expect(bcrypt.compareSync(input.pin, stored.pin!)).toBe(true);
    const linked = await prismaDirect.user.findUniqueOrThrow({ where: { employeeId: input.id } });
    expect(linked.role).toBe("Usuario");
    expect(linked.isForcePasswordChange).toBe(true);
    expect(bcrypt.compareSync("123456", linked.passwordHash)).toBe(true);
    expect(employeeEvents()).toHaveLength(1);
    withoutPin(employeeEvents()[0][1] as Record<string, unknown>);
    const logs = await prismaDirect.auditLog.findMany({
      where: { action: "EMPLEADO_CREADO", category: "OPERATIONS" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].actorUsername).toBe("employee-admin");
  });
  it("rolls back both employee and linked user when ensure fails inside the direct transaction", async () => {
    const original = userService.ensureEmployeeUser.bind(userService);
    vi.spyOn(userService, "ensureEmployeeUser").mockImplementationOnce(async (data, actor, db) => {
      expect(requestContext.getStore()).toMatchObject({
        username: "employee-admin",
        skipTrigger: true,
      });
      expect(db).toBeDefined();
      await original(data, actor, db);
      throw new Error("failure after creating linked user");
    });
    const response = await http("POST", "/api/employees", { ...input, createUserAccount: true });
    expect(response.status).toBe(500);
    expect(await prismaDirect.employee.count()).toBe(0);
    expect(await prismaDirect.user.count()).toBe(1);
    expect(employeeEvents()).toHaveLength(0);
    expect(await prismaDirect.auditLog.count({ where: { action: "EMPLEADO_CREADO" } })).toBe(0);
    // Existing ensure emits user:updated before commit; its delivery is not transactional.
  });
  it("kiosk exposes only active six-field rows while regular GET requires authentication", async () => {
    await prismaDirect.employee.create({ data: input });
    await prismaDirect.employee.create({
      data: { ...input, id: "EMP-archived", rut: "99999999-9", status: "Archivado" },
    });
    const response = await http("GET", "/api/employees/kiosk", undefined, null);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: input.id,
        name: input.name,
        rutHash: crypto
          .createHash("sha256")
          .update(input.rut.replace(/\./g, "").toUpperCase())
          .digest("hex"),
        isPinBlocked: false,
        status: "Activo",
        area: "Ops",
        workdayType: input.workdayType,
      },
    ]);
    expect((await http("GET", "/api/employees", undefined, null)).status).toBe(401);
    // Kiosk ignores supplied bearer and always uses its public projection.
    expect((await http("GET", "/api/employees/kiosk")).body).toEqual(response.body);
  });
  it("returns minimal active clocking options and scopes Usuario to its own employee", async () => {
    await prismaDirect.employee.create({ data: input });
    await prismaDirect.employee.create({
      data: {
        ...input,
        id: "EMP-archived",
        name: "Archived Operator",
        rut: "99999999-9",
        status: "Archivado",
      },
    });
    await prismaDirect.employee.create({
      data: {
        ...input,
        id: "EMP-other-area",
        name: "Other Area Operator",
        rut: "88888888-8",
        area: "Other",
      },
    });

    expect((await http("GET", "/api/employees/clocking-options", undefined, null)).status).toBe(
      401,
    );
    const response = await http("GET", "/api/employees/clocking-options");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: input.id,
        name: input.name,
        position: input.position,
        area: input.area,
        workdayType: input.workdayType,
        status: "Activo",
      },
      {
        id: "EMP-other-area",
        name: "Other Area Operator",
        position: input.position,
        area: "Other",
        workdayType: input.workdayType,
        status: "Activo",
      },
    ]);
    expect(Object.keys(response.body[0]).sort()).toEqual(
      ["area", "id", "name", "position", "status", "workdayType"].sort(),
    );

    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Supervisor", employeeId: input.id },
    });
    expect((await http("GET", "/api/employees/clocking-options")).body).toEqual([
      {
        id: input.id,
        name: input.name,
        position: input.position,
        area: input.area,
        workdayType: input.workdayType,
        status: "Activo",
      },
    ]);

    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Usuario", employeeId: input.id },
    });
    expect((await http("GET", "/api/employees/clocking-options")).body).toEqual([
      {
        id: input.id,
        name: input.name,
        position: input.position,
        area: input.area,
        workdayType: input.workdayType,
        status: "Activo",
      },
    ]);

    await prismaDirect.user.update({
      where: { id: actorId },
      data: { employeeId: null },
    });
    expect((await http("GET", "/api/employees/clocking-options")).body).toEqual([]);
  });
  it("keeps filters, pagination, delta and persisted Usuario row scoping", async () => {
    await prismaDirect.employee.create({ data: input });
    await prismaDirect.employee.create({
      data: { ...input, id: "EMP-2002", name: "Other Operator", rut: "22222222-2", area: "Other" },
    });
    const response = await http(
      "GET",
      "/api/employees?page=1&pageSize=1&search=ana&area=Ops&status=Activo",
    );
    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({ total: 1, page: 1, totalPages: 1 });
    expect(response.body.data[0]).toMatchObject({
      id: input.id,
      syncStatus: "synced",
      isDeleted: false,
    });
    expect(typeof response.body.data[0].lastModified).toBe("number");
    withoutPin(response.body.data[0]);
    expect((await http("GET", `/api/employees?since=${Date.now() + 60000}`)).body).toEqual([]);
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Usuario", employeeId: input.id },
    });
    const scoped = await http("GET", "/api/employees");
    expect(scoped.status).toBe(200);
    expect(scoped.body.map((row: { id: string }) => row.id)).toEqual([input.id]);
  });
  it.each([
    ["POST", "/api/employees", input],
    ["POST", "/api/employees/bulk", [input]],
    ["PUT", "/api/employees/missing", { name: "Changed" }],
    ["GET", "/api/employees/export", undefined],
  ] as const)(
    "denies unauthenticated and persisted non-supervisor %s %s",
    async (method, url, body) => {
      const payload = body ? (Array.isArray(body) ? [...body] : { ...body }) : undefined;
      expect((await http(method, url, payload, null)).status).toBe(401);
      await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
      const denied = await http(method, url, payload);
      expect(denied.status).toBe(403);
      expect(denied.body).toMatchObject({
        code: "FORBIDDEN",
        message: "Acceso denegado: Se requieren permisos de Supervisor o superior",
      });
      expect(await prismaDirect.employee.count()).toBe(0);
      expect(employeeEvents()).toHaveLength(0);
    },
  );
  it("validates the entire bulk array before writing and preserves bulk success/count/upsert", async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      ...input,
      id: `EMP-bulk-${index}`,
      rut: `${10000000 + index}-0`,
    }));
    expect(
      (
        await http("POST", "/api/employees/bulk", [
          ...rows.slice(0, 50),
          { ...rows[50], name: "x" },
        ])
      ).status,
    ).toBe(400);
    expect(await prismaDirect.employee.count()).toBe(0);
    expect(employeeEvents()).toHaveLength(0);
    const response = await http("POST", "/api/employees/bulk", rows);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, count: 51 });
    expect(employeeEvents()).toEqual([["employee:updated", { count: 51 }]]);
    expect(
      (await http("POST", "/api/employees/bulk", [{ ...rows[0], name: "Replaced Name" }])).status,
    ).toBe(200);
    expect(await prismaDirect.employee.count()).toBe(51);
    expect(
      (await prismaDirect.employee.findUniqueOrThrow({ where: { id: rows[0].id } })).name,
    ).toBe("Replaced Name");
  });
  it("preserves conflicts, missing update and query/body validation before employee effects", async () => {
    expect((await http("POST", "/api/employees", { ...input, rut: "bad" })).status).toBe(400);
    expect((await http("GET", "/api/employees?search=a&search=b")).status).toBe(400);
    expect((await http("PUT", "/api/employees/missing", { name: "Valid Name" })).status).toBe(404);
    await prismaDirect.employee.create({ data: input });
    expect((await http("POST", "/api/employees", { ...input, id: "EMP-duplicate" })).status).toBe(
      409,
    );
    expect(employeeEvents()).toHaveLength(0);
  });
  it("archives and reactivates the linked user and retains legacy PIN flags behavior", async () => {
    await http("POST", "/api/employees", { ...input, createUserAccount: true });
    vi.mocked(SocketService.emit).mockClear();
    const archived = await http("PUT", `/api/employees/${input.id}`, {
      status: "Archivado",
      pin: null,
      createUserAccount: true,
    });
    expect(archived.status).toBe(200);
    withoutPin(archived.body);
    expect(
      (await prismaDirect.user.findUniqueOrThrow({ where: { employeeId: input.id } })).role,
    ).toBe("Archivado");
    expect(await prismaDirect.user.count()).toBe(2);
    const logs = await prismaDirect.auditLog.findMany({
      where: { category: "OPERATIONS", action: { startsWith: "EMPLEADO_ESTADO_CAMBIADO" } },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].actorUsername).toBe("employee-admin");
    const restored = await http("PUT", `/api/employees/${input.id}`, { status: "Activo" });
    expect(restored.status).toBe(200);
    const linked = await prismaDirect.user.findUniqueOrThrow({ where: { employeeId: input.id } });
    expect(linked.role).toBe("Usuario");
    expect(linked.isForcePasswordChange).toBe(true);
    const employee = await prismaDirect.employee.findUniqueOrThrow({ where: { id: input.id } });
    expect(employee.pin).not.toBe(input.rut.slice(0, 4));
    expect(bcrypt.compareSync(input.rut.slice(0, 4), employee.pin ?? "")).toBe(true);
    expect(employee.pinFailedAttempts).toBe(0);
    for (const [, event] of employeeEvents()) withoutPin(event as Record<string, unknown>);
  });
  it("allows all existing supervisor roles and reuses the linked account on update", async () => {
    for (const [index, role] of ["Supervisor", "Administrador", "Reloj_Control"].entries()) {
      await prismaDirect.user.update({ where: { id: actorId }, data: { role } });
      const response = await http("POST", "/api/employees", {
        ...input,
        id: `EMP-${role}`,
        rut: `${10000000 + index}-0`,
      });
      expect(response.status).toBe(201);
    }
    const response = await http("PUT", "/api/employees/EMP-SUPERVISOR", {
      name: "Renamed Supervisor",
      createUserAccount: true,
      pinFailedAttempts: 0,
      isPinBlocked: false,
    });
    expect(response.status).toBe(200);
    const first = await prismaDirect.user.findUniqueOrThrow({
      where: { employeeId: "EMP-SUPERVISOR" },
    });
    expect(
      (await http("PUT", "/api/employees/EMP-SUPERVISOR", { createUserAccount: true })).status,
    ).toBe(200);
    expect(
      (await prismaDirect.user.findUniqueOrThrow({ where: { employeeId: "EMP-SUPERVISOR" } })).id,
    ).toBe(first.id);
  });
  it("exports a filtered valid streaming XLSX with legacy headers and no PIN column/value", async () => {
    await prismaDirect.employee.create({ data: input });
    await prismaDirect.employee.create({
      data: { ...input, id: "EMP-other", rut: "22222222-2", area: "Other" },
    });
    const url = "/api/employees/export?area=Ops&status=Activo&search=Ana";
    let bytes: Buffer;
    let status: number;
    let headers: Record<string, unknown>;

    const response = await fastify.inject({ url, headers: { authorization: `Bearer ${token}` } });
    bytes = response.rawPayload;
    status = response.statusCode;
    headers = response.headers;

    expect(status).toBe(200);
    expect(headers["content-type"]).toContain("spreadsheetml.sheet");
    expect(headers["content-disposition"]).toBe("attachment; filename=lista_empleados.xlsx");
    const workbook = new ExcelJS.Workbook();
    // ExcelJS shadows Node Buffer with an incompatible ambient type; derive its input type.
    await workbook.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    const sheet = workbook.getWorksheet("Empleados")!;
    expect(sheet.rowCount).toBe(2);
    expect(sheet.getRow(1).values).toEqual([
      undefined,
      "ID",
      "Nombre",
      "RUT",
      "Email",
      "Cargo",
      "Área",
      "Tipo Jornada",
      "Estado",
    ]);
    expect(sheet.getRow(2).getCell(1).value).toBe(input.id);
    expect(JSON.stringify(sheet.getRow(2).values)).not.toContain(input.pin);
  });

  it("[BUG-19] hashes bulk PINs on createBulk and resets PIN block counters when pin is cleared to null", async () => {
    const bulkRes = await http("POST", "/api/employees/bulk", [
      {
        id: "EMP-BULK-1",
        name: "Bulk Worker",
        rut: "33333333-3",
        position: "Operario",
        area: "Planta",
        workdayType: "Normal",
        pin: "4567",
      },
    ]);
    expect(bulkRes.status).toBe(200);
    const bulkEmp = await prismaDirect.employee.findUniqueOrThrow({ where: { id: "EMP-BULK-1" } });
    expect(bulkEmp.pin).not.toBe("4567");
    expect(bcrypt.compareSync("4567", bulkEmp.pin ?? "")).toBe(true);

    await prismaDirect.employee.update({
      where: { id: "EMP-BULK-1" },
      data: { isPinBlocked: true, pinFailedAttempts: 5 },
    });
    const clearPin = await http("PUT", "/api/employees/EMP-BULK-1", { pin: null });
    expect(clearPin.status).toBe(200);
    const clearedEmp = await prismaDirect.employee.findUniqueOrThrow({
      where: { id: "EMP-BULK-1" },
    });
    expect(clearedEmp.pin).toBeNull();
    expect(clearedEmp.isPinBlocked).toBe(false);
    expect(clearedEmp.pinFailedAttempts).toBe(0);
  });

  it("[BUG-11] archiving employee archives linked user, deletes sessions, and disconnects sockets", async () => {
    const forceUserSpy = vi
      .spyOn(SocketService, "emitForceLogoutToUser")
      .mockImplementation(() => {});
    const forceEmpSpy = vi
      .spyOn(SocketService, "emitForceLogoutToEmployee")
      .mockImplementation(() => {});

    const created = await http("POST", "/api/employees", {
      ...input,
      id: "EMP-ARCHIVE-1",
      rut: "44444444-4",
      createUserAccount: true,
    });
    expect(created.status).toBe(201);
    const linked = await prismaDirect.user.findUniqueOrThrow({
      where: { employeeId: "EMP-ARCHIVE-1" },
    });
    const sess = await AuthService.createSession(
      linked.id,
      linked.username,
      linked.role,
      "EMP-ARCHIVE-1",
      "kiosk-ua",
    );

    const archived = await http("PUT", "/api/employees/EMP-ARCHIVE-1", { status: "Archivado" });
    expect(archived.status).toBe(200);
    const archivedUser = await prismaDirect.user.findUniqueOrThrow({ where: { id: linked.id } });
    expect(archivedUser.role).toBe("Archivado");
    expect(await prismaDirect.activeSession.count({ where: { userId: linked.id } })).toBe(0);
    expect(forceUserSpy).toHaveBeenCalledWith(
      linked.id,
      expect.objectContaining({ reason: "SESSION_INVALIDATED" }),
    );
    expect(forceEmpSpy).toHaveBeenCalledWith(
      "EMP-ARCHIVE-1",
      expect.objectContaining({ reason: "SESSION_INVALIDATED" }),
    );
    expect(
      (
        await fastify.inject({
          url: "/api/holidays",
          headers: { authorization: `Bearer ${sess.token}` },
        })
      ).statusCode,
    ).toBe(401);
  });

  it("[Spec 116] normalizes dotted RUT for initial PIN, emits sync metadata on POST, resolves concurrent EMP-N atomically, and validates query/scoping", async () => {
    // 1. POST without PIN and with dotted RUT -> hashes normalized first 4 digits & includes sync metadata
    const created = await http("POST", "/api/employees", {
      name: "RUT Normalizado",
      rut: "12.345.678-9",
      position: "Operario",
      area: "Ops",
      workdayType: "Normal",
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      id: "EMP-1001",
      syncStatus: "synced",
      isDeleted: false,
    });
    expect(typeof created.body.lastModified).toBe("number");
    const stored = await prismaDirect.employee.findUniqueOrThrow({ where: { id: "EMP-1001" } });
    expect(bcrypt.compareSync("1234", stored.pin ?? "")).toBe(true);

    // 2. Concurrent POST without explicit ID -> no 409 collisions, sequential numeric EMP-N
    const concurrent = await Promise.all(
      Array.from({ length: 4 }, (_, idx) =>
        http("POST", "/api/employees", {
          name: `Concurrent ${idx}`,
          rut: `${20000000 + idx}-1`,
          position: "Operario",
          area: idx % 2 === 0 ? "Ops" : "Other",
          workdayType: "Normal",
        }),
      ),
    );
    expect(concurrent.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    const createdIds = concurrent.map((r) => r.body.id as string).sort();
    expect(createdIds).toEqual(["EMP-1002", "EMP-1003", "EMP-1004", "EMP-1005"]);

    // 3. Invalid pagination query params -> 400 VALIDATION_ERROR
    for (const qs of [
      "page=0&pageSize=1",
      "page=-1&pageSize=1",
      "page=abc&pageSize=1",
      "page=1&pageSize=201",
    ]) {
      const bad = await http("GET", `/api/employees?${qs}`);
      expect(bad.status).toBe(400);
      expect(bad.body.code).toBe("VALIDATION_ERROR");
    }

    // 4. Role scoping: Usuario without employeeId -> []; Supervisor -> only own area
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Usuario", employeeId: null },
    });
    expect((await http("GET", "/api/employees")).body).toEqual([]);
    expect((await http("GET", "/api/employees?page=1&pageSize=10")).body).toEqual({
      data: [],
      pagination: { total: 0, page: 1, totalPages: 0 },
    });

    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Supervisor", employeeId: "EMP-1001" },
    });
    const supList = await http("GET", "/api/employees");
    expect(supList.status).toBe(200);
    expect(supList.body.every((e: { area: string }) => e.area === "Ops")).toBe(true);
    expect(supList.body.length).toBe(3);
  });
});
