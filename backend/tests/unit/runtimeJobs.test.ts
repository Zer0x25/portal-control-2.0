vi.mock("../../src/services/workCoordinator", () => ({
  workCoordinator: {
    run: async (_label: string, task: () => Promise<unknown>) => task(),
    exclusive: async (_key: string, task: () => Promise<unknown>) => ({
      ran: true,
      value: await task(),
    }),
  },
}));
import { afterEach, expect, it, vi } from "vitest";
const doubles = vi.hoisted(() => ({
  ensure: vi.fn(async () => {}),
  config: vi.fn(async () => ({ value: '"instance"' })),
  phase2: vi.fn(async () => true),
  rotate: vi.fn(async () => {}),
  auto: vi.fn(async () => {}),
  audit: vi.fn(async () => {}),
  init: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
  resume: vi.fn(async () => {}),
  shutdown: vi.fn(async () => {}),
  lock: vi.fn(async (_key, task) => ({ ran: true, result: await task() })),
}));
vi.mock("../../src/services/db", () => ({
  prisma: { systemConfig: { findUnique: doubles.config } },
}));
vi.mock("../../src/services/maintenanceService", () => ({
  maintenanceService: { ensureInstanceId: doubles.ensure, rotateAuditLogs: doubles.audit },
}));
vi.mock("../../src/services/autoCloseService", () => ({ processAutoClosures: doubles.auto }));
vi.mock("../../src/services/shiftRotationService", () => ({
  rotateIndefiniteShifts: doubles.rotate,
}));
vi.mock("../../src/services/schedulerService", () => ({
  initializeScheduler: doubles.init,
  stopScheduler: doubles.stop,
}));
vi.mock("../../src/services/seedingJobService", () => ({
  seedingJobService: {
    isPhase2Running: doubles.phase2,
    resumePendingOnStartup: doubles.resume,
    shutdown: doubles.shutdown,
  },
}));
vi.mock("../../src/services/lockService", () => ({ LockService: { withLock: doubles.lock } }));
vi.mock("../../src/services/backupService", () => ({ backupService: {} }));
vi.mock("../../src/services/backupHealthService", () => ({ backupHealthService: {} }));
vi.mock("../../src/services/jobTelemetryService", () => ({
  jobTelemetryService: { recordRun: vi.fn(), recordRetry: vi.fn() },
}));
import { createRuntimeJobs } from "../../src/services/runtimeJobs";
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});
it("captures owner once, skips rotation/auto during seed, cancels startup and recurring timers", async () => {
  vi.useFakeTimers();
  const jobs = createRuntimeJobs();
  await jobs.start();
  await jobs.start();
  expect(doubles.ensure).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);
  expect(doubles.init).toHaveBeenCalledTimes(1);
  expect(doubles.resume).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(300000);
  expect(doubles.auto).not.toHaveBeenCalled();
  expect(doubles.rotate).not.toHaveBeenCalled();
  doubles.phase2.mockResolvedValue(false);
  await vi.advanceTimersByTimeAsync(300000);
  expect(doubles.lock).toHaveBeenCalledWith("job:processAutoClosures", expect.any(Function));
  expect(doubles.auto).toHaveBeenCalledTimes(1);
  await jobs.stop();
  await jobs.stop();
  expect(doubles.stop).toHaveBeenCalledTimes(1);
  expect(doubles.shutdown).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("propagates bootstrap failure and leaves no timers", async () => {
  vi.useFakeTimers();
  doubles.ensure.mockRejectedValueOnce(new Error("db unavailable"));
  const jobs = createRuntimeJobs();
  await expect(jobs.start()).rejects.toThrow("db unavailable");
  await jobs.stop();
  expect(vi.getTimerCount()).toBe(0);
});
