import prisma from "./db";
import { timeRecordIntegrityService } from "./timeRecordIntegrityService";
import { auditService } from "./auditService";
import { integrityStatusService } from "./integrityStatusService";
import { requestContext } from "../utils/context";

const backfillEnabled = process.env.INTEGRITY_BACKFILL_ENABLED !== "false";
const backfillBatchSize = Math.min(
  Math.max(Number.parseInt(process.env.INTEGRITY_BACKFILL_BATCH_SIZE ?? "250", 10) || 250, 25),
  2000,
);
const backfillMaxPerRun = (() => {
  const val = Number.parseInt(process.env.INTEGRITY_BACKFILL_MAX_PER_RUN ?? "5000", 10);
  if (val === -1) return -1;
  return Math.max(val || 5000, 100);
})();
const autoRechainEnabled = process.env.INTEGRITY_AUTO_RECHAIN_ENABLED === "true";
const rechainMaxEmployeesPerRun = Math.max(
  Number.parseInt(process.env.INTEGRITY_RECHAIN_MAX_EMPLOYEES_PER_RUN ?? "200", 10) || 200,
  1,
);
const rechainVerifyLimit = (() => {
  const val = Number.parseInt(process.env.INTEGRITY_RECHAIN_VERIFY_LIMIT ?? "20000", 10);
  if (val === -1) return -1;
  return Math.max(val || 20000, 1000);
})();

export const integrityMaintenanceService = {
  async runMissingHashBackfill() {
    if (!backfillEnabled) {
      return { enabled: false, processed: 0, errors: 0 };
    }

    const startedAt = Date.now();
    let processed = 0;
    let errors = 0;

    await requestContext.run({ username: "SYSTEM", skipTrigger: true }, async () => {
      const rows = await prisma.timeRecord.findMany({
        where: { integrityHash: null },
        orderBy: [{ employeeId: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
        take: backfillMaxPerRun === -1 ? undefined : backfillMaxPerRun,
        select: { employeeId: true },
      });

      if (rows.length === 0) return;

      const employeeIds = Array.from(new Set(rows.map((r) => r.employeeId))) as string[];
      processed = await timeRecordIntegrityService.bulkSqlSeal(prisma, employeeIds, {
        skipAudit: true,
      });
    });

    const durationMs = Date.now() - startedAt;
    integrityStatusService.markBackfillRun({ processed, errors });

    await auditService.log({
      actorUsername: "SYSTEM",
      action: "TIME_RECORD_INTEGRITY_BACKFILL_RUN",
      category: "CTRL_HOURS",
      severity: errors > 0 ? "WARNING" : "INFO",
      outcome: errors > 0 ? "FAILURE" : "SUCCESS",
      details: {
        processed,
        errors,
        durationMs,
        batchSize: backfillBatchSize,
        maxPerRun: backfillMaxPerRun,
      },
    });

    return {
      enabled: true,
      processed,
      errors,
      durationMs,
      batchSize: backfillBatchSize,
      maxPerRun: backfillMaxPerRun,
    };
  },

  async runAutoRechainIfNeeded() {
    if (!autoRechainEnabled) {
      return { enabled: false, reChainedEmployees: 0, processedRecords: 0, errors: 0 };
    }

    const verifyResult = await timeRecordIntegrityService.verifyChain(prisma, {
      limit: rechainVerifyLimit === -1 ? undefined : rechainVerifyLimit,
    });

    if (verifyResult.brokenCount === 0) {
      return { enabled: true, reChainedEmployees: 0, processedRecords: 0, errors: 0 };
    }

    const affectedEmployees = Array.from(
      new Set(
        verifyResult.broken
          .filter((b) => b.reason === "PREV_HASH_MISMATCH" || b.reason === "HASH_MISMATCH")
          .map((b) => b.employeeId),
      ),
    ).slice(0, rechainMaxEmployeesPerRun);

    if (affectedEmployees.length === 0) {
      return { enabled: true, reChainedEmployees: 0, processedRecords: 0, errors: 0 };
    }

    const startedAt = Date.now();
    let processedRecords = 0;
    let errors = 0;

    await requestContext.run({ username: "SYSTEM", skipTrigger: true }, async () => {
      for (const employeeId of affectedEmployees) {
        const records = await prisma.timeRecord.findMany({
          where: { employeeId },
          orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
          select: { id: true },
        });

        for (const record of records) {
          try {
            await timeRecordIntegrityService.sealAfterMutation(prisma, employeeId, record.id, {
              skipAudit: true,
            });
            processedRecords += 1;
          } catch {
            errors += 1;
          }
        }
      }
    });

    const durationMs = Date.now() - startedAt;
    await auditService.log({
      actorUsername: "SYSTEM",
      action: "TIME_RECORD_INTEGRITY_RECHAIN_RUN",
      category: "CTRL_HOURS",
      severity: errors > 0 ? "WARNING" : "INFO",
      outcome: errors > 0 ? "FAILURE" : "SUCCESS",
      details: {
        reChainedEmployees: affectedEmployees.length,
        processedRecords,
        errors,
        durationMs,
        rechainMaxEmployeesPerRun,
        rechainVerifyLimit,
      },
    });

    return {
      enabled: true,
      reChainedEmployees: affectedEmployees.length,
      processedRecords,
      errors,
    };
  },

  async runNightlyIntegrityMaintenance() {
    const backfill = await this.runMissingHashBackfill();
    const rechain = await this.runAutoRechainIfNeeded();
    return { backfill, rechain };
  },
};
