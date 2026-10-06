import { createAuthFlows } from "../modules/auth";
import { AuthService } from "./AuthService";
import { auditService } from "./auditService";
import { clearLoginFailures, recordLoginFailure } from "./loginFailures";
import { logger } from "../utils/logger";

export const authFlows = createAuthFlows({
  service: AuthService,
  failures: { record: recordLoginFailure, clear: clearLoginFailures },
  audit: (entry) => auditService.log(entry),
  log: (message, context) => logger.info(message, context),
});
