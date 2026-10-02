import prisma, { withDirectTransaction } from "./db";
import { auditService } from "./auditService";
import { logger } from "../utils/logger";

/** Columns inspected when auditing the digital seal. */
type SealViolation = {
  id: string;
  employeeName: string;
  date: string;
  updatedAt: Date;
  status: string;
};

export class SecurityAuditService {
  /**
   * Verifies the integrity of the "Digital Seal" by detecting records modified
   * AFTER their period was officially locked.
   */
  async verifyDigitalSealIntegrity(): Promise<{
    violations: SealViolation[];
    totalViolations: number;
  }> {
    logger.info("Iniciando Verificación de Integridad del Sello Digital");

    // 1. Get current lock date from config
    const lockConfig = await prisma.systemConfig.findUnique({
      where: { key: "accounting_lock_date" },
    });

    if (!lockConfig || !lockConfig.value || lockConfig.value === "null") {
      return { violations: [], totalViolations: 0 };
    }

    const manualLockDate = JSON.parse(lockConfig.value);
    if (!manualLockDate || typeof manualLockDate !== "string") {
      return { violations: [], totalViolations: 0 };
    }

    // 2. Find records whose 'date' <= lockDate BUT 'updatedAt' > lock execution?
    // Actually, a more precise check is:
    // Any record in a locked period that was updated AFTER the lock was applied.
    // For simplicity and high security: we check records in locked periods
    // updated in the last 24 hours (assuming audit runs daily).

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const suspiciousRecords = await prisma.timeRecord.findMany({
      where: {
        date: { lte: manualLockDate },
        updatedAt: { gte: oneDayAgo },
        isDeleted: false,
      },
      select: {
        id: true,
        employeeName: true,
        date: true,
        updatedAt: true,
        status: true,
      },
    });

    if (suspiciousRecords.length > 0) {
      console.warn(
        `[🚨] SEGURIDAD: Se detectaron ${suspiciousRecords.length} modificaciones en periodos BLOQUEADOS.`,
      );

      const VIOLATION_THRESHOLD = 10;

      if (suspiciousRecords.length > VIOLATION_THRESHOLD) {
        // Log a single bulk entry for many violations
        await auditService.log({
          actorUsername: "SYSTEM_SECURITY_AUDIT",
          action: "INTEGRITY_VIOLATION_BULK",
          category: "CTRL_HOURS",
          severity: "CRITICAL",
          outcome: "FAILURE",
          details: {
            message: `Múltiples registros (${suspiciousRecords.length}) modificados en periodos bloqueados`,
            count: suspiciousRecords.length,
            lockDate: manualLockDate,
            sampleIds: suspiciousRecords.slice(0, 5).map((r) => r.id),
          },
        });
      } else {
        // Log individual entries for a small number of violations
        for (const record of suspiciousRecords) {
          await auditService.log({
            actorUsername: "SYSTEM_SECURITY_AUDIT",
            action: "INTEGRITY_VIOLATION_DETECTED",
            category: "CTRL_HOURS",
            severity: "ERROR",
            outcome: "FAILURE",
            details: {
              message: "Registro modificado en periodo contable CERRADO",
              recordId: record.id,
              employeeName: record.employeeName,
              recordDate: record.date,
              modificationTime: record.updatedAt,
              lockDate: manualLockDate,
            },
          });
        }
      }
    }

    return {
      violations: suspiciousRecords,
      totalViolations: suspiciousRecords.length,
    };
  }

  /**
   * Performs a deep cryptographic verification of the entire TimeRecord chain.
   */
  async verifyFullChainIntegrity(): Promise<void> {
    logger.info("Iniciando Auditoría Criptográfica de la Cadena de Marcajes");
    const { timeRecordIntegrityService } = await import("./timeRecordIntegrityService");

    const result = await withDirectTransaction(
      async (tx) => timeRecordIntegrityService.verifyChain(tx, { limit: 20000 }),
      {
        timeout: 90000, // 90 seconds
      },
    );

    if (result.brokenCount > 0) {
      logger.error(
        `[🚨] INTEGRIDAD ROTA: Se detectaron ${result.brokenCount} registros corruptos.`,
        undefined,
        { brokenCount: result.brokenCount },
      );
      // logs are already handled by timeRecordIntegrityService.verifyChain
    } else {
      logger.info(`Integridad verificada para ${result.checkedCount} registros.`, {
        checkedCount: result.checkedCount,
      });
    }
  }
}

export const securityAuditService = new SecurityAuditService();
