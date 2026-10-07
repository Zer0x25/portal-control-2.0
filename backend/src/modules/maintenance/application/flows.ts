import { ValidationError } from "../../../utils/AppError";
import { toCaughtError } from "../../../utils/caughtError";
import type {
  MaintenanceActor,
  MaintenanceDependencies,
  MaintenanceOutput,
  SeedOptions,
  Phase2Options,
} from "./contracts";
export function createMaintenanceFlows(deps: MaintenanceDependencies) {
  return {
    async clear(user: MaintenanceActor | undefined, out: MaintenanceOutput) {
      deps.operations.start({
        type: "reset",
        actorUsername: user?.username || "ADMIN",
        maintenanceMode: true,
        message: "Reset critico de base de datos en curso",
      });
      out.start();
      try {
        const result = await deps.clear({
          onProgress: (message) => out.write({ progress: message }),
          currentUser: user,
        });
        out.write(result);
        out.end();
        deps.restart("database reset completed");
      } catch (error) {
        const caught = toCaughtError(error);
        out.write({
          error:
            caught.message === "PROCESS_TIMEOUT"
              ? "Proceso de limpieza abortado por inactividad prolongada en la DB."
              : "Error crítico al limpiar DB; no se confirmó el reset.",
        });
        out.end();
      } finally {
        deps.operations.finish();
      }
    },
    async seed(input: SeedOptions, user: { username?: string }, out: MaintenanceOutput) {
      const {
        employees = 0,
        days = 0,
        basePatternsCount = 3,
        leaveRatio = 5,
        correctionRequestRatio = 2,
        shiftReportsPerDay = 6,
        quickNotesCount = 5,
      } = input;
      deps.operations.start({
        type: "seed",
        actorUsername: user.username || "SYSTEM",
        maintenanceMode: true,
        message: "Seeder Fase 1 en curso",
      });
      let ended = false;
      const write = (value: unknown) => {
        if (!ended) out.write(value);
      };
      const end = () => {
        if (ended) return;
        ended = true;
        out.end();
      };
      const progress = (message: string) => write({ progress: message });
      const watchdog = deps.watchdog(() => {
        write({ error: "Respuesta cerrada por inactividad; el motor continúa hasta finalizar." });
        end();
      });
      try {
        out.start();
        watchdog.start();
        await deps.seedScope(async () => {
          progress(`Iniciando Seeder Fase 1: ${employees} empleados, ${days} días...`);
          await deps.seedPhase1(
            {
              employees,
              days,
              basePatternsCount,
              leaveRatio,
              correctionRequestRatio,
              shiftReportsPerDay,
              quickNotesCount,
            },
            progress,
            () => watchdog.heartbeat(),
          );
        });
        progress("Fase 1 completada con éxito.");
        watchdog.stop();
        try {
          await deps.createStoppedJob(user.username || "SYSTEM", {
            days,
            leaveRatio,
            correctionRequestRatio,
            batchSize: 250,
          });
        } catch (error) {
          deps.reportJobError(error);
        }
        write({ success: true, phase: "phase1" });
        end();
      } catch {
        watchdog.stop();
        write({ error: "Error crítico en fase 1; no se confirmó la finalización." });
        end();
      } finally {
        watchdog.stop();
        deps.operations.finish();
      }
    },
    async startJob(input: Phase2Options, user: { username?: string }) {
      const { days = 3, leaveRatio = 5, correctionRequestRatio = 2, batchSize = 250 } = input;
      return {
        success: true,
        job: await deps.startJob(user.username || "SYSTEM", {
          days,
          leaveRatio,
          correctionRequestRatio,
          batchSize,
        }),
      };
    },
    pauseJob: async (input: { jobId: string }) => ({
      success: true,
      job: await deps.pauseJob(input.jobId),
    }),
    resumeJob: async (input: { jobId: string }) => ({
      success: true,
      job: await deps.resumeJob(input.jobId),
    }),
    stopJob: async (input: { jobId: string }) => ({
      success: true,
      job: await deps.stopJob(input.jobId),
    }),
    status: async (query: { jobId?: string }) => ({
      success: true,
      job: await deps.status(query.jobId),
    }),
    async logs(query: { jobId?: string; limit?: string | number }) {
      if (!query.jobId) throw new ValidationError("jobId es requerido");
      return { success: true, logs: await deps.logs(query.jobId, Number(query.limit ?? 200)) };
    },
  };
}
export type MaintenanceFlows = ReturnType<typeof createMaintenanceFlows>;
