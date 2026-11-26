import { isoDateSchema, z } from "./common";

export const RestoreBackupSchema = z
  .object({
    filename: z.string().min(1, "Nombre de archivo es requerido"),
  })
  .openapi("RestoreBackup");

export const AuditLogSchema = z
  .object({
    id: z.string().optional(),
    timestamp: z.string().optional(),
    actorUsername: z.string().optional(),
    action: z.string().min(1),
    category: z.string().min(1),
    severity: z.string().optional(),
    outcome: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    ipAddress: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("AuditLog");

export const ServerTimeSchema = z
  .object({
    iso: z.string(),
    timestamp: z.number(),
    timezone: z.string(),
    businessDate: isoDateSchema(),
  })
  .openapi("ServerTime");

export const ConfigEntrySchema = z
  .object({
    key: z.string(),
    value: z.unknown(),
    group: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .openapi("ConfigEntry");

export const HealthStatusSchema = z
  .object({
    status: z.enum(["healthy", "degraded"]),
    instanceId: z.string().min(1),
    timestamp: z.string(),
    responseTime: z.number().optional(),
    uptime: z.number().optional(),
    database: z.object({
      status: z.string(),
      latency: z.number().optional(),
      size: z.string().optional(),
    }),
    system: z
      .object({
        platform: z.string(),
        arch: z.string(),
        nodeVersion: z.string(),
        cpus: z.number(),
        memory: z.object({
          rss: z.number(),
          heapTotal: z.number(),
          heapUsed: z.number(),
        }),
        os: z.object({
          freeMem: z.number(),
          totalMem: z.number(),
          loadAvg: z.array(z.number()),
        }),
      })
      .optional(),
    backup: z.record(z.string(), z.unknown()).optional(),
    integrity: z.record(z.string(), z.unknown()).optional(),
    jobs: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("HealthStatus");

export const HealthReadinessSchema = z
  .object({
    status: z.literal("ready"),
    healthStatus: z.enum(["healthy", "degraded"]),
    instanceId: z.string().min(1),
  })
  .openapi("HealthReadiness");

export const KpiSummaryRequestSchema = z
  .object({
    startDate: isoDateSchema(),
    endDate: isoDateSchema().optional(),
    endDateExclusive: isoDateSchema().optional(),
    employeeId: z.string().optional(),
    employeeIds: z.array(z.string()).optional(),
    area: z.string().optional(),
    departmentId: z.string().optional(),
    cargo: z.string().optional(),
    workdayType: z.string().optional(),
  })
  .refine((v) => Boolean(v.endDate || v.endDateExclusive), {
    message: "Debe informar endDate o endDateExclusive",
    path: ["endDate"],
  })
  .openapi("KpiSummaryRequest");

export const DashboardOverviewSchema = z
  .object({
    dailyAttendanceRatio: z.number(),
    activeShifts: z.number(),
    pendingLeaves: z.number(),
    alerts: z.array(z.string()),
  })
  .openapi("DashboardOverview");

/**
 * Detalle de anomalías del equipo (GET /api/kpis/anomalies). El overview solo
 * envía el conteo; este contrato sirve el detalle bajo demanda. Cada entrada es
 * un registro de asistencia anómalo o un virtual `MISSING-*` (sin fila en BD).
 */
export const TeamAnomaliesSchema = z
  .object({
    count: z.number().int(),
    anomalies: z.array(z.unknown()),
    timestamp: z.string(),
  })
  .openapi("TeamAnomalies");

export const SeedOptionsSchema = z
  .object({
    clearExisting: z.boolean().optional(),
    adminPassword: z.string().optional(),
    employees: z.number().int().min(0).optional(),
    days: z.number().int().min(0).optional(),
    basePatternsCount: z.number().int().min(1).optional(),
    leaveRatio: z.number().min(0).max(100).optional(),
    correctionRequestRatio: z.number().min(0).max(100).optional(),
    shiftReportsPerDay: z.number().min(0).max(6).optional(),
    quickNotesCount: z.number().int().min(0).optional(),
    seedEmployees: z.boolean().optional(),
    seedShifts: z.boolean().optional(),
    seedRecords: z.boolean().optional(),
    monthsToSeed: z.number().int().min(1).max(12).optional(),
  })
  .openapi("SeedOptions");

export const SeedPhase2StartSchema = z
  .object({
    days: z.number().int().min(1).max(3650).optional(),
    leaveRatio: z.number().min(0).max(100).optional(),
    correctionRequestRatio: z.number().min(0).max(100).optional(),
    batchSize: z.number().int().min(50).max(2000).optional(),
  })
  .openapi("SeedPhase2Start");

/**
 * Body shared by the `pause` / `resume` / `stop` seed-phase-2 endpoints.
 *
 * These controllers previously read `req.body.jobId` and threw a generic
 * `ValidationError` themselves, which left the OpenAPI spec without a schema
 * for the request body.
 */
export const SeedPhase2JobSchema = z
  .object({
    jobId: z.string().min(1, "jobId requerido"),
  })
  .openapi("SeedPhase2Job");

export const SeedStatusSchema = z
  .object({
    status: z.enum(["idle", "running", "paused", "completed", "error"]),
    progress: z.number(),
    processed: z.number(),
    total: z.number(),
    currentPhase: z.string().optional(),
    startTime: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi("SeedStatus");

export const SystemStatsSchema = z
  .object({
    activeUsers: z.number(),
    totalEmployees: z.number(),
    pendingLeaves: z.number(),
    pendingCorrections: z.number(),
    uptime: z.number(),
    memoryUsage: z.object({
      rss: z.number(),
      heapTotal: z.number(),
      heapUsed: z.number(),
    }),
  })
  .openapi("SystemStats");

export const SecurityInsightsSchema = z
  .object({
    failedLogins24h: z.number(),
    lockedAccounts: z.number(),
    suspiciousIPs: z.array(z.string()),
    lastAuditTimestamp: z.string(),
  })
  .openapi("SecurityInsights");
