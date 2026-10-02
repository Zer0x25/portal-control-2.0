import prisma from "./db";
import { ulid } from "ulid";
import { formatDateUTCISO, parseDateOnlyUTC } from "../utils/timeUtils";
import { toCaughtError } from "../utils/caughtError";

const disableShiftRotation = process.env.DISABLE_SHIFT_ROTATION === "true";
const rotationMaxPerRun = Math.max(1, Number(process.env.SHIFT_ROTATION_MAX_PER_RUN ?? 50));
const rotationRetryCount = Math.max(0, Number(process.env.SHIFT_ROTATION_RETRY_COUNT ?? 2));
const rotationRetryDelayMs = Math.max(50, Number(process.env.SHIFT_ROTATION_RETRY_DELAY_MS ?? 300));
const auditPerItem = process.env.SHIFT_ROTATION_AUDIT_PER_ITEM === "true";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Rotate open shift assignments after full cycles are completed.
 * Hardened for production: bounded workload, retries and summary audit.
 */
export const rotateIndefiniteShifts = async () => {
  console.warn("--- Starting automatic shift rotation ---");

  if (disableShiftRotation) {
    console.warn("--- Shift rotation disabled (DISABLE_SHIFT_ROTATION=true) ---");
    return 0;
  }

  try {
    const now = new Date();
    const todayStr = formatDateUTCISO(now);
    const today = parseDateOnlyUTC(todayStr);

    const indefiniteAssignments = await prisma.assignedShift.findMany({
      where: { endDate: null },
      take: rotationMaxPerRun,
    });

    if (indefiniteAssignments.length === 0) {
      console.warn("--- Shift rotation finished: nothing to rotate ---");
      return 0;
    }

    const patternIds = Array.from(new Set(indefiniteAssignments.map((a) => a.shiftPatternId)));
    const patterns = await prisma.shiftPattern.findMany({
      where: { id: { in: patternIds } },
      select: { id: true, cycleLengthDays: true },
    });
    const patternsMap = new Map<string, { id: string; cycleLengthDays: number }>(
      patterns.map((p) => [p.id, p]),
    );

    let rotatedCount = 0;
    let errorCount = 0;

    for (const ass of indefiniteAssignments) {
      try {
        const pattern = patternsMap.get(ass.shiftPatternId);
        if (!pattern || pattern.cycleLengthDays <= 0) continue;

        const startDate = parseDateOnlyUTC(ass.startDate);
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < pattern.cycleLengthDays) continue;

        const cyclesCompleted = Math.floor(diffDays / pattern.cycleLengthDays);
        const totalDaysToClose = cyclesCompleted * pattern.cycleLengthDays;

        const endDateDate = new Date(startDate.getTime());
        endDateDate.setUTCDate(endDateDate.getUTCDate() + totalDaysToClose - 1);
        const newEndDateStr = formatDateUTCISO(endDateDate);

        const nextStartDateDate = new Date(endDateDate.getTime());
        nextStartDateDate.setUTCDate(nextStartDateDate.getUTCDate() + 1);
        const nextStartDateStr = formatDateUTCISO(nextStartDateDate);

        let rotated = false;

        for (let attempt = 0; attempt <= rotationRetryCount; attempt++) {
          try {
            // Avoid interactive transactions under PgBouncer pressure:
            // close current row atomically and create the successor row.
            const updated = await prisma.assignedShift.updateMany({
              where: { id: ass.id, endDate: null },
              data: { endDate: newEndDateStr },
            });
            if (updated.count === 0) {
              rotated = false;
              break;
            }

            await prisma.assignedShift.create({
              data: {
                id: ulid(),
                employeeId: ass.employeeId,
                shiftPatternId: ass.shiftPatternId,
                startDate: nextStartDateStr,
                endDate: null,
              },
            });

            if (auditPerItem) {
              await prisma.auditLog.create({
                data: {
                  actorUsername: "SYSTEM",
                  action: "AUTOMATIC_SHIFT_ROTATION",
                  category: "SHIFT_MGMT",
                  severity: "INFO",
                  outcome: "SUCCESS",
                  details: JSON.stringify({
                    employeeId: ass.employeeId,
                    patternId: ass.shiftPatternId,
                    closedAssignmentId: ass.id,
                    closedOn: newEndDateStr,
                    newStartDate: nextStartDateStr,
                  }),
                  ipAddress: "127.0.0.1",
                },
              });
            }
            rotated = true;
            break;
          } catch (txErr: unknown) {
            const isP2028 = toCaughtError(txErr).code === "P2028";
            if (!isP2028 || attempt === rotationRetryCount) {
              throw txErr;
            }
            await sleep(rotationRetryDelayMs * (attempt + 1));
          }
        }

        if (rotated) {
          rotatedCount++;
        }
      } catch (err) {
        console.error(`Error rotating assignment ${ass.id} for employee ${ass.employeeId}:`, err);
        errorCount++;
      }
    }

    if (rotatedCount > 0 || errorCount > 0) {
      console.warn(
        `--- Shift rotation finished: ${rotatedCount} rotated, ${errorCount} errors ---`,
      );
      if (!auditPerItem) {
        await prisma.auditLog.create({
          data: {
            actorUsername: "SYSTEM",
            action: "SHIFT_ROTATION_SUMMARY",
            category: "SHIFT_MGMT",
            severity: errorCount > 0 ? "WARNING" : "INFO",
            outcome: errorCount > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
            details: JSON.stringify({
              rotatedCount,
              errorCount,
              scanned: indefiniteAssignments.length,
              maxPerRun: rotationMaxPerRun,
            }),
            ipAddress: "127.0.0.1",
          },
        });
      }
    } else {
      console.warn("--- Shift rotation finished: nothing to rotate ---");
    }

    return rotatedCount;
  } catch (error) {
    console.error("Critical error during shift rotation:", error);
    throw error;
  }
};
