import { NotFoundError, ValidationError } from "../../../utils/AppError";
import { toCaughtError } from "../../../utils/caughtError";
import type { AdminActor, AdminDependencies, AdminRespond } from "./contracts";
export function createAdminFlows(deps: AdminDependencies) {
  const actor = (user: AdminActor) => user.username || "ADMIN";
  return {
    stats: async () => ({ success: true, data: await deps.stats() }),
    diagnosis: async () => ({ success: true, data: await deps.diagnosis() }),
    insights: async () => ({ success: true, data: await deps.insights() }),
    status: () => ({ success: true, data: deps.snapshot() }),
    backups: () => ({ success: true, data: deps.backups() }),
    async autoClose(user: AdminActor) {
      const closedCount = await deps.autoClose();
      await deps.audit({
        actorUsername: actor(user),
        action: "TRIGGER_AUTOCLOSE_MANUAL",
        category: "CTRL_HOURS",
        severity: "WARNING",
        details: { closedCount },
      });
      return {
        success: true,
        data: { message: `${closedCount} registros cerrados automáticamente.`, closedCount },
      };
    },
    async accountingClose(user: AdminActor) {
      const result = await deps.accountingClose(actor(user));
      await deps.audit({
        actorUsername: actor(user),
        action: "TRIGGER_ACCOUNTING_AUTOCLOSE_MANUAL",
        category: "CTRL_HOURS",
        severity: "WARNING",
        details: result,
      });
      return {
        success: true,
        data: {
          message: result.applied
            ? `Cierre contable automático aplicado hasta ${result.closureCandidate}.`
            : `Sin cambios. El cierre actual (${result.currentLockDate || "N/A"}) ya cubre el objetivo automático (${result.closureCandidate}).`,
          ...result,
        },
      };
    },
    async resetPassword(input: { username?: string; newPassword?: string }, user: AdminActor) {
      const { username, newPassword } = input;
      if (!username || !newPassword)
        throw new ValidationError("Username y nueva contraseña requeridos");
      await deps.resetPassword(username, newPassword, actor(user));
      return {
        success: true,
        data: { message: `Contraseña de usuario ${username} actualizada exitosamente.` },
      };
    },
    async purge(input: { username?: string }, user: AdminActor) {
      try {
        const { deletedCount, target } = await deps.purge({
          username: input.username,
          currentUserId: user.id,
          actorUsername: actor(user),
        });
        return {
          success: true,
          data: { message: `Sesiones purgadas: ${deletedCount}`, deletedCount, target },
        };
      } catch (error) {
        if (toCaughtError(error).message === "USER_NOT_FOUND")
          throw new NotFoundError("Usuario objetivo no encontrado.");
        throw error;
      }
    },
    async backup(user: AdminActor, send: AdminRespond) {
      const actorUsername = actor(user);
      deps.operations.start({
        type: "backup",
        actorUsername,
        maintenanceMode: false,
        message: "Backup manual en curso",
      });
      try {
        const backupPath = await deps.backup();
        deps.backupSuccess();
        await deps.audit({
          actorUsername,
          action: "TRIGGER_BACKUP_MANUAL",
          category: "OPERATIONS",
          severity: "WARNING",
          details: { backupPath },
        });
        send({ success: true, data: { message: "Backup ejecutado exitosamente.", backupPath } });
      } finally {
        deps.operations.finish();
      }
    },
    async restore(input: { filename: string }, user: AdminActor, send: AdminRespond) {
      if (!input.filename) throw new Error("Filename is required");
      const actorUsername = actor(user);
      deps.operations.start({
        type: "restore",
        actorUsername,
        maintenanceMode: true,
        message: `Restauracion critica en curso desde ${input.filename}`,
      });
      try {
        await deps.restore(input.filename);
        const invalidation = await deps.invalidate({
          actorUsername,
          reason: "DATABASE_RESTORE",
          restartRecommended: true,
        });
        await deps.audit({
          actorUsername,
          action: "RESTORE_BACKUP",
          category: "CRITICAL",
          severity: "CRITICAL",
          details: { filename: input.filename, invalidatedSessions: invalidation.deletedCount },
        });
        send({
          success: true,
          data: {
            message:
              "Restauración completada. Se forzó cierre de sesión global y el backend se reiniciará automáticamente.",
            invalidatedSessions: invalidation.deletedCount,
          },
        });
        deps.restart("database restore completed");
      } finally {
        deps.operations.finish();
      }
    },
    async restart(user: AdminActor, send: AdminRespond) {
      await deps.audit({
        actorUsername: actor(user),
        action: "RESTART_BACKEND",
        category: "CRITICAL",
        severity: "CRITICAL",
        details: { reason: "User requested restart" },
      });
      send({ success: true, data: { message: "Reiniciando servidor backend..." } });
      deps.restart("manual admin request");
    },
  };
}
export type AdminFlows = ReturnType<typeof createAdminFlows>;
