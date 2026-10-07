import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import ExcelJS from "exceljs";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { SocketService } from "../../src/services/socketService";
import { getChileDateISO } from "../../src/utils/timeUtils";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
const today = () => getChileDateISO(new Date());
const log = (patch = {}) => ({
  id: "log-1",
  time: "09:00",
  annotation: "Rounds completed",
  timestamp: 10,
  ...patch,
});
const supplier = (patch = {}) => ({
  id: "supplier-1",
  time: "10:00",
  company: "ACME",
  licensePlate: "AA-BB-11",
  driverName: "Driver",
  paxCount: 2,
  reason: "Delivery",
  timestamp: 20,
  ...patch,
});
const body = (patch = {}) => ({
  id: "shift-report",
  folio: "client-folio",
  shiftName: "Day",
  responsibleUser: "Operator",
  startTime: `${today()}T12:00:00.000Z`,
  endTime: null,
  date: today(),
  status: "open",
  logEntries: [log()],
  supplierEntries: [supplier()],
  ...patch,
});
async function seedReport(patch = {}) {
  return prismaDirect.shiftReport.create({
    data: {
      id: "seed-report",
      folio: "010",
      shiftName: "Night",
      responsibleUser: "Other",
      startTime: new Date(`${today()}T12:00:00.000Z`),
      date: new Date(`${today()}T00:00:00.000Z`),
      status: "closed",
      logEntries: "[]",
      supplierEntries: "[]",
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
  const actor = await prismaDirect.user.create({
    data: { username: "reports-admin", role: "Administrador", passwordHash: "test-only" },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, undefined, "spec017")
  ).token;
  vi.spyOn(SocketService, "emit").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
const routes = [
  ["GET", "/api/shift-reports"],
  ["POST", "/api/shift-reports"],
  ["GET", "/api/shift-reports/export/missing"],
] as const;
describe.each(["Express", "Fastify"] as const)("Spec 017 shift reports on %s", (server) => {
  const http = httpClient(
    server,
    () => fastify,
    () => token,
  );
  it("opens, reports structured conflict, closes and assigns next generated folio", async () => {
    const created = await http("POST", "/api/shift-reports", body());
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      folio: "001",
      responsibleUser: "Operator",
      date: today(),
      status: "open",
      syncStatus: "synced",
      lastModified: expect.any(Number),
    });
    expect(SocketService.emit).toHaveBeenCalledWith(
      "shiftReport:created",
      expect.objectContaining({ id: "shift-report" }),
    );
    expect(
      await prismaDirect.auditLog.findFirst({ where: { action: "SHIFT_STARTED" } }),
    ).toMatchObject({ actorUsername: "reports-admin" });
    vi.mocked(SocketService.emit).mockClear();
    const conflict = await http("POST", "/api/shift-reports", body({ id: "second" }));
    expect(conflict.status).toBe(409);
    expect(conflict.body.message).toBe(
      "No se puede iniciar turno. El turno de Operator (Folio: 001) ya está abierto.",
    );
    expect(await prismaDirect.shiftReport.count()).toBe(1);
    expect(SocketService.emit).not.toHaveBeenCalled();
    expect(await prismaDirect.auditLog.count({ where: { action: "SHIFT_START_BLOCKED" } })).toBe(1);
    const closed = await http(
      "POST",
      "/api/shift-reports",
      body({ folio: "001", status: "closed", endTime: `${today()}T20:00:00.000Z` }),
    );
    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe("closed");
    expect(await prismaDirect.auditLog.count({ where: { action: "SHIFT_CLOSED" } })).toBe(1);
    expect(SocketService.emit).toHaveBeenCalledWith(
      "shiftReport:updated",
      expect.objectContaining({ status: "closed" }),
    );
    expect((await http("POST", "/api/shift-reports", body({ id: "next" }))).body.folio).toBe("002");
  });
  it("normalizes/sorts saved entries and audits add/edit/delete with actual actor", async () => {
    const initial = await http(
      "POST",
      "/api/shift-reports",
      body({
        logEntries: [log({ id: "late", timestamp: 30, annotation: " late " }), log()],
        supplierEntries: [supplier()],
      }),
    );
    expect(initial.body.logEntries.map((entry: { id: string }) => entry.id)).toEqual([
      "log-1",
      "late",
    ]);
    expect(initial.body.logEntries[1].annotation).toBe("late");
    const updated = await http(
      "POST",
      "/api/shift-reports",
      body({
        folio: "001",
        logEntries: [log({ annotation: "Updated" }), log({ id: "new", timestamp: 40 })],
        supplierEntries: [
          supplier({ company: "Changed" }),
          supplier({ id: "new-supplier", timestamp: 50 }),
        ],
      }),
    );
    expect(updated.status).toBe(200);
    for (const action of [
      "LOG_ENTRY_ADDED",
      "LOG_ENTRY_EDITED",
      "LOG_ENTRY_DELETED",
      "SUPPLIER_ENTRY_ADDED",
      "SUPPLIER_ENTRY_EDITED",
    ]) {
      expect(await prismaDirect.auditLog.findFirst({ where: { action } })).toMatchObject({
        actorUsername: "reports-admin",
      });
    }
    expect(
      (
        await http(
          "POST",
          "/api/shift-reports",
          body({ folio: "001", logEntries: [], supplierEntries: [] }),
        )
      ).status,
    ).toBe(200);
    expect(await prismaDirect.auditLog.count({ where: { action: "SUPPLIER_ENTRY_DELETED" } })).toBe(
      2,
    );
  });
  it("uses numeric MAX across 999/1000 and serializes concurrent closed folios", async () => {
    await seedReport({ id: "old999", folio: "999" });
    await seedReport({ id: "old1000", folio: "1000" });
    await seedReport({ id: "legacy", folio: "LEGACY" });
    const first = await http("POST", "/api/shift-reports", body({ status: "closed" }));
    expect(first.status).toBe(200);
    expect(first.body.folio).toBe("1001");
    const results = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        http("POST", "/api/shift-reports", body({ id: `parallel-${i}`, status: "closed" })),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(new Set(results.map((r) => r.body.folio)).size).toBe(3);
    expect(await prismaDirect.shiftReport.count()).toBe(7);
  });
  it("allows exactly one concurrent opening and rejects reopening beside it", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        http("POST", "/api/shift-reports", body({ id: `opening-${i}` })),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await prismaDirect.shiftReport.count({ where: { status: "open" } })).toBe(1);
    expect(SocketService.emit).toHaveBeenCalledTimes(1);
    await seedReport();
    expect(
      (await http("POST", "/api/shift-reports", body({ id: "seed-report", folio: "010" }))).status,
    ).toBe(409);
  });
  it("preserves pagination/status/delta semantics and normalizes stored legacy content", async () => {
    await seedReport({
      id: "old-open",
      folio: "001",
      status: "open",
      logEntries: JSON.stringify([{ detail: "Legacy", timestamp: "10" }]),
      supplierEntries: "not-json",
      updatedAt: new Date(0),
    });
    await seedReport({ id: "deleted", folio: "002", isDeleted: true });
    await seedReport({ id: "closed", folio: "003" });
    const delta = await http("GET", `/api/shift-reports?since=${Date.now() + 60000}`);
    expect(delta.body.total).toBe(1);
    expect(delta.body.data[0]).toMatchObject({
      id: "old-open",
      logEntries: [expect.objectContaining({ annotation: "Legacy", timestamp: 10 })],
      supplierEntries: [],
    });
    const closed = await http("GET", "/api/shift-reports?status=closed&page=1&pageSize=1");
    expect(closed.body).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    expect(closed.body.data[0].id).toBe("closed");
  });
  it("exports real XLSX cells/headers and returns JSON 404 for missing report", async () => {
    expect((await http("POST", "/api/shift-reports", body())).status).toBe(200);
    const response = await http(
      "GET",
      "/api/shift-reports/export/shift-report",
      undefined,
      token,
      true,
    );
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("spreadsheetml");
    expect(response.headers["content-disposition"]).toContain("Reporte_001.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.bytes as any);
    const worksheet = workbook.getWorksheet("Bitácora")!;
    expect(worksheet.getCell("B2").value).toBe("NOVEDAD");
    expect(worksheet.getCell("C2").value).toBe("Rounds completed");
    expect(worksheet.getCell("D2").value).toBe("Operator");
    expect(worksheet.getCell("B3").value).toBe("PROVEEDOR");
    expect(worksheet.getCell("C3").value).toBe("ACME");
    expect(worksheet.getCell("D3").value).toBe("AA-BB-11");
    const missing = await http("GET", "/api/shift-reports/export/missing");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: "Reporte no encontrado" });
    expect(missing.headers["content-type"]).toContain("application/json");
  });
  it("terminates corrupt legacy export with JSON 500 while list normalizes it", async () => {
    await seedReport({ logEntries: "not-json" });
    const exported = await http("GET", "/api/shift-reports/export/seed-report");
    expect(exported.status).toBe(500);
    expect(exported.body.message).toBe("Error al exportar reporte de turno");
    expect(exported.headers["content-type"]).toContain("application/json");
    expect((await http("GET", "/api/shift-reports")).body.data[0].logEntries).toEqual([]);
  });
  it("accepts generated IDs and ignores deleted-open shifts while validating malformed body", async () => {
    expect((await http("POST", "/api/shift-reports", {})).status).toBe(400);
    const withoutId: any = body();
    delete withoutId.id;
    expect((await http("POST", "/api/shift-reports", withoutId)).status).toBe(200);
    expect(await prismaDirect.shiftReport.count()).toBe(1);
    await prismaDirect.shiftReport.deleteMany();
    await seedReport({ status: "open", isDeleted: true });
    expect((await http("POST", "/api/shift-reports", body())).status).toBe(200);
    expect((await http("GET", "/api/shift-reports")).body.total).toBe(1);
  });
  it("rolls back granular audit after failed update and emits no success event", async () => {
    await http("POST", "/api/shift-reports", body());
    vi.mocked(SocketService.emit).mockClear();
    await prismaDirect.$executeRaw`CREATE FUNCTION test_report_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'spec017 update failed'; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_report_fail BEFORE UPDATE ON shift_reports FOR EACH ROW EXECUTE FUNCTION test_report_fail()`;
    try {
      const response = await http(
        "POST",
        "/api/shift-reports",
        body({ folio: "001", logEntries: [log(), log({ id: "new" })] }),
      );
      expect(response.status).toBe(500);
      expect(response.body.code).toBe("SHIFT_REPORT_ERROR");
      const report = await prismaDirect.shiftReport.findUniqueOrThrow({
        where: { id: "shift-report" },
      });
      expect(JSON.parse(report.logEntries)).toHaveLength(1);
      expect(await prismaDirect.auditLog.count({ where: { action: "LOG_ENTRY_ADDED" } })).toBe(0);
      expect(SocketService.emit).not.toHaveBeenCalled();
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_report_fail ON shift_reports`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_report_fail()`;
    }
  });
  it("rolls back a new report when its success audit cannot be saved", async () => {
    await prismaDirect.$executeRaw`CREATE FUNCTION test_report_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'SHIFT_STARTED' THEN RAISE EXCEPTION 'audit failed'; END IF; RETURN NEW; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_report_audit_fail BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION test_report_audit_fail()`;
    try {
      expect((await http("POST", "/api/shift-reports", body())).status).toBe(500);
      expect(await prismaDirect.shiftReport.count()).toBe(0);
      expect(await prismaDirect.auditLog.count({ where: { action: "SHIFT_STARTED" } })).toBe(0);
      expect(SocketService.emit).not.toHaveBeenCalled();
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_report_audit_fail ON audit_logs`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_report_audit_fail()`;
    }
  });
  it("permits Reloj_Control to list/save/export", async () => {
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Reloj_Control" } });
    expect((await http("POST", "/api/shift-reports", body())).status).toBe(200);
    expect((await http("GET", "/api/shift-reports")).status).toBe(200);
    expect((await http("GET", "/api/shift-reports/export/missing")).status).toBe(404);
  });
  it.each(routes)("enforces sessions/persisted roles on %s %s", async (method, url) => {
    const payload = method === "POST" ? body() : undefined;
    expect((await http(method, url, payload, null)).status).toBe(401);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    expect((await http(method, url, payload)).status).toBe(403);
    expect(await prismaDirect.shiftReport.count()).toBe(0);
    expect(SocketService.emit).not.toHaveBeenCalled();
  });
});
