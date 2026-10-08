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
vi.mock("../../src/services/db", () => ({
  default: {
    scheduledReport: {
      findMany: vi.fn(async () => [{ id: "report", cronExpression: "0 8 * * *", nextRunAt: null }]),
    },
  },
}));
vi.mock("../../src/services/seedingJobService", () => ({
  seedingJobService: { isPhase2Running: async () => true },
}));
vi.mock("../../src/services/export/ExportService", () => ({ ExportService: class {} }));
vi.mock("../../src/services/EmailService", () => ({ EmailService: class {} }));
vi.mock("../../src/services/closureValidationService", () => ({ closureValidationService: {} }));
vi.mock("../../src/services/HolidayService", () => ({ holidayService: {} }));
vi.mock("../../src/services/integrityMaintenanceService", () => ({
  integrityMaintenanceService: {},
}));
import {
  initializeScheduler,
  refreshScheduler,
  stopScheduler,
  getSchedulerStatus,
} from "../../src/services/schedulerService";
afterEach(async () => {
  await stopScheduler();
  vi.useRealTimers();
});
it("refresh keeps exactly one nightly timer and one report, without hourly duplicate", async () => {
  vi.useFakeTimers();
  await initializeScheduler();
  await initializeScheduler();
  expect(vi.getTimerCount()).toBe(2);
  for (let i = 0; i < 3; i++) await refreshScheduler();
  expect(vi.getTimerCount()).toBe(2);
  expect(getSchedulerStatus()).toEqual([{ reportId: "report", isRunning: true }]);
  await stopScheduler();
  await refreshScheduler();
  expect(vi.getTimerCount()).toBe(0);
  await initializeScheduler();
  expect(vi.getTimerCount()).toBe(2);
});
