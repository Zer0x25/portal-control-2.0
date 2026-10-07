import { createAuditFlows } from "../modules/audit";
import { auditService } from "./auditService";
import { securityAuditService } from "./securityAuditService";
import { integrityStatusService } from "./integrityStatusService";
import { streamAuditExport } from "./auditExport";
import { logger } from "../utils/logger";
export const auditFlows = createAuditFlows({
  list: (filters) => auditService.getLogs(filters),
  log: (entry) => auditService.log(entry),
  cleanup: (months) => auditService.cleanup(months),
  snapshot: () => integrityStatusService.getSnapshot(),
  verify: async () => {
    logger.info("Iniciando verificación manual de integridad");
    await securityAuditService.verifyFullChainIntegrity();
  },
  exportJson: (filters) => auditService.getLogsForExport(filters),
  exportStream: streamAuditExport,
});
