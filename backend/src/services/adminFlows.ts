import { createAdminFlows } from "../modules/admin";
import { processAutoClosures, getAutoCloseDiagnosis } from "./autoCloseService";
import { auditService } from "./auditService";
import { backupService } from "./backupService";
import { integrityStatusService } from "./integrityStatusService";
import { backupHealthService } from "./backupHealthService";
import { AdminService } from "./AdminService";
import { userService } from "./UserService";
import { AuthService } from "./AuthService";
import { closureValidationService } from "./closureValidationService";
import { systemOperationService } from "./systemOperationService";
import { runtimeControlService } from "./runtimeControlService";
export const adminFlows = createAdminFlows({
  stats: () => AdminService.getSystemStats(),
  diagnosis: getAutoCloseDiagnosis,
  insights: () => AdminService.getSecurityInsights(),
  snapshot: () => integrityStatusService.getSnapshot(),
  autoClose: processAutoClosures,
  accountingClose: (actor) => closureValidationService.triggerAccountingAutoClosureNow(actor),
  audit: (entry) => auditService.log(entry),
  resetPassword: (username, password, actor) =>
    userService.forceResetPassword(username, password, actor),
  purge: (input) => AuthService.purgeSessions(input),
  operations: {
    start: (input) => systemOperationService.start(input),
    finish: () => systemOperationService.finish(),
  },
  backup: () => backupService.backupDatabase(),
  backupSuccess: () => backupHealthService.recordSuccess(),
  backups: () => backupHealthService.getBackups(),
  restore: (filename) => backupService.restoreDatabase(filename),
  invalidate: (input) => AuthService.invalidateAllSessions(input),
  restart: (reason) => runtimeControlService.scheduleRestart(reason),
});
