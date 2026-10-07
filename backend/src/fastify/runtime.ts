import { operationRuntime } from "../services/operationRuntime";
import { openSchedulerRuntime, stopScheduler } from "../services/schedulerService";
import { seedRuntime } from "../services/seedRuntime";
import { adminFlows } from "../services/adminFlows";
import { maintenanceFlows } from "../services/maintenanceFlows";
import { auditFlows } from "../services/auditFlows";
import { importExportFlows } from "../services/importExportFlows";
import { meterFlows } from "../services/meterFlows";
import { noteFlows } from "../services/noteFlows";
import { configFlows } from "../services/configFlows";
import { companyPolicyStorage } from "../services/companyPolicyStorage";
import { emailReportFlows } from "../services/emailReportFlows";
import { kpiFlows } from "../services/kpiFlows";
import { shiftReportFlows } from "../services/shiftReportFlows";
import { leaveFlows } from "../services/leaveFlows";
import { correctionFlows } from "../services/correctionFlows";
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
  operationRuntime.openRuntime();
  seedRuntime.openRuntime();
  openSchedulerRuntime();
  let exports: Promise<typeof import("../services/export/StreamExportService")> | undefined;
  const loadExports = () => (exports ??= import("../services/export/StreamExportService"));
  const app = buildFastifyApp(
    {
      authenticate: authenticateAccessToken,
      holidays: holidayService,
      users: userService,
      admin: adminFlows,
      maintenanceFlows,
      kpis: kpiFlows,
      emailReports: emailReportFlows,
      importExport: {
        ...importExportFlows,
        excel: async (sink, filters) => {
          await loadExports();
          await importExportFlows.excel(sink, filters);
        },
      },
      meters: meterFlows,
      audit: {
        ...auditFlows,
        exportStream: async (sink, filters) => {
          await loadExports();
          await auditFlows.exportStream(sink, filters);
        },
      },
      notes: noteFlows,
      configs: {
        ...configFlows,
        storePolicy: (stream, name, mime) => companyPolicyStorage.store(stream, name, mime),
        removeUploaded: (filename) => companyPolicyStorage.remove(filename),
      },
      shiftReports: {
        ...shiftReportFlows,
        exportStream: async (stream, id) => {
          const { streamExportService } = await loadExports();
          await streamExportService.streamShiftReportToExcel(stream, id);
        },
      },
      shifts: shiftFlows,
      leaves: leaveFlows,
      corrections: correctionFlows,
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
        await operationRuntime.drain();
        await stopScheduler();
        await seedRuntime.drain();
        try {
          if (exports) await (await exports).streamExportService.close();
        } finally {
          await closeDatabase();
        }
      },
    },
    config ?? {
      allowedOrigins: getAllowedOrigins(),
      trustProxy: 1,
      rateLimit: { max: 5000, timeWindow: 15 * 60 * 1000 },
      development: process.env.NODE_ENV === "development",
    },
  );
  app.addHook("preClose", async () => {
    operationRuntime.closeAdmission();
    await operationRuntime.drain();
  });
  return app;
}
