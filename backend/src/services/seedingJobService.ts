import { workCoordinator } from "./workCoordinator";
import { Prisma } from "../generated/prisma/client";
import prisma from "./db";
import { requestContext } from "../utils/context";
import { seedingEngine as seedingService } from "./seeder/SeederEngine";
import { SocketService } from "./socketService";
import { logger } from "../utils/logger";
import { toCaughtError } from "../utils/caughtError";

type Phase2Config = {
  days: number;
  leaveRatio: number;
  correctionRequestRatio: number;
  batchSize: number;
};

type Progress = {
  currentDay: number;
  totalDays: number;
  processedRecords: number;
  sealedRecords: number;
  errors: number;
};

/**
 * `SeedingJob.config` / `SeedingJob.progress` are Prisma `Json` columns. `Prisma.InputJsonValue`
 * accepts plain JSON-compatible objects, so these locals need no `as any` cast to be persisted.
 */
const toJsonColumn = <T extends object>(value: T): Prisma.InputJsonValue => value;

/**
 * Reads a Prisma `Json` column back as a concrete shape. The `Json` column is untyped at the
 * Prisma level, so this is a deliberate narrowing cast rather than an `any` bypass.
 */
const fromJsonColumn = <T extends object>(value: Prisma.JsonValue): T => value as T;

let shuttingDown = false;
const workers = new Map<string, Promise<void>>();
const operations = new Set<Promise<unknown>>();
function trackOperation<T>(promise: Promise<T>): Promise<T> {
  operations.add(promise);
  void promise.then(
    () => operations.delete(promise),
    () => operations.delete(promise),
  );
  return promise;
}
const RUNNING = new Map<string, boolean>();
const JOB_TYPE = "MARKINGS_PHASE2";
const phase2DayTimeoutMs = Math.max(
  Number.parseInt(process.env.SEED_PHASE2_DAY_TIMEOUT_MS ?? "180000", 10) || 180000,
  30000,
);
const phase2ParallelDays = Math.min(
  Math.max(Number.parseInt(process.env.SEED_PHASE2_PARALLEL_DAYS ?? "25", 10) || 25, 1),
  60,
);

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const seedingJobService = {
  async isPhase2Running() {
    const running = await prisma.seedingJob.findFirst({
      where: { type: JOB_TYPE, status: "running" },
      select: { id: true },
    });
    return Boolean(running);
  },

  async getActiveJob() {
    return prisma.seedingJob.findFirst({
      where: { type: JOB_TYPE, status: { in: ["pending", "running", "paused"] } },
      orderBy: { createdAt: "desc" },
    });
  },

  async startPhase2(createdBy: string, config: Partial<Phase2Config>) {
    const active = await this.getActiveJob();
    if (
      active &&
      active.status !== "stopped" &&
      active.status !== "failed" &&
      active.status !== "completed"
    ) {
      return active;
    }

    const fullConfig: Phase2Config = {
      days: Math.max(1, Number(config.days ?? 3)),
      leaveRatio: Math.max(0, Number(config.leaveRatio ?? 5)),
      correctionRequestRatio: Math.max(0, Number(config.correctionRequestRatio ?? 2)),
      batchSize: Math.max(50, Number(config.batchSize ?? 250)),
    };
    const progress: Progress = {
      currentDay: 0,
      totalDays: fullConfig.days,
      processedRecords: 0,
      sealedRecords: 0,
      errors: 0,
    };

    const job = await prisma.seedingJob.create({
      data: {
        type: JOB_TYPE,
        status: "pending",
        config: toJsonColumn(fullConfig),
        progress: toJsonColumn(progress),
        createdBy,
      },
    });

    await this.log(job.id, `Job fase 2 creado por ${createdBy}.`, "INFO");
    void this.run(job.id);
    return job;
  },

  async createStoppedJob(createdBy: string, config: Partial<Phase2Config>) {
    const active = await this.getActiveJob();
    if (active && ["pending", "running", "paused"].includes(active.status)) {
      return active;
    }

    const fullConfig: Phase2Config = {
      days: Math.max(1, Number(config.days ?? 3)),
      leaveRatio: Math.max(0, Number(config.leaveRatio ?? 5)),
      correctionRequestRatio: Math.max(0, Number(config.correctionRequestRatio ?? 2)),
      batchSize: Math.max(50, Number(config.batchSize ?? 250)),
    };

    const progress: Progress = {
      currentDay: 0,
      totalDays: fullConfig.days,
      processedRecords: 0,
      sealedRecords: 0,
      errors: 0,
    };

    const job = await prisma.seedingJob.create({
      data: {
        type: JOB_TYPE,
        status: "stopped",
        config: toJsonColumn(fullConfig),
        progress: toJsonColumn(progress),
        createdBy,
      },
    });

    await this.log(job.id, `Job fase 2 pre-creado (detenido) por ${createdBy}.`, "INFO");
    return job;
  },

  async pause(jobId: string) {
    const job = await prisma.seedingJob.update({
      where: { id: jobId },
      data: { status: "paused" },
    });
    RUNNING.set(jobId, false);
    await this.log(jobId, "Fase 2 pausada por operador.", "WARNING");
    SocketService.emit("seeder:phase2_paused", { jobId });
    return job;
  },

  async resume(jobId: string) {
    const job = await prisma.seedingJob.update({
      where: { id: jobId },
      data: { status: "pending" },
    });
    await this.log(jobId, "Fase 2 (re)iniciada por operador.", "INFO");
    SocketService.emit("seeder:phase2_resumed", { jobId });
    void this.run(jobId);
    return job;
  },

  async stop(jobId: string) {
    RUNNING.set(jobId, false);
    const job = await prisma.seedingJob.update({
      where: { id: jobId },
      data: { status: "stopped", finishedAt: new Date() },
    });
    await this.log(jobId, "Fase 2 detenida por operador.", "WARNING");
    SocketService.emit("seeder:phase2_stopped", { jobId });
    return job;
  },

  async status(jobId?: string) {
    const where: Prisma.SeedingJobWhereInput = jobId ? { id: jobId } : { type: JOB_TYPE };
    const job = await prisma.seedingJob.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });
    return job;
  },

  async logs(jobId: string, limit: number = 100) {
    return prisma.seedingJobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(limit, 1000)),
    });
  },

  async resumePendingOnStartup() {
    const jobs = await prisma.seedingJob.findMany({
      where: { type: JOB_TYPE, status: { in: ["pending", "running"] } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    for (const j of jobs) void this.run(j.id);
  },

  async shutdown() {
    shuttingDown = true;
    await Promise.all(workers.values());
    await Promise.allSettled(operations);
  },

  openRuntime() {
    shuttingDown = false;
  },

  run(jobId: string): Promise<void> {
    if (shuttingDown) return Promise.resolve();
    const current = workers.get(jobId);
    if (current) return current;
    const pending = workCoordinator
      .run(
        `seed-job:${jobId}`,
        async () => {
          const result = await workCoordinator.exclusive(`seed-job:${jobId}`, () =>
            this.runWorker(jobId),
          );
          if (!result.ran) return;
        },
        true,
      )
      .catch((error) => {
        logger.error("Seeding worker failed", error, { jobId });
      })
      .finally(() => {
        workers.delete(jobId);
        RUNNING.delete(jobId);
      });
    workers.set(jobId, pending);
    return pending;
  },

  async runWorker(jobId: string) {
    if (RUNNING.get(jobId)) return;
    RUNNING.set(jobId, true);

    const job = await prisma.seedingJob.findUnique({ where: { id: jobId } });
    if (!job) return;
    const config = fromJsonColumn<Phase2Config>(job.config);
    let progress = fromJsonColumn<Progress>(job.progress);
    await prisma.seedingJob.update({
      where: { id: jobId },
      data: { status: "running", startedAt: job.startedAt ?? new Date() },
    });
    SocketService.emit("seeder:phase2_started", { jobId });

    try {
      const runStartedAt = Date.now();
      await requestContext.run(
        { ...requestContext.getStore(), username: "SYSTEM_SEEDER", skipTrigger: true },
        async () => {
          // Optimization: Pre-load context once per job
          const preloadStartedAt = Date.now();
          const context = await seedingService.preloadSeedingContext();
          await this.log(
            jobId,
            `Contexto de seeding cargado en ${Date.now() - preloadStartedAt}ms.`,
            "INFO",
          );

          const PARALLEL_DAYS = phase2ParallelDays;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (
            let chunkStart = progress.currentDay;
            chunkStart < config.days;
            chunkStart += PARALLEL_DAYS
          ) {
            if (shuttingDown) return;
            const fresh = await prisma.seedingJob.findUnique({ where: { id: jobId } });
            if (!fresh || fresh.status === "paused" || fresh.status === "stopped") break;

            const chunkEnd = Math.min(chunkStart + PARALLEL_DAYS, config.days);
            const dayPromises = [];

            // 1. Parallel Creation for the whole chunk
            for (let day = chunkStart; day < chunkEnd; day++) {
              const date = new Date(today.getTime() - (config.days - 1 - day) * 86400000);
              dayPromises.push(
                (async () => {
                  try {
                    const createdCount = await withTimeout(
                      trackOperation(
                        workCoordinator.run("seed-day", () =>
                          seedingService.seedHistoryForDate(
                            date,
                            ((config.leaveRatio || 0) / 100) * 0.4,
                            undefined,
                            context,
                          ),
                        ),
                      ),
                      phase2DayTimeoutMs,
                      `Timeout generando marcaciones del dia ${day + 1} (${phase2DayTimeoutMs}ms).`,
                    );
                    return { day, date, createdCount, error: null };
                  } catch (err: unknown) {
                    const caught = toCaughtError(err);
                    return { day, date, createdCount: 0, error: caught.message || "Unknown" };
                  }
                })(),
              );
            }

            const chunkStartedAt = Date.now();
            const results = await Promise.all(dayPromises);

            // Update Progress for each day in the chunk
            for (const res of results) {
              const { day, createdCount, error } = res;

              if (error) {
                progress.errors += 1;
                await this.log(jobId, `Error en dia ${day + 1}: ${error}`, "ERROR");
                continue;
              }

              progress.currentDay = day + 1;
              progress.processedRecords += createdCount;

              await prisma.seedingJob.update({
                where: { id: jobId },
                data: { progress: toJsonColumn(progress), updatedAt: new Date() },
              });

              await this.log(jobId, `Dia ${day + 1} listo. creados=${createdCount}`, "INFO", {
                dayCompleted: day + 1,
                totalDays: config.days,
                created: createdCount,
              });

              SocketService.emit("seeder:phase2_progress", {
                jobId,
                dayCompleted: day + 1,
                totalDays: config.days,
                progress,
              });
            }
            await this.log(
              jobId,
              `Chunk ${chunkStart + 1}-${chunkEnd} completado en ${Date.now() - chunkStartedAt}ms.`,
              "INFO",
            );
          }
        },
      );

      if (shuttingDown) return;
      const final = await prisma.seedingJob.findUnique({ where: { id: jobId } });
      if (final?.status === "paused" || final?.status === "stopped") {
        RUNNING.set(jobId, false);
        return;
      }

      // Post-Phase 2: generate correction requests now that time records exist
      try {
        const corrStartedAt = Date.now();
        const corrProb = (config.correctionRequestRatio || 2) / 100;
        await this.log(jobId, "Generando solicitudes de corrección...", "INFO");
        await seedingService.seedCorrectionRequests(
          config.days,
          corrProb,
          async (msg: string) => {
            await this.log(jobId, msg, "INFO");
          },
          () => {},
        );
        await this.log(
          jobId,
          `Generación de correcciones completada en ${Date.now() - corrStartedAt}ms.`,
          "INFO",
        );
      } catch (corrErr: unknown) {
        const errMsg = corrErr instanceof Error ? corrErr.message : "Unknown error";
        await this.log(jobId, `Error generando correcciones: ${errMsg}`, "WARNING");
      }

      // Final High-Performance Backfill:
      // Re-seal ALL seeded records using Bulk SQL to ensure chain continuity.
      try {
        const backfillStartedAt = Date.now();
        await this.log(jobId, "Iniciando backfill bulk de integridad (Bulk SQL)...", "INFO");

        const processed = await seedingService.backfillTimeRecordIntegrity(
          async (msg) => {
            await this.log(jobId, msg, "INFO");
          },
          () => {
            // Heartbeat potentially for the job manager
          },
        );

        progress.sealedRecords = processed;
        await prisma.seedingJob.update({
          where: { id: jobId },
          data: { progress: toJsonColumn(progress), updatedAt: new Date() },
        });

        await this.log(
          jobId,
          `Backfill bulk completado. Registros sellados: ${processed}. Tiempo=${Date.now() - backfillStartedAt}ms.`,
          "INFO",
        );
      } catch (backfillErr: unknown) {
        const errMsg = backfillErr instanceof Error ? backfillErr.message : "Unknown error";
        await this.log(jobId, `Error en backfill bulk de integridad: ${errMsg}`, "WARNING");
      }

      await prisma.seedingJob.update({
        where: { id: jobId },
        data: { status: "completed", finishedAt: new Date(), progress: toJsonColumn(progress) },
      });
      await this.log(
        jobId,
        `Fase 2 completada. Tiempo total=${Date.now() - runStartedAt}ms.`,
        "INFO",
      );
      SocketService.emit("seeder:phase2_completed", { jobId, progress });
    } catch (err: unknown) {
      const caught = toCaughtError(err);
      const errorMessage = caught.message ?? "Unknown error";
      await prisma.seedingJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errorSummary: errorMessage,
        },
      });
      await this.log(jobId, `Fase 2 fallo: ${errorMessage}`, "ERROR");
      SocketService.emit("seeder:phase2_failed", { jobId, error: errorMessage });
    } finally {
      RUNNING.set(jobId, false);
    }
  },

  async log(
    jobId: string,
    message: string,
    level: string = "INFO",
    payload?: Record<string, unknown>,
  ) {
    await prisma.seedingJobLog.create({
      data: {
        jobId,
        level,
        message,
        payload: toJsonColumn(payload),
      },
    });
  },
};
