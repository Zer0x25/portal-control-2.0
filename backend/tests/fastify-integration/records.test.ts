import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import ExcelJS from "exceljs";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { EmailService } from "../../src/services/EmailService";
import { SocketService } from "../../src/services/socketService";
import { TimeRecordService } from "../../src/services/TimeRecordService";
import { timeRecordIntegrityService } from "../../src/services/timeRecordIntegrityService";
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
      role: "Super_Administrador",
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
  it("verifies real predecessors when dates are interleaved and detects a changed record", async () => {
    const rows = [
      { id: "chain-a", date: "2026-01-01", createdAt: new Date("2026-01-01T00:00:00Z") },
      { id: "chain-b", date: "2026-03-01", createdAt: new Date("2026-01-02T00:00:00Z") },
      { id: "chain-c", date: "2026-02-01", createdAt: new Date("2026-01-03T00:00:00Z") },
      { id: "chain-d", date: "2026-03-02", createdAt: new Date("2026-01-04T00:00:00Z") },
    ];
    for (const row of rows) {
      await prismaDirect.timeRecord.create({
        data: {
          ...row,
          employeeId: employee.id,
          employeeName: employee.name,
          status: "Completado",
        },
      });
      await timeRecordIntegrityService.sealAfterMutation(prismaDirect, employee.id, row.id, {
        skipAudit: true,
      });
    }
    const url = `/api/records/integrity/verify?employeeId=${employee.id}&from=2026-03-01&to=2026-03-02`;
    const verified = await http("GET", url);
    expect(verified.status).toBe(200);
    expect(verified.body.summary).toMatchObject({ checkedCount: 2, brokenCount: 0 });
    await prismaDirect.timeRecord.update({
      where: { id: "chain-d" },
      data: { status: "Alterado" },
    });
    const altered = await http("GET", url);
    expect(altered.status).toBe(200);
    expect(altered.body.summary).toMatchObject({ checkedCount: 2, brokenCount: 1 });
    expect(altered.body.broken).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recordId: "chain-d", reason: "HASH_MISMATCH" }),
      ]),
    );
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
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Administrador" },
    });
    expect((await http("POST", "/api/records/punch", { employeeId: "missing" })).status).toBe(404);
  });
  it("allows Supervisor to read but denies record and punch mutations", async () => {
    const created = await http("POST", "/api/records", write());
    expect(created.status).toBe(200);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Supervisor" } });
    expect((await http("GET", "/api/records")).status).toBe(200);
    expect(
      (
        await http(
          "GET",
          `/api/records/export?format=csv&startDate=${today()}&endDate=${today()}`,
          undefined,
          token,
          true,
        )
      ).status,
    ).toBe(200);
    expect((await http("POST", "/api/admin/trigger-autoclose", {})).status).toBe(403);
    expect(
      (
        await http("POST", `/api/records/${created.body.id}/resolve-anomaly`, {
          resolution: "ABSENCE_MARK",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await http(
          "GET",
          `/api/records/integrity/verify?employeeId=${employee.id}&from=${today()}&to=${today()}`,
        )
      ).status,
    ).toBe(200);
    expect((await http("POST", "/api/records/punch", { employeeId: employee.id })).status).toBe(
      403,
    );
    expect((await http("POST", "/api/records", write())).status).toBe(403);
    expect((await http("POST", "/api/records/bulk", [write()])).status).toBe(403);
    expect((await http("POST", "/api/records/auto-close", {})).status).toBe(403);
    expect((await http("DELETE", `/api/records/${created.body.id}`)).status).toBe(403);
    expect(
      (await prismaDirect.timeRecord.findUniqueOrThrow({ where: { id: created.body.id } }))
        .isDeleted,
    ).toBe(false);
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
  it("rolls back the entire batch and its audit when row 51 conflicts, then commits a valid batch", async () => {
    const rows = Array.from({ length: 51 }, (_, index) => write({ id: `atomic-${index}` }));
    rows[50] = write({ id: "atomic-0" });
    const failed = await http("POST", "/api/records/bulk", rows);
    expect(failed.status).toBe(409);
    expect(await prismaDirect.timeRecord.count()).toBe(0);
    expect(await prismaDirect.auditLog.count({ where: { action: "CARGA_MASIVA_MARCAJES" } })).toBe(
      0,
    );
    expect(
      await prismaDirect.auditLog.count({ where: { action: "TIME_RECORD_HASH_CREATED" } }),
    ).toBe(0);
    expect(events()).toHaveLength(0);

    rows[50] = write({ id: "atomic-50" });
    const success = await http("POST", "/api/records/bulk", rows);
    expect(success.status).toBe(200);
    expect(success.body).toEqual({ success: true, count: 51 });
    expect(await prismaDirect.timeRecord.count()).toBe(51);
    expect(await prismaDirect.auditLog.count({ where: { action: "CARGA_MASIVA_MARCAJES" } })).toBe(
      1,
    );
    expect(
      await prismaDirect.auditLog.count({ where: { action: "TIME_RECORD_HASH_CREATED" } }),
    ).toBe(51);
    const verified = await http(
      "GET",
      `/api/records/integrity/verify?employeeId=${employee.id}&from=${today()}&to=${today()}`,
    );
    expect(verified.status).toBe(200);
    expect(verified.body.summary).toMatchObject({ checkedCount: 51, brokenCount: 0 });
  });
  it("rejects batches exceeding 500 rows without persisting or auditing", async () => {
    const rows = Array.from({ length: 501 }, (_, index) => write({ id: `limit-${index}` }));
    expect((await http("POST", "/api/records/bulk", rows)).status).toBe(400);
    expect(await prismaDirect.timeRecord.count()).toBe(0);
    expect(
      await prismaDirect.auditLog.count({
        where: { action: { in: ["TIME_RECORD_HASH_CREATED", "CARGA_MASIVA_MARCAJES"] } },
      }),
    ).toBe(0);
  });
  it("accepts the maximum batch across 500 employees with complete audit", async () => {
    const employees = Array.from({ length: 500 }, (_, index) => ({
      ...employee,
      id: `bulk-employee-${index}`,
      rut: `${String(30000000 + index)}-1`,
    }));
    await prismaDirect.employee.createMany({ data: employees });
    const rows = employees.map((item, index) =>
      write({ id: `bulk-maximum-${index}`, employeeId: item.id }),
    );
    const response = await http("POST", "/api/records/bulk", rows);
    expect(response.status).toBe(200);
    expect(response.body.count).toBe(500);
    expect(await prismaDirect.timeRecord.count()).toBe(500);
    expect(
      await prismaDirect.auditLog.count({ where: { action: "TIME_RECORD_HASH_CREATED" } }),
    ).toBe(500);
  }, 60000);
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
  it("limits indicators to requested records and exposes no unrelated audit details", async () => {
    const record = await http("POST", "/api/records", write());
    expect(record.status).toBe(200);
    const recordId = record.body.id as string;
    await prismaDirect.auditLog.create({
      data: {
        actorUsername: "editor",
        action: "TIME_RECORD_EDITED",
        details: {
          recordId,
          oldValue: { entrada: "08:00" },
          newValue: { entrada: "09:00" },
          secret: "not exposed",
        },
      },
    });
    await prismaDirect.correctionRequest.create({
      data: {
        employeeId: employee.id,
        timeRecordId: recordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "09:00",
        reason: "private reason",
        status: "pending",
      },
    });
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Supervisor" } });
    const result = await http("GET", `/api/records/indicators?ids=${encodeURIComponent(recordId)}`);
    expect(result.status).toBe(200);
    expect(result.body.edits).toHaveLength(1);
    expect(result.body.edits[0].details).toMatchObject({
      recordId,
      fieldEdited: "entrada",
      oldValue: "08:00",
    });
    expect(JSON.stringify(result.body)).not.toContain("not exposed");
    expect(JSON.stringify(result.body)).not.toContain("private reason");
    expect(result.body.pending).toHaveLength(1);
    const unrelated = await http("GET", "/api/records/indicators?ids=missing");
    expect(unrelated.body).toEqual({ edits: [], pending: [] });
    const tooMany = Array.from({ length: 101 }, (_, index) => `r${index}`).join(",");
    expect((await http("GET", `/api/records/indicators?ids=${tooMany}`)).status).toBe(400);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Reloj_Control" } });
    expect(
      (await http("GET", `/api/records/indicators?ids=${encodeURIComponent(recordId)}`)).status,
    ).toBe(200);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    expect(
      (await http("GET", `/api/records/indicators?ids=${encodeURIComponent(recordId)}`)).status,
    ).toBe(403);
  });
  it("rechecks accounting closure inside the batch transaction", async () => {
    const original = TimeRecordService.isRecordLocked.bind(TimeRecordService);
    let first = true;
    vi.spyOn(TimeRecordService, "isRecordLocked").mockImplementation(async (date, tx) => {
      const locked = await original(date, tx);
      if (first && !tx) {
        first = false;
        await prismaDirect.systemConfig.create({
          data: { key: "accounting_lock_date", value: JSON.stringify(today()) },
        });
      }
      return locked;
    });
    const result = await http("POST", "/api/records/bulk", [write()]);
    expect(result.status).toBe(403);
    expect(await prismaDirect.timeRecord.count()).toBe(0);
  });
  it("validates integrity limit and reports truncation", async () => {
    const yesterday = getChileDateISO(new Date(Date.now() - 86400000));
    expect((await http("POST", "/api/records", write({ date: yesterday }))).status).toBe(200);
    expect((await http("POST", "/api/records", write())).status).toBe(200);
    const query = `employeeId=${employee.id}&from=${yesterday}&to=${today()}`;
    const limited = await http("GET", `/api/records/integrity/verify?${query}&limit=1`);
    expect(limited.status).toBe(200);
    expect(limited.body.summary).toMatchObject({ checkedCount: 1, truncated: true });
    const all = await http("GET", `/api/records/integrity/verify?${query}&limit=2`);
    expect(all.body.summary).toMatchObject({ checkedCount: 2, truncated: false });
    expect((await http("GET", `/api/records/integrity/verify?${query}&limit=invalid`)).status).toBe(
      400,
    );
    expect((await http("GET", `/api/records/integrity/verify?${query}&limit=0`)).status).toBe(400);
  });
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
