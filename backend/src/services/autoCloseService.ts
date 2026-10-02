import prisma, { withDirectTransaction } from "./db";
import { EmailService } from "./EmailService";
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
  console.warn("--- Iniciando proceso de Cierre Automático ---");
  try {
    const now = new Date();
    const nowMs = now.getTime();

    // Buscar registros abiertos (que tengan entrada pero no salida, y no estén en estados terminales)
    const openRecords = await prisma.timeRecord.findMany({
      where: {
        entrada: { not: null },
        salida: null,
        status: {
          notIn: ["Completado", "AnomaliaManual", "Ausente", "Feriado"],
        },
        isDeleted: false,
      },
    });

    let closedCount = 0;

    for (const record of openRecords) {
      if (!record.entrada) continue;

      const entradaTime = parseEntradaToTimestamp(record.entrada, record.date);
      if (!entradaTime) {
        console.warn(
          `[AUTO_CLOSE_SKIP] Registro ${record.id} omitido por formato de entrada invalido: ${record.entrada}`,
        );
        continue;
      }
      const elapsed = nowMs - entradaTime;

      if (elapsed > FOURTEEN_HOURS_MS) {
        console.warn(
          `Cerrando registro ${record.id} de ${record.employeeName} (Antigüedad: ${Math.round(elapsed / 3600000)}h)`,
        );

        // Note: virtualSalida calculation was removed as it was not used.

        await withDirectTransaction(async (tx) => {
          const closed = await tx.timeRecord.update({
            where: { id: record.id },
            data: {
              status: "AnomaliaManual",
              salida: null, // Dejar salida en blanco
              justification: JSON.stringify({
                type: "SYSTEM_ANOMALY",
                reason: "AUTO_CLOSE_EXCEEDED_14H",
                comment: "Cerrado automáticamente por exceder el límite de 14 horas de jornada.",
                metadata: {
                  autoClosedAt: now.toISOString(),
                  threshold: 14,
                },
              }),
              updatedAt: new Date(),
            },
          });
          await timeRecordIntegrityService.sealAfterMutation(tx, closed.employeeId, closed.id);
        });

        // Registrar en auditoría (Bypass controller para simplicidad interna o llamar a una función de log)
        await prisma.auditLog.create({
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
              elapsedHours: Math.round(elapsed / 3600000),
            }),
            ipAddress: "127.0.0.1",
          },
        });

        // Enviar notificación por correo
        emailService
          .notifyTimeRecordAutoClose(
            record.employeeName,
            record.entrada,
            Math.round(elapsed / 3600000),
          )
          .catch((err) => console.error("Error sending auto-close email:", err));

        closedCount++;
      }
    }

    if (closedCount > 0) {
      console.warn(`--- Cierre Automático Finalizado: ${closedCount} jornadas cerradas ---`);
    } else {
      console.warn("--- Cierre Automático Finalizado: No se encontraron jornadas vencidas ---");
    }

    return closedCount;
  } catch (error) {
    console.error("Error en proceso de cierre automático:", error);
    throw error;
  }
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
