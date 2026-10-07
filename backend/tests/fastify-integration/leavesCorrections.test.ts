import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { SocketService } from "../../src/services/socketService";
import { getChileDateISO, addBusinessDaysChile } from "../../src/utils/timeUtils";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
const employee = {
  id: "absence-emp",
  name: "Absence Employee",
  rut: "12345678-9",
  position: "Operator",
  area: "Ops",
  workdayType: "Normal",
};
const today = () => getChileDateISO(new Date());
const date = (offset: number) => addBusinessDaysChile(today(), offset);
const leave = (patch = {}) => ({
  employeeId: employee.id,
  type: "Vacaciones",
  startDate: date(1),
  endDate: date(2),
  ...patch,
});
const correction = (patch = {}) => ({
  employeeId: employee.id,
  timeRecordId: "correction-record",
  recordField: "salida",
  currentValue: "",
  requestedValue: `${today()}T20:00:00.000Z`,
  reason: "Missing exit",
  ...patch,
});
async function seedRecord(patch = {}) {
  return prismaDirect.timeRecord.create({
    data: {
      id: "correction-record",
      employeeId: employee.id,
      employeeName: employee.name,
      employeeWorkdayType: "Normal",
      date: today(),
      entrada: `${today()}T12:00:00.000Z`,
      status: "AnomaliaManual",
      ...patch,
    },
  });
}
async function seedRequest(patch = {}) {
  await seedRecord();
  return prismaDirect.correctionRequest.create({
    data: {
      id: "correction-request",
      employeeId: employee.id,
      timeRecordId: "correction-record",
      recordField: "salida",
      originalValue: "",
      requestedValue: `${today()}T20:00:00.000Z`,
      reason: "Missing exit",
      ...patch,
    },
  });
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
  await prismaDirect.employee.create({ data: employee });
  const actor = await prismaDirect.user.create({
    data: {
      username: "absence-admin",
      role: "Administrador",
      passwordHash: "test-only",
      employeeId: employee.id,
    },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, employee.id, "spec016")
  ).token;
  vi.spyOn(SocketService, "emit").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
const routes = [
  ["GET", "/api/leaves", true],
  ["POST", "/api/leaves", true],
  ["DELETE", "/api/leaves/missing", true],
  ["GET", "/api/corrections", false],
  ["GET", "/api/corrections/stats", false],
  ["GET", "/api/corrections/missing/history", false],
  ["POST", "/api/corrections", false],
  ["PATCH", "/api/corrections/missing/status", true],
] as const;
describe.each(["Express", "Fastify"] as const)("Spec 016 leaves/corrections on %s", (server) => {
  const http = httpClient(
    server,
    () => fastify,
    () => token,
  );
  it("materializes Chile dates, preserves punched records and seals generated rows", async () => {
    const punched = await seedRecord({ date: date(1), status: "En Curso" });
    const response = await http(
      "POST",
      "/api/leaves",
      leave({ id: "leave-real", endDate: date(3), extra: "discarded" }),
    );
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: { id: "leave-real", startDate: date(1), endDate: date(3) },
    });
    const records = await prismaDirect.timeRecord.findMany({ orderBy: { date: "asc" } });
    expect(records.map((r) => r.date)).toEqual([date(1), date(2), date(3)]);
    expect(records[0]).toMatchObject({ entrada: punched.entrada, status: "En Curso" });
    for (const r of records.slice(1)) {
      expect(r.status).toBe("Vacaciones");
      expect(r.integrityHash).toBeTruthy();
      expect(JSON.parse(r.justification!)).toMatchObject({ leaveId: "leave-real" });
    }
    expect(SocketService.emit).toHaveBeenCalledWith(
      "leave:updated",
      expect.objectContaining({ id: "leave-real" }),
    );
    const listed = await http("GET", "/api/leaves?page=1&pageSize=5");
    expect(listed.body).toMatchObject({
      success: true,
      meta: { total: 1, page: 1, pageSize: 5, totalPages: 1 },
    });
    expect(listed.body.data[0]).toMatchObject({
      lastModified: expect.any(Number),
      syncStatus: "synced",
      isDeleted: false,
    });
  });
  it("extends leave and archives future unpunched days on deletion while retaining punched precedence", async () => {
    const saved = await http("POST", "/api/leaves", leave({ id: "leave-edit" }));
    expect(saved.status).toBe(201);
    await prismaDirect.timeRecord.updateMany({
      where: { date: date(2) },
      data: { entrada: `${date(2)}T12:00:00.000Z`, status: "En Curso" },
    });
    expect(
      (await http("POST", "/api/leaves", leave({ id: "leave-edit", endDate: date(3) }))).status,
    ).toBe(201);
    // Existing cleanup archives day 1, and materializeDays never resets its isDeleted flag.
    const extendedRows = await prismaDirect.timeRecord.findMany({ orderBy: { date: "asc" } });
    expect(extendedRows.map((r) => r.isDeleted)).toEqual([true, false, false]);
    const deleted = await http("DELETE", "/api/leaves/leave-edit");
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ success: true, message: "Ausencia finalizada" });
    expect(
      await prismaDirect.leaveRecord.findUnique({ where: { id: "leave-edit" } }),
    ).toMatchObject({ isDeleted: true, endDate: date(-1) });
    const rows = await prismaDirect.timeRecord.findMany({ orderBy: { date: "asc" } });
    expect(rows.map((r) => r.isDeleted)).toEqual([true, false, true]);
    expect((await http("GET", "/api/leaves?showArchived=true")).body.data).toHaveLength(0);
    const delta = await http("GET", "/api/leaves?showArchived=true&since=1");
    expect(delta.body.data[0].isDeleted).toBe(true);
    expect((await http("DELETE", "/api/leaves/missing")).status).toBe(404);
  });
  it("maps seven-day and immutable/finalized/past-end/archive-protection failures", async () => {
    expect((await http("POST", "/api/leaves", leave({ startDate: date(-8) }))).status).toBe(400);
    await http("POST", "/api/leaves", leave({ id: "leave-rules", startDate: today() }));
    expect(
      (
        await http(
          "POST",
          "/api/leaves",
          leave({ id: "leave-rules", startDate: today(), type: "Otro" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await http(
          "POST",
          "/api/leaves",
          leave({ id: "leave-rules", startDate: today(), endDate: date(-1) }),
        )
      ).status,
    ).toBe(400);
    await prismaDirect.leaveRecord.create({
      data: {
        id: "archived",
        ...leave({ startDate: date(-2), endDate: date(-1) }),
        createdAt: new Date(Date.now() - 48 * 3600000),
      },
    });
    expect((await http("DELETE", "/api/leaves/archived")).status).toBe(400);
    expect(
      (await http("POST", "/api/leaves", leave({ id: "archived", startDate: date(-2) }))).status,
    ).toBe(400);
    await prismaDirect.leaveRecord.create({
      data: { id: "old", ...leave({ startDate: date(-9), endDate: date(-8) }) },
    });
    expect((await http("DELETE", "/api/leaves/old")).status).toBe(400);
    expect((await http("POST", "/api/leaves", leave({ startDate: "not-a-date" }))).status).toBe(
      400,
    );
  });
  it("characterizes existing overlap allowance without adding a conflict rule", async () => {
    expect((await http("POST", "/api/leaves", leave())).status).toBe(201);
    expect((await http("POST", "/api/leaves", leave({ type: "Permiso Especial" }))).status).toBe(
      201,
    );
    expect(await prismaDirect.leaveRecord.count()).toBe(2);
    expect(await prismaDirect.timeRecord.count()).toBe(2);
  });
  it("allows Reloj_Control leaves but refuses correction resolution", async () => {
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Reloj_Control" } });
    expect((await http("POST", "/api/leaves", leave())).status).toBe(201);
    expect((await http("GET", "/api/leaves")).status).toBe(200);
    expect(
      (
        await http("PATCH", "/api/corrections/missing/status", {
          status: "approved",
          resolvedBy: "actor",
        })
      ).status,
    ).toBe(403);
  });
  it("validates correction input and denies foreign ownership with the exact legacy payload", async () => {
    await seedRecord();
    expect(
      (await http("POST", "/api/corrections", correction({ requestedValue: "07:55" }))).status,
    ).toBe(400);
    expect(
      (await http("POST", "/api/corrections", correction({ recordField: "invalid" }))).status,
    ).toBe(400);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    const foreign = await http("POST", "/api/corrections", correction({ employeeId: "foreign" }));
    expect(foreign.status).toBe(403);
    expect(foreign.body).toEqual({
      message: "Acceso denegado: Solo puede crear solicitudes para su propio registro.",
    });
    expect(await prismaDirect.correctionRequest.count()).toBe(0);
    const own = await http("POST", "/api/corrections", correction());
    expect(own.status).toBe(201);
    // currentValue is not remapped to originalValue by the existing service.
    expect(own.body).toMatchObject({ status: "pending", originalValue: "" });
    expect(
      await prismaDirect.auditLog.findFirst({ where: { action: "CORRECTION_REQUEST_CREATED" } }),
    ).toMatchObject({ actorUsername: "absence-admin" });
  });
  it("scopes list/stats/history to linked Usuario and returns missing/foreign history errors", async () => {
    const own = await seedRequest();
    await prismaDirect.employee.create({ data: { ...employee, id: "foreign", rut: "22222222-2" } });
    await seedRecord({ id: "external-record", employeeId: "foreign" });
    await prismaDirect.correctionRequest.create({
      data: {
        originalValue: "",
        employeeId: "foreign",
        timeRecordId: "external-record",
        recordField: "entrada",
        requestedValue: `${today()}T12:00:00.000Z`,
        reason: "Foreign",
        status: "pending",
      },
    });
    const foreign = await prismaDirect.correctionRequest.findFirstOrThrow({
      where: { employeeId: "foreign" },
    });
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    const listed = await http("GET", "/api/corrections?limit=1&offset=0&status=pending");
    expect(listed.body).toMatchObject({ total: 1 });
    expect(listed.body.requests).toHaveLength(1);
    expect(listed.body.requests[0]).toMatchObject({
      id: own.id,
      lastModified: expect.any(Number),
      syncStatus: "synced",
    });
    expect((await http("GET", "/api/corrections/stats")).body).toEqual({
      pending: 1,
      approved: 0,
      rejected: 0,
    });
    const history = await http("GET", `/api/corrections/${own.id}/history`);
    expect(history.body.data[0].details.source).toBe("fallback");
    expect((await http("GET", `/api/corrections/${foreign.id}/history`)).status).toBe(403);
    expect((await http("GET", "/api/corrections/missing/history")).status).toBe(404);
  });
  it("denies reads and creation for Usuario without an employee link", async () => {
    const request = await seedRequest();
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Usuario", employeeId: null },
    });
    for (const url of [
      "/api/corrections",
      "/api/corrections?since=1",
      "/api/corrections/stats",
      `/api/corrections/${request.id}/history`,
      "/api/corrections/missing/history",
    ]) {
      expect((await http("GET", url)).status).toBe(403);
    }
    expect((await http("POST", "/api/corrections", correction())).status).toBe(403);
    expect(await prismaDirect.correctionRequest.count()).toBe(1);
    expect(SocketService.emit).not.toHaveBeenCalled();
  });
  it.each(["Usuario", "Administrador"])(
    "denies inconsistent record ownership for %s",
    async (role) => {
      await prismaDirect.employee.create({
        data: { ...employee, id: "foreign", rut: "22222222-2" },
      });
      await seedRecord({ employeeId: "foreign" });
      await prismaDirect.user.update({ where: { id: actorId }, data: { role } });
      expect((await http("POST", "/api/corrections", correction())).status).toBe(403);
      expect(await prismaDirect.correctionRequest.count()).toBe(0);
      expect(SocketService.emit).not.toHaveBeenCalled();
      expect(
        await prismaDirect.auditLog.count({ where: { action: "CORRECTION_REQUEST_CREATED" } }),
      ).toBe(0);
    },
  );
  it("rejects missing records without creating requests", async () => {
    expect((await http("POST", "/api/corrections", correction())).status).toBe(404);
    expect(await prismaDirect.correctionRequest.count()).toBe(0);
  });
  it("rolls back approval of historical inconsistent ownership", async () => {
    await prismaDirect.employee.create({ data: { ...employee, id: "foreign", rut: "22222222-2" } });
    const request = await seedRequest({ employeeId: "foreign" });
    expect(
      (
        await http("PATCH", `/api/corrections/${request.id}/status`, {
          status: "approved",
          resolvedBy: "actor",
        })
      ).status,
    ).toBe(403);
    expect(
      (await prismaDirect.correctionRequest.findUniqueOrThrow({ where: { id: request.id } }))
        .status,
    ).toBe("pending");
    expect(
      (await prismaDirect.timeRecord.findUniqueOrThrow({ where: { id: "correction-record" } }))
        .salida,
    ).toBeNull();
    expect(SocketService.emit).not.toHaveBeenCalled();
    expect(await prismaDirect.auditLog.count({ where: { action: "TIME_RECORD_EDITED" } })).toBe(0);
  });
  it("rejects without reason, then persists rejection and returns settled request idempotently", async () => {
    const request = await seedRequest();
    const bad = await http("PATCH", `/api/corrections/${request.id}/status`, {
      status: "rejected",
      resolvedBy: "display",
    });
    expect(bad.status).toBe(400);
    expect(
      (await prismaDirect.correctionRequest.findUniqueOrThrow({ where: { id: request.id } }))
        .status,
    ).toBe("pending");
    const result = await http("PATCH", `/api/corrections/${request.id}/status`, {
      status: "rejected",
      resolvedBy: "display",
      rejectionReason: "No evidence",
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: "rejected",
      resolvedBy: "display",
      rejectionReason: "No evidence",
    });
    expect(
      (await prismaDirect.timeRecord.findUniqueOrThrow({ where: { id: "correction-record" } }))
        .salida,
    ).toBeNull();
    vi.mocked(SocketService.emit).mockClear();
    const repeated = await http("PATCH", `/api/corrections/${request.id}/status`, {
      status: "approved",
      resolvedBy: "other",
    });
    expect(repeated.body.status).toBe("rejected");
    expect(SocketService.emit).not.toHaveBeenCalled();
    expect(
      await prismaDirect.auditLog.count({ where: { action: "CORRECTION_REQUEST_STATUS_UPDATED" } }),
    ).toBe(1);
    const history = await http("GET", `/api/corrections/${request.id}/history`);
    expect(history.body.data[0]).toMatchObject({
      actorUsername: "absence-admin",
      details: { newStatus: "rejected" },
    });
  });
  it("approves concurrently with one patch/audit/event winner and heals complete anomaly", async () => {
    const request = await seedRequest();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        http("PATCH", `/api/corrections/${request.id}/status`, {
          status: "approved",
          resolvedBy: "display",
        }),
      ),
    );
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.body.status).toBe("approved");
    }
    const record = await prismaDirect.timeRecord.findUniqueOrThrow({
      where: { id: "correction-record" },
    });
    expect(record).toMatchObject({ salida: request.requestedValue, status: "Completado" });
    expect(await prismaDirect.auditLog.count({ where: { action: "TIME_RECORD_EDITED" } })).toBe(1);
    expect(
      await prismaDirect.auditLog.count({ where: { action: "CORRECTION_REQUEST_STATUS_UPDATED" } }),
    ).toBe(1);
    expect(
      vi
        .mocked(SocketService.emit)
        .mock.calls.filter(([event]) => event === "correctionRequest:updated"),
    ).toHaveLength(1);
    expect(
      vi.mocked(SocketService.emit).mock.calls.filter(([event]) => event === "timeRecord:updated"),
    ).toHaveLength(1);
    const audit = await prismaDirect.auditLog.findFirstOrThrow({
      where: { action: "CORRECTION_REQUEST_STATUS_UPDATED" },
    });
    expect(audit).toMatchObject({
      actorUsername: "absence-admin",
      metadata: { actorRole: "Administrador" },
    });
  });
  it("rolls back pending claim when the approved record write fails", async () => {
    const request = await seedRequest();
    await prismaDirect.$executeRaw`CREATE FUNCTION test_correction_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'spec016 record write failed'; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_correction_fail BEFORE UPDATE ON time_records FOR EACH ROW EXECUTE FUNCTION test_correction_fail()`;
    try {
      const response = await http("PATCH", `/api/corrections/${request.id}/status`, {
        status: "approved",
        resolvedBy: "actor",
      });
      expect(response.status).toBe(500);
      expect(
        (await prismaDirect.correctionRequest.findUniqueOrThrow({ where: { id: request.id } }))
          .status,
      ).toBe("pending");
      expect(
        (await prismaDirect.timeRecord.findUniqueOrThrow({ where: { id: "correction-record" } }))
          .salida,
      ).toBeNull();
      expect(SocketService.emit).not.toHaveBeenCalled();
      expect(await prismaDirect.auditLog.count({ where: { action: "TIME_RECORD_EDITED" } })).toBe(
        0,
      );
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_correction_fail ON time_records`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_correction_fail()`;
    }
  });
  it("returns 404 for absent resolution and rolls back invalid correction field", async () => {
    expect(
      (
        await http("PATCH", "/api/corrections/missing/status", {
          status: "approved",
          resolvedBy: "actor",
        })
      ).status,
    ).toBe(404);
    const request = await seedRequest({ recordField: "employeeName" });
    expect(
      (
        await http("PATCH", `/api/corrections/${request.id}/status`, {
          status: "approved",
          resolvedBy: "actor",
        })
      ).status,
    ).toBe(400);
    expect(
      (await prismaDirect.correctionRequest.findUniqueOrThrow({ where: { id: request.id } }))
        .status,
    ).toBe("pending");
  });
  it("includes correction tombstones for delta and resolved fallback timeline", async () => {
    const request = await seedRequest({
      status: "approved",
      resolvedAt: new Date(),
      resolvedBy: "display",
      isDeleted: true,
    });
    expect((await http("GET", "/api/corrections")).body.total).toBe(0);
    const delta = await http("GET", "/api/corrections?since=1");
    expect(delta.body.requests[0]).toMatchObject({ id: request.id, isDeleted: true });
    const history = await http("GET", `/api/corrections/${request.id}/history`);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.data[1]).toMatchObject({
      actorUsername: "display",
      details: { source: "fallback", newStatus: "approved" },
    });
  });
  it.each(routes)(
    "enforces authentication and persisted roles for %s %s",
    async (method, url, protectedRole) => {
      const body = method === "POST" || method === "PATCH" ? {} : undefined;
      expect((await http(method, url, body, null)).status).toBe(401);
      if (protectedRole) {
        await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
        expect((await http(method, url, body)).status).toBe(403);
        expect(await prismaDirect.leaveRecord.count()).toBe(0);
        expect(await prismaDirect.correctionRequest.count()).toBe(0);
        expect(SocketService.emit).not.toHaveBeenCalled();
      }
    },
  );
});
