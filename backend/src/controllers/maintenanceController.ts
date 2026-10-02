import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { maintenanceService } from "../services/maintenanceService";
import { asyncHandler } from "../middleware/errorHandler";
import { runtimeControlService } from "../services/runtimeControlService";
import { systemOperationService } from "../services/systemOperationService";
import { toCaughtError } from "../utils/caughtError";

export const ensureInstanceId = async () => {
  await maintenanceService.ensureInstanceId();
};

export const clearDatabase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorUsername = req.user?.username || "ADMIN";
  systemOperationService.start({
    type: "reset",
    actorUsername,
    maintenanceMode: true,
    message: "Reset critico de base de datos en curso",
  });

  // Modo Streaming para feedback en tiempo real
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Transfer-Encoding", "chunked");
  // Deshabilitar compresión para evitar buffering
  res.setHeader("X-No-Compression", "true");
  res.flushHeaders();

  const sendProgress = (message: string) => {
    res.write(JSON.stringify({ progress: message }) + "\n");
  };

  try {
    const result = await maintenanceService.clearDatabase({
      onProgress: sendProgress,
      currentUser: req.user ? { id: req.user.id, username: req.user.username } : undefined,
    });

    res.write(JSON.stringify(result) + "\n");
    res.end();
    runtimeControlService.scheduleRestart("database reset completed");
  } catch (error: unknown) {
    const caught = toCaughtError(error);
    res.write(
      JSON.stringify({
        error:
          caught.message === "PROCESS_TIMEOUT"
            ? "Proceso de limpieza abortado por inactividad prolongada en la DB."
            : `Error crítico al limpiar DB: ${caught.message || "Error desconocido"}`,
      }) + "\n",
    );
    res.end();
  } finally {
    systemOperationService.finish();
  }
});
