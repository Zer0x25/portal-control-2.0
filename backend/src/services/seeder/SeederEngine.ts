import { phase1Service } from "./Phase1Service";
import { phase2Service, SeedingContext } from "./Phase2Service";

export class SeederEngine {
  /**
   * Phase 1: Structural Data (Employees, Users, Patterns) + Initial Transactional Data (Leaves, Shifts)
   */
  async runSeedPhase1(
    options: {
      employees: number;
      days: number;
      basePatternsCount?: number;
      leaveRatio?: number;
      correctionRequestRatio?: number;
      shiftReportsPerDay?: number;
      quickNotesCount?: number;
    },
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    const basePatternsCount = options.basePatternsCount ?? 3;
    const leaveRatio = options.leaveRatio ?? 5;
    const correctionRequestRatio = options.correctionRequestRatio ?? 2;
    const shiftReportsPerDay = options.shiftReportsPerDay ?? 6;
    const quickNotesCount = options.quickNotesCount ?? 5;
    const absenceProb = leaveRatio / 100;
    const correctionProb = correctionRequestRatio / 100;

    // 1. Static Configuration & Entities
    await phase1Service.seedSystemConfigs(progressCb);
    await phase1Service.seedEmployees(options.employees, progressCb, heartbeatCb);
    await phase1Service.seedUsers(progressCb, heartbeatCb);
    await phase1Service.seedShiftPatternsAndAssignments(
      basePatternsCount,
      options.days,
      progressCb,
      heartbeatCb,
    );

    // 2. Initial Transactional Data (that fits in Phase 1 flow)
    await phase2Service.seedShiftReports(options.days, shiftReportsPerDay, progressCb, heartbeatCb);
    await phase2Service.seedLeaveRecords(options.days, absenceProb, progressCb, heartbeatCb);
    await phase2Service.seedCorrectionRequests(
      options.days,
      correctionProb,
      progressCb,
      heartbeatCb,
    );
    await phase2Service.seedQuickNotes(quickNotesCount, progressCb, heartbeatCb);
  }

  // ── Phase 2 Proxies (Used by SeedingJobService) ──

  async preloadSeedingContext(): Promise<SeedingContext> {
    return phase2Service.preloadSeedingContext();
  }

  async seedHistoryForDate(
    targetDate: Date,
    absenceProb: number,
    progressCb?: (msg: string) => void,
    context?: SeedingContext,
  ): Promise<number> {
    return phase2Service.seedHistoryForDate(targetDate, absenceProb, progressCb, context);
  }

  async seedCorrectionRequests(
    numDays: number,
    correctionProb: number,
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    return phase2Service.seedCorrectionRequests(numDays, correctionProb, progressCb, heartbeatCb);
  }

  async backfillTimeRecordIntegrity(progressCb: (msg: string) => void, heartbeatCb: () => void) {
    return phase2Service.backfillTimeRecordIntegrity(progressCb, heartbeatCb);
  }
}

export const seedingEngine = new SeederEngine();
// Export as seedingService for backward compatibility if we want to minimize renaming
// export const seedingService = seedingEngine;
