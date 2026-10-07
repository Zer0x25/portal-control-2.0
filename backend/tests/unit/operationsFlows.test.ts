import { it, expect, vi } from "vitest";
import { createAdminFlows } from "../../src/modules/admin/application/flows";
import { createMaintenanceFlows } from "../../src/modules/maintenance/application/flows";
const fixture = () => ({
  stats: vi.fn().mockResolvedValue({ users: 1 }),
  diagnosis: vi.fn(),
  insights: vi.fn(),
  snapshot: vi.fn(),
  autoClose: vi.fn().mockResolvedValue(3),
  accountingClose: vi
    .fn()
    .mockResolvedValue({ applied: false, closureCandidate: "2020-01-01", currentLockDate: null }),
  audit: vi.fn(),
  resetPassword: vi.fn(),
  purge: vi.fn().mockResolvedValue({ deletedCount: 2, target: "all" }),
  operations: { start: vi.fn(), finish: vi.fn() },
  backup: vi.fn().mockResolvedValue("owned.sql"),
  backupSuccess: vi.fn(),
  backups: vi.fn(),
  restore: vi.fn(),
  invalidate: vi.fn().mockResolvedValue({ deletedCount: 4 }),
  restart: vi.fn(),
});
const maintenance = () => ({
  operations: { start: vi.fn(), finish: vi.fn() },
  clear: vi.fn().mockResolvedValue({ success: true }),
  restart: vi.fn(),
  watchdog: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), heartbeat: vi.fn() })),
  seedScope: vi.fn(async (run: any) => run()),
  seedPhase1: vi.fn(),
  createStoppedJob: vi.fn(),
  reportJobError: vi.fn(),
  startJob: vi.fn().mockResolvedValue({ id: "j" }),
  pauseJob: vi.fn(),
  resumeJob: vi.fn(),
  stopJob: vi.fn(),
  status: vi.fn(),
  logs: vi.fn(),
});
it("admin preserves envelopes, actor, purge error mapping and password guards", async () => {
  const d = fixture(),
    f = createAdminFlows(d);
  expect(await f.stats()).toEqual({ success: true, data: { users: 1 } });
  expect((await f.autoClose({ username: "alice" })).data.closedCount).toBe(3);
  expect(d.audit).toHaveBeenCalledWith(
    expect.objectContaining({ actorUsername: "alice", action: "TRIGGER_AUTOCLOSE_MANUAL" }),
  );
  d.purge.mockRejectedValueOnce(new Error("USER_NOT_FOUND"));
  await expect(f.purge({}, {})).rejects.toMatchObject({ statusCode: 404 });
  await expect(f.resetPassword({ username: "" }, {})).rejects.toMatchObject({ statusCode: 400 });
});
it("backup releases ownership on failure and restore sends before restart/finish", async () => {
  const d = fixture(),
    f = createAdminFlows(d),
    order: string[] = [];
  d.backup.mockRejectedValueOnce(new Error("backup"));
  await expect(f.backup({}, () => {})).rejects.toThrow("backup");
  expect(d.operations.finish).toHaveBeenCalledOnce();
  d.restart.mockImplementation(() => order.push("restart"));
  d.operations.finish.mockImplementation(() => order.push("finish"));
  await f.restore({ filename: "owned.sql" }, { username: "alice" }, (body: any) => {
    expect(body.data.invalidatedSessions).toBe(4);
    order.push("send");
  });
  expect(order).toEqual(["send", "restart", "finish"]);
  expect(d.invalidate).toHaveBeenCalledWith({
    actorUsername: "alice",
    reason: "DATABASE_RESTORE",
    restartRecommended: true,
  });
});
it("clear emits progress and in-band timeout error while releasing maintenance", async () => {
  const d = maintenance(),
    f = createMaintenanceFlows(d),
    out = { start: vi.fn(), write: vi.fn(), end: vi.fn() };
  d.clear.mockRejectedValueOnce(new Error("PROCESS_TIMEOUT"));
  await f.clear({ id: "u", username: "alice" }, out);
  expect(out.write).toHaveBeenCalledWith({
    error: "Proceso de limpieza abortado por inactividad prolongada en la DB.",
  });
  expect(out.end).toHaveBeenCalledOnce();
  expect(d.operations.finish).toHaveBeenCalledOnce();
  expect(d.restart).not.toHaveBeenCalled();
  d.operations.start.mockImplementation(() => {
    throw new Error("busy");
  });
  await expect(f.clear({}, out)).rejects.toThrow("busy");
  expect(out.start).toHaveBeenCalledOnce();
});
it("seed retains defaults, isolates scope, swallows stopped-job failure and validates logs id", async () => {
  const d = maintenance(),
    f = createMaintenanceFlows(d),
    out = { start: vi.fn(), write: vi.fn(), end: vi.fn() };
  d.createStoppedJob.mockRejectedValueOnce(new Error("job"));
  await f.seed({}, { username: "alice" }, out);
  expect(d.seedPhase1).toHaveBeenCalledWith(
    {
      employees: 0,
      days: 0,
      basePatternsCount: 3,
      leaveRatio: 5,
      correctionRequestRatio: 2,
      shiftReportsPerDay: 6,
      quickNotesCount: 5,
    },
    expect.any(Function),
    expect.any(Function),
  );
  expect(d.reportJobError).toHaveBeenCalledOnce();
  expect(out.write).toHaveBeenLastCalledWith({ success: true, phase: "phase1" });
  expect((await f.startJob({}, {})).job).toEqual({ id: "j" });
  expect(d.startJob).toHaveBeenCalledWith("SYSTEM", {
    days: 3,
    leaveRatio: 5,
    correctionRequestRatio: 2,
    batchSize: 250,
  });
  await expect(f.logs({})).rejects.toMatchObject({ statusCode: 400 });
});
it("timeout closes output once but retains seed ownership until the engine settles", async () => {
  const d = maintenance();
  let timeout!: () => void;
  let resolve!: () => void;
  d.watchdog.mockImplementation((callback: () => void) => {
    timeout = callback;
    return { start: vi.fn(), stop: vi.fn(), heartbeat: vi.fn() };
  });
  d.seedPhase1.mockImplementation(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const out = { start: vi.fn(), write: vi.fn(), end: vi.fn() };
  const pending = createMaintenanceFlows(d).seed({}, { username: "alice" }, out);
  timeout();
  expect(out.end).toHaveBeenCalledOnce();
  expect(d.operations.finish).not.toHaveBeenCalled();
  const writes = out.write.mock.calls.length;
  resolve();
  await pending;
  expect(out.write).toHaveBeenCalledTimes(writes);
  expect(out.end).toHaveBeenCalledOnce();
  expect(d.operations.finish).toHaveBeenCalledOnce();
});
