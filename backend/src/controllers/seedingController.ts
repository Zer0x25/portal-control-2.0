import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { Watchdog } from "../utils/Watchdog";
import { seedingEngine as seedingService } from "../services/seeder/SeederEngine";
import { requestContext } from "../utils/context";
import { seedingJobService } from "../services/seedingJobService";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationError } from "../utils/AppError";
import { toCaughtError } from "../utils/caughtError";

export const seedDatabase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    employees: numEmployees = 0,
    days: numDays = 0,
    basePatternsCount = 3,
    leaveRatio = 5,
    correctionRequestRatio = 2,
    shiftReportsPerDay = 6,
    quickNotesCount = 5,
  } = req.body;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-No-Compression", "true");
  res.flushHeaders();

  const sendProgress = (message: string) => {
    res.write(JSON.stringify({ progress: message }) + "\n");
  };

  const watchdog = new Watchdog("SeederPhase1", 60000, () => {
    res.write(JSON.stringify({ error: "Proceso abortado por inactividad prolongada." }) + "\n");
    res.end();
  });

  watchdog.start();
  const heartbeat = () => watchdog.heartbeat();

  try {
    await requestContext.run({ username: "SYSTEM_SEEDER", skipTrigger: true }, async () => {
      sendProgress(`Iniciando Seeder Fase 1: ${numEmployees} empleados, ${numDays} días...`);
      await seedingService.runSeedPhase1(
        {
          employees: numEmployees,
          days: numDays,
          basePatternsCount,
          leaveRatio,
          correctionRequestRatio,
          shiftReportsPerDay,
          quickNotesCount,
        },
        sendProgress,
        heartbeat,
      );
    });

    sendProgress("Fase 1 completada con éxito.");
    watchdog.stop();

    // Pre-crear job de fase 2 (detenido) para asegurar persistencia de parámetros
    try {
      await seedingJobService.createStoppedJob(req.user?.username || "SYSTEM", {
        days: numDays,
        leaveRatio,
        correctionRequestRatio,
        batchSize: 250,
      });
    } catch (jobErr) {
      console.error("No se pudo pre-crear job de fase 2:", jobErr);
    }

    res.write(JSON.stringify({ success: true, phase: "phase1" }) + "\n");
    res.end();
  } catch (error: unknown) {
    watchdog.stop();
    const caught = toCaughtError(error);
    res.write(JSON.stringify({ error: caught.message || "Error crítico en fase 1." }) + "\n");
    res.end();
  }
});

export const seedPhase1 = seedDatabase;

export const startSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days = 3, leaveRatio = 5, correctionRequestRatio = 2, batchSize = 250 } = req.body || {};
  const job = await seedingJobService.startPhase2(req.user?.username || "SYSTEM", {
    days,
    leaveRatio,
    correctionRequestRatio,
    batchSize,
  });
  return res.json({ success: true, job });
});

export const pauseSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.body;
  const job = await seedingJobService.pause(jobId);
  return res.json({ success: true, job });
});

export const resumeSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.body;
  const job = await seedingJobService.resume(jobId);
  return res.json({ success: true, job });
});

export const stopSeedPhase2 = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.body;
  const job = await seedingJobService.stop(jobId);
  return res.json({ success: true, job });
});

export const getSeedPhase2Status = asyncHandler(async (req: AuthRequest, res: Response) => {
  const jobId = req.query.jobId as string | undefined;
  const job = await seedingJobService.status(jobId);
  return res.json({ success: true, job });
});

export const getSeedPhase2Logs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const jobId = req.query.jobId as string | undefined;
  if (!jobId) throw new ValidationError("jobId es requerido");
  const limit = Number(req.query.limit ?? 200);
  const logs = await seedingJobService.logs(jobId, limit);
  return res.json({ success: true, logs });
});
