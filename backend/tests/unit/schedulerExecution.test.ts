import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  report: {} as Record<string, unknown>,
  findMany: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  render: vi.fn(),
  send: vi.fn(),
}));
vi.mock("../../src/services/db", () => ({
  default: {
    scheduledReport: {
      findMany: fixture.findMany,
      findUnique: fixture.findUnique,
      updateMany: fixture.updateMany,
    },
  },
}));
vi.mock("../../src/services/export/ExportService", () => ({
  ExportService: class {
    generateReportPDF = fixture.render;
  },
}));
vi.mock("../../src/services/EmailService", () => ({
  EmailService: class {
    sendEmailWithAttachment = fixture.send;
  },
}));
vi.mock("../../src/services/seedingJobService", () => ({
  seedingJobService: { isPhase2Running: async () => true },
}));
vi.mock("../../src/services/closureValidationService", () => ({ closureValidationService: {} }));
vi.mock("../../src/services/HolidayService", () => ({ holidayService: {} }));
vi.mock("../../src/services/integrityMaintenanceService", () => ({
  integrityMaintenanceService: {},
}));
import {
  initializeScheduler,
  refreshScheduler,
  stopScheduler,
  triggerReport,
} from "../../src/services/schedulerService";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-02T10:59:00Z"));
  vi.clearAllMocks();
  fixture.report = {
    id: "r",
    isActive: true,
    name: "Attendance",
    reportType: "attendance_summary",
    frequency: "daily",
    cronExpression: "0 8 * * *",
    filters: null,
    recipients: "a@example.com",
    nextRunAt: new Date("2026-01-02T11:00:00Z"),
    lastRunAt: null,
  };
  fixture.findMany.mockImplementation(async () => [{ ...fixture.report }]);
  fixture.findUnique.mockImplementation(async () => ({ ...fixture.report }));
  fixture.updateMany.mockImplementation(async ({ data }) => {
    Object.assign(fixture.report, data);
    return { count: 1 };
  });
  fixture.render.mockResolvedValue(Buffer.from("%PDF-1.4\ntest-only fixture"));
  fixture.send.mockResolvedValue({ success: true, message: "test only" });
});
afterEach(async () => {
  await stopScheduler();
  vi.useRealTimers();
});
it("fires at the persisted Chile cron time and schedules the next occurrence", async () => {
  await initializeScheduler();
  await vi.advanceTimersByTimeAsync(59000);
  expect(fixture.render).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1000);
  expect(fixture.render).toHaveBeenCalledOnce();
  expect(fixture.send).toHaveBeenCalledWith(
    "a@example.com",
    expect.any(String),
    expect.any(String),
    expect.any(Buffer),
    "Attendance_2026-01-02.pdf",
  );
  expect(fixture.report.lastRunAt).toEqual(new Date("2026-01-02T11:00:00Z"));
  expect(fixture.report.nextRunAt).toEqual(new Date("2026-01-03T11:00:00Z"));
  await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
  expect(fixture.render).toHaveBeenCalledTimes(2);
});
it("refresh cancels old cron and uses the edited persisted deadline", async () => {
  await initializeScheduler();
  fixture.report.cronExpression = "30 8 * * *";
  fixture.report.nextRunAt = new Date("2026-01-02T11:30:00Z");
  await refreshScheduler();
  await vi.advanceTimersByTimeAsync(60 * 1000);
  expect(fixture.render).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
  expect(fixture.render).toHaveBeenCalledOnce();
});
it("chunks monthly waits beyond Node's timer limit instead of executing immediately", async () => {
  vi.setSystemTime(new Date("2026-01-01T11:00:00Z"));
  fixture.report.cronExpression = "0 8 1 * *";
  fixture.report.nextRunAt = new Date("2026-02-01T11:00:00Z");
  await initializeScheduler();
  await vi.advanceTimersByTimeAsync(2147483647);
  expect(fixture.render).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(31 * 86400000 - 2147483647);
  expect(fixture.render).toHaveBeenCalledOnce();
});
it("does not mark failed delivery as successful and advances to the next cron", async () => {
  vi.setSystemTime(new Date("2026-01-02T11:00:00Z"));
  fixture.send.mockResolvedValue({ success: false, message: "provider detail" });
  expect(await triggerReport("r")).toEqual({
    success: false,
    message: "Error al ejecutar reporte",
  });
  expect(fixture.report.lastRunAt).toBeNull();
  expect(fixture.report.nextRunAt).toEqual(new Date("2026-01-03T11:00:00Z"));
});
it("cold HTTP composition does not create scheduler timers or query the database", async () => {
  await refreshScheduler();
  expect(fixture.findMany).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it("rearms after a provider failure and records success only on the next delivered run", async () => {
  fixture.send.mockResolvedValueOnce({ success: false, message: "provider detail" });
  await initializeScheduler();
  await vi.advanceTimersByTimeAsync(60000);
  expect(fixture.render).toHaveBeenCalledOnce();
  expect(fixture.report.lastRunAt).toBeNull();
  expect(fixture.report.nextRunAt).toEqual(new Date("2026-01-03T11:00:00Z"));
  await vi.advanceTimersByTimeAsync(86400000);
  expect(fixture.render).toHaveBeenCalledTimes(2);
  expect(fixture.report.lastRunAt).toEqual(new Date("2026-01-03T11:00:00Z"));
});
it("skips invalid legacy cron without preventing valid reports from starting", async () => {
  fixture.findMany.mockResolvedValue([
    { ...fixture.report, id: "invalid", cronExpression: "legacy-invalid" },
    { ...fixture.report },
  ]);
  await initializeScheduler();
  expect(vi.getTimerCount()).toBe(2);
  await vi.advanceTimersByTimeAsync(60000);
  expect(fixture.render).toHaveBeenCalledOnce();
});

it("keeps legacy text renderers as txt attachments", async () => {
  fixture.render.mockResolvedValue(Buffer.from("legacy text output"));
  expect((await triggerReport("r")).success).toBe(true);
  expect(fixture.send).toHaveBeenCalledWith(
    "a@example.com",
    expect.any(String),
    expect.any(String),
    expect.any(Buffer),
    "Attendance_2026-01-02.txt",
  );
});
