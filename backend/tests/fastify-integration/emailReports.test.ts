import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const smtp = vi.hoisted(() => ({ verify: vi.fn(), sendMail: vi.fn(), createTransport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.createTransport } }));
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { EmailService } from "../../src/services/EmailService";
import { AuthService } from "../../src/services/AuthService";
import { decrypt, isEncrypted } from "../../src/utils/cryptoUtils";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
const profile = {
  host: "smtp.invalid",
  port: 587,
  secure: false,
  user: "test",
  pass: "spec019-only-secret",
  fromEmail: "from@example.com",
  fromName: "Portal",
};
const multi = { profiles: [profile, profile, profile], activeProfileIndex: 0 };
const wireConfig = multi;
const legacyReport = {
  name: "Report",
  reportType: "attendance_summary",
  frequency: "daily",
  cronExpression: "0 8 * * *",
  recipients: ["a@example.com"],
};
const wireReport = legacyReport;
const wireRules = {
  autoCloseShift: { enabled: true, recipient: "a@example.com" },
  latenessOver15: { enabled: false, recipient: "" },
  latenessOver60: { enabled: false, recipient: "" },
};
const routes = [
  ["POST", "/api/email/verify"],
  ["GET", "/api/email/config"],
  ["POST", "/api/email/config"],
  ["GET", "/api/email/rules"],
  ["POST", "/api/email/rules"],
  ["POST", "/api/email/send-test"],
  ["GET", "/api/scheduled-reports"],
  ["GET", "/api/scheduled-reports/missing"],
  ["POST", "/api/scheduled-reports"],
  ["PUT", "/api/scheduled-reports/missing"],
  ["PATCH", "/api/scheduled-reports/missing/toggle"],
  ["DELETE", "/api/scheduled-reports/missing"],
] as const;
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
  vi.clearAllMocks();
  smtp.createTransport.mockReturnValue(smtp);
  smtp.verify.mockResolvedValue(true);
  smtp.sendMail.mockResolvedValue({ messageId: "fake-only" });
  const actor = await prismaDirect.user.create({
    data: { username: "mail-admin", role: "Administrador", passwordHash: "test-only" },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, undefined, "spec019")
  ).token;
});
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
describe("Spec019 email/reports on Fastify", () => {
  const http = httpClient(
    () => fastify,
    () => token,
  );
  it("returns masked defaults, rules and unwrapped empty reports", async () => {
    const config = await http("GET", "/api/email/config");
    expect(config.status).toBe(200);
    expect(config.body.profiles).toHaveLength(3);
    expect(config.body.profiles[0].pass).toBe("");
    expect((await http("GET", "/api/email/rules")).body.autoCloseShift).toEqual({
      enabled: false,
      recipient: "",
    });
    expect((await http("GET", "/api/scheduled-reports")).body).toEqual([]);
  });
  it("accepts native config, rejects obsolete fields and persists encrypted profiles only", async () => {
    expect((await http("POST", "/api/email/config", { ...multi, host: "obsolete" })).status).toBe(
      400,
    );
    const oldShape = {
      host: profile.host,
      port: 587,
      secure: false,
      auth: { user: "u", pass: "p" },
      from: "from@example.com",
    };
    expect((await http("POST", "/api/email/config", oldShape)).status).toBe(400);
    expect(await prismaDirect.systemConfig.count()).toBe(0);
    expect((await http("POST", "/api/email/config", wireConfig)).body.success).toBe(true);
    const stored = await prismaDirect.systemConfig.findUniqueOrThrow({
      where: { key: "SMTP_CONFIG" },
    });
    const encrypted = JSON.parse(stored.value).profiles[0].pass;
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decrypt(encrypted)).toBe(profile.pass);
    expect(stored.value).not.toContain(profile.pass);
    const publicConfig = (await http("GET", "/api/email/config")).body;
    expect(publicConfig.profiles[0].pass).toBe("********");
    expect(JSON.stringify(publicConfig)).not.toContain(encrypted);
    expect(
      (await http("POST", "/api/email/config", { ...wireConfig, ...publicConfig })).status,
    ).toBe(200);
    expect(
      JSON.parse(
        (await prismaDirect.systemConfig.findUniqueOrThrow({ where: { key: "SMTP_CONFIG" } }))
          .value,
      ).profiles[0].pass,
    ).toBe(encrypted);
  });
  it("uses stored decrypted credentials for masked verification and keeps failures at HTTP200", async () => {
    expect((await http("POST", "/api/email/verify", {})).status).toBe(400);
    expect(smtp.createTransport).not.toHaveBeenCalled();
    await http("POST", "/api/email/config", wireConfig);
    const response = await http("POST", "/api/email/verify", { ...profile, pass: "********" });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(smtp.createTransport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        auth: { user: profile.user, pass: profile.pass },
        tls: { rejectUnauthorized: true },
      }),
    );
    smtp.verify.mockRejectedValueOnce(new Error("provider offline"));
    expect((await http("POST", "/api/email/verify", profile)).body).toEqual({
      success: false,
      message: "No se pudo verificar la conexión SMTP",
    });
  });
  it("sends only through a double; absence/configuration/provider errors keep existing result contract", async () => {
    const body = { to: "a@example.com", subject: "test", message: "first\nsecond" };
    const absent = await http("POST", "/api/email/send-test", body);
    expect(absent.status).toBe(200);
    expect(absent.body.success).toBe(false);
    expect(smtp.sendMail).not.toHaveBeenCalled();
    expect((await http("POST", "/api/email/send-test", { ...body, to: "invalid" })).status).toBe(
      400,
    );
    await http("POST", "/api/email/config", wireConfig);
    expect((await http("POST", "/api/email/send-test", body)).body.success).toBe(true);
    expect(smtp.sendMail).toHaveBeenLastCalledWith({
      from: '"Portal" <from@example.com>',
      to: body.to,
      subject: "test",
      text: body.message,
      html: "first<br>second",
    });
    smtp.sendMail.mockRejectedValueOnce(new Error("send offline"));
    expect((await http("POST", "/api/email/send-test", body)).body).toEqual({
      success: false,
      message: "No se pudo enviar el correo",
    });
    expect((await http("POST", "/api/email/send-test", { to: body.to })).body.success).toBe(true);
    expect(smtp.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({ subject: "", text: "", html: "" }),
    );
  });
  it.each([
    [Buffer.from("%PDF-1.4\ntest-only bytes"), "application/pdf"],
    [Buffer.from("legacy plain text"), "text/plain; charset=utf-8"],
  ])("uses the actual attachment format for MIME", async (bytes, contentType) => {
    await http("POST", "/api/email/config", multi);
    const result = await new EmailService().sendEmailWithAttachment(
      "a@example.com",
      "test",
      "<p>test</p>",
      bytes,
      "test-only",
    );
    expect(result.success).toBe(true);
    expect(smtp.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attachments: [{ filename: "test-only", content: bytes, contentType }],
      }),
    );
  });

  it("accepts native rules and returns disabled rules for corrupt storage", async () => {
    const native = {
      autoCloseShift: { enabled: true, recipient: "a@example.com" },
      latenessOver15: { enabled: false, recipient: "" },
      latenessOver60: { enabled: false, recipient: "" },
    };
    expect(
      (await http("POST", "/api/email/rules", { ...native, notifyOnAbsence: true })).status,
    ).toBe(400);
    const combined = { ...wireRules, ...native };
    expect((await http("POST", "/api/email/rules", combined)).body.success).toBe(true);
    expect((await http("GET", "/api/email/rules")).body).toEqual(combined);
    await prismaDirect.systemConfig.update({
      where: { key: "EMAIL_NOTIFICATION_RULES" },
      data: { value: "not-json" },
    });
    expect((await http("GET", "/api/email/rules")).body.autoCloseShift).toEqual({
      enabled: false,
      recipient: "",
    });
  });
  it("creates, normalizes, updates, toggles and deletes actual reports with server actor", async () => {
    expect(
      (await http("POST", "/api/scheduled-reports", { ...legacyReport, type: "daily" })).status,
    ).toBe(400);
    expect(
      (
        await http("POST", "/api/scheduled-reports", {
          name: "x",
          type: "daily",
          active: true,
          recipients: [],
        })
      ).status,
    ).toBe(400);
    expect(await prismaDirect.scheduledReport.count()).toBe(0);
    const response = await http("POST", "/api/scheduled-reports", {
      ...wireReport,
      filters: { area: "Ops" },
    });
    expect(response.status).toBe(201);
    const r = response.body;
    expect(r).toMatchObject({
      createdBy: "mail-admin",
      isActive: true,
      recipients: ["a@example.com"],
      filters: { area: "Ops" },
    });
    expect(new Date(r.nextRunAt).getTime()).toBeGreaterThan(Date.now());
    const stored = await prismaDirect.scheduledReport.findUniqueOrThrow({ where: { id: r.id } });
    expect(stored.recipients).toBe("a@example.com");
    expect(stored.filters).toBe('{"area":"Ops"}');
    expect((await http("GET", `/api/scheduled-reports/${r.id}`)).body).toEqual(r);
    const updated = await http("PUT", `/api/scheduled-reports/${r.id}`, {
      name: "Changed",
      isActive: false,
      recipients: ["b@example.com", "c@example.com"],
    });
    expect(updated.body).toMatchObject({
      name: "Changed",
      isActive: false,
      recipients: ["b@example.com", "c@example.com"],
      filters: { area: "Ops" },
    });
    expect((await http("PATCH", `/api/scheduled-reports/${r.id}/toggle`)).body.isActive).toBe(true);
    const deleted = await http("DELETE", `/api/scheduled-reports/${r.id}`);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(await prismaDirect.scheduledReport.count()).toBe(0);
  });
  it.each([
    { ...wireReport, cronExpression: "invalid-but-accepted" },
    { ...wireReport, cronExpression: "60 8 * * *" },
    { ...wireReport, cronExpression: "0 8 31 2 *" },
    { ...wireReport, cronExpression: "* * * * * *" },
    { ...wireReport, cronExpression: "H 8 * * *" },
    { ...wireReport, reportType: "attendance" },
    { ...wireReport, reportType: "shift_report" },
    { ...wireReport, recipients: "a@example.com" },
    { ...wireReport, createdBy: "spoof" },
    { ...wireReport, filters: { startDate: "2026-02-30" } },
    { ...wireReport, filters: { unknown: true } },
  ])("rejects invalid report input before persistence", async (body) => {
    expect((await http("POST", "/api/scheduled-reports", body)).status).toBe(400);
    expect(await prismaDirect.scheduledReport.count()).toBe(0);
  });

  it.each([
    { ...multi, activeProfileIndex: 0.5 },
    { ...multi, profiles: [{ ...profile, port: 65536 }, profile, profile] },
    { ...multi, profiles: [{ ...profile, port: 587.5 }, profile, profile] },
    { ...multi, profiles: [{ ...profile, arbitrary: true }, profile, profile] },
  ])("rejects invalid SMTP config before persistence/provider", async (body) => {
    expect((await http("POST", "/api/email/config", body)).status).toBe(400);
    expect(await prismaDirect.systemConfig.count()).toBe(0);
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });

  it("accepts blank inactive slots and keeps defaults isolated between reads", async () => {
    const defaults = (await http("GET", "/api/email/config")).body;
    const configured = {
      ...defaults,
      profiles: [profile, defaults.profiles[1], defaults.profiles[2]],
    };
    expect((await http("POST", "/api/email/config", configured)).status).toBe(200);
    expect((await http("GET", "/api/email/config")).body.profiles[0].pass).toBe("********");
    expect((await http("POST", "/api/email/send-test", { to: "a@example.com" })).body.success).toBe(
      true,
    );
    expect(smtp.createTransport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        auth: { user: profile.user, pass: profile.pass },
      }),
    );
    await prismaDirect.systemConfig.deleteMany();
    expect((await http("GET", "/api/email/config")).body).toEqual(defaults);
    expect(
      (await http("POST", "/api/email/verify", { ...profile, host: "", extra: true })).status,
    ).toBe(400);
  });

  it("rejects active rules without a valid recipient and ignores no extra fields", async () => {
    for (const rule of [
      { enabled: true, recipient: "" },
      { enabled: false, recipient: "bad" },
      { enabled: false, recipient: "", pass: "extra" },
    ]) {
      expect(
        (await http("POST", "/api/email/rules", { ...wireRules, autoCloseShift: rule })).status,
      ).toBe(400);
    }
    expect(await prismaDirect.systemConfig.count()).toBe(0);
  });

  it("preserves omitted fields on inactive updates and allows clearing filters", async () => {
    const created = await http("POST", "/api/scheduled-reports", {
      ...wireReport,
      isActive: false,
      filters: { area: "Ops" },
    });
    expect(created.status).toBe(201);
    const updated = await http("PUT", `/api/scheduled-reports/${created.body.id}`, {
      description: "Changed",
    });
    expect(updated.body).toMatchObject({
      isActive: false,
      filters: { area: "Ops" },
      description: "Changed",
    });
    const cleared = await http("PUT", `/api/scheduled-reports/${created.body.id}`, {
      filters: null,
    });
    expect(cleared.body.filters).toBeNull();
    expect(cleared.body.isActive).toBe(false);
  });

  it("serializes concurrent toggles and updates without losing fields", async () => {
    const created = await http("POST", "/api/scheduled-reports", wireReport);
    const id = created.body.id;
    const toggled = await Promise.all(
      Array.from({ length: 6 }, () => http("PATCH", `/api/scheduled-reports/${id}/toggle`)),
    );
    expect(toggled.map((result) => result.status)).toEqual(Array(6).fill(200));
    expect(toggled.filter((result) => result.body.isActive)).toHaveLength(3);
    const updates = await Promise.all([
      http("PUT", `/api/scheduled-reports/${id}`, { name: "Concurrent" }),
      http("PUT", `/api/scheduled-reports/${id}`, { description: "Preserved" }),
    ]);
    expect(updates.map((result) => result.status)).toEqual([200, 200]);
    expect((await http("GET", `/api/scheduled-reports/${id}`)).body).toMatchObject({
      name: "Concurrent",
      description: "Preserved",
      isActive: true,
    });
  });

  it("preserves 404 across missing read/update/toggle/delete and invalid update never writes", async () => {
    for (const method of ["GET", "PUT", "DELETE"] as const)
      expect(
        (await http(method, "/api/scheduled-reports/missing", method === "PUT" ? {} : undefined))
          .status,
      ).toBe(404);
    expect((await http("PATCH", "/api/scheduled-reports/missing/toggle")).status).toBe(404);
    expect(
      (await http("PUT", "/api/scheduled-reports/missing", { recipients: ["bad"] })).status,
    ).toBe(400);
  });
  it("surfaces actual database insert failure without a partial scheduled report", async () => {
    await prismaDirect.$executeRaw`CREATE FUNCTION test_mail_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'spec019 write failed'; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_mail_fail BEFORE INSERT ON scheduled_reports FOR EACH ROW EXECUTE FUNCTION test_mail_fail()`;
    try {
      expect((await http("POST", "/api/scheduled-reports", wireReport)).status).toBe(500);
      expect(await prismaDirect.scheduledReport.count()).toBe(0);
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_mail_fail ON scheduled_reports`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_mail_fail()`;
    }
  });
  it.each(["create", "update", "toggle", "delete"])(
    "rolls back %s when report audit fails",
    async (operation) => {
      const report = await prismaDirect.scheduledReport.create({
        data: { ...wireReport, recipients: "a@example.com", createdBy: "fixture" },
      });
      await prismaDirect.$executeRaw`CREATE FUNCTION test_report_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action LIKE 'SCHEDULEDREPORT_%' THEN RAISE EXCEPTION 'test report audit failure'; END IF;
      RETURN NEW; END; $$`;
      await prismaDirect.$executeRaw`CREATE TRIGGER test_report_audit_fail BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION test_report_audit_fail()`;
      try {
        const result =
          operation === "create"
            ? await http("POST", "/api/scheduled-reports", wireReport)
            : operation === "update"
              ? await http("PUT", `/api/scheduled-reports/${report.id}`, { name: "Changed" })
              : operation === "toggle"
                ? await http("PATCH", `/api/scheduled-reports/${report.id}/toggle`)
                : await http("DELETE", `/api/scheduled-reports/${report.id}`);
        expect(result.status).toBe(500);
        expect(await prismaDirect.scheduledReport.count()).toBe(1);
        expect(
          await prismaDirect.scheduledReport.findUniqueOrThrow({ where: { id: report.id } }),
        ).toEqual(report);
        expect(
          await prismaDirect.auditLog.count({
            where: { action: { startsWith: "SCHEDULEDREPORT_" } },
          }),
        ).toBe(0);
      } finally {
        await prismaDirect.$executeRaw`DROP TRIGGER test_report_audit_fail ON audit_logs`;
        await prismaDirect.$executeRaw`DROP FUNCTION test_report_audit_fail()`;
      }
    },
  );

  it.each(["config", "rules"])("rolls back SMTP/rules %s when audit fails", async (kind) => {
    await prismaDirect.$executeRaw`CREATE FUNCTION test_email_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action = 'CONFIG_SET' THEN RAISE EXCEPTION 'test email audit failure'; END IF;
      RETURN NEW; END; $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER test_email_audit_fail BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION test_email_audit_fail()`;
    try {
      expect(
        (await http("POST", `/api/email/${kind}`, kind === "config" ? multi : wireRules)).status,
      ).toBe(500);
      expect(await prismaDirect.systemConfig.count()).toBe(0);
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER test_email_audit_fail ON audit_logs`;
      await prismaDirect.$executeRaw`DROP FUNCTION test_email_audit_fail()`;
    }
  });

  it("retains the latest credential under concurrent masked and new-password saves", async () => {
    await http("POST", "/api/email/config", multi);
    const masked = (await http("GET", "/api/email/config")).body;
    const freshSecret = "spec025-new-test-password";
    const fresh = {
      ...multi,
      profiles: multi.profiles.map((entry) => ({ ...entry, pass: freshSecret })),
    };
    const results = await Promise.all([
      http("POST", "/api/email/config", fresh),
      http("POST", "/api/email/config", masked),
    ]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    const stored = await prismaDirect.systemConfig.findUniqueOrThrow({
      where: { key: "SMTP_CONFIG" },
    });
    expect(decrypt(JSON.parse(stored.value).profiles[0].pass)).toBe(freshSecret);
    const audits = await prismaDirect.auditLog.findMany({ where: { action: "CONFIG_SET" } });
    expect(audits).toHaveLength(3);
    expect(audits.every((entry) => entry.actorUsername === "mail-admin")).toBe(true);
    expect(JSON.stringify(audits)).not.toContain(freshSecret);
  });

  it("permits Supervisor_Elevado and excludes Supervisor/Reloj/Fiscalizador/Usuario using persisted role", async () => {
    for (const role of [
      "Supervisor_Elevado",
      "Supervisor",
      "Reloj_Control",
      "Fiscalizador",
      "Usuario",
    ] as const) {
      await prismaDirect.user.update({ where: { id: actorId }, data: { role } });
      expect((await http("GET", "/api/email/config")).status).toBe(
        role === "Supervisor_Elevado" ? 200 : 403,
      );
      expect((await http("GET", "/api/scheduled-reports")).status).toBe(
        role === "Supervisor_Elevado" ? 200 : 403,
      );
    }
  });
  it.each(routes)("authenticates and authorizes %s %s before effects", async (method, url) => {
    const body = ["POST", "PUT"].includes(method) ? {} : undefined;
    expect((await http(method, url, body, null)).status).toBe(401);
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Supervisor" } });
    expect((await http(method, url, body)).status).toBe(403);
    expect(smtp.createTransport).not.toHaveBeenCalled();
    expect(await prismaDirect.scheduledReport.count()).toBe(0);
    expect(await prismaDirect.systemConfig.count()).toBe(0);
  });
});
