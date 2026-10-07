import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";
import path from "node:path";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { SocketService } from "../../src/services/socketService";
import { companyPolicyStorage } from "../../src/services/companyPolicyStorage";
import { configFlows } from "../../src/services/configFlows";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
const emit = vi.spyOn(SocketService, "emit");
const owned = new Set<string>();
const directory = path.resolve(process.cwd(), "uploads", "company-policy");
const originalUpload = configFlows.upload;
vi.spyOn(configFlows, "upload").mockImplementation((file, actor) => {
  if (file) owned.add(file.filename);
  return originalUpload(file, actor);
});
const originalStore = companyPolicyStorage.store;
vi.spyOn(companyPolicyStorage, "store").mockImplementation(async (...args) => {
  const file = await originalStore(...args);
  owned.add(file.filename);
  return file;
});
const reading = { meterConfigId: "water", authorUsername: "client-author", value: 12.5 };
const note = { content: "Reminder", authorUsername: "client-author" };
const routes = [
  ["GET", "/api/meters"],
  ["POST", "/api/meters/bulk"],
  ["GET", "/api/notes"],
  ["POST", "/api/notes"],
  ["PUT", "/api/notes/missing"],
  ["DELETE", "/api/notes/missing"],
  ["GET", "/api/configs/server-time"],
  ["GET", "/api/configs"],
  ["GET", "/api/configs/missing"],
  ["GET", "/api/configs/validate-closure?date=2020-01-01"],
  ["POST", "/api/configs/custom"],
  ["POST", "/api/configs/company-policy"],
] as const;
async function cleanup() {
  for (const filename of owned)
    await fs.unlink(path.join(directory, path.basename(filename))).catch(() => undefined);
  owned.clear();
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
  await cleanup();
  await resetIntegrationDb();
  emit.mockClear();
  const actor = await prismaDirect.user.create({
    data: { username: "data-admin", role: "Administrador", passwordHash: "test-only" },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, undefined, "spec020")
  ).token;
});
afterEach(() => {
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await cleanup();
  await resetIntegrationDb();
  await fastify.close();
  vi.restoreAllMocks();
});
describe("Spec020 data/configs on Fastify", () => {
  const http = httpClient(
    () => fastify,
    () => token,
  );
  async function upload(
    bytes: Buffer,
    name = "Policy.pdf",
    mime = "application/pdf",
    field = "file",
    access: string | null = token,
  ) {
    const boundary = "spec020-boundary";
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${name}"\r\nContent-Type: ${mime}\r\n\r\n`,
      ),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await fastify.inject({
      method: "POST",
      url: "/api/configs/company-policy",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        ...(access ? { authorization: `Bearer ${access}` } : {}),
      },
      payload,
    });
    return { status: res.statusCode, body: res.json() };
  }
  it("creates whole meter batch, strips ignored input fields and emits one count", async () => {
    const res = await http("POST", "/api/meters/bulk", [
      { ...reading, id: "client-id", timestamp: "2000-01-01T00:00:00Z", extra: "ignored" },
      { ...reading, authorUsername: "another-spoof", value: 0, isRecharge: true, notes: "" },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      meterConfigId: "water",
      authorUsername: "data-admin",
      value: 12.5,
      syncStatus: "synced",
      isDeleted: false,
      isRecharge: false,
    });
    expect(res.body.data[0].id).not.toBe("client-id");
    expect(res.body.data[0].timestamp).not.toContain("2000-01-01");
    expect(res.body.data[1].notes).toBeNull();
    expect(
      res.body.data.every((row: { authorUsername: string }) => row.authorUsername === "data-admin"),
    ).toBe(true);
    const audits = await prismaDirect.auditLog.findMany({
      where: { action: "METERREADING_CREATE" },
    });
    expect(audits).toHaveLength(2);
    expect(audits.every((audit) => audit.actorUsername === "data-admin")).toBe(true);
    expect(audits.map((audit) => (audit.details as { id: string }).id).sort()).toEqual(
      res.body.data.map((row: { id: string }) => row.id).sort(),
    );
    expect(emit).toHaveBeenCalledExactlyOnceWith("meter:updated", { count: 2 });
  });
  it("rolls back all meter readings when an insertion in the batch fails", async () => {
    await prismaDirect.$executeRaw`CREATE FUNCTION test_meter_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.value = 13 THEN RAISE EXCEPTION 'test meter failure'; END IF; RETURN NEW; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_meter_fail BEFORE INSERT ON meter_readings FOR EACH ROW EXECUTE FUNCTION test_meter_fail()`;
    try {
      const result = await http("POST", "/api/meters/bulk", [
        { ...reading, value: 1 },
        { ...reading, value: 13 },
        { ...reading, value: 2 },
      ]);
      expect(result.status).toBe(500);
      expect(await prismaDirect.meterReading.count()).toBe(0);
      expect(await prismaDirect.auditLog.count({ where: { action: "METERREADING_CREATE" } })).toBe(
        0,
      );
      expect(emit).not.toHaveBeenCalled();
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_meter_fail ON meter_readings`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_meter_fail()`;
    }
  });
  it("rolls back the meter batch when its audit fails", async () => {
    await prismaDirect.$executeRaw`CREATE FUNCTION test_meter_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'METERREADING_CREATE' THEN RAISE EXCEPTION 'test meter audit failure'; END IF; RETURN NEW; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_meter_audit_fail BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION test_meter_audit_fail()`;
    try {
      const result = await http("POST", "/api/meters/bulk", [reading, { ...reading, value: 1 }]);
      expect(result.status).toBe(500);
      expect(await prismaDirect.meterReading.count()).toBe(0);
      expect(await prismaDirect.auditLog.count({ where: { action: "METERREADING_CREATE" } })).toBe(
        0,
      );
      expect(emit).not.toHaveBeenCalled();
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_meter_audit_fail ON audit_logs`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_meter_audit_fail()`;
    }
  });
  it("rejects invalid 51st reading before all writes; empty batch remains accepted", async () => {
    expect(
      (
        await http("POST", "/api/meters/bulk", [
          ...Array.from({ length: 50 }, () => reading),
          { ...reading, value: "invalid" },
        ])
      ).status,
    ).toBe(400);
    expect(await prismaDirect.meterReading.count()).toBe(0);
    expect(emit).not.toHaveBeenCalled();
    expect((await http("POST", "/api/meters/bulk", [])).body).toEqual({ success: true, data: [] });
    expect(emit).toHaveBeenCalledExactlyOnceWith("meter:updated", { count: 0 });
  });
  it("filters/deltas/paginates meters with effective month selection", async () => {
    await prismaDirect.meterReading.createMany({
      data: [
        { ...reading, timestamp: new Date("2026-01-01T12:00:00Z") },
        { ...reading, meterConfigId: "gas", timestamp: new Date("2026-01-02T12:00:00Z") },
      ],
    });
    const full = await http("GET", "/api/meters");
    expect(full.body.data).toHaveLength(2);
    expect(full.body).not.toHaveProperty("pagination");
    const page = await http("GET", "/api/meters?page=1&pageSize=1");
    expect(page.body.pagination).toEqual({ total: 2, page: 1, totalPages: 2 });
    expect(page.body.data[0].meterConfigId).toBe("gas");
    expect((await http("GET", "/api/meters?meterId=water")).body.data).toHaveLength(1);
    expect(
      (await http("GET", `/api/meters?since=${new Date("2026-01-02T00:00:00Z").getTime()}`)).body
        .data,
    ).toHaveLength(1);
    expect(
      (await http("GET", "/api/meters?startDate=2026-01-01&endDate=2026-01-03")).body.data,
    ).toHaveLength(2);
    expect((await http("GET", "/api/meters?month=2020-01")).body.data).toHaveLength(0);
    expect((await http("GET", "/api/meters?month=2026-01")).body.data).toHaveLength(2);
    expect((await http("GET", "/api/meters?page=invalid&pageSize=1")).status).toBe(400);
  });
  it.each([
    { timezone: "UTC", offset: 0, included: true },
    { timezone: "America/Santiago", offset: 180, included: true },
  ])(
    "uses Chile meter date bounds regardless of host in $timezone",
    async ({ timezone, offset, included }) => {
      vi.stubEnv("TZ", timezone);
      expect(new Date("2026-01-02T00:00:00Z").getTimezoneOffset()).toBe(offset);
      const meter = await prismaDirect.meterReading.create({
        data: { ...reading, timestamp: new Date("2026-01-02T12:00:00Z") },
      });
      const res = await http("GET", "/api/meters?startDate=2026-01-02&endDate=2026-01-02");
      expect(res.status).toBe(200);
      // Both hosts select the same Chile calendar day.
      expect(res.body.data.map((row: { id: string }) => row.id)).toEqual(
        included ? [meter.id] : [],
      );
    },
  );
  it("keeps page ordering stable when timestamps tie", async () => {
    const timestamp = new Date("2026-01-01T12:00:00Z");
    await prismaDirect.meterReading.createMany({
      data: [
        { ...reading, id: "meter-a", timestamp },
        { ...reading, id: "meter-z", timestamp },
      ],
    });
    const first = await http("GET", "/api/meters?page=1&pageSize=1");
    const second = await http("GET", "/api/meters?page=2&pageSize=1");
    expect(first.body.data[0].id).toBe("meter-z");
    expect(second.body.data[0].id).toBe("meter-a");
  });
  it.each([
    "page=0&pageSize=1",
    "page=1&pageSize=0",
    "page=1&pageSize=501",
    "page=1",
    "pageSize=1",
    "page=1.5&pageSize=1",
    "since=NaN",
    "since=-1",
    "since=8640000000000001",
    "meterId=water&meterId=gas",
    "startDate=2026-02-30",
    "month=2026-13",
    "startDate=2026-02-02&endDate=2026-02-01",
    "month=2026-01&startDate=2026-01-01",
  ])("rejects invalid meter query %s with 400", async (query) => {
    expect((await http("GET", `/api/meters?${query}`)).status).toBe(400);
  });
  it.each(["NaN", "-1", "8640000000000001", "1.5"])(
    "rejects invalid note delta %s",
    async (since) => {
      expect((await http("GET", `/api/notes?since=${since}`)).status).toBe(400);
    },
  );
  it.each(["2026-01-02", "2026-09-06"])(
    "uses exact Chile day boundaries including DST for %s",
    async (date) => {
      // September 6 has no local midnight: its first valid instant is 01:00 (-03).
      const start = date === "2026-09-06" ? "2026-09-06T04:00:00Z" : "2026-01-02T03:00:00Z";
      const end = date === "2026-09-06" ? "2026-09-07T03:00:00Z" : "2026-01-03T03:00:00Z";
      const base = new Date(start).getTime(),
        upper = new Date(end).getTime();
      await prismaDirect.meterReading.createMany({
        data: [base - 1, base, upper - 1, upper].map((ms, index) => ({
          ...reading,
          value: index,
          timestamp: new Date(ms),
        })),
      });
      const response = await http("GET", `/api/meters?startDate=${date}&endDate=${date}`);
      expect(response.status).toBe(200);
      expect(response.body.data.map((row: { value: number }) => row.value)).toEqual([2, 1]);
      const delta = await http(
        "GET",
        `/api/meters?startDate=${date}&endDate=${date}&since=${upper - 1}`,
      );
      expect(delta.body.data.map((row: { value: number }) => row.value)).toEqual([2]);
    },
  );
  it.each(["CREATE", "UPDATE", "DELETE"])(
    "rolls back note %s and emits no event if its audit fails",
    async (operation) => {
      const existing =
        operation === "CREATE" ? null : await prismaDirect.quickNote.create({ data: note });
      await prismaDirect.$executeRaw`CREATE FUNCTION test_note_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'QUICKNOTE_%' THEN RAISE EXCEPTION 'test note audit failure'; END IF; RETURN NEW; END; $$`;
      await prismaDirect.$executeRaw`CREATE TRIGGER test_note_audit_fail BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION test_note_audit_fail()`;
      try {
        const response =
          operation === "CREATE"
            ? await http("POST", "/api/notes", note)
            : await http(operation === "UPDATE" ? "PUT" : "DELETE", `/api/notes/${existing!.id}`);
        expect(response.status).toBe(500);
        expect(await prismaDirect.quickNote.count()).toBe(existing ? 1 : 0);
        if (existing)
          expect(
            (await prismaDirect.quickNote.findUniqueOrThrow({ where: { id: existing.id } }))
              .isArchived,
          ).toBe(false);
        expect(
          await prismaDirect.auditLog.count({ where: { action: { startsWith: "QUICKNOTE_" } } }),
        ).toBe(0);
        expect(emit).not.toHaveBeenCalled();
      } finally {
        await prismaDirect.$executeRaw`DROP TRIGGER test_note_audit_fail ON audit_logs`;
        await prismaDirect.$executeRaw`DROP FUNCTION test_note_audit_fail()`;
      }
    },
  );
  it("creates note with session author/defaults and archives/deletes with existing event shapes", async () => {
    const res = await http("POST", "/api/notes", {
      ...note,
      id: "client",
      isArchived: true,
      color: "",
      extra: "ignored",
    });
    expect(res.status).toBe(201);
    const n = res.body.data;
    expect(n).toMatchObject({
      authorUsername: "data-admin",
      isArchived: false,
      color: "amber",
      reminderEnabled: true,
      syncStatus: "synced",
      isDeleted: false,
    });
    expect(emit).toHaveBeenCalledWith("quickNote:created", expect.objectContaining({ id: n.id }));
    expect((await http("GET", "/api/notes")).body.data).toHaveLength(1);
    const archived = await http("PUT", `/api/notes/${n.id}`);
    expect(archived.body.data.isArchived).toBe(true);
    expect(archived.body.data).not.toHaveProperty("syncStatus");
    expect(emit).toHaveBeenCalledWith(
      "quickNote:updated",
      expect.objectContaining({ id: n.id, syncStatus: "synced" }),
    );
    expect((await http("GET", "/api/notes")).body.data[0].isArchived).toBe(true);
    expect((await http("DELETE", `/api/notes/${n.id}`)).body).toEqual({
      success: true,
      message: "Nota eliminada",
    });
    expect(emit).toHaveBeenCalledWith("quickNote:deleted", { id: n.id });
    expect(await prismaDirect.quickNote.count()).toBe(0);
    const audits = await prismaDirect.auditLog.findMany({
      where: { action: { startsWith: "QUICKNOTE_" } },
    });
    expect(audits).toHaveLength(3);
    expect(audits.every((audit) => audit.actorUsername === "data-admin")).toBe(true);
    expect(audits.map((audit) => audit.action).sort()).toEqual([
      "QUICKNOTE_CREATE",
      "QUICKNOTE_DELETE",
      "QUICKNOTE_UPDATE",
    ]);
  });
  it("validates note content and handles missing IDs and delta", async () => {
    expect((await http("POST", "/api/notes", { ...note, content: "" })).status).toBe(400);
    expect(await prismaDirect.quickNote.count()).toBe(0);
    expect(emit).not.toHaveBeenCalled();
    for (const method of ["PUT", "DELETE"] as const)
      expect((await http(method, "/api/notes/missing")).status).toBe(404);
    await prismaDirect.quickNote.create({ data: { ...note, updatedAt: new Date("2020-01-01") } });
    expect((await http("GET", "/api/notes?since=1")).body.data).toHaveLength(1);
    expect((await http("GET", `/api/notes?since=${Date.now() + 100000}`)).body.data).toEqual([]);
  });
  it("config read protects two keys by persisted role and preserves nullable/scalar values", async () => {
    await prismaDirect.systemConfig.createMany({
      data: [
        { key: "SMTP_CONFIG", value: '{"profiles":[]}' },
        { key: "EMAIL_NOTIFICATION_RULES", value: '{"enabled":true}' },
        { key: "ordinary", value: '"text"' },
      ],
    });
    expect((await http("GET", "/api/configs")).body).toHaveLength(3);
    expect((await http("GET", "/api/configs/missing")).body).toBeNull();
    expect((await http("GET", "/api/configs/ordinary")).body).toBe("text");
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
    expect((await http("GET", "/api/configs")).body).toEqual([{ key: "ordinary", value: "text" }]);
    for (const key of ["SMTP_CONFIG", "EMAIL_NOTIFICATION_RULES"])
      expect((await http("GET", `/api/configs/${key}`)).status).toBe(403);
    expect((await http("GET", "/api/configs/ordinary")).status).toBe(200);
    const time = (await http("GET", "/api/configs/server-time")).body;
    expect(time.timezone).toBe("America/Santiago");
    expect(new Date(time.iso).getTime()).toBe(time.timestamp);
  });
  it("stores SMTP credentials but redacts old and new values from persisted audits", async () => {
    await prismaDirect.systemConfig.create({
      data: { key: "SMTP_CONFIG", value: JSON.stringify({ password: "old-smtp-fixture" }) },
    });
    const value = { profiles: [{ auth: { pass: "new-smtp-fixture" } }] };
    expect((await http("POST", "/api/configs/SMTP_CONFIG", { value })).status).toBe(200);
    const stored = await prismaDirect.systemConfig.findUniqueOrThrow({
      where: { key: "SMTP_CONFIG" },
    });
    expect(JSON.parse(stored.value)).toEqual(value);
    const audits = await prismaDirect.auditLog.findMany({ where: { action: "CONFIG_SET" } });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.details).toMatchObject({
      key: "SMTP_CONFIG",
      previousValue: "[REDACTED]",
      newValue: "[REDACTED]",
    });
    expect(JSON.stringify(audits)).not.toMatch(/old-smtp-fixture|new-smtp-fixture/);
  });
  it("masks generic SMTP get/list/post and retains secret when saving a masked profile", async () => {
    const value = {
      profiles: [
        { host: "smtp.invalid", user: "owner", port: 587, secure: false, pass: "smtp-fixture" },
      ],
    };
    await prismaDirect.systemConfig.create({
      data: { key: "SMTP_CONFIG", value: JSON.stringify(value) },
    });
    const read = await http("GET", "/api/configs/SMTP_CONFIG");
    expect(read.body.profiles[0].pass).toBe("********");
    expect(JSON.stringify((await http("GET", "/api/configs")).body)).not.toContain("smtp-fixture");
    const saved = await http("POST", "/api/configs/SMTP_CONFIG", { value: read.body });
    expect(saved.status).toBe(200);
    expect(JSON.stringify(saved.body)).not.toContain("smtp-fixture");
    expect(
      JSON.parse(
        (await prismaDirect.systemConfig.findUniqueOrThrow({ where: { key: "SMTP_CONFIG" } }))
          .value,
      ),
    ).toEqual(value);
    read.body.profiles[0].host = "different.invalid";
    expect((await http("POST", "/api/configs/SMTP_CONFIG", { value: read.body })).status).toBe(400);
  });
  it("writes config JSON with one audit and event; supervisor elevated cannot write", async () => {
    const res = await http("POST", "/api/configs/custom", {
      value: { enabled: true },
      actorUsername: "spoof",
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: true });
    expect(
      (await prismaDirect.systemConfig.findUniqueOrThrow({ where: { key: "custom" } })).value,
    ).toBe('{"enabled":true}');
    const audits = await prismaDirect.auditLog.findMany({ where: { action: "CONFIG_SET" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorUsername).toBe("data-admin");
    expect(emit).toHaveBeenCalledExactlyOnceWith("config:updated", {
      key: "custom",
      value: { enabled: true },
    });
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Supervisor_Elevado" },
    });
    expect((await http("POST", "/api/configs/custom", { value: false })).status).toBe(403);
    expect((await http("GET", "/api/configs/validate-closure?date=2020-01-01")).status).toBe(403);
  });
  it("blocks closure from actual anomalies without changing lock/audit/events", async () => {
    await prismaDirect.employee.create({
      data: {
        id: "closure-emp",
        name: "Employee",
        rut: "12345678-9",
        position: "Operator",
        area: "Ops",
        workdayType: "Ordinaria",
      },
    });
    await prismaDirect.timeRecord.create({
      data: {
        employeeId: "closure-emp",
        employeeName: "Employee",
        date: "2020-01-01",
        status: "AnomaliaManual",
      },
    });
    const validation = await http("GET", "/api/configs/validate-closure?date=2020-01-01");
    expect(validation.status).toBe(200);
    expect(validation.body.allowed).toBe(false);
    expect(validation.body.details.total).toBe(1);
    const res = await http("POST", "/api/configs/accounting_lock_date", { value: "2020-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("LOCK_DATE_BLOCKED");
    expect(res.body).not.toHaveProperty("details");
    expect(await prismaDirect.systemConfig.count()).toBe(0);
    expect(await prismaDirect.auditLog.count({ where: { action: "CONFIG_SET" } })).toBe(0);
    expect(emit).not.toHaveBeenCalled();
    expect((await http("GET", "/api/configs/validate-closure")).status).toBe(400);
  });
  it("closes valid period, preserves future-date 500 and fallback lock", async () => {
    expect((await http("GET", "/api/configs/accounting_lock_date")).body).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(
      (await http("POST", "/api/configs/accounting_lock_date", { value: "2020-01-01" })).status,
    ).toBe(200);
    expect(
      (await http("POST", "/api/configs/accounting_lock_date", { value: "2999-01-01" })).status,
    ).toBe(500);
    expect(
      (
        await prismaDirect.systemConfig.findUniqueOrThrow({
          where: { key: "accounting_lock_date" },
        })
      ).value,
    ).toBe('"2020-01-01"');
  });
  it("preserves nested secret redaction in generic config audits", async () => {
    const value = { nested: { password: "test-only-password", pin: "1234" }, visible: true };
    expect((await http("POST", "/api/configs/custom", { value })).status).toBe(200);
    const audit = await prismaDirect.auditLog.findFirstOrThrow({ where: { action: "CONFIG_SET" } });
    expect(audit.details).toMatchObject({
      newValue: { nested: { password: "[REDACTED]", pin: "[REDACTED]" }, visible: true },
    });
  });

  it("rolls back configuration and events if CONFIG_SET audit fails", async () => {
    await http("POST", "/api/configs/custom", { value: "before" });
    emit.mockClear();
    await prismaDirect.$executeRawUnsafe(`
      CREATE FUNCTION fail_config_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action = 'CONFIG_SET' THEN RAISE EXCEPTION 'test audit failure'; END IF;
      RETURN NEW; END $$;
    `);
    await prismaDirect.$executeRawUnsafe(`
      CREATE TRIGGER fail_config_audit BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_config_audit();
    `);
    try {
      expect((await http("POST", "/api/configs/custom", { value: "after" })).status).toBe(500);
      expect(
        (await prismaDirect.systemConfig.findUniqueOrThrow({ where: { key: "custom" } })).value,
      ).toBe(JSON.stringify("before"));
      expect(emit).not.toHaveBeenCalled();
    } finally {
      await prismaDirect.$executeRawUnsafe("DROP TRIGGER fail_config_audit ON audit_logs");
      await prismaDirect.$executeRawUnsafe("DROP FUNCTION fail_config_audit()");
    }
  });

  it.each([
    Buffer.from("pretend PDF"),
    Buffer.from("%PDF-1.4\nNot a document\n%%EOF"),
    Buffer.from("%PDF-1.4\ntruncated"),
  ])("rejects invalid PDF content and removes the staged file", async (bytes) => {
    const listFiles = () =>
      fs.readdir(directory).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
    const before = await listFiles();
    expect((await upload(bytes)).status).toBe(400);
    expect(await listFiles()).toEqual(before);
    expect(await prismaDirect.systemConfig.count({ where: { key: "company_policy_meta" } })).toBe(
      0,
    );
  });

  it("removes the new PDF after persistence failure and keeps the previous download", async () => {
    const document = await PDFDocument.create();
    document.addPage();
    const bytes = Buffer.from(await document.save());
    const previous = await upload(bytes);
    const before = await fs.readdir(directory);
    const replace = vi.spyOn(configFlows, "upload");
    // Exercise actual file cleanup through the composed flow by failing its transaction.
    await prismaDirect.$executeRawUnsafe(`
      CREATE FUNCTION fail_policy_write() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.key = 'company_policy_meta' THEN RAISE EXCEPTION 'test persistence failure'; END IF;
      RETURN NEW; END $$;
    `);
    await prismaDirect.$executeRawUnsafe(`
      CREATE TRIGGER fail_policy_write BEFORE UPDATE ON system_configs
      FOR EACH ROW EXECUTE FUNCTION fail_policy_write();
    `);
    try {
      expect((await upload(bytes)).status).toBe(500);
      expect(await fs.readdir(directory)).toEqual(before);
      expect((await http("GET", "/api/configs/public/company-policy")).body.filename).toBe(
        previous.body.filename,
      );
      expect(replace).toHaveBeenCalled();
    } finally {
      await prismaDirect.$executeRawUnsafe("DROP TRIGGER fail_policy_write ON system_configs");
      await prismaDirect.$executeRawUnsafe("DROP FUNCTION fail_policy_write()");
    }
  });

  it("serializes concurrent PDF replacements and retains only the current file", async () => {
    const document = await PDFDocument.create();
    document.addPage();
    const bytes = Buffer.from(await document.save());
    const first = await upload(bytes);
    const results = await Promise.all([upload(bytes, "A.pdf"), upload(bytes, "B.pdf")]);
    expect(results.map((result) => result.status)).toEqual([201, 201]);
    const current = (await http("GET", "/api/configs/public/company-policy")).body;
    const filenames = [first.body.filename, ...results.map((result) => result.body.filename)];
    for (const filename of filenames) {
      const exists = await fs.access(path.join(directory, filename)).then(
        () => true,
        () => false,
      );
      expect(exists).toBe(filename === current.filename);
    }
    const audits = await prismaDirect.auditLog.findMany({
      where: { action: "CONFIG_SET" },
    });
    const chain = audits.map(
      (audit) =>
        audit.details as {
          previousValue: { filename: string } | null;
          newValue: { filename: string };
        },
    );
    expect(chain.filter((entry) => entry.previousValue === null)).toHaveLength(1);
    expect(
      chain.filter((entry) => entry.previousValue?.filename === first.body.filename),
    ).toHaveLength(1);
    expect(chain.some((entry) => entry.newValue.filename === current.filename)).toBe(true);
  });

  it("public policy is anonymous, uploads PDF bytes, replaces file and preserves inline headers", async () => {
    expect((await http("GET", "/api/configs/public/company-policy", undefined, null)).status).toBe(
      404,
    );
    expect(
      (await http("GET", "/api/configs/public/company-policy/file", undefined, null)).body,
    ).toEqual({ message: "No hay reglamento cargado" });
    const document = await PDFDocument.create();
    document.addPage();
    const bytes = Buffer.from(await document.save());
    const res = await upload(bytes, "Reglamento á.pdf");
    expect(res.status).toBe(201);
    expect(res.body.uploadedBy).toBe("data-admin");
    expect(res.body.size).toBe(bytes.length);
    owned.add(res.body.filename);
    const meta = await http("GET", "/api/configs/public/company-policy", undefined, null);
    expect(meta.status).toBe(200);
    expect(meta.body.filename).toBe(res.body.filename);
    const file = await http(
      "GET",
      "/api/configs/public/company-policy/file",
      undefined,
      null,
      true,
    );
    expect(file.status).toBe(200);
    expect(file.bytes).toEqual(bytes);
    expect(file.headers["content-type"]).toContain("application/pdf");
    expect(file.headers["content-disposition"]).toContain("inline; filename=");
    let partialStatus: number, partialBytes: Buffer, etag: string | undefined;

    const part = await fastify.inject({
      method: "GET",
      url: "/api/configs/public/company-policy/file",
      headers: { range: "bytes=0-3" },
    });
    partialStatus = part.statusCode;
    partialBytes = part.rawPayload;
    etag = part.headers.etag as string;
    expect(
      (
        await fastify.inject({
          method: "GET",
          url: "/api/configs/public/company-policy/file",
          headers: { "if-none-match": etag },
        })
      ).statusCode,
    ).toBe(304);

    expect(partialStatus).toBe(206);
    expect(partialBytes.toString()).toBe("%PDF");
    expect(etag).toBeTruthy();
    const next = await upload(bytes, "New.pdf");
    expect(next.status).toBe(201);
    owned.add(next.body.filename);
    await expect(fs.access(path.join(directory, res.body.filename))).rejects.toThrow();
    await fs.unlink(path.join(directory, next.body.filename));
    expect(
      (await http("GET", "/api/configs/public/company-policy/file", undefined, null)).status,
    ).toBe(404);
  });
  it("rejects missing/wrong MIME/unexpected file/oversize before metadata write", async () => {
    expect((await http("POST", "/api/configs/company-policy", {})).status).toBe(400);
    expect((await upload(Buffer.from("text"), "x.txt", "text/plain")).status).toBe(400);
    expect((await upload(Buffer.from("pdf"), "x.pdf", "application/pdf", "other")).status).toBe(
      400,
    );
    expect((await upload(Buffer.alloc(15 * 1024 * 1024 + 1), "huge.pdf")).status).toBe(413);
    expect(await prismaDirect.systemConfig.count()).toBe(0);
    expect(emit).not.toHaveBeenCalled();
  });
  it("uses basename for public policy path without traversing directories", async () => {
    const filename = `spec020-path-fastify.pdf`;
    owned.add(filename);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), "owned-policy");
    await prismaDirect.systemConfig.create({
      data: {
        key: "company_policy_meta",
        value: JSON.stringify({ filename: `../../${filename}`, originalName: "Policy.pdf" }),
      },
    });
    const res = await http("GET", "/api/configs/public/company-policy/file", undefined, null, true);
    expect(res.status).toBe(200);
    expect(res.bytes.toString()).toBe("owned-policy");
  });
  it("keeps previous config and emits nothing on actual database write failure", async () => {
    await prismaDirect.systemConfig.create({ data: { key: "custom", value: "false" } });
    await prismaDirect.$executeRaw`CREATE FUNCTION test_config_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'spec020 write failed'; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_config_fail BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION test_config_fail()`;
    try {
      expect((await http("POST", "/api/configs/custom", { value: true })).status).toBe(500);
      expect(
        (await prismaDirect.systemConfig.findUniqueOrThrow({ where: { key: "custom" } })).value,
      ).toBe("false");
      expect(emit).not.toHaveBeenCalled();
      expect(await prismaDirect.auditLog.count({ where: { action: "CONFIG_SET" } })).toBe(0);
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_config_fail ON system_configs`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_config_fail()`;
    }
  });
  it("allows Reloj_Control for meters/notes but retains admin-only mutations", async () => {
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Reloj_Control" } });
    expect((await http("POST", "/api/meters/bulk", [reading])).status).toBe(201);
    expect((await http("POST", "/api/notes", note)).status).toBe(201);
    expect((await http("POST", "/api/configs/custom", { value: 1 })).status).toBe(403);
  });
  it.each(routes)(
    "checks session before %s %s and persisted role for writes",
    async (method, url) => {
      const body = method === "POST" ? {} : undefined;
      expect((await http(method, url, body, null)).status).toBe(401);
      await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Usuario" } });
      const readConfig =
        method === "GET" && url.startsWith("/api/configs") && !url.includes("validate-closure");
      expect((await http(method, url, body)).status).toBe(readConfig ? 200 : 403);
      expect(await prismaDirect.meterReading.count()).toBe(0);
      expect(await prismaDirect.quickNote.count()).toBe(0);
      expect(await prismaDirect.systemConfig.count()).toBe(0);
    },
  );
});
