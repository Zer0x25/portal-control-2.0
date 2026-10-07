import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import prisma, { prismaDirect, withDirectTransaction } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { auditService } from "../../src/services/auditService";
import { securityAuditService } from "../../src/services/securityAuditService";
import { streamExportService } from "../../src/services/export/StreamExportService";
import { requestContext } from "../../src/utils/context";
import { SocketService } from "../../src/services/socketService";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance, token: string, actorId: string;
let sequence = 0,
  ip = "";
const manual = {
  id: "ignored-id",
  timestamp: "1900-01-01",
  actorUsername: "spoof",
  action: "MANUAL",
  category: "SPEC022",
  severity: "custom",
  outcome: "custom",
  details: { recordId: "r1", content: '<&"' },
  ipAddress: "spoof",
  metadata: { secret: "ignored" },
};
async function session(username: string, role = "Administrador") {
  const actor = await prismaDirect.user.create({
    data: { username, role: role as "Administrador", passwordHash: "test-only" },
  });
  return (
    await AuthService.createSession(actor.id, actor.username, actor.role, undefined, "spec022")
  ).token;
}
async function logs() {
  await prismaDirect.auditLog.createMany({
    data: [
      {
        id: "audit-a",
        timestamp: new Date("2020-01-01T12:00:00Z"),
        actorUsername: "Alice",
        action: "EDIT",
        category: "A",
        severity: "INFO",
        outcome: "SUCCESS",
        details: { recordId: "r1", content: 'a, "b" & <tag>' },
      },
      {
        id: "audit-b",
        timestamp: new Date("2020-01-02T12:00:00Z"),
        actorUsername: "Alice",
        action: "EDIT",
        category: "B",
        severity: "ERROR",
        outcome: "FAILURE",
        details: { recordId: "r2" },
      },
      {
        id: "audit-c",
        timestamp: new Date("2020-01-03T12:00:00Z"),
        actorUsername: "Bob",
        action: "OTHER",
        category: "C",
        severity: "INFO",
        outcome: "SUCCESS",
      },
    ],
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
  ip = "192.0.2." + ++sequence;
  const actor = await prismaDirect.user.create({
    data: { username: "audit-admin", role: "Administrador", passwordHash: "test-only" },
  });
  actorId = actor.id;
  token = (
    await AuthService.createSession(actor.id, actor.username, actor.role, undefined, "spec022")
  ).token;
  vi.spyOn(SocketService, "emitToAll").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
describe.each(["Express", "Fastify"] as const)("Spec022 audit on %s", (server) => {
  const http = httpClient(
    server,
    () => fastify,
    () => token,
    () => ({ "x-forwarded-for": ip }),
  );
  it("paginates stably and consumes cursor without duplicates", async () => {
    await logs();
    const first = await http("GET", "/api/audit-logs?pageSize=2&sortOrder=asc");
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({
      total: 3,
      page: 1,
      totalPages: 2,
      nextCursor: "audit-b",
    });
    expect(first.body.data.items.map((x: any) => x.id)).toEqual(["audit-a", "audit-b"]);
    const next = await http("GET", "/api/audit-logs?pageSize=2&sortOrder=asc&cursor=audit-b");
    expect(next.body.data.items.map((x: any) => x.id)).toEqual(["audit-c"]);
    expect(next.body.data.nextCursor).toBeNull();
    expect(
      (await http("GET", "/api/audit-logs?page=2&pageSize=2&sortOrder=asc")).body.data.items[0].id,
    ).toBe("audit-c");
  });
  it("filters actor, repeated categories, severity, outcome and recordId", async () => {
    await logs();
    const result = await http(
      "GET",
      "/api/audit-logs?actor=alice&category=A&category=B&severity=INFO&outcome=SUCCESS&recordId=r1&action=edit",
    );
    expect(result.status).toBe(200);
    expect(result.body.data.items.map((x: any) => x.id)).toEqual(["audit-a"]);
    expect(
      (await http("GET", "/api/audit-logs?sortBy=unknown&since=9999999999999")).body.data.total,
    ).toBe(3);
    expect((await http("GET", "/api/audit-logs?sortOrder=bad")).status).toBe(400);
  });
  it("persists manual log with authenticated actor and emits public event", async () => {
    const response = await http("POST", "/api/audit-logs", manual);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, message: "Log creado exitosamente" });
    const saved = await prismaDirect.auditLog.findFirst({ where: { action: "MANUAL" } });
    expect(saved).toMatchObject({
      actorUsername: "audit-admin",
      ipAddress: ip,
      severity: "custom",
      outcome: "custom",
      details: manual.details,
      metadata: null,
    });
    expect(saved?.id).not.toBe(manual.id);
    expect(saved?.timestamp.getUTCFullYear()).not.toBe(1900);
    expect(SocketService.emitToAll).toHaveBeenCalledWith(
      "auditLog:created",
      expect.objectContaining({ actorUsername: "audit-admin" }),
    );
  });
  it("rejects incomplete manual schema before creating a log", async () => {
    expect(
      (await http("POST", "/api/audit-logs", { action: "MANUAL", category: "A" })).status,
    ).toBe(400);
    expect(await prismaDirect.auditLog.count({ where: { action: "MANUAL" } })).toBe(0);
  });
  it("retains success when audit persistence fails", async () => {
    vi.spyOn(prisma.auditLog, "create").mockRejectedValueOnce(new Error("owned test failure"));
    expect((await http("POST", "/api/audit-logs", manual)).status).toBe(201);
    expect(await prismaDirect.auditLog.count({ where: { action: "MANUAL" } })).toBe(0);
  });
  it.each(["Supervisor", "Reloj_Control", "Usuario"])(
    "denies reads but allows manual POST for %s",
    async (role) => {
      await prismaDirect.user.update({ where: { id: actorId }, data: { role: role as "Usuario" } });
      for (const path of [
        "/api/audit-logs",
        "/api/audit-logs/export",
        "/api/audit-logs/integrity-status",
      ])
        expect((await http("GET", path)).status).toBe(403);
      expect((await http("POST", "/api/audit-logs", manual)).status).toBe(201);
    },
  );
  it("Fiscalizador reads/exports/status but cannot verify or clean", async () => {
    await prismaDirect.user.update({ where: { id: actorId }, data: { role: "Fiscalizador" } });
    await logs();
    for (const path of [
      "/api/audit-logs",
      "/api/audit-logs/export",
      "/api/audit-logs/integrity-status",
    ])
      expect((await http("GET", path)).status).toBe(200);
    expect((await http("GET", "/api/audit-logs/verify-integrity")).status).toBe(403);
    expect((await http("POST", "/api/audit-logs/cleanup", {})).status).toBe(403);
    expect(
      await prismaDirect.auditLog.count({
        where: { id: { in: ["audit-a", "audit-b", "audit-c"] } },
      }),
    ).toBe(3);
  });
  it("cleanup defaults six months and retains recent entries", async () => {
    await logs();
    await prismaDirect.auditLog.create({
      data: { id: "recent", actorUsername: "Admin", action: "RECENT", category: "A" },
    });
    const response = await http("POST", "/api/audit-logs/cleanup", {});
    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(3);
    expect(response.body.data.message).toContain(response.body.data.cutoffDate);
    expect(await prismaDirect.auditLog.findUnique({ where: { id: "recent" } })).not.toBeNull();
  });
  it("rejects destructive retention bounds and supports numeric string", async () => {
    await logs();
    for (const months of [0, 121, 1.5, "bad", -1])
      expect((await http("POST", "/api/audit-logs/cleanup", { months })).status).toBe(400);
    expect(await prismaDirect.auditLog.count({ where: { id: "audit-a" } })).toBe(1);
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { role: "Supervisor_Elevado" },
    });
    const response = await http("POST", "/api/audit-logs/cleanup", { months: "1" });
    expect(response.status).toBe(200);
    expect(response.body.data.count).toBeGreaterThanOrEqual(3);
  });
  it("exports raw JSON and unknown format falls back to JSON", async () => {
    await logs();
    for (const format of ["json", "other"]) {
      const response = await http(
        "GET",
        `/api/audit-logs/export?format=${format}&actor=alice&category=A&category=B&severity=INFO`,
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.map((x: any) => x.id)).toEqual(["audit-a"]);
    }
    expect(
      (await http("GET", "/api/audit-logs/export?actor=" + encodeURIComponent("' OR 1=1 --"))).body,
    ).toEqual([]);
  });
  it.each(["csv", "xml"])("streams real %s with filters and escaped content", async (format) => {
    await logs();
    const response = await http(
      "GET",
      `/api/audit-logs/export?format=${format}&category=A&category=B&severity=INFO`,
      undefined,
      token,
      true,
    );
    expect(response.status).toBe(200);
    const text = response.bytes.toString("utf8");
    expect(text).toContain("audit-a");
    expect(text).not.toContain("audit-b");
    expect(text).not.toContain("audit-c");
    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename=audit_logs_all_all.${format}`,
    );
    if (format === "xml") {
      expect(text).toContain("<AuditLogs>");
      expect(text).toContain("&lt;tag&gt;");
      expect(text).toContain("</AuditLogs>");
    } else {
      expect(response.bytes.subarray(0, 3).toString("hex")).toBe("efbbbf");
      expect(text).toContain("id,timestamp,actorUsername");
      expect(text).toContain('""');
    }
    const injected = await http(
      "GET",
      `/api/audit-logs/export?format=${format}&actor=` + encodeURIComponent("' OR 1=1 --"),
      undefined,
      token,
      true,
    );
    expect(injected.bytes.toString("utf8")).not.toContain("audit-a");
  });
  it("maps JSON and pre-byte stream failures; ends partial output", async () => {
    vi.spyOn(auditService, "getLogsForExport").mockRejectedValueOnce(new Error("failure"));
    expect((await http("GET", "/api/audit-logs/export")).body).toMatchObject({
      code: "AUDIT_EXPORT_ERROR",
    });
    const exporter = vi
      .spyOn(streamExportService, "streamQueryToCSV")
      .mockRejectedValueOnce(new Error("failure"));
    const before = await http("GET", "/api/audit-logs/export?format=csv");
    expect(before.status).toBe(500);
    expect(before.body.code).toBe("AUDIT_EXPORT_ERROR");
    exporter.mockImplementationOnce(async (sink) => {
      sink.write("partial");
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error("after bytes");
    });
    const after = await http("GET", "/api/audit-logs/export?format=csv", undefined, token, true);
    expect(after.status).toBe(200);
    expect(after.bytes.toString()).toBe("partial");
  });
  it.each(["csv", "xml"])(
    "preserves renderer-owned 500 for %s before connecting",
    async (format) => {
      vi.spyOn((streamExportService as any).pool, "connect").mockRejectedValueOnce(
        new Error("connect failed"),
      );
      const errorAudit = vi.spyOn(auditService, "logError");
      const response = await http("GET", `/api/audit-logs/export?format=${format}`);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "Error al exportar datos" });
      expect(errorAudit).not.toHaveBeenCalled();
    },
  );
  it.each(["csv", "xml"])(
    "retains partial %s when invalid date fails after initial bytes",
    async (format) => {
      await logs();
      const response = await http(
        "GET",
        `/api/audit-logs/export?format=${format}&startDate=invalid`,
        undefined,
        token,
        true,
      );
      expect(response.status).toBe(200);
      const text = response.bytes.toString("utf8");
      expect(text).not.toContain("audit-a");
      expect(text).not.toContain("AUDIT_EXPORT_ERROR");
      if (format === "csv") expect(text).toContain("id,timestamp,actorUsername");
      else {
        expect(text).toContain("<AuditLogs>");
        expect(text).not.toContain("</AuditLogs>");
      }
    },
  );
  it("verifies real empty chain then exposes updated snapshot", async () => {
    const response = await http("GET", "/api/audit-logs/verify-integrity");
    expect(response.status).toBe(200);
    const status = await http("GET", "/api/audit-logs/integrity-status");
    expect(status.body.data).toMatchObject({
      status: "ok",
      lastCheckedCount: 0,
      lastBrokenCount: 0,
    });
    expect(status.body.data.lastRunAt).not.toBeNull();
    const saved = await prismaDirect.auditLog.findFirst({
      where: { action: "TIME_RECORD_INTEGRITY_VERIFY_RUN" },
    });
    expect(saved?.actorUsername).toBe("SYSTEM");
  });
  it("reports a real record without hash as degraded", async () => {
    const employee = await prismaDirect.employee.create({
      data: {
        id: "integrity-employee",
        name: "Audit employee",
        rut: "12345678-9",
        area: "Ops",
        position: "Operator",
        workdayType: "Ordinaria",
      },
    });
    await prismaDirect.timeRecord.create({
      data: {
        id: "unsealed",
        employeeId: employee.id,
        employeeName: employee.name,
        date: "2020-01-01",
        status: "Presente",
      },
    });
    expect((await http("GET", "/api/audit-logs/verify-integrity")).status).toBe(200);
    expect((await http("GET", "/api/audit-logs/integrity-status")).body.data).toMatchObject({
      status: "degraded",
      lastCheckedCount: 1,
      lastBrokenCount: 1,
      lastBrokenByReason: { missingHash: 1 },
    });
    expect(
      await prismaDirect.auditLog.count({ where: { action: "TIME_RECORD_INTEGRITY_BROKEN" } }),
    ).toBe(1);
  });
  it("isolates concurrent actors across awaits and direct transactions", async () => {
    const second = await session("audit-elevated", "Supervisor_Elevado");
    const seen: Array<{ username: string | undefined; sql: string }> = [];
    vi.spyOn(securityAuditService, "verifyFullChainIntegrity").mockImplementation(async () => {
      const username = requestContext.getStore()?.username;
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(requestContext.getStore()?.username).toBe(username);
      const sql = await withDirectTransaction(async (tx) => {
        const values = await tx.$queryRaw<
          Array<{ actor: string }>
        >`SELECT current_setting('audit.username') AS actor`;
        return values[0].actor;
      });
      seen.push({ username, sql });
    });
    const results = await Promise.all([
      http("GET", "/api/audit-logs/verify-integrity"),
      http("GET", "/api/audit-logs/verify-integrity", undefined, second),
    ]);
    expect(results.map((x) => x.status)).toEqual([200, 200]);
    expect(seen).toEqual(
      expect.arrayContaining([
        { username: "audit-admin", sql: "audit-admin" },
        { username: "audit-elevated", sql: "audit-elevated" },
      ]),
    );
  });
  it("propagates verification failure and requires authentication on six routes", async () => {
    vi.spyOn(securityAuditService, "verifyFullChainIntegrity").mockRejectedValueOnce(
      new Error("verification failed"),
    );
    expect((await http("GET", "/api/audit-logs/verify-integrity")).status).toBe(500);
    for (const [method, path] of [
      ["GET", "/api/audit-logs"],
      ["POST", "/api/audit-logs"],
      ["GET", "/api/audit-logs/export"],
      ["GET", "/api/audit-logs/integrity-status"],
      ["GET", "/api/audit-logs/verify-integrity"],
      ["POST", "/api/audit-logs/cleanup"],
    ] as const)
      expect((await http(method, path, method === "POST" ? {} : undefined, null)).status).toBe(401);
  });
});
