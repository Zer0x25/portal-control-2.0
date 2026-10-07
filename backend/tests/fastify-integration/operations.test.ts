import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { backupService } from "../../src/services/backupService";
import { backupHealthService } from "../../src/services/backupHealthService";
import { runtimeControlService } from "../../src/services/runtimeControlService";
import { systemOperationService } from "../../src/services/systemOperationService";
import { maintenanceService } from "../../src/services/maintenanceService";
import { seedingEngine } from "../../src/services/seeder/SeederEngine";
import { seedingJobService } from "../../src/services/seedingJobService";
import { requestContext } from "../../src/utils/context";
import { SocketService } from "../../src/services/socketService";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";
import { httpClient } from "./_support/http";
let fastify: FastifyInstance,
  token: string,
  actorId: string,
  ip = "",
  sequence = 0;
let gzip = false;
const routes = [
  ["GET", "/api/admin/stats"],
  ["GET", "/api/admin/diagnose-autoclose"],
  ["POST", "/api/admin/trigger-autoclose"],
  ["POST", "/api/admin/trigger-accounting-autoclose"],
  ["GET", "/api/admin/security-insights"],
  ["GET", "/api/admin/integrity-status"],
  ["POST", "/api/admin/trigger-backup"],
  ["POST", "/api/admin/purge-sessions"],
  ["POST", "/api/admin/reset-password"],
  ["GET", "/api/admin/backups"],
  ["POST", "/api/admin/restore"],
  ["POST", "/api/admin/restart"],
  ["DELETE", "/api/maintenance/clear-database"],
  ["POST", "/api/maintenance/seed"],
  ["POST", "/api/maintenance/seed/phase1"],
  ["POST", "/api/maintenance/seed/phase2/start"],
  ["POST", "/api/maintenance/seed/phase2/pause"],
  ["POST", "/api/maintenance/seed/phase2/resume"],
  ["POST", "/api/maintenance/seed/phase2/stop"],
  ["GET", "/api/maintenance/seed/phase2/status"],
  ["GET", "/api/maintenance/seed/phase2/logs"],
] as const;
const lines = (bytes: Buffer) =>
  bytes
    .toString("utf8")
    .trim()
    .split("\n")
    .map((x) => JSON.parse(x));
async function user(username: string, role = "Usuario") {
  const saved = await prismaDirect.user.create({
    data: { username, role: role as "Usuario", passwordHash: "test-only" },
  });
  const access = (
    await AuthService.createSession(saved.id, saved.username, saved.role, undefined, "spec023")
  ).token;
  return { saved, access };
}
async function stoppedJob() {
  return prismaDirect.seedingJob.create({
    data: {
      type: "MARKINGS_PHASE2",
      status: "stopped",
      config: {},
      progress: {},
      createdBy: "fixture",
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
  systemOperationService.finish();
  await resetIntegrationDb();
  ip = "192.0.2." + ++sequence;
  gzip = false;
  const actor = await user("operations-admin", "Administrador");
  actorId = actor.saved.id;
  token = actor.access;
  vi.spyOn(SocketService, "emitToAll").mockImplementation(() => {});
  vi.spyOn(SocketService, "disconnectAllClients").mockImplementation(() => {});
  vi.spyOn(runtimeControlService, "scheduleRestart").mockImplementation(() => {});
  // Host operations must never run; individual cases opt into resolved/rejected orchestration doubles.
  vi.spyOn(backupService, "backupDatabase").mockRejectedValue(
    new Error("backup double not configured"),
  );
  vi.spyOn(backupService, "restoreDatabase").mockRejectedValue(
    new Error("restore double not configured"),
  );
  vi.spyOn(seedingJobService, "run").mockResolvedValue(undefined);
});
afterEach(() => {
  systemOperationService.finish();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await resetIntegrationDb();
  await fastify.close();
});
describe.each(["Express", "Fastify"] as const)("Spec023 operations on %s", (server) => {
  const http = httpClient(
    server,
    () => fastify,
    () => token,
    () => ({ "x-forwarded-for": ip, ...(gzip ? { "accept-encoding": "gzip" } : {}) }),
  );
  it("requires authentication on all 21 routes before side effects", async () => {
    for (const [method, path] of routes)
      expect((await http(method, path, method === "POST" ? {} : undefined, null)).status).toBe(401);
    expect(backupService.backupDatabase).not.toHaveBeenCalled();
    expect(backupService.restoreDatabase).not.toHaveBeenCalled();
    expect(runtimeControlService.scheduleRestart).not.toHaveBeenCalled();
  });
  it.each(["Supervisor_Elevado", "Supervisor", "Fiscalizador", "Reloj_Control", "Usuario"])(
    "rejects %s on every route despite stale Admin JWT",
    async (role) => {
      await prismaDirect.user.update({ where: { id: actorId }, data: { role: role as "Usuario" } });
      const cleaner = vi.spyOn(maintenanceService, "clearDatabase");
      const seeder = vi.spyOn(seedingEngine, "runSeedPhase1");
      for (const [method, path] of routes)
        expect((await http(method, path, method === "POST" ? {} : undefined)).status).toBe(403);
      expect(cleaner).not.toHaveBeenCalled();
      expect(seeder).not.toHaveBeenCalled();
      expect(backupService.backupDatabase).not.toHaveBeenCalled();
    },
  );
  it("reads real stats, MFA security insights, diagnosis and integrity snapshot", async () => {
    const target = await user("stats-target");
    await prismaDirect.user.update({ where: { id: target.saved.id }, data: { mfaEnabled: true } });
    await prismaDirect.auditLog.create({
      data: {
        actorUsername: "fixture",
        action: "SECURITY_ALERT",
        category: "SECURITY",
        severity: "CRITICAL",
      },
    });
    const stats = await http("GET", "/api/admin/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data).toMatchObject({
      usersCount: 2,
      employeesCount: 0,
      recordsCount: 0,
      mfaStats: { enabled: 1, disabled: 1 },
      totalUsers: 2,
    });
    const insights = await http("GET", "/api/admin/security-insights");
    expect(insights.status).toBe(200);
    expect(insights.body.data.stats.mfaAdoption).toBe(50);
    expect(insights.body.data.recentAlerts.some((x: any) => x.action === "SECURITY_ALERT")).toBe(
      true,
    );
    expect((await http("GET", "/api/admin/diagnose-autoclose")).status).toBe(200);
    expect((await http("GET", "/api/admin/integrity-status")).body.data).toHaveProperty("status");
  });
  it("executes empty auto close and real accounting closure with actor audits", async () => {
    const auto = await http("POST", "/api/admin/trigger-autoclose", {});
    expect(auto.status).toBe(200);
    expect(auto.body.data.closedCount).toBe(0);
    const accounting = await http("POST", "/api/admin/trigger-accounting-autoclose", {});
    expect(accounting.status).toBe(200);
    expect(accounting.body.data.applied).toBe(true);
    const repeat = await http("POST", "/api/admin/trigger-accounting-autoclose", {});
    expect(repeat.body.data.applied).toBe(false);
    const entries = await prismaDirect.auditLog.findMany({
      where: {
        action: { in: ["TRIGGER_AUTOCLOSE_MANUAL", "TRIGGER_ACCOUNTING_AUTOCLOSE_MANUAL"] },
      },
    });
    expect(entries.length).toBe(3);
    expect(entries.every((x) => x.actorUsername === "operations-admin")).toBe(true);
  });
  it("purges global sessions while preserving actor and maps missing target to 404", async () => {
    const target = await user("purge-target");
    const response = await http("POST", "/api/admin/purge-sessions", {});
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ deletedCount: 1, target: "all" });
    expect(await prismaDirect.activeSession.count({ where: { userId: actorId } })).toBe(1);
    expect(await prismaDirect.activeSession.count({ where: { userId: target.saved.id } })).toBe(0);
    expect((await http("POST", "/api/admin/purge-sessions", { username: "missing" })).status).toBe(
      404,
    );
    expect((await http("POST", "/api/admin/purge-sessions", { username: "" })).status).toBe(400);
  });
  it("purges specified target including own sessions", async () => {
    const target = await user("purge-target");
    const response = await http("POST", "/api/admin/purge-sessions", { username: "PURGE-TARGET" });
    expect(response.body.data).toMatchObject({ deletedCount: 1, target: "purge-target" });
    expect(await prismaDirect.activeSession.count({ where: { userId: target.saved.id } })).toBe(0);
    expect(
      (await http("POST", "/api/admin/purge-sessions", { username: "operations-admin" })).body.data
        .deletedCount,
    ).toBe(1);
    expect((await http("GET", "/api/admin/stats")).status).toBe(401);
  });
  it("resets password and forced-change flag and invalidates only target sessions", async () => {
    const target = await user("reset-target"),
      password = "spec023-test-only";
    expect(
      (
        await http("POST", "/api/admin/reset-password", {
          username: "RESET-TARGET",
          newPassword: password,
        })
      ).status,
    ).toBe(200);
    const saved = await prismaDirect.user.findUniqueOrThrow({ where: { id: target.saved.id } });
    expect(bcrypt.compareSync(password, saved.passwordHash)).toBe(true);
    expect(saved.isForcePasswordChange).toBe(true);
    expect(await prismaDirect.activeSession.count({ where: { userId: target.saved.id } })).toBe(0);
    expect(await prismaDirect.activeSession.count({ where: { userId: actorId } })).toBe(1);
    expect((await http("GET", "/api/users", undefined, target.access)).status).toBe(401);
    const log = await prismaDirect.auditLog.findFirst({
      where: { action: "FORCE_PASSWORD_RESET" },
    });
    expect(log?.actorUsername).toBe("operations-admin");
    expect(JSON.stringify(log)).not.toContain(password);
    expect(
      (
        await http("POST", "/api/admin/reset-password", {
          username: "reset-target",
          newPassword: "short",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await http("POST", "/api/admin/reset-password", {
          username: "missing",
          newPassword: password,
        })
      ).status,
    ).toBe(404);
  });
  it("rejects an authenticated credential snapshot and MFA challenge after password reset", async () => {
    const target = await user("reset-snapshot");
    const hash = bcrypt.hashSync("snapshot-old-password", 10);
    await prismaDirect.user.update({
      where: { id: target.saved.id },
      data: { passwordHash: hash },
    });
    const authenticated = await AuthService.authenticate(
      target.saved.username,
      "snapshot-old-password",
    );
    expect(authenticated.success).toBe(true);
    const pending = AuthService.generateMFAPendingToken(authenticated.user!);
    expect(
      (
        await http("POST", "/api/admin/reset-password", {
          username: target.saved.username,
          newPassword: "snapshot-new-password",
        })
      ).status,
    ).toBe(200);
    await expect(
      AuthService.createSession(
        target.saved.id,
        target.saved.username,
        target.saved.role,
        null,
        "stale-login",
        authenticated.user!.credentialStamp,
      ),
    ).rejects.toThrow("Credenciales cambiaron");
    await expect(AuthService.validateMFALogin(pending, "000000")).rejects.toThrow(
      "Credenciales cambiaron",
    );
    expect(await prismaDirect.activeSession.count({ where: { userId: target.saved.id } })).toBe(0);
    const fresh = await AuthService.authenticate(target.saved.username, "snapshot-new-password");
    expect(fresh.success).toBe(true);
    const session = await AuthService.createSession(
      target.saved.id,
      target.saved.username,
      target.saved.role,
      null,
      "fresh-login",
      fresh.user!.credentialStamp,
    );
    expect(session.token).toBeTruthy();
    expect(
      (await AuthService.authenticate(target.saved.username, "snapshot-old-password")).success,
    ).toBe(false);
  });
  it("serializes concurrent reset and stale session issuance on the user row", async () => {
    const target = await user("reset-race");
    await prismaDirect.user.update({
      where: { id: target.saved.id },
      data: { passwordHash: bcrypt.hashSync("race-old-password", 4) },
    });
    const login = await AuthService.authenticate(target.saved.username, "race-old-password");
    const [reset, issuance] = await Promise.allSettled([
      http("POST", "/api/admin/reset-password", {
        username: target.saved.username,
        newPassword: "race-new-password",
      }),
      AuthService.createSession(
        target.saved.id,
        target.saved.username,
        target.saved.role,
        null,
        "racing-login",
        login.user!.credentialStamp,
      ),
    ]);
    expect(reset.status).toBe("fulfilled");
    if (reset.status === "fulfilled") expect(reset.value.status).toBe(200);
    if (issuance.status === "rejected")
      expect(issuance.reason.message).toContain("Credenciales cambiaron");
    expect(await prismaDirect.activeSession.count({ where: { userId: target.saved.id } })).toBe(0);
    expect(await prismaDirect.activeSession.count({ where: { userId: actorId } })).toBe(1);
  });
  it("rolls back password and sessions if session revocation fails", async () => {
    const target = await user("reset-rollback");
    await prismaDirect.$executeRawUnsafe(
      `CREATE FUNCTION test_password_reset_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'owned revocation failure'; END $$`,
    );
    await prismaDirect.$executeRawUnsafe(
      `CREATE TRIGGER test_password_reset_failure BEFORE DELETE ON active_sessions FOR EACH STATEMENT EXECUTE FUNCTION test_password_reset_failure()`,
    );
    try {
      const response = await http("POST", "/api/admin/reset-password", {
        username: target.saved.username,
        newPassword: "rollback-new-password",
      });
      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toContain("owned revocation failure");
      const stored = await prismaDirect.user.findUniqueOrThrow({ where: { id: target.saved.id } });
      expect(stored.passwordHash).toBe(target.saved.passwordHash);
      expect(stored.isForcePasswordChange).toBe(target.saved.isForcePasswordChange);
      expect(await prismaDirect.activeSession.count({ where: { userId: target.saved.id } })).toBe(
        1,
      );
      expect(await prismaDirect.auditLog.count({ where: { action: "FORCE_PASSWORD_RESET" } })).toBe(
        0,
      );
    } finally {
      await prismaDirect.$executeRawUnsafe(
        `DROP TRIGGER test_password_reset_failure ON active_sessions`,
      );
      await prismaDirect.$executeRawUnsafe(`DROP FUNCTION test_password_reset_failure()`);
    }
  });
  it("backs up through injected host double, records success and releases ownership", async () => {
    vi.mocked(backupService.backupDatabase).mockResolvedValueOnce("owned-backup.sql");
    const success = vi.spyOn(backupHealthService, "recordSuccess");
    const response = await http("POST", "/api/admin/trigger-backup", {});
    expect(response.status).toBe(200);
    expect(response.body.data.backupPath).toBe("owned-backup.sql");
    expect(success).toHaveBeenCalledOnce();
    expect(systemOperationService.getSnapshot()).toBeNull();
    expect(
      await prismaDirect.auditLog.findFirst({ where: { action: "TRIGGER_BACKUP_MANUAL" } }),
    ).toMatchObject({
      actorUsername: "operations-admin",
      details: { backupPath: "owned-backup.sql" },
    });
    vi.spyOn(backupHealthService, "getBackups").mockReturnValue([
      { name: "owned-backup.sql", createdAt: "2020-01-01Z", size: 5, sizeFormatted: "5 Bytes" },
    ]);
    expect((await http("GET", "/api/admin/backups")).body.data[0].name).toBe("owned-backup.sql");
  });
  it("backup failure releases maintenance and conflicting acquisition keeps previous operation", async () => {
    const response = await http("POST", "/api/admin/trigger-backup", {});
    expect(response.status).toBe(500);
    expect(systemOperationService.getSnapshot()).toBeNull();
    systemOperationService.start({
      type: "restore",
      actorUsername: "owner",
      maintenanceMode: true,
      message: "owned",
    });
    expect((await http("POST", "/api/admin/trigger-backup", {})).status).toBe(409);
    expect(systemOperationService.getSnapshot()?.actorUsername).toBe("owner");
  });
  it("restore uses host double then invalidates real sessions and schedules restart", async () => {
    await user("restore-target");
    vi.mocked(backupService.restoreDatabase).mockResolvedValueOnce(undefined);
    const response = await http("POST", "/api/admin/restore", { filename: "owned.sql" });
    expect(response.status).toBe(200);
    expect(response.body.data.invalidatedSessions).toBe(2);
    expect(backupService.restoreDatabase).toHaveBeenCalledWith("owned.sql");
    expect(await prismaDirect.activeSession.count()).toBe(0);
    expect(runtimeControlService.scheduleRestart).toHaveBeenCalledWith(
      "database restore completed",
    );
    expect(systemOperationService.getSnapshot()).toBeNull();
    expect(SocketService.emitToAll).toHaveBeenCalledWith(
      "auth:force_logout",
      expect.objectContaining({ reason: "DATABASE_RESTORE" }),
    );
  });
  it("restore failure does not invalidate or restart and invalid body is rejected", async () => {
    expect((await http("POST", "/api/admin/restore", { filename: "owned.sql" })).status).toBe(500);
    expect(runtimeControlService.scheduleRestart).not.toHaveBeenCalled();
    expect(systemOperationService.getSnapshot()).toBeNull();
    expect(await prismaDirect.activeSession.count()).toBe(1);
    expect((await http("POST", "/api/admin/restore", { filename: "" })).status).toBe(400);
  });
  it("restart emits success and records actor with only a restart double", async () => {
    expect((await http("POST", "/api/admin/restart", {})).status).toBe(200);
    expect(runtimeControlService.scheduleRestart).toHaveBeenCalledWith("manual admin request");
    expect(
      await prismaDirect.auditLog.findFirst({ where: { action: "RESTART_BACKEND" } }),
    ).toMatchObject({ actorUsername: "operations-admin" });
  });
  it("maintenance exemption preserves auth and admin budget while blocking ordinary traffic", async () => {
    systemOperationService.start({
      type: "restore",
      actorUsername: "owner",
      maintenanceMode: true,
      message: "owned",
    });
    const response = await http("GET", "/api/admin/stats");
    expect(response.status).toBe(200);
    expect(response.headers["ratelimit-policy"]).toBe("1000;w=900");
    expect((await http("GET", "/api/maintenance/seed/phase2/status")).status).toBe(200);
    expect((await http("GET", "/api/admin/stats", undefined, null)).status).toBe(401);
    expect((await http("GET", "/api/maintenance/seed/phase2/status", undefined, null)).status).toBe(
      401,
    );
    expect((await http("GET", "/api/notes")).status).toBe(503);
    expect((await http("GET", "/api/health/ready")).status).toBe(200);
  });
  it("resets disposable DB atomically while preserving administrators and removing sessions/jobs", async () => {
    await prismaDirect.employee.create({
      data: {
        id: "clear-employee",
        name: "Disposable",
        rut: "12345678-9",
        area: "Ops",
        position: "Operator",
        workdayType: "Ordinaria",
      },
    });
    await prismaDirect.user.update({
      where: { id: actorId },
      data: { employeeId: "clear-employee", mfaSecret: "preserved-fixture", mfaEnabled: true },
    });
    const before = await prismaDirect.user.findUniqueOrThrow({ where: { id: actorId } });
    const job = await stoppedJob();
    gzip = true;
    const response = await http(
      "DELETE",
      "/api/maintenance/clear-database",
      undefined,
      token,
      true,
    );
    expect(response.status).toBe(200);
    expect(response.headers["x-no-compression"]).toBe("true");
    expect(response.headers["content-encoding"]).toBeUndefined();
    const output = lines(response.bytes);
    expect(output.some((x) => x.progress)).toBe(true);
    expect(output.at(-1)).toMatchObject({ success: true, preservedUser: "operations-admin" });
    expect(await prismaDirect.employee.count()).toBe(0);
    expect(await prismaDirect.activeSession.count()).toBe(0);
    const after = await prismaDirect.user.findUniqueOrThrow({ where: { id: actorId } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.mfaSecret).toBe(before.mfaSecret);
    expect(after.mfaEnabled).toBe(true);
    expect(after.employeeId).toBeNull();
    expect(await prismaDirect.user.findUnique({ where: { username: "admin" } })).toBeNull();
    expect(await prismaDirect.seedingJob.findUnique({ where: { id: job.id } })).toBeNull();
    expect(runtimeControlService.scheduleRestart).toHaveBeenCalledWith("database reset completed");
    expect(systemOperationService.getSnapshot()).toBeNull();
  });
  it("rolls back session/user deletion and keeps admin credentials when reset fails", async () => {
    await prismaDirect.systemConfig.create({ data: { key: "rollback-fixture", value: "true" } });
    await prismaDirect.$executeRaw`CREATE FUNCTION spec025_reset_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'spec025 forced reset failure'; END $$`;
    await prismaDirect.$executeRaw`CREATE TRIGGER spec025_reset_fail BEFORE DELETE ON system_configs FOR EACH STATEMENT EXECUTE FUNCTION spec025_reset_fail()`;
    try {
      const response = await http(
        "DELETE",
        "/api/maintenance/clear-database",
        undefined,
        token,
        true,
      );
      expect(lines(response.bytes).at(-1).error).toBeDefined();
      expect(await prismaDirect.activeSession.count()).toBeGreaterThan(0);
      expect(await prismaDirect.user.findUnique({ where: { id: actorId } })).not.toBeNull();
      expect(
        await prismaDirect.systemConfig.findUnique({ where: { key: "rollback-fixture" } }),
      ).not.toBeNull();
      expect(runtimeControlService.scheduleRestart).not.toHaveBeenCalled();
    } finally {
      await prismaDirect.$executeRaw`DROP TRIGGER spec025_reset_fail ON system_configs`;
      await prismaDirect.$executeRaw`DROP FUNCTION spec025_reset_fail()`;
    }
  });
  it("clear timeout/failure uses in-band 200 and acquisition conflict precedes stream", async () => {
    const cleaner = vi
      .spyOn(maintenanceService, "clearDatabase")
      .mockRejectedValueOnce(new Error("PROCESS_TIMEOUT"));
    const response = await http(
      "DELETE",
      "/api/maintenance/clear-database",
      undefined,
      token,
      true,
    );
    expect(response.status).toBe(200);
    expect(lines(response.bytes)).toEqual([
      { error: "Proceso de limpieza abortado por inactividad prolongada en la DB." },
    ]);
    expect(runtimeControlService.scheduleRestart).not.toHaveBeenCalled();
    expect(systemOperationService.getSnapshot()).toBeNull();
    systemOperationService.start({
      type: "restore",
      actorUsername: "owner",
      maintenanceMode: true,
      message: "owned",
    });
    const conflict = await http("DELETE", "/api/maintenance/clear-database");
    expect(conflict.status).toBe(409);
    expect(cleaner).toHaveBeenCalledOnce();
    expect(systemOperationService.getSnapshot()?.actorUsername).toBe("owner");
  });
  it.each(["seed", "seed/phase1"])(
    "%s shares defaults, seed ALS and stopped-job persistence",
    async (path) => {
      gzip = true;
      vi.spyOn(seedingEngine, "runSeedPhase1").mockImplementationOnce(
        async (options, progress, heartbeat) => {
          expect(requestContext.getStore()).toMatchObject({
            username: "SYSTEM_SEEDER",
            skipTrigger: true,
          });
          await new Promise((resolve) => setTimeout(resolve, 5));
          expect(requestContext.getStore()?.username).toBe("SYSTEM_SEEDER");
          expect(options).toMatchObject({
            employees: 0,
            days: 0,
            basePatternsCount: 3,
            quickNotesCount: 5,
          });
          heartbeat();
          progress("owned progress");
        },
      );
      const response = await http("POST", `/api/maintenance/${path}`, {}, token, true);
      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
      expect(lines(response.bytes).at(-1)).toEqual({ success: true, phase: "phase1" });
      const job = await prismaDirect.seedingJob.findFirst();
      expect(job).toMatchObject({
        createdBy: "operations-admin",
        status: "stopped",
        config: { days: 1, leaveRatio: 5, correctionRequestRatio: 2, batchSize: 250 },
      });
    },
  );
  it("runs bounded real phase1 on isolated DB and does not start phase2 worker", async () => {
    const response = await http(
      "POST",
      "/api/maintenance/seed/phase1",
      {
        employees: 0,
        days: 0,
        basePatternsCount: 1,
        quickNotesCount: 0,
        shiftReportsPerDay: 0,
        leaveRatio: 0,
        correctionRequestRatio: 0,
      },
      token,
      true,
    );
    expect(response.status).toBe(200);
    expect(lines(response.bytes).at(-1)).toEqual({ success: true, phase: "phase1" });
    expect(await prismaDirect.shiftPattern.count()).toBe(0);
    expect(await prismaDirect.systemConfig.count()).toBeGreaterThan(0);
    expect(seedingJobService.run).not.toHaveBeenCalled();
  });
  it("seed engine error is in-band and stopped job failure still finishes success", async () => {
    const engine = vi
      .spyOn(seedingEngine, "runSeedPhase1")
      .mockRejectedValueOnce(new Error("owned seed failure"));
    const failed = await http("POST", "/api/maintenance/seed", {}, token, true);
    expect(failed.status).toBe(200);
    expect(lines(failed.bytes).at(-1)).toEqual({ error: "owned seed failure" });
    engine.mockResolvedValueOnce(undefined);
    vi.spyOn(seedingJobService, "createStoppedJob").mockRejectedValueOnce(
      new Error("owned job failure"),
    );
    const success = await http("POST", "/api/maintenance/seed", {}, token, true);
    expect(lines(success.bytes).at(-1)).toEqual({ success: true, phase: "phase1" });
    expect((await http("POST", "/api/maintenance/seed", { employees: -1 })).status).toBe(400);
  });
  it("persists phase2 lifecycle and logs while suppressing background worker", async () => {
    expect((await http("GET", "/api/maintenance/seed/phase2/status")).body.job).toBeNull();
    const started = await http("POST", "/api/maintenance/seed/phase2/start", {});
    expect(started.status).toBe(200);
    expect(started.body.job).toMatchObject({
      status: "pending",
      createdBy: "operations-admin",
      config: { days: 3, leaveRatio: 5, correctionRequestRatio: 2, batchSize: 250 },
    });
    const id = started.body.job.id;
    expect(seedingJobService.run).toHaveBeenCalledWith(id);
    expect(
      (await http("POST", "/api/maintenance/seed/phase2/start", { days: 4 })).body.job.id,
    ).toBe(id);
    for (const [command, status] of [
      ["pause", "paused"],
      ["resume", "pending"],
      ["stop", "stopped"],
    ]) {
      expect(
        (await http("POST", `/api/maintenance/seed/phase2/${command}`, { jobId: id })).body.job
          .status,
      ).toBe(status);
      expect(
        (await http("GET", `/api/maintenance/seed/phase2/status?jobId=${id}`)).body.job.status,
      ).toBe(status);
    }
    const result = await http("GET", `/api/maintenance/seed/phase2/logs?jobId=${id}&limit=1`);
    expect(result.status).toBe(200);
    expect(result.body.logs).toHaveLength(1);
    expect(await prismaDirect.seedingJobLog.count({ where: { jobId: id } })).toBe(4);
    expect(SocketService.emitToAll).toHaveBeenCalledWith("seeder:phase2_stopped", { jobId: id });
  });
  it("disables gzip for maintenance JSON status as well as progress streams", async () => {
    const job = await stoppedJob();
    await prismaDirect.seedingJob.update({
      where: { id: job.id },
      data: { config: { padding: "x".repeat(3000) } },
    });
    gzip = true;
    const response = await http("GET", `/api/maintenance/seed/phase2/status?jobId=${job.id}`);
    expect(response.status).toBe(200);
    expect(response.headers["content-encoding"]).toBeUndefined();
    expect(response.body.job.config.padding).toHaveLength(3000);
  });
  it("retains job validation and errors with no implicit query schema", async () => {
    expect(
      (await http("POST", "/api/maintenance/seed/phase2/start", { days: 0, batchSize: 1 })).status,
    ).toBe(400);
    for (const command of ["pause", "resume", "stop"]) {
      expect((await http("POST", `/api/maintenance/seed/phase2/${command}`, {})).status).toBe(400);
      expect(
        (await http("POST", `/api/maintenance/seed/phase2/${command}`, { jobId: "missing" }))
          .status,
      ).toBe(404);
    }
    expect((await http("GET", "/api/maintenance/seed/phase2/logs")).status).toBe(400);
    expect(
      (await http("GET", "/api/maintenance/seed/phase2/logs?jobId=missing")).body.logs,
    ).toEqual([]);
    expect(
      (await http("GET", "/api/maintenance/seed/phase2/status?jobId=missing")).body.job,
    ).toBeNull();
    const job = await stoppedJob();
    expect(
      (await http("GET", `/api/maintenance/seed/phase2/logs?jobId=${job.id}&limit=bad`)).status,
    ).toBe(500);
  });
});
