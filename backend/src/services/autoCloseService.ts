import prisma, { withDirectTransaction } from "./db";
import { EmailService } from "./EmailService";
import { logger } from "../utils/logger";
import { SocketService } from "./socketService";
import { timeRecordIntegrityService } from "./timeRecordIntegrityService";
import { schedulingService } from "./schedulingService";
import { addBusinessDaysChile, toBusinessDateChile } from "../utils/timeUtils";

const emailService = new EmailService();
const FOURTEEN_HOURS_MS = 14 * 60 * 60 * 1000;

function parseEntradaToTimestamp(entrada: string | null, date: string): number | null {
  if (!entrada) return null;

  const direct = new Date(entrada).getTime();
  if (Number.isFinite(direct)) return direct;

  // Fallback for legacy/manual formats like "HH:mm" or "HH:mm:ss"
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(entrada)) {
    const normalizedTime = entrada.length === 5 ? `${entrada}:00` : entrada;
    const ts = new Date(`${date}T${normalizedTime}Z`).getTime();
    if (Number.isFinite(ts)) return ts;
  }

  return null;
}

export const processAutoClosures = async () => {
  const now = new Date();
  const openWhere = {
    entrada: { not: null },
    salida: null,
    status: { notIn: ["Completado", "AnomaliaManual", "Ausente", "Feriado"] },
    isDeleted: false,
  };
  const candidates = await prisma.timeRecord.findMany({ where: openWhere });
  const expired = candidates.filter((record) => {
    const entrada = parseEntradaToTimestamp(record.entrada, record.date);
    return entrada !== null && now.getTime() - entrada >= FOURTEEN_HOURS_MS;
  });
  if (expired.length === 0) return 0;

  const byEmployee = new Map<string, string[]>();
  for (const record of expired) {
    const ids = byEmployee.get(record.employeeId) ?? [];
    ids.push(record.id);
    byEmployee.set(record.employeeId, ids);
  }

  let closedCount = 0;
  for (const [employeeId, ids] of byEmployee) {
    const closedRecords = await withDirectTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"punch:" + employeeId}))`;

      // Candidates may have changed while waiting for the employee lock.
      const current = await tx.timeRecord.findMany({
        where: { ...openWhere, employeeId, id: { in: ids } },
      });
      const closedRecords = [];
      for (const record of current) {
        const entradaTime = parseEntradaToTimestamp(record.entrada, record.date);
        if (entradaTime === null || now.getTime() - entradaTime < FOURTEEN_HOURS_MS) continue;
        const elapsedHours = Math.round((now.getTime() - entradaTime) / 3600000);
        const closedAt = new Date();
        const closed = await tx.timeRecord.update({
          where: { id: record.id },
          data: {
            status: "AnomaliaManual",
            justification: JSON.stringify({
              type: "SYSTEM_ANOMALY",
              reason: "AUTO_CLOSE_EXCEEDED_14H",
              comment: "Cerrado automáticamente por exceder el límite de 14 horas de jornada.",
              metadata: {
                autoClosedAt: closedAt.toISOString(),
                threshold: 14,
                originalDate: record.date,
              },
            }),
            updatedAt: closedAt,
          },
        });
        await timeRecordIntegrityService.sealAfterMutation(tx, closed.employeeId, closed.id, {
          skipAudit: true,
        });
        const hashAudit = await tx.auditLog.create({
          data: {
            actorUsername: "SYSTEM",
            action: record.integrityHash ? "TIME_RECORD_HASH_UPDATED" : "TIME_RECORD_HASH_CREATED",
            category: "CTRL_HOURS",
            severity: "INFO",
            outcome: "SUCCESS",
            details: { recordId: record.id, employeeId: record.employeeId },
          },
        });
        const closureAudit = await tx.auditLog.create({
          data: {
            actorUsername: "SYSTEM",
            action: "Cierre Automático de Turno",
            category: "CTRL_HOURS",
            severity: "WARNING",
            outcome: "SUCCESS",
            details: JSON.stringify({
              recordId: record.id,
              employeeName: record.employeeName,
              entrada: record.entrada,
              elapsedHours,
            }),
            ipAddress: "127.0.0.1",
          },
        });
        closedRecords.push({ record, elapsedHours, hashAudit, closureAudit });
      }
      return closedRecords;
    });

    closedCount += closedRecords.length;
    for (const { record, elapsedHours, hashAudit, closureAudit } of closedRecords) {
      SocketService.emitToAll("auditLog:created", hashAudit);
      SocketService.emitToAll("auditLog:created", closureAudit);
      SocketService.emit("timeRecord:updated", { id: record.id, employeeId: record.employeeId });
      if (record.entrada) {
        emailService
          .notifyTimeRecordAutoClose(record.employeeName, record.entrada, elapsedHours)
          .catch((error: unknown) => logger.error("Error sending auto-close email", error));
      }
    }
  }
  return closedCount;
};

// 1. Get all active employees

export const getAutoCloseDiagnosis = async () => {
  const now = new Date();
  const nowMs = now.getTime();

  const allOpenRecords = await prisma.timeRecord.findMany({
    where: {
      salida: null,
      entrada: { not: null },
      status: { notIn: ["Completado", "AnomaliaManual", "Ausente"] },
      isDeleted: false,
    },
  });

  const diagnosis = allOpenRecords.map((record) => {
    const entradaTime = parseEntradaToTimestamp(record.entrada, record.date);
    const elapsed = entradaTime ? nowMs - entradaTime : NaN;
    const hours = elapsed / 3600000;
    return {
      id: record.id,
      employeeName: record.employeeName,
      status: record.status,
      hoursElapsed: hours,
      shouldAutoClose: Number.isFinite(hours) && hours > 14,
      invalidEntradaFormat: !entradaTime,
    };
  });

  return {
    summary: {
      totalOpen: allOpenRecords.length,
      needingAction: diagnosis.filter((d) => d.shouldAutoClose).length,
    },
    diagnosis,
  };
};

/**
 * Process Daily Absences
 * Scans for employees who should have worked but have no records.
 * Creates physical 'Ausente' records.
 */
export const processDailyAbsences = async (targetDate?: string) => {
  const dateStr = targetDate || addBusinessDaysChile(toBusinessDateChile(), -1);
  console.warn(`--- Iniciando detección de Ausencias para ${dateStr} ---`);

  try {
    const activeEmployees = await prisma.employee.findMany({
      where: { status: "Activo" },
      select: { id: true, name: true, area: true, position: true, workdayType: true },
    });

    const employeeIds = activeEmployees.map((e) => e.id);
    if (employeeIds.length === 0) return 0;

    // 1. Get schedule matrix for the date
    const scheduleMatrix = await schedulingService.getCalendarMatrix(dateStr, dateStr, employeeIds);

    // 2. Get existing records for the date
    const existingRecords = await prisma.timeRecord.findMany({
      where: { date: dateStr, employeeId: { in: employeeIds }, isDeleted: false },
      select: { employeeId: true },
    });
    const recordMap = new Set(existingRecords.map((r) => r.employeeId));

    let createdCount = 0;

    for (const employee of activeEmployees) {
      const scheduleInfo = scheduleMatrix[employee.id]?.[dateStr];

      // If it's a workday, not a holiday, and has no record/justification
      if (
        scheduleInfo?.isWorkDay &&
        !scheduleInfo.isHoliday &&
        !scheduleInfo.justificationType &&
        !recordMap.has(employee.id)
      ) {
        await withDirectTransaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"punch:" + employee.id}))`;
          const record = await tx.timeRecord.create({
            data: {
              employeeId: employee.id,
              employeeName: employee.name,
              employeeArea: employee.area,
              employeePosition: employee.position,
              employeeWorkdayType: employee.workdayType,
              date: dateStr,
              status: "Ausente",
              source: "SYSTEM_AUTO",
              justification: JSON.stringify({
                type: "SYSTEM_ANOMALY",
                reason: "ABSENCE_DETECTED",
                comment: "Ausencia detectada automáticamente por el sistema.",
              }),
            },
          });
          await timeRecordIntegrityService.sealAfterMutation(tx, employee.id, record.id);
        });
        createdCount++;
      }
    }

    if (createdCount > 0) {
      console.warn(`--- Detección de Ausencias Finalizada: ${createdCount} registros creados ---`);
    }
    return createdCount;
  } catch (error) {
    console.error("Error en proceso de detección de ausencias:", error);
    throw error;
  }
};
