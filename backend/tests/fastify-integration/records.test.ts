import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import ExcelJS from "exceljs";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { EmailService } from "../../src/services/EmailService";
import { SocketService } from "../../src/services/socketService";
import { getChileDateISO } from "../../src/utils/timeUtils";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
const employee = {
  id: "records-emp",
  name: "Record Employee",
  rut: "12345678-9",
  position: "Operator",
  area: "Ops",
  workdayType: "Artículo 22",
};
const events = () =>
  vi.mocked(SocketService.emit).mock.calls.filter(([event]) => event.startsWith("timeRecord:"));
const today = () => getChileDateISO(new Date());
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
      username: "records-admin",
      role: "Administrador",
      passwordHash: "test-only",
      employeeId: employee.id,
    },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(
      actor.id,
      actor.username,
      actor.role,
      employee.id,
      "record-test",
    )
  ).token;
  vi.spyOn(SocketService, "emit").mockImplementation(() => {});
  vi.spyOn(EmailService.prototype, "notifyTardiness").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});

describe("Spec 014 records on Fastify", () => {
  const http = httpClient(
    () => fastify,
    () => token,
  );
  const write = (extra: Record<string, unknown> = {}) => ({
    employeeId: employee.id,
    employeeName: employee.name,
    employeeWorkdayType: employee.workdayType,
    employeeArea: employee.area,
    employeePosition: employee.position,
    date: today(),
    status: "Ausente",
    ...extra,
  });
  it("creates without id, reuses employee/day, lists metadata and verifies its integrity", async () => {
    const created = await http("POST", "/api/records", write());
    expect(created.status).toBe(200);
    expect(typeof created.body.id).toBe("string");
    const reused = await http("POST", "/api/records", write({ status: "Vacaciones" }));
    expect(reused.status).toBe(200);
    expect(reused.body.id).toBe(created.body.id);
    expect(await prismaDirect.timeRecord.count()).toBe(1);
    const list = await http("GET", `/api/records?employeeId=${employee.id}&page=1&pageSize=10`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({ employeeId: employee.id, syncStatus: "synced" });
    const verified = await http(
      "GET",
      `/api/records/integrity/verify?employeeId=${employee.id}&from=${today()}&to=${today()}`,
    );
    expect(verified.status).toBe(200);
    expect(verified.body.summary).toMatchObject({ checkedCount: 1, brokenCount: 0 });
    expect(
      (await prismaDirect.timeRecord.findUniqueOrThrow({ where: { id: created.body.id } }))
        .integrityHash,
    ).toBeTruthy();
  });
  it("uses persisted Usuario association for punch and rejects forced cooldown and missing employee", async () => {
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    const response = await http("POST", "/api/records/punch", {
      employeeId: "forged",
      forcedType: "entrada",
      source: "TEST",
    });
    expect(response.status).toBe(200);
    expect(response.body.action).toBe("ENTRADA");
    expect(response.body.record.employeeId).toBe(employee.id);
    expect(
      (await http("POST", "/api/records/punch", { employeeId: "forged", forcedType: "salida" }))
        .status,
    ).toBe(429);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Supervisor" } });
    expect((await http("POST", "/api/records/punch", { employeeId: "missing" })).status).toBe(404);
  });
  it("serializes concurrent entry punches with one row and a valid chain", async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        http("POST", "/api/records/punch", { employeeId: employee.id, forcedType: "entrada" }),
      ),
    );
    expect(responses.filter((res) => res.status === 200)).toHaveLength(1);
    expect(responses.every((res) => [200, 400, 429].includes(res.status))).toBe(true);
    expect(await prismaDirect.timeRecord.count({ where: { employeeId: employee.id } })).toBe(1);
    expect(events()).toHaveLength(1);
  });
  it("checks locked date at the end of 51 rows and validates full batch before writes", async () => {
    const rows = Array.from({ length: 50 }, (_, index) => write({ id: `record-${index}` }));
    const older = "2020-01-01";
    expect(
      (await http("POST", "/api/records/bulk", [...rows, write({ date: older })])).status,
    ).toBe(403);
    expect(
      (await http("POST", "/api/records/bulk", [...rows, write({ employeeId: "" })])).status,
    ).toBe(400);
    expect(await prismaDirect.timeRecord.count()).toBe(0);
    expect(events()).toHaveLength(0);
    const valid = await http("POST", "/api/records/bulk", [write({ id: "valid-bulk" })]);
    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ success: true, count: 1 });
    expect(events()[0]).toEqual(["timeRecord:batch_created", { count: 1 }]);
  });
  it("preserves scoped list/export, date-range validation and no-association denial", async () => {
    await http("POST", "/api/records", write());
    await prismaDirect.employee.create({ data: { ...employee, id: "other", rut: "22222222-2" } });
    await http("POST", "/api/records", write({ employeeId: "other", employeeName: "Other" }));
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    const list = await http("GET", "/api/records?employeeId=other");
    expect(list.body.data.map((row: { employeeId: string }) => row.employeeId)).toEqual([
      employee.id,
    ]);
    const json = await http(
      "GET",
      `/api/records/export?startDate=${today()}&endDate=${today()}&employeeId=other`,
    );
    expect(json.status).toBe(200);
    expect(json.body.map((row: { employeeId: string }) => row.employeeId)).toEqual([employee.id]);
    expect((await http("GET", "/api/records/export")).status).toBe(400);
    await prismaDirect.user.update({ where: { id: actorId }, data: { employeeId: null } });
    expect((await http("GET", "/api/records")).status).toBe(403);
    expect((await http("POST", "/api/records/punch", { employeeId: "forged" })).status).toBe(403);
    expect(
      (await http("GET", `/api/records/export?startDate=${today()}&endDate=${today()}`)).status,
    ).toBe(403);
  });
  it("resolves anomaly, rejects invalid resolution and soft-deletes with 204/tombstone", async () => {
    const created = await http("POST", "/api/records", write({ status: "AnomaliaManual" }));
    expect(created.status).toBe(200);
    expect(
      (
        await http("POST", `/api/records/${created.body.id}/resolve-anomaly`, {
          resolution: "invalid",
        })
      ).status,
    ).toBe(400);
    const resolved = await http("POST", `/api/records/${created.body.id}/resolve-anomaly`, {
      resolution: "ABSENCE_MARK",
    });
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe("Ausente");
    vi.mocked(SocketService.emit).mockClear();
    const deleted = await http("DELETE", `/api/records/${created.body.id}`);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(
      (await prismaDirect.timeRecord.findUniqueOrThrow({ where: { id: created.body.id } }))
        .isDeleted,
    ).toBe(true);
    expect(events()).toEqual([["timeRecord:deleted", { id: created.body.id }]]);
    expect((await http("DELETE", "/api/records/missing")).status).toBe(404);
  });
  it("preserves auto-close ignored body and accounting lock on create/delete/punch", async () => {
    const res = await http("POST", "/api/records/auto-close", { ignored: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, closedCount: 0 });
    const created = await http("POST", "/api/records", write());
    await prismaDirect.systemConfig.create({
      data: { key: "accounting_lock_date", value: JSON.stringify(today()) },
    });
    expect((await http("POST", "/api/records", write())).status).toBe(403);
    expect((await http("POST", "/api/records/punch", { employeeId: employee.id })).status).toBe(
      403,
    );
    expect((await http("DELETE", `/api/records/${created.body.id}`)).status).toBe(403);
  });
  it.each(["csv", "xml", "excel"] as const)(
    "exports scoped usable %s using real cursors",
    async (format) => {
      await http("POST", "/api/records", write());
      await prismaDirect.employee.create({
        data: { ...employee, id: "export-other", rut: "22222222-2" },
      });
      await http(
        "POST",
        "/api/records",
        write({ employeeId: "export-other", employeeName: "Private Other" }),
      );
      await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
      const response = await http(
        "GET",
        `/api/records/export?startDate=${today()}&endDate=${today()}&format=${format}&employeeId=export-other`,
        undefined,
        token,
        true,
      );
      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain(`_${today()}_${today()}.`);
      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(response.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
        const sheet = workbook.getWorksheet("Registros")!;
        expect(sheet.rowCount).toBe(2);
        expect(JSON.stringify(sheet.getRow(2).values)).toContain(employee.name);
        expect(JSON.stringify(sheet.getRow(2).values)).not.toContain("Private Other");
      } else {
        expect(response.bytes.toString()).toContain(employee.id);
        expect(response.bytes.toString()).not.toContain("export-other");
      }
    },
  );
  it.each([
    ["POST", "/api/records", { employeeId: "e", date: "2026-10-06" }],
    ["POST", "/api/records/bulk", []],
    ["POST", "/api/records/auto-close", undefined],
    ["GET", "/api/records/integrity/verify?employeeId=e&from=2026-10-01&to=2026-10-06", undefined],
    ["POST", "/api/records/missing/resolve-anomaly", { resolution: "ABSENCE_MARK" }],
    ["DELETE", "/api/records/missing", undefined],
  ] as const)(
    "denies admin route %s %s using persisted role before effects",
    async (method, url, body) => {
      expect((await http(method, url, body, null)).status).toBe(401);
      await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
      expect((await http(method, url, body)).status).toBe(403);
      expect(await prismaDirect.timeRecord.count()).toBe(0);
      expect(events()).toHaveLength(0);
    },
  );
});
