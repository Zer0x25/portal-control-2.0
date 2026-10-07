import { createMaintenanceFlows } from "../modules/maintenance";
import { maintenanceService } from "./maintenanceService";
import { systemOperationService } from "./systemOperationService";
import { runtimeControlService } from "./runtimeControlService";
import { seedingJobService } from "./seedingJobService";
import { seedingEngine } from "./seeder/SeederEngine";
import { Watchdog } from "../utils/Watchdog";
import { requestContext } from "../utils/context";
import { logger } from "../utils/logger";
export const maintenanceFlows = createMaintenanceFlows({
  operations: {
    start: (input) => systemOperationService.start(input),
    finish: () => systemOperationService.finish(),
  },
  clear: async (input) => {
    await seedingJobService.shutdown();
    try {
      return await maintenanceService.clearDatabase(input);
    } finally {
      seedingJobService.openRuntime();
    }
  },
  restart: (reason) => runtimeControlService.scheduleRestart(reason),
  watchdog: (onTimeout) => new Watchdog("SeederPhase1", 60000, onTimeout),
  seedScope: (run) => requestContext.run({ username: "SYSTEM_SEEDER", skipTrigger: true }, run),
  seedPhase1: (options, progress, heartbeat) =>
    seedingEngine.runSeedPhase1(options, progress, heartbeat),
  createStoppedJob: (actor, options) => seedingJobService.createStoppedJob(actor, options),
  reportJobError: (error) => logger.error("No se pudo pre-crear job de fase 2", error),
  startJob: (actor, options) => seedingJobService.startPhase2(actor, options),
  pauseJob: (id) => seedingJobService.pause(id),
  resumeJob: (id) => seedingJobService.resume(id),
  stopJob: (id) => seedingJobService.stop(id),
  status: (id) => seedingJobService.status(id),
  logs: (id, limit) => seedingJobService.logs(id, limit),
});
