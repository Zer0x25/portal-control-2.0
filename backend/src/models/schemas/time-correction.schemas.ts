import { isoDateSchema, numericString, z } from "./common";
import { ApiResponseSchema } from "./responses.schemas";

export const TimeRecordWriteSchema = z
  .object({
    employeeId: z.string().min(1, "ID de empleado es requerido"),
    date: isoDateSchema(),
    entrada: z.string().optional().nullable(),
    inicioColacion: z.string().optional().nullable(),
    finColacion: z.string().optional().nullable(),
    salida: z.string().optional().nullable(),
    status: z.string().optional(),
    source: z.string().optional(),
    justification: z.string().optional().nullable(),
  })
  .openapi("TimeRecordWrite");

export const TimeRecordStatusSchema = z
  .enum([
    "Laborando",
    "Colacion",
    "Completado",
    "AnomaliaManual",
    "Ausente",
    "Permiso Especial",
    "Vacaciones",
    "DiaLibre",
    "SinMarcajeTurnoAsignado",
    "Feriado",
  ])
  .openapi("TimeRecordStatus");

export const ClockingStatusSchema = z
  .enum([
    "fuera",
    "por_iniciar",
    "en_jornada",
    "en_colacion",
    "en_jornada_post_colacion",
    "terminada",
    "jornada_terminada_anomalia",
    "no_programado",
    "ausente",
  ])
  .openapi("ClockingStatus");

export const AttendanceStatusSchema = z
  .enum([
    "Normal",
    "Atraso",
    "Ausente",
    "Vacaciones",
    "Licencia Médica",
    "Permiso Especial",
    "Feriado",
    "DiaLibre",
  ])
  .openapi("AttendanceStatus");

export const AttendanceRecordResponseSchema = z
  .object({
    id: z.string().optional(),
    employeeId: z.string().min(1),
    employeeName: z.string().optional(),
    employeePosition: z.string().optional(),
    employeeArea: z.string().optional(),
    employeeWorkdayType: z.string().optional(),
    date: isoDateSchema(),
    status: TimeRecordStatusSchema.optional(),
    entrada: z.string().optional().nullable(),
    inicioColacion: z.string().optional().nullable(),
    finColacion: z.string().optional().nullable(),
    salida: z.string().optional().nullable(),
    entradaTimestamp: z.number().nullable().optional(),
    inicioColacionTimestamp: z.number().nullable().optional(),
    finColacionTimestamp: z.number().nullable().optional(),
    salidaTimestamp: z.number().nullable().optional(),
    scheduledStartTime: z.string().optional().nullable(),
    scheduledEndTime: z.string().optional().nullable(),
    scheduledHours: z.number().optional().nullable(),
    scheduledColacionMinutes: z.number().optional().nullable(),
    shiftPatternId: z.string().optional().nullable(),
    shiftPatternName: z.string().optional().nullable(),
    justification: z.unknown().optional().nullable(),
    source: z.string().optional(),
    workedHours: z.number().optional(),
    overtimeHours: z.number().optional(),
    isDayOffWorked: z.boolean().optional(),
    clockingStatus: ClockingStatusSchema.optional(),
    attendanceStatus: AttendanceStatusSchema.optional(),
    isLate: z.boolean().optional(),
    lateMinutes: z.number().optional(),
    syncStatus: z.string().optional(),
    lastModified: z.number().optional(),
    isDeleted: z.boolean().optional(),
  })
  .openapi("AttendanceRecordResponse");

export const BulkTimeRecordSchema = z.array(TimeRecordWriteSchema).openapi("BulkTimeRecord");

export const TimeRecordListResponseSchema = z
  .object({
    data: z.array(AttendanceRecordResponseSchema),
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
  })
  .openapi("TimeRecordListResponse");

export const PunchSchema = z
  .object({
    employeeId: z.string(),
    source: z.string().optional(),
    forcedType: z.enum(["entrada", "salida", "inicioColacion", "finColacion"]).optional(),
    timestamp: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .openapi("Punch");

export const PunchResponseSchema = z
  .object({
    success: z.boolean(),
    action: z.string(),
    record: AttendanceRecordResponseSchema.optional(),
    timestamp: z.string(),
  })
  .openapi("PunchResponse");

export const CorrectionRequestSchema = z
  .object({
    employeeId: z.string(),
    timeRecordId: z.string(),
    recordField: z.enum(["entrada", "inicioColacion", "finColacion", "salida"]),
    currentValue: z.string().optional(),
    requestedValue: z.iso.datetime({ offset: true }),
    reason: z.string(),
    attachment: z.any().optional(),
  })
  .openapi("CorrectionRequest");

export const UpdateCorrectionStatusSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().optional(),
    resolvedBy: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "rejected" && !data.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason es obligatorio cuando status es rejected",
        path: ["rejectionReason"],
      });
    }
  })
  .openapi("UpdateCorrectionStatus");

export const CorrectionRequestListResponseSchema = ApiResponseSchema.extend({
  data: z.array(CorrectionRequestSchema),
}).openapi("CorrectionRequestListResponse");

export const TimeRecordQuerySchema = z.object({
  page: numericString.optional(),
  pageSize: numericString.optional(),
  since: numericString.optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  name: z.string().optional(),
  area: z.string().optional(),
  workdayType: z.string().optional(),
  status: z.string().optional(),
  employeeId: z.string().optional(),
});

export const IntegrityVerifyQuerySchema = z.object({
  employeeId: z.string().min(1, "ID de empleado es requerido"),
  from: isoDateSchema("Formato de fecha inválido"),
  to: isoDateSchema("Formato de fecha inválido"),
});

export const ExportQuerySchema = z.object({
  startDate: isoDateSchema(),
  endDate: isoDateSchema(),
  area: z.string().optional(),
  cargo: z.string().optional(),
  employeeId: z.string().optional(),
  viewMode: z.enum(["month", "week", "day"]).optional(),
  mode: z.enum(["summary", "detailed", "compiled_detailed"]).optional(),
});

/**
 * `POST /api/records/{id}/resolve-anomaly` body.
 *
 * The controller previously duplicated this allow-list inline, which let the
 * OpenAPI spec drift from the runtime check. Declaring it as a schema keeps the
 * contract and the enforcement in one place.
 */
export const ANOMALY_RESOLUTIONS = [
  "ABSENCE_MARK",
  "SHIFT_HOURS_ACK",
  "PERMIT_MARK",
  "DAY_OFF_MARK",
  "VACATION_MARK",
] as const;

export const ResolveAnomalySchema = z
  .object({
    resolution: z.enum(ANOMALY_RESOLUTIONS, {
      error: "Resolución inválida",
    }),
  })
  .openapi("ResolveAnomaly");
