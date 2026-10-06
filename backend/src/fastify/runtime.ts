import { userService } from "../services/UserService";
import { authFlows } from "../services/authFlows";
import { inspectLoginFailures } from "../services/loginFailures";
import { buildFastifyApp, type FastifyConfig } from "../platform/fastify/app";
import { authenticateAccessToken } from "../services/authentication";
import { holidayService } from "../services/HolidayService";
import { HealthService } from "../services/HealthService";
import { systemOperationService } from "../services/systemOperationService";
import { auditService } from "../services/auditService";
import { closeDatabase } from "../services/db";
import { getAllowedOrigins } from "../utils/corsPolicy";

export function createFastifyRuntime(config?: FastifyConfig) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET es obligatorio para iniciar Fastify");
  return buildFastifyApp(
    {
      authenticate: authenticateAccessToken,
      holidays: holidayService,
      users: userService,
      auth: { flows: authFlows, inspectFailures: inspectLoginFailures },
      health: HealthService,
      maintenance: () =>
        systemOperationService.isMaintenanceModeActive()
          ? systemOperationService.getSnapshot()
          : null,
      auditError: (error, request, category) => auditService.logError(error, request, category),
      close: closeDatabase,
    },
    config ?? {
      allowedOrigins: getAllowedOrigins(),
      trustProxy: 1,
      rateLimit: { max: 5000, timeWindow: 15 * 60 * 1000 },
      development: process.env.NODE_ENV === "development",
    },
  );
}
