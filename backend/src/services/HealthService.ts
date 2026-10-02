import prisma from "./db";
import os from "os";
import { backupHealthService } from "./backupHealthService";
import { integrityStatusService } from "./integrityStatusService";
import { jobTelemetryService } from "./jobTelemetryService";

/** Derived from the sub-services so the health payload can never drift from them. */
type BackupStatus = ReturnType<typeof backupHealthService.getStatus>;
type IntegrityStatus = ReturnType<typeof integrityStatusService.getSnapshot>;
type JobStatus = ReturnType<typeof jobTelemetryService.getSnapshot>;

export interface HealthDetails {
  status: "healthy" | "degraded";
  timestamp: string;
  uptime: number;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpus: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    os: {
      freeMem: number;
      totalMem: number;
      loadAvg: number[];
    };
  };
  database: {
    status: string;
    latency: number;
    size: string;
  };
  backup: BackupStatus;
  integrity: IntegrityStatus;
  jobs: JobStatus;
}

export class HealthService {
  /**
   * Performs a simple connectivity probe to the database.
   * Throws if unreachable.
   */
  static async checkDbReady(): Promise<boolean> {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  }

  /**
   * Gathers comprehensive health metrics from DB, OS, and internal services.
   */
  static async getDetailedHealth(): Promise<HealthDetails> {
    let dbStatus = "OK";
    let dbLatency = 0;
    let dbSize = "Desconocido";
    const startDb = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - startDb;

      // Get database size (PostgreSQL specific)
      const sizeResult = (await prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN pg_database_size(current_database()) >= 1073741824 
            THEN concat(round(cast(pg_database_size(current_database()) as numeric) / 1073741824, 2), ' GB')
            ELSE pg_size_pretty(pg_database_size(current_database()))
          END as size
      `) as { size: string }[];
      dbSize = sizeResult[0]?.size || "Error";
    } catch (error) {
      console.error("HealthService DB error:", error);
      dbStatus = "ERROR";
    }

    const backupStatus = backupHealthService.getStatus();
    const integrityStatus = integrityStatusService.getSnapshot();
    const jobStatus = jobTelemetryService.getSnapshot();

    const healthy =
      dbStatus === "OK" &&
      (!backupStatus.enabled || (!backupStatus.stale && !backupStatus.lastError));

    return {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpus: os.cpus().length,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        os: {
          freeMem: Math.round(os.freemem() / 1024 / 1024),
          totalMem: Math.round(os.totalmem() / 1024 / 1024),
          loadAvg: os.loadavg(),
        },
      },
      database: {
        status: dbStatus,
        latency: dbLatency,
        size: dbSize,
      },
      backup: backupStatus,
      integrity: integrityStatus,
      jobs: jobStatus,
    };
  }
}
