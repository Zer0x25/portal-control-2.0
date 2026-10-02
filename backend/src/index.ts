import dotenv from "dotenv";
dotenv.config();
import http from "http";
import app from "./app";
import { SocketService } from "./services/socketService";
import { processAutoClosures } from "./services/autoCloseService";
import { rotateIndefiniteShifts } from "./services/shiftRotationService";
import { initializeScheduler } from "./services/schedulerService";
import { maintenanceService } from "./services/maintenanceService";
import { backupService } from "./services/backupService";
import { backupHealthService } from "./services/backupHealthService";
import { ensureInstanceId } from "./controllers/maintenanceController";
import { seedingJobService } from "./services/seedingJobService";
import { LockService } from "./services/lockService";
import { prisma } from "./services/db";
import * as Sentry from "@sentry/node";
import { logger } from "./utils/logger";
import { requestContext } from "./utils/context";
import { jobTelemetryService } from "./services/jobTelemetryService";

// Job Lock Configuration
const JOB_LOCK_AUTO_CLOSURES = "job:processAutoClosures";
const JOB_LOCK_ROTATE_SHIFTS = "job:rotateIndefiniteShifts";
const JOB_LOCK_DAILY_MAINTENANCE = "job:dailyMaintenance";
const JOB_LOCK_BACKUP_DATABASE = "job:backupDatabase";

const TTL_10_MIN = 10 * 60 * 1000;
const TTL_60_MIN = 60 * 60 * 1000;
const TTL_120_MIN = 120 * 60 * 1000;

// Configuration
const PORT = process.env.PORT || 4000;
const backupEnabled = process.env.BACKUP_ENABLED === "true";
const backupScheduleHour = Number.parseInt(process.env.BACKUP_SCHEDULE_HOUR ?? "", 10);
const backupScheduleMinute = Number.parseInt(process.env.BACKUP_SCHEDULE_MINUTE ?? "", 10);
const dailyHour = Number.isFinite(backupScheduleHour)
  ? Math.min(Math.max(backupScheduleHour, 0), 23)
  : 2;
const dailyMinute = Number.isFinite(backupScheduleMinute)
  ? Math.min(Math.max(backupScheduleMinute, 0), 59)
  : 0;

const httpServer = http.createServer(app);
SocketService.initialize(httpServer);

const server = httpServer.listen(Number(PORT), "0.0.0.0", () => {
  logger.info(`🚀 Servidor backend corriendo en http://localhost:${PORT}`, {
    eventType: "BOOT",
    port: PORT,
  });
  logger.info(
    backupEnabled
      ? "Backups diarios automaticos habilitados."
      : "Backups automaticos deshabilitados (BACKUP_ENABLED != true).",
    { eventType: "BOOT", backupEnabled },
  );

  let instanceId = "unknown";

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
        logger.logTask("TASK_SKIP", taskName, `[TASK_SKIP] ${taskName}: Lock denied (LOCKED)`, {
          key,
          instanceId,
        });
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
    await runLockedTask(JOB_LOCK_DAILY_MAINTENANCE, TTL_60_MIN, "dailyMaintenance", async () => {
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
                await new Promise((res) => setTimeout(res, delayMs));
              }
            }
          }
        });
      }
      await runTask("rotateAuditLogs", () => maintenanceService.rotateAuditLogs());
    });
  };

  const runRotateIndefiniteShiftsSafely = async (taskName: string) => {
    const phase2Running = await seedingJobService.isPhase2Running();
    if (phase2Running) {
      logger.logTask("TASK_SKIP", taskName, `[TASK_SKIP] ${taskName}: Seeder Fase 2 en ejecucion.`);
      jobTelemetryService.recordRun(taskName, "SKIPPED", 0);
      return;
    }
    await runLockedTask(JOB_LOCK_ROTATE_SHIFTS, TTL_10_MIN, taskName, rotateIndefiniteShifts);
  };

  const runProcessAutoClosuresSafely = async (taskName: string) => {
    const phase2Running = await seedingJobService.isPhase2Running();
    if (phase2Running) {
      logger.logTask("TASK_SKIP", taskName, `[TASK_SKIP] ${taskName}: Seeder Fase 2 en ejecucion.`);
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
  const taskInterval = setInterval(
    async () => {
      await runProcessAutoClosuresSafely("processAutoClosures");
      await runRotateIndefiniteShiftsSafely("rotateIndefiniteShifts");
    },
    5 * 60 * 1000,
  );

  // Tareas Diarias a hora fija
  let dailyInterval: NodeJS.Timeout | null = null;
  const dailyStartupDelayMs = getDelayToNextDailyRunMs();
  const dailyFirstTimeout = setTimeout(async () => {
    await runDailyMaintenance();
    dailyInterval = setInterval(runDailyMaintenance, 24 * 60 * 60 * 1000);
  }, dailyStartupDelayMs);
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
  setTimeout(async () => {
    await runRotateIndefiniteShiftsSafely("initial_rotation");
    await runTask("initial_logRotation", () => maintenanceService.rotateAuditLogs());

    await runTask("initializeScheduler", initializeScheduler);
    await runTask("resumeSeedingPhase2Jobs", () => seedingJobService.resumePendingOnStartup());

    logger.info("Verificando huella de instancia de base de datos...", {
      eventType: "BOOT",
    });
    await ensureInstanceId();

    // Capturar instanceId estable de la base de datos
    const config = await prisma.systemConfig.findUnique({ where: { key: "db_instance_id" } });
    if (config) {
      instanceId = JSON.parse(config.value);
      logger.info(`InstanceID capturado para locks: ${instanceId}`, {
        eventType: "BOOT",
        instanceId,
      });
    }
  }, 5000);

  // Graceful Shutdown
  process.on("SIGTERM", () => {
    logger.warn("SIGTERM recibido. Cerrando servidor...", { eventType: "SHUTDOWN" });
    clearInterval(taskInterval);
    clearTimeout(dailyFirstTimeout);
    if (dailyInterval) clearInterval(dailyInterval);
    server.close(() => {
      logger.warn("Servidor cerrado.", { eventType: "SHUTDOWN" });
      process.exit(0);
    });
  });
});
