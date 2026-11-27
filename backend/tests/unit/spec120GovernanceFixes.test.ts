import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFastifyApp } from "../../src/platform/fastify/app";
import { HealthStatusSchema, AuditLogSchema } from "../../src/models/schemas/core.schemas";
import { AdminService } from "../../src/services/AdminService";
import { BackupService } from "../../src/services/backupService";
import { seedingJobService } from "../../src/services/seedingJobService";
import prisma from "../../src/services/db";
import { ConflictError, NotFoundError, ValidationError } from "../../src/utils/AppError";
import {
  atBusinessTimeCL,
  endOfBusinessDayCL,
  startOfBusinessDayCL,
} from "../../src/utils/timePolicy";

function makeMinimalApp(role: string = "Usuario") {
  const getPublicHealth = vi.fn(async () => ({
    status: "healthy" as const,
    instanceId: "inst-1",
    timestamp: "2026-11-18T12:00:00.000Z",
    database: { status: "OK" },
  }));
  const getDetailedHealth = vi.fn(async () => ({
    status: "healthy" as const,
    instanceId: "inst-1",
    timestamp: "2026-11-18T12:00:00.000Z",
    uptime: 10,
    system: {
      platform: "linux",
      arch: "x64",
      nodeVersion: "v26.13.0",
      cpus: 4,
      memory: { rss: 100, heapTotal: 50, heapUsed: 30 },
      os: { freeMem: 1000, totalMem: 4000, loadAvg: [0.1, 0.2, 0.3] },
    },
    database: { status: "OK", latency: 2, size: "10 MB" },
    backup: { enabled: false },
    integrity: {},
    jobs: {},
  }));
  const auditCreate = vi.fn(async () => ({ success: true, message: "Log creado exitosamente" }));
  const maintenanceLogs = vi.fn(async () => ({ success: true, logs: [] }));

  const noop = vi.fn(async () => ({}));
  const app = buildFastifyApp(
    {
      authenticate: vi.fn(async () => ({
        id: "u1",
        username: "tester",
        role,
      })),
      holidays: { list: noop, create: noop, update: noop, remove: noop } as never,
      users: { list: noop, create: noop, update: noop, remove: noop } as never,
      records: {
        list: noop,
        listAll: noop,
        create: noop,
        update: noop,
        remove: noop,
        bulk: noop,
        punch: noop,
        resolvePending: noop,
        exportExcel: noop,
      } as never,
      shifts: {
        listPatterns: noop,
        createPattern: noop,
        updatePattern: noop,
        deletePattern: noop,
        bulkPatterns: noop,
        listAssignments: noop,
        createAssignment: noop,
        updateAssignment: noop,
        deleteAssignment: noop,
        bulkAssignments: noop,
        conflicts: noop,
      } as never,
      leaves: { list: noop, create: noop, update: noop, remove: noop } as never,
      kpis: { summary: noop, detailed: noop } as never,
      emailReports: {
        getConfig: noop,
        saveConfig: noop,
        verify: noop,
        getRules: noop,
        saveRules: noop,
        send: noop,
        list: noop,
        create: noop,
        update: noop,
        remove: noop,
        logs: noop,
      } as never,
      configs: {
        list: noop,
        get: noop,
        upsert: noop,
        getServerTime: noop,
      } as never,
      admin: {
        stats: noop,
        diagnosis: noop,
        insights: noop,
        status: noop,
        backups: noop,
        autoClose: noop,
        accountingClose: noop,
        resetPassword: noop,
        purge: noop,
        backup: noop,
        restore: noop,
        restart: noop,
      } as never,
      maintenanceFlows: {
        clear: noop,
        seed: noop,
        startJob: noop,
        pauseJob: noop,
        resumeJob: noop,
        stopJob: noop,
        status: noop,
        logs: maintenanceLogs,
      } as never,
      audit: {
        list: noop,
        create: auditCreate,
        cleanup: noop,
        status: noop,
        verify: noop,
        exportJson: noop,
        exportStream: noop,
      } as never,
      notes: { list: noop, create: noop, update: noop, remove: noop } as never,
      meters: { list: noop, create: noop, bulk: noop, configs: noop, saveConfig: noop } as never,
      importExport: { importData: noop, exportData: noop } as never,
      shiftReports: {
        list: noop,
        get: noop,
        save: noop,
        remove: noop,
        exportStream: noop,
      } as never,
      corrections: { list: noop, create: noop, update: noop, remove: noop } as never,
      employees: {
        list: noop,
        get: noop,
        create: noop,
        update: noop,
        remove: noop,
        exportExcel: noop,
      } as never,
      auth: {
        flows: {
          login: noop,
          logout: noop,
          me: noop,
          kioskLogin: noop,
          mfaVerify: noop,
        } as never,
        inspectFailures: vi.fn(async () => null),
      },
      health: {
        checkDbReady: vi.fn(async () => true),
        getReadiness: vi.fn(() => ({
          status: "ready" as const,
          healthStatus: "healthy" as const,
          instanceId: "inst-1",
        })),
        getPublicHealth,
        getDetailedHealth,
      },
      maintenance: () => null,
      auditError: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    },
    {
      allowedOrigins: [],
      trustProxy: 1,
      rateLimit: { max: 1000, timeWindow: 60_000 },
      logger: false,
    },
  );
  return { app, getPublicHealth, getDetailedHealth, auditCreate, maintenanceLogs };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Spec 120 governance, audit, backup & seeding fixes", () => {
  it("BE-1: /api/health returns public payload for anonymous/non-admin and detailed for Super_Administrador", async () => {
    const anon = makeMinimalApp("Usuario");
    const resAnon = await anon.app.inject({ method: "GET", url: "/api/health" });
    expect(resAnon.statusCode).toBe(200);
    expect(anon.getPublicHealth).toHaveBeenCalledOnce();
    expect(anon.getDetailedHealth).not.toHaveBeenCalled();
    expect(HealthStatusSchema.safeParse(resAnon.json().data).success).toBe(true);

    const userRes = await anon.app.inject({
      method: "GET",
      url: "/api/health",
      headers: { authorization: "Bearer valid-user" },
    });
    expect(userRes.statusCode).toBe(200);
    expect(anon.getPublicHealth).toHaveBeenCalledTimes(2);
    expect(anon.getDetailedHealth).not.toHaveBeenCalled();

    const admin = makeMinimalApp("Super_Administrador");
    const adminRes = await admin.app.inject({
      method: "GET",
      url: "/api/health",
      headers: { authorization: "Bearer valid-admin" },
    });
    expect(adminRes.statusCode).toBe(200);
    expect(admin.getDetailedHealth).toHaveBeenCalledOnce();
    expect(HealthStatusSchema.safeParse(adminRes.json().data).success).toBe(true);
    await anon.app.close();
    await admin.app.close();
  });

  it("BE-2: POST /api/audit-logs enforces elevated role and optional id/timestamp/actorUsername", async () => {
    expect(
      AuditLogSchema.safeParse({
        action: "UI_EVENT",
        category: "OPERATIONS",
        details: { ok: true },
      }).success,
    ).toBe(true);

    const auditor = makeMinimalApp("Fiscalizador");
    const forbidden = await auditor.app.inject({
      method: "POST",
      url: "/api/audit-logs",
      headers: { authorization: "Bearer token" },
      payload: { action: "UI_EVENT", category: "OPERATIONS" },
    });
    expect(forbidden.statusCode).toBe(403);
    expect(auditor.auditCreate).not.toHaveBeenCalled();

    const supervisor = makeMinimalApp("Administrador");
    const created = await supervisor.app.inject({
      method: "POST",
      url: "/api/audit-logs",
      headers: { authorization: "Bearer token" },
      payload: { action: "UI_EVENT", category: "OPERATIONS" },
    });
    expect(created.statusCode).toBe(201);
    expect(supervisor.auditCreate).toHaveBeenCalledOnce();
    await auditor.app.close();
    await supervisor.app.close();
  });

  it("BE-2: AdminService.getSecurityInsights redacts recentAlerts", async () => {
    vi.spyOn(prisma.user, "count").mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    vi.spyOn(prisma.auditLog, "findMany").mockResolvedValueOnce([
      {
        id: "a1",
        timestamp: new Date(),
        actorUsername: "admin",
        action: "UNHANDLED_ERROR",
        category: "SECURITY",
        severity: "CRITICAL",
        outcome: "FAILURE",
        details: { message: "Failed with token=secret123", stack: "secret-stack" },
        metadata: { body: { password: "secret" }, path: "/api/test" },
        ipAddress: "127.0.0.1",
      } as never,
    ]);

    const insights = await AdminService.getSecurityInsights();
    expect(JSON.stringify(insights.recentAlerts)).not.toContain("secret123");
    expect(JSON.stringify(insights.recentAlerts)).not.toContain("secret-stack");
    expect(insights.recentAlerts[0].details).toMatchObject({
      message: "Failed with token=[REDACTED]",
      stack: "[REDACTED]",
    });
    expect(insights.recentAlerts[0].metadata).toMatchObject({
      body: "[REDACTED]",
      path: "/api/test",
    });
  });

  it("BE-3: BackupService.restoreDatabase throws ValidationError (400) and NotFoundError (404)", async () => {
    const svc = new BackupService();
    await expect(svc.restoreDatabase("arbitrary.sql")).rejects.toBeInstanceOf(ValidationError);
    await expect(svc.restoreDatabase("../backup-pg-1.sql")).rejects.toBeInstanceOf(ValidationError);
    await expect(svc.restoreDatabase("backup-pg-nonexistent-12345.sql")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("BE-4: /api/maintenance/seed/phase2/logs validates query and seedingJobService validates transitions", async () => {
    const admin = makeMinimalApp("Super_Administrador");
    const badLimit = await admin.app.inject({
      method: "GET",
      url: "/api/maintenance/seed/phase2/logs?jobId=j1&limit=abc",
      headers: { authorization: "Bearer token" },
    });
    expect(badLimit.statusCode).toBe(400);

    const missingJob = await admin.app.inject({
      method: "GET",
      url: "/api/maintenance/seed/phase2/logs",
      headers: { authorization: "Bearer token" },
    });
    expect(missingJob.statusCode).toBe(400);

    const okLogs = await admin.app.inject({
      method: "GET",
      url: "/api/maintenance/seed/phase2/logs?jobId=j1&limit=50",
      headers: { authorization: "Bearer token" },
    });
    expect(okLogs.statusCode).toBe(200);
    expect(admin.maintenanceLogs).toHaveBeenCalledWith({ jobId: "j1", limit: "50" });
    await admin.app.close();

    vi.spyOn(prisma.seedingJob, "findUnique").mockResolvedValueOnce(null);
    await expect(seedingJobService.pause("missing")).rejects.toBeInstanceOf(NotFoundError);

    vi.spyOn(prisma.seedingJob, "findUnique").mockResolvedValueOnce({
      id: "j1",
      status: "completed",
    } as never);
    await expect(seedingJobService.pause("j1")).rejects.toBeInstanceOf(ConflictError);

    vi.spyOn(prisma.seedingJob, "findUnique").mockResolvedValueOnce({
      id: "j1",
      status: "running",
    } as never);
    await expect(seedingJobService.resume("j1")).rejects.toBeInstanceOf(ConflictError);

    vi.spyOn(prisma.seedingJob, "findUnique").mockResolvedValueOnce({
      id: "j1",
      status: "stopped",
    } as never);
    await expect(seedingJobService.stop("j1")).rejects.toBeInstanceOf(ConflictError);
  });

  it("BE-5: timePolicy helpers compute America/Santiago day boundaries", () => {
    const start = startOfBusinessDayCL(new Date("2026-11-18T15:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-11-18T03:00:00.000Z");
    const end = endOfBusinessDayCL("2026-11-18");
    expect(end.toISOString()).toBe("2026-11-19T02:59:59.999Z");
    const noon = atBusinessTimeCL("2026-11-18", 12, 30, 0);
    expect(noon.toISOString()).toBe("2026-11-18T15:30:00.000Z");
  });
});
