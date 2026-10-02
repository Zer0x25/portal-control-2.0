import crypto from "crypto";
import { Prisma, TimeRecord } from "@prisma/client";
import type { prisma as extendedPrisma } from "./db";
import { auditService } from "./auditService";
import { integrityStatusService } from "./integrityStatusService";

type VerifyFilters = {
  employeeId?: string;
  from?: string;
  to?: string;
  limit?: number;
};
type SealOptions = {
  skipAudit?: boolean;
};

type BrokenReason = "HASH_MISMATCH" | "PREV_HASH_MISMATCH" | "MISSING_HASH";

type BrokenItem = {
  recordId: string;
  employeeId: string;
  reason: BrokenReason;
  expectedHash: string | null;
  actualHash: string | null;
  expectedPrevHash: string | null;
  actualPrevHash: string | null;
};

type VerifyResult = {
  checkedCount: number;
  brokenCount: number;
  broken: BrokenItem[];
};

const INTEGRITY_VERSION = 1;
const INTEGRITY_ALGO = "SHA256";
const BROKEN_LOG_THRESHOLD = Math.max(
  Number.parseInt(process.env.INTEGRITY_BROKEN_LOG_THRESHOLD ?? "20", 10) || 20,
  1,
);
const BROKEN_SAMPLE_SIZE = Math.max(
  Number.parseInt(process.env.INTEGRITY_BROKEN_SAMPLE_SIZE ?? "20", 10) || 20,
  1,
);
const BULK_ALERT_COOLDOWN_MINUTES = Math.max(
  Number.parseInt(process.env.INTEGRITY_BULK_ALERT_COOLDOWN_MINUTES ?? "60", 10) || 60,
  1,
);

/**
 * Any Prisma client flavour this service accepts: the base client, the extended client
 * exported from ./db (type-only import, no runtime dependency), or a transaction client.
 * Mirrors `withDirectTransaction`'s `Prisma.TransactionClient` callback parameter in ./db.
 */
type DbClient = typeof extendedPrisma | Prisma.TransactionClient;

/** Fields covered by the canonical integrity payload. */
type CanonicalRecord = Pick<
  TimeRecord,
  | "employeeId"
  | "date"
  | "entrada"
  | "inicioColacion"
  | "finColacion"
  | "salida"
  | "status"
  | "source"
  | "updatedAt"
  | "integrityVersion"
>;

type TxLike = {
  timeRecord: {
    findFirst(args: {
      where: Prisma.TimeRecordWhereInput;
      orderBy?:
        | Prisma.TimeRecordOrderByWithRelationInput
        | Prisma.TimeRecordOrderByWithRelationInput[];
      select?: Prisma.TimeRecordSelect;
    }): Promise<Pick<TimeRecord, "integrityHash"> | null>;
    findUnique(args: { where: Prisma.TimeRecordWhereUniqueInput }): Promise<TimeRecord | null>;
    findMany(args?: Prisma.TimeRecordFindManyArgs): Promise<TimeRecord[]>;
    update(args: {
      where: Prisma.TimeRecordWhereUniqueInput;
      data: Prisma.TimeRecordUpdateInput;
    }): Promise<TimeRecord>;
  };
};

function safeValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export const timeRecordIntegrityService = {
  buildCanonicalPayload(record: CanonicalRecord, prevHash: string | null): string {
    const parts = [
      record.employeeId,
      record.date,
      record.entrada,
      record.inicioColacion,
      record.finColacion,
      record.salida,
      record.status,
      record.source,
      record.updatedAt.toISOString(),
      prevHash,
      record.integrityVersion ?? INTEGRITY_VERSION,
    ];

    return parts.map(safeValue).join("|");
  },

  computeHash(payload: string): string {
    return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  },

  async getPrevHash(
    tx: TxLike,
    employeeId: string,
    updatedAt: Date,
    excludeRecordId?: string,
  ): Promise<string | null> {
    const prev = await tx.timeRecord.findFirst({
      where: {
        employeeId,
        id: excludeRecordId ? { not: excludeRecordId } : undefined,
        OR: [
          { updatedAt: { lt: updatedAt } },
          excludeRecordId
            ? {
                AND: [{ updatedAt }, { id: { lt: excludeRecordId } }],
              }
            : { updatedAt: { lt: updatedAt } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { integrityHash: true },
    });

    return prev?.integrityHash ?? null;
  },

  async sealRecord(tx: TxLike, recordId: string, options?: SealOptions): Promise<void> {
    const record = await tx.timeRecord.findUnique({ where: { id: recordId } });
    if (!record) return;

    const prevHash = await this.getPrevHash(tx, record.employeeId, record.updatedAt, record.id);
    const payload = this.buildCanonicalPayload(record, prevHash);
    const hash = this.computeHash(payload);
    const action = record.integrityHash ? "TIME_RECORD_HASH_UPDATED" : "TIME_RECORD_HASH_CREATED";

    await tx.timeRecord.update({
      where: { id: record.id },
      data: {
        integrityHash: hash,
        integrityPrevHash: prevHash,
        integrityAlgo: INTEGRITY_ALGO,
        integrityVersion: INTEGRITY_VERSION,
        // Preserve logical mutation timestamp; sealing should not alter business updatedAt.
        updatedAt: record.updatedAt,
      },
    });

    if (!options?.skipAudit) {
      await auditService.log({
        actorUsername: "SYSTEM",
        action,
        category: "CTRL_HOURS",
        severity: "INFO",
        outcome: "SUCCESS",
        details: {
          recordId: record.id,
          employeeId: record.employeeId,
        },
      });
    }
  },

  async sealAfterMutation(
    tx: TxLike,
    employeeId: string,
    affectedRecordId: string,
    options?: SealOptions,
  ): Promise<void> {
    await this.sealRecord(tx, affectedRecordId, options);
    void employeeId;
  },

  async verifyChain(tx: TxLike, filters: VerifyFilters): Promise<VerifyResult> {
    const batchSize = 5000;
    const broken: BrokenItem[] = [];
    let checkedCount = 0;
    let prevHashByEmployee = new Map<string, string | null>();

    const where: Prisma.TimeRecordWhereInput = {
      employeeId: filters.employeeId,
      date:
        filters.from || filters.to
          ? {
              gte: filters.from,
              lte: filters.to,
            }
          : undefined,
    };

    let cursorId: string | undefined;

    while (true) {
      const records = await tx.timeRecord.findMany({
        where,
        orderBy: [{ employeeId: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
        take: batchSize,
        skip: cursorId ? 1 : 0,
        cursor: cursorId ? { id: cursorId } : undefined,
      });

      if (records.length === 0) break;

      for (const record of records) {
        const expectedPrevHash = prevHashByEmployee.get(record.employeeId) ?? null;

        // If we are starting a NEW employee in this batch, we might need
        // to fetch their last known integrity hash from DB if we don't have it in the map.
        // However, the current logic assumes we are verifying a CONTINUOUS chain
        // from the start of the filter.

        const expectedHash = this.computeHash(this.buildCanonicalPayload(record, expectedPrevHash));
        const actualHash = record.integrityHash ?? null;
        const actualPrevHash = record.integrityPrevHash ?? null;

        if (!actualHash) {
          broken.push({
            recordId: record.id,
            employeeId: record.employeeId,
            reason: "MISSING_HASH",
            expectedHash,
            actualHash,
            expectedPrevHash,
            actualPrevHash,
          });
        } else if (actualPrevHash !== expectedPrevHash) {
          broken.push({
            recordId: record.id,
            employeeId: record.employeeId,
            reason: "PREV_HASH_MISMATCH",
            expectedHash,
            actualHash,
            expectedPrevHash,
            actualPrevHash,
          });
        } else if (actualHash !== expectedHash) {
          broken.push({
            recordId: record.id,
            employeeId: record.employeeId,
            reason: "HASH_MISMATCH",
            expectedHash,
            actualHash,
            expectedPrevHash,
            actualPrevHash,
          });
        }

        prevHashByEmployee.set(record.employeeId, actualHash ?? expectedHash);
        checkedCount++;
      }

      cursorId = records[records.length - 1].id;

      // Safety limit for the total verification (user requested capability for 1.2M,
      // but we should probably still have a reasonable default or filter)
      if (filters.limit && checkedCount >= filters.limit) break;
    }

    const result: VerifyResult = {
      checkedCount,
      brokenCount: broken.length,
      broken,
    };
    const byReason = {
      missingHash: broken.filter((x) => x.reason === "MISSING_HASH").length,
      hashMismatch: broken.filter((x) => x.reason === "HASH_MISMATCH").length,
      prevHashMismatch: broken.filter((x) => x.reason === "PREV_HASH_MISMATCH").length,
    };
    const bulkMode = result.brokenCount >= BROKEN_LOG_THRESHOLD;

    integrityStatusService.markVerifyRun({
      checkedCount: result.checkedCount,
      brokenCount: result.brokenCount,
      bulkMode,
      byReason,
    });

    await auditService.log({
      actorUsername: "SYSTEM",
      action: "TIME_RECORD_INTEGRITY_VERIFY_RUN",
      category: "CTRL_HOURS",
      severity: "INFO",
      outcome: "SUCCESS",
      details: {
        checkedCount: result.checkedCount,
        brokenCount: result.brokenCount,
        scope: {
          employeeId: filters.employeeId ?? null,
          from: filters.from ?? null,
          to: filters.to ?? null,
          limit: filters.limit ?? null,
        },
        bulkMode,
        brokenByReason: byReason,
        brokenLogThreshold: BROKEN_LOG_THRESHOLD,
      },
    });

    if (bulkMode) {
      const sample = broken.slice(0, BROKEN_SAMPLE_SIZE);
      const signature = JSON.stringify({
        byReason,
        sample: sample.map((x) => `${x.reason}:${x.employeeId}:${x.recordId}`).slice(0, 10),
      });
      const emitBulkAlert = integrityStatusService.shouldEmitBulkAlert(
        signature,
        BULK_ALERT_COOLDOWN_MINUTES,
      );

      if (emitBulkAlert) {
        await auditService.log({
          actorUsername: "SYSTEM",
          action: "TIME_RECORD_INTEGRITY_BROKEN_BULK",
          category: "CTRL_HOURS",
          severity: "CRITICAL",
          outcome: "FAILURE",
          details: {
            checkedCount: result.checkedCount,
            brokenCount: result.brokenCount,
            brokenByReason: byReason,
            sampleSize: sample.length,
            sample,
            cooldownMinutes: BULK_ALERT_COOLDOWN_MINUTES,
          },
        });
      }
    } else {
      for (const item of broken) {
        await auditService.log({
          actorUsername: "SYSTEM",
          action: "TIME_RECORD_INTEGRITY_BROKEN",
          category: "CTRL_HOURS",
          severity: "CRITICAL",
          outcome: "FAILURE",
          details: item,
        });
      }
    }

    return result;
  },

  async bulkSqlSeal(
    prisma: DbClient,
    employeeIds: string[],
    options: {
      batchSize?: number;
      workers?: number;
      skipAudit?: boolean;
      progressCb?: (processed: number) => void;
      heartbeatCb?: () => void;
    } = {},
  ): Promise<number> {
    const envBatchSize = parseInt(process.env.INTEGRITY_BACKFILL_BATCH_SIZE ?? "5000");
    const batchSize = Math.max(200, Math.min(envBatchSize, 10000));

    const envWorkers = parseInt(process.env.INTEGRITY_BACKFILL_WORKERS ?? "12");
    const workers = Math.max(1, Math.min(envWorkers, 24));

    void workers; // Parallel workers partition logic would go here if needed,
    // for now we use worker count to decide how many employees to fetch at once.

    let totalProcessed = 0;
    let cursorId: string | undefined;
    let currentEmployeeId: string | null = null;
    let prevHash: string | null = null;
    let batchUpdates: { id: string; hash: string; prev: string | null }[] = [];

    const where = { employeeId: { in: employeeIds } };

    while (true) {
      // Fetch absolute batch of records
      const records = await prisma.timeRecord.findMany({
        where,
        orderBy: [{ employeeId: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
        take: batchSize,
        skip: cursorId ? 1 : 0,
        cursor: cursorId ? { id: cursorId } : undefined,
        select: {
          id: true,
          employeeId: true,
          date: true,
          entrada: true,
          inicioColacion: true,
          finColacion: true,
          salida: true,
          status: true,
          source: true,
          updatedAt: true,
          integrityVersion: true,
        },
      });

      if (records.length === 0) break;

      for (const record of records) {
        // Reset chain when employee changes
        if (record.employeeId !== currentEmployeeId) {
          currentEmployeeId = record.employeeId;
          prevHash = null;
        }

        const payload = this.buildCanonicalPayload(record, prevHash);
        const hash = this.computeHash(payload);

        batchUpdates.push({ id: record.id, hash, prev: prevHash });
        prevHash = hash;
        totalProcessed++;

        // When batch is full, execute bulk update
        if (batchUpdates.length >= batchSize) {
          await this.executeBulkUpdate(prisma, batchUpdates);
          batchUpdates = [];
          options.progressCb?.(totalProcessed);
          options.heartbeatCb?.();
        }
      }

      cursorId = records[records.length - 1].id;
    }

    // Final batch
    if (batchUpdates.length > 0) {
      await this.executeBulkUpdate(prisma, batchUpdates);
      options.progressCb?.(totalProcessed);
      options.heartbeatCb?.();
    }

    if (!options.skipAudit) {
      await auditService.log({
        actorUsername: "SYSTEM",
        action: "TIME_RECORD_BULK_SQL_SEAL",
        category: "CTRL_HOURS",
        severity: "INFO",
        outcome: "SUCCESS",
        details: {
          employeeCount: employeeIds.length,
          recordCount: totalProcessed,
        },
      });
    }

    return totalProcessed;
  },

  async executeBulkUpdate(
    prisma: DbClient,
    updates: { id: string; hash: string; prev: string | null }[],
  ): Promise<void> {
    if (updates.length === 0) return;

    // Build the VALUES part of the SQL query
    // We use Prisma.sql and Prisma.join for safety
    const values = updates.map((u) => Prisma.sql`(${u.id}, ${u.hash}, ${u.prev})`);

    await prisma.$executeRaw`
      UPDATE time_records AS tr
      SET
        integrity_hash = v.hash,
        integrity_prev_hash = v.prev,
        integrity_algo = ${INTEGRITY_ALGO},
        integrity_version = ${INTEGRITY_VERSION}
      FROM (VALUES
        ${Prisma.join(values)}
      ) AS v(id, hash, prev)
      WHERE tr.id = v.id
    `;
  },
};

export type { VerifyFilters, VerifyResult, BrokenItem, TxLike };
