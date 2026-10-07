import { processAutoClosures } from "./autoCloseService";
import { rotateIndefiniteShifts } from "./shiftRotationService";
import { initializeScheduler, stopScheduler } from "./schedulerService";
import { maintenanceService } from "./maintenanceService";
import { backupService } from "./backupService";
import { backupHealthService } from "./backupHealthService";

import { seedingJobService } from "./seedingJobService";
import { LockService } from "./lockService";
import { prisma } from "./db";
import * as Sentry from "@sentry/node";
import { logger } from "../utils/logger";
import { requestContext } from "../utils/context";
import { jobTelemetryService } from "./jobTelemetryService";

import { createRuntimeLifecycle } from "../modules/runtime";
// Job Lock Configuration
const JOB_LOCK_AUTO_CLOSURES = "job:processAutoClosures";
const JOB_LOCK_ROTATE_SHIFTS = "job:rotateIndefiniteShifts";
const JOB_LOCK_DAILY_MAINTENANCE = "job:dailyMaintenance";
const JOB_LOCK_BACKUP_DATABASE = "job:backupDatabase";

const TTL_10_MIN = 10 * 60 * 1000;
const TTL_60_MIN = 60 * 60 * 1000;
const TTL_120_MIN = 120 * 60 * 1000;

// Configuration

const backupEnabled = process.env.BACKUP_ENABLED === "true";
const backupScheduleHour = Number.parseInt(process.env.BACKUP_SCHEDULE_HOUR ?? "", 10);
const backupScheduleMinute = Number.parseInt(process.env.BACKUP_SCHEDULE_MINUTE ?? "", 10);
const dailyHour = Number.isFinite(backupScheduleHour)
  ? Math.min(Math.max(backupScheduleHour, 0), 23)
  : 2;
const dailyMinute = Number.isFinite(backupScheduleMinute)
  ? Math.min(Math.max(backupScheduleMinute, 0), 59)
  : 0;

export function createRuntimeJobs() {
  const lifecycle = createRuntimeLifecycle({
    after: (ms, task) => {
      const id = setTimeout(task, ms);
      return () => clearTimeout(id);
    },
    every: (ms, task) => {
      const id = setInterval(task, ms);
      return () => clearInterval(id);
    },
    reportError: (error) => logger.error("Runtime job failed", error),
  });
  let starting: Promise<void> | undefined;
  let startupError: unknown;
  const start = () =>
    (starting ??= lifecycle
      .run(async () => {
        try {
          await maintenanceService.ensureInstanceId();
          const config = await prisma.systemConfig.findUnique({ where: { key: "db_instance_id" } });
          const instanceId: unknown = config ? JSON.parse(config.value) : undefined;
          if (typeof instanceId !== "string" || !instanceId)
            throw new Error("Invalid database instance ID");

          // Wrapper para ejecutar tareas con bloqueo distribuido
          const runLockedTask = async (
            key: string,
            ttlMs: number,
            taskName: string,
            task: () => Promise<unknown>,
          ) => {
            return requestContext.run({ username: "SYSTEM" }, async () => {
              const result = await LockService.withLock(key, ttlMs, instanceId, async () => {
                const start = Date.now();
                try {
                  logger.logTask("TASK_START", taskName, `[TASK_START] ${taskName}`);
                  const taskResult = await task();
                  const durationMs = Date.now() - start;
                  logger.logTask("TASK_END", taskName, `[TASK_END] ${taskName}`, { durationMs });
                  jobTelemetryService.recordRun(taskName, "SUCCESS", durationMs);
                  return taskResult;
                } catch (err) {
                  const durationMs = Date.now() - start;
                  logger.logTask("TASK_ERROR", taskName, `[TASK_ERROR] ${taskName}`, {
                    durationMs,
                    error: err,
                  });
                  jobTelemetryService.recordRun(taskName, "ERROR", durationMs, err);
                  throw err;
                }
              });

              if (result.ran === false) {
                logger.logTask(
                  "TASK_SKIP",
                  taskName,
                  `[TASK_SKIP] ${taskName}: Lock denied (LOCKED)`,
                  {
                    key,
                    instanceId,
                  },
                );
                jobTelemetryService.recordRun(taskName, "SKIPPED", 0);
              }
              return result;
            });
          };

          // Wrapper legacy (sin lock) para tareas internas o que no requieren coordinacion multi-instancia
          const runTask = async (name: string, task: () => Promise<unknown>) => {
            const start = Date.now();
            try {
              logger.logTask("TASK_START", name, `[TASK_START] ${name}`);
              await task();
              const durationMs = Date.now() - start;
              logger.logTask("TASK_END", name, `[TASK_END] ${name}`, { durationMs });
              jobTelemetryService.recordRun(name, "SUCCESS", durationMs);
            } catch (err) {
              const durationMs = Date.now() - start;
              logger.logTask("TASK_ERROR", name, `[TASK_ERROR] ${name}`, {
                durationMs,
                error: err,
              });
              jobTelemetryService.recordRun(name, "ERROR", durationMs, err);
            }
          };

          const runDailyMaintenance = async () => {
            await runLockedTask(
              JOB_LOCK_DAILY_MAINTENANCE,
              TTL_60_MIN,
              "dailyMaintenance",
              async () => {
                if (backupEnabled) {
                  const taskName = "backupDatabase";
                  // Lock secundario especifico para el backup (opcional segun alcance pero recomendado)
                  await runLockedTask(JOB_LOCK_BACKUP_DATABASE, TTL_120_MIN, taskName, async () => {
                    const MAX_RETRIES = 3;
                    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                      try {
                        await backupService.backupDatabase();
                        backupHealthService.recordSuccess();
                        break; // Exit loop on success
                      } catch (error) {
                        logger.error(
                          `[TASK_ERROR] ${taskName} (Attempt ${attempt}/${MAX_RETRIES} failed):`,
                          error,
                          {
                            taskName,
                            attempt,
                          },
                        );
                        backupHealthService.recordFailure(error);

                        if (attempt === MAX_RETRIES) {
                          Sentry.captureException(error);
                          throw error; // Rethrow to let runLockedTask log it as TASK_ERROR
                        } else {
                          jobTelemetryService.recordRetry(taskName);
                          const delayMs = 5 * 60 * 1000; // 5 minutes
                          logger.warn(`Retrying backup in ${delayMs / 1000}s...`, {
                            taskName,
                            attempt,
                            delayMs,
                          });
                          if (!(await lifecycle.wait(delayMs))) return;
                        }
                      }
                    }
                  });
                }
                await runTask("rotateAuditLogs", () => maintenanceService.rotateAuditLogs());
              },
            );
          };

          const runRotateIndefiniteShiftsSafely = async (taskName: string) => {
            const phase2Running = await seedingJobService.isPhase2Running();
            if (phase2Running) {
              logger.logTask(
                "TASK_SKIP",
                taskName,
                `[TASK_SKIP] ${taskName}: Seeder Fase 2 en ejecucion.`,
              );
              jobTelemetryService.recordRun(taskName, "SKIPPED", 0);
              return;
            }
            await runLockedTask(
              JOB_LOCK_ROTATE_SHIFTS,
              TTL_10_MIN,
              taskName,
              rotateIndefiniteShifts,
            );
          };

          const runProcessAutoClosuresSafely = async (taskName: string) => {
            const phase2Running = await seedingJobService.isPhase2Running();
            if (phase2Running) {
              logger.logTask(
                "TASK_SKIP",
                taskName,
                `[TASK_SKIP] ${taskName}: Seeder Fase 2 en ejecucion.`,
              );
              jobTelemetryService.recordRun(taskName, "SKIPPED", 0);
              return;
            }
            await runLockedTask(JOB_LOCK_AUTO_CLOSURES, TTL_10_MIN, taskName, processAutoClosures);
          };

          const getDelayToNextDailyRunMs = () => {
            const now = new Date();
            const next = new Date(now);
            next.setHours(dailyHour, dailyMinute, 0, 0);
            if (next.getTime() <= now.getTime()) {
              next.setDate(next.getDate() + 1);
            }
            return next.getTime() - now.getTime();
          };

          // Tareas Recurrentes (Cada 5 minutos)
          lifecycle.every(5 * 60 * 1000, async () => {
            await runProcessAutoClosuresSafely("processAutoClosures");
            await runRotateIndefiniteShiftsSafely("rotateIndefiniteShifts");
          });

          // Tareas Diarias a hora fija
          const dailyStartupDelayMs = getDelayToNextDailyRunMs();
          lifecycle.after(dailyStartupDelayMs, async () => {
            try {
              await runDailyMaintenance();
            } finally {
              lifecycle.every(24 * 60 * 60 * 1000, runDailyMaintenance);
            }
          });
          logger.info(
            `Tareas diarias programadas a las ${String(dailyHour).padStart(2, "0")}:${String(
              dailyMinute,
            ).padStart(2, "0")} (hora local del servidor).`,
            {
              eventType: "BOOT",
              dailyHour,
              dailyMinute,
              nextRunMs: dailyStartupDelayMs,
            },
          );

          // Ejecución inicial controlada
          lifecycle.after(5000, async () => {
            await runRotateIndefiniteShiftsSafely("initial_rotation");
            await runTask("initial_logRotation", () => maintenanceService.rotateAuditLogs());

            await runProcessAutoClosuresSafely("initial_autoClosures");
            await runTask("initializeScheduler", initializeScheduler);
            await runTask("resumeSeedingPhase2Jobs", () =>
              seedingJobService.resumePendingOnStartup(),
            );
          });
        } catch (error) {
          startupError = error;
          throw error;
        }
      })
      .then(() => {
        if (startupError) throw startupError;
      }));
  return {
    start,
    stop: () =>
      lifecycle.stop(async () => {
        await stopScheduler();
        await seedingJobService.shutdown();
      }),
  };
}
