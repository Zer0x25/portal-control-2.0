import { shiftFlows } from "../services/shiftFlows";
import { recordFlows } from "../services/recordFlows";
import { employeeFlows } from "../services/employeeFlows";
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
  let exports: Promise<typeof import("../services/export/StreamExportService")> | undefined;
  const loadExports = () => (exports ??= import("../services/export/StreamExportService"));
  return buildFastifyApp(
    {
      authenticate: authenticateAccessToken,
      holidays: holidayService,
      users: userService,
      shifts: shiftFlows,
      records: {
        ...recordFlows,
        exportStream: async (format, stream, filters) => {
          const { streamExportService } = await loadExports();
          if (format === "csv") return streamExportService.streamToCSV(stream, filters);
          if (format === "xml") return streamExportService.streamToXML(stream, filters);
          return streamExportService.streamToExcel(stream, filters);
        },
      },
      employees: {
        ...employeeFlows,
        exportExcel: async (stream, filters) => {
          const { streamExportService } = await loadExports();
          await streamExportService.streamEmployeesToExcel(stream, filters);
        },
      },
      auth: { flows: authFlows, inspectFailures: inspectLoginFailures },
      health: HealthService,
      maintenance: () =>
        systemOperationService.isMaintenanceModeActive()
          ? systemOperationService.getSnapshot()
          : null,
      auditError: (error, request, category) => auditService.logError(error, request, category),
      close: async () => {
        if (exports) await (await exports).streamExportService.close();
        await closeDatabase();
      },
    },
    config ?? {
      allowedOrigins: getAllowedOrigins(),
      trustProxy: 1,
      rateLimit: { max: 5000, timeWindow: 15 * 60 * 1000 },
      development: process.env.NODE_ENV === "development",
    },
  );
}
