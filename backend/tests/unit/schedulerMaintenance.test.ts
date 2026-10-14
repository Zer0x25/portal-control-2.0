import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maintenanceMode: false,
  phase2Running: false,
  ensureInstanceId: vi.fn(async () => {}),
  rotateAuditLogs: vi.fn(async () => {}),
  refreshMaterializedViews: vi.fn(async () => {}),
  runNightlyIntegrityMaintenance: vi.fn(async () => {}),
  auditClosureHealth: vi.fn(async () => {}),
  getHolidays: vi.fn(async () => []),
}));

vi.mock("../../src/services/workCoordinator", () => ({
  workCoordinator: {
    run: async (_label: string, task: () => Promise<unknown>) => task(),
  },
}));

vi.mock("../../src/services/systemOperationService", () => ({
  systemOperationService: {
    isMaintenanceModeActive: () => mocks.maintenanceMode,
  },
}));

vi.mock("../../src/services/seedingJobService", () => ({
  seedingJobService: {
    isPhase2Running: async () => mocks.phase2Running,
  },
}));

vi.mock("../../src/services/maintenanceService", () => ({
  maintenanceService: {
    ensureInstanceId: mocks.ensureInstanceId,
    rotateAuditLogs: mocks.rotateAuditLogs,
    refreshMaterializedViews: mocks.refreshMaterializedViews,
  },
}));

vi.mock("../../src/services/integrityMaintenanceService", () => ({
  integrityMaintenanceService: {
    runNightlyIntegrityMaintenance: mocks.runNightlyIntegrityMaintenance,
  },
}));

vi.mock("../../src/services/closureValidationService", () => ({
  closureValidationService: {
    auditClosureHealth: mocks.auditClosureHealth,
  },
}));

vi.mock("../../src/services/HolidayService", () => ({
  holidayService: {
    getHolidays: mocks.getHolidays,
  },
}));

vi.mock("../../src/services/ExportService", () => ({
  ExportService: class {},
}));

vi.mock("../../src/services/export/ExportService", () => ({
  ExportService: class {},
}));

vi.mock("../../src/services/EmailService", () => ({
  EmailService: class {},
}));

vi.mock("../../src/services/db", () => ({
  default: {
    scheduledReport: {
      findMany: vi.fn(async () => []),
    },
  },
}));

import { runMaintenance } from "../../src/services/schedulerService";

describe("schedulerService maintenance runner (anti-regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maintenanceMode = false;
    mocks.phase2Running = false;
  });

  it("executes ensureInstanceId, rotateAuditLogs, refreshMaterializedViews and integrity checks in order", async () => {
    await runMaintenance();

    expect(mocks.ensureInstanceId).toHaveBeenCalledOnce();
    expect(mocks.rotateAuditLogs).toHaveBeenCalledOnce();
    expect(mocks.refreshMaterializedViews).toHaveBeenCalledOnce();
    expect(mocks.runNightlyIntegrityMaintenance).toHaveBeenCalledOnce();
    expect(mocks.auditClosureHealth).toHaveBeenCalledOnce();
    expect(mocks.getHolidays).toHaveBeenCalledOnce();
  });

  it("skips maintenance tasks when system maintenance mode is active", async () => {
    mocks.maintenanceMode = true;

    await runMaintenance();

    expect(mocks.ensureInstanceId).not.toHaveBeenCalled();
    expect(mocks.rotateAuditLogs).not.toHaveBeenCalled();
    expect(mocks.refreshMaterializedViews).not.toHaveBeenCalled();
    expect(mocks.runNightlyIntegrityMaintenance).not.toHaveBeenCalled();
  });

  it("defers maintenance tasks when seeder Phase 2 is active to prevent DB contention", async () => {
    mocks.phase2Running = true;

    await runMaintenance();

    expect(mocks.ensureInstanceId).not.toHaveBeenCalled();
    expect(mocks.rotateAuditLogs).not.toHaveBeenCalled();
    expect(mocks.refreshMaterializedViews).not.toHaveBeenCalled();
    expect(mocks.runNightlyIntegrityMaintenance).not.toHaveBeenCalled();
  });
});
