import { Request, Response } from "express";
import { processAutoClosures, getAutoCloseDiagnosis } from "../services/autoCloseService";
import { auditService } from "../services/auditService";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/authMiddleware";
import { backupService } from "../services/backupService";
import { integrityStatusService } from "../services/integrityStatusService";
import { backupHealthService } from "../services/backupHealthService";
import { AdminService } from "../services/AdminService";
import { userService } from "../services/UserService";
import { AuthService } from "../services/AuthService";
import { closureValidationService } from "../services/closureValidationService";
import { systemOperationService } from "../services/systemOperationService";
import { runtimeControlService } from "../services/runtimeControlService";
import { NotFoundError, ValidationError } from "../utils/AppError";
import { toCaughtError } from "../utils/caughtError";

/**
 * AdminController: High-privilege administrative tools
 */

export const diagnoseAutoClose = asyncHandler(async (req: Request, res: Response) => {
  const result = await getAutoCloseDiagnosis();

  res.json({
    success: true,
    data: result,
  });
});

export const triggerAutoClose = asyncHandler(async (req: AuthRequest, res: Response) => {
  const closedCount = await processAutoClosures();

  await auditService.log({
    actorUsername: req.user?.username || "ADMIN",
    action: "TRIGGER_AUTOCLOSE_MANUAL",
    category: "CTRL_HOURS",
    severity: "WARNING",
    details: { closedCount },
  });

  res.json({
    success: true,
    data: {
      message: `${closedCount} registros cerrados automáticamente.`,
      closedCount,
    },
  });
});

export const triggerAccountingAutoClosure = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const actorUsername = req.user?.username || "ADMIN";
    const result = await closureValidationService.triggerAccountingAutoClosureNow(actorUsername);

    await auditService.log({
      actorUsername,
      action: "TRIGGER_ACCOUNTING_AUTOCLOSE_MANUAL",
      category: "CTRL_HOURS",
      severity: "WARNING",
      details: result,
    });

    res.json({
      success: true,
      data: {
        message: result.applied
          ? `Cierre contable automático aplicado hasta ${result.closureCandidate}.`
          : `Sin cambios. El cierre actual (${result.currentLockDate || "N/A"}) ya cubre el objetivo automático (${result.closureCandidate}).`,
        ...result,
      },
    });
  },
);

export const resetUserPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username, newPassword } = req.body;

  if (!username || !newPassword) {
    throw new ValidationError("Username y nueva contraseña requeridos");
  }

  const actorUsername = req.user?.username || "ADMIN";
  await userService.forceResetPassword(username, newPassword, actorUsername);

  res.json({
    success: true,
    data: {
      message: `Contraseña de usuario ${username} actualizada exitosamente.`,
    },
  });
});

export const getSystemStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await AdminService.getSystemStats();

  res.json({
    success: true,
    data: stats,
  });
});

export const getSecurityInsights = asyncHandler(async (req: Request, res: Response) => {
  const insights = await AdminService.getSecurityInsights();

  res.json({
    success: true,
    data: insights,
  });
});

export const triggerBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const actorUsername = req.user?.username || "ADMIN";
  systemOperationService.start({
    type: "backup",
    actorUsername,
    maintenanceMode: false,
    message: "Backup manual en curso",
  });

  try {
    const backupPath = await backupService.backupDatabase();
    backupHealthService.recordSuccess();

    await auditService.log({
      actorUsername,
      action: "TRIGGER_BACKUP_MANUAL",
      category: "OPERATIONS",
      severity: "WARNING",
      details: { backupPath },
    });

    res.json({
      success: true,
      data: {
        message: "Backup ejecutado exitosamente.",
        backupPath,
      },
    });
  } finally {
    systemOperationService.finish();
  }
});

export const getBackups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const backups = backupHealthService.getBackups();
  res.json({
    success: true,
    data: backups,
  });
});

export const restoreBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filename } = req.body;
  if (!filename) {
    res.status(400);
    throw new Error("Filename is required");
  }

  const actorUsername = req.user?.username || "ADMIN";
  systemOperationService.start({
    type: "restore",
    actorUsername,
    maintenanceMode: true,
    message: `Restauracion critica en curso desde ${filename}`,
  });

  try {
    await backupService.restoreDatabase(filename);
    const invalidation = await AuthService.invalidateAllSessions({
      actorUsername,
      reason: "DATABASE_RESTORE",
      restartRecommended: true,
    });

    await auditService.log({
      actorUsername,
      action: "RESTORE_BACKUP",
      category: "CRITICAL",
      severity: "CRITICAL",
      details: { filename, invalidatedSessions: invalidation.deletedCount },
    });

    res.json({
      success: true,
      data: {
        message:
          "Restauración completada. Se forzó cierre de sesión global y el backend se reiniciará automáticamente.",
        invalidatedSessions: invalidation.deletedCount,
      },
    });

    runtimeControlService.scheduleRestart("database restore completed");
  } finally {
    systemOperationService.finish();
  }
});

export const restartBackend = asyncHandler(async (req: AuthRequest, res: Response) => {
  await auditService.log({
    actorUsername: req.user?.username || "ADMIN",
    action: "RESTART_BACKEND",
    category: "CRITICAL",
    severity: "CRITICAL",
    details: { reason: "User requested restart" },
  });

  res.json({
    success: true,
    data: {
      message: "Reiniciando servidor backend...",
    },
  });

  runtimeControlService.scheduleRestart("manual admin request");
});

export const purgeSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username } = req.body as { username?: string };
  const currentUserId = req.user?.id;
  const actorUsername = req.user?.username || "ADMIN";

  try {
    const { deletedCount, target } = await AuthService.purgeSessions({
      username,
      currentUserId,
      actorUsername,
    });

    res.json({
      success: true,
      data: {
        message: `Sesiones purgadas: ${deletedCount}`,
        deletedCount,
        target,
      },
    });
  } catch (error: unknown) {
    const caught = toCaughtError(error);
    if (caught.message === "USER_NOT_FOUND") {
      throw new NotFoundError("Usuario objetivo no encontrado.");
    }
    throw error;
  }
});

export const getIntegrityStatus = asyncHandler(async (_req: Request, res: Response) => {
  const snapshot = integrityStatusService.getSnapshot();

  res.json({
    success: true,
    data: snapshot,
  });
});
