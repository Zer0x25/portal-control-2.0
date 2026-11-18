import {
  AugmentedTimeRecord,
  AuditLog,
  CorrectionRequest,
  TimeRecordField,
} from "../../../types/index";
import { PLANNING_STATUS_CONFIG, TIME_RECORD_STATUS_CONFIG } from "../../../utils/mappings";

interface UseTimeRecordRowControllerParams {
  record: AugmentedTimeRecord;
  accountingLockDate: string | null;
  roleBasedTooltip: string;
  externalEdits?: AuditLog[];
  externalPendingRequest?: Pick<CorrectionRequest, "id" | "timeRecordId" | "status">;
}

export const useTimeRecordRowController = ({
  record,
  accountingLockDate,
  roleBasedTooltip,
  externalEdits,
  externalPendingRequest,
}: UseTimeRecordRowControllerParams) => {
  const editsMap = (() => {
    const map = new Map<string, { actor: string; timestamp: string; oldValue: string }>();
    const fields: TimeRecordField[] = ["entrada", "inicioColacion", "finColacion", "salida"];
    (externalEdits || []).forEach((log) => {
      const oldValue = log.details?.oldValue;
      const newValue = log.details?.newValue;
      const legacyField = log.details?.fieldEdited;
      if (typeof legacyField === "string" && fields.some((field) => field === legacyField)) {
        const key = `${record.id}-${legacyField}`;
        if (!map.has(key)) {
          map.set(key, {
            actor: log.actorUsername,
            timestamp: log.timestamp,
            oldValue: typeof oldValue === "string" ? oldValue : "SIN DATOS",
          });
        }
        return;
      }
      if (!oldValue || !newValue || typeof oldValue !== "object" || typeof newValue !== "object")
        return;
      const before = oldValue as Record<string, unknown>;
      const after = newValue as Record<string, unknown>;
      for (const field of fields) {
        if (!(field in before) || !(field in after) || before[field] === after[field]) continue;
        const key = `${record.id}-${field}`;
        if (!map.has(key)) {
          map.set(key, {
            actor: log.actorUsername,
            timestamp: log.timestamp,
            oldValue: typeof before[field] === "string" ? before[field] : "SIN DATOS",
          });
        }
      }
    });
    return map;
  })();

  const pendingRequest = externalPendingRequest;
  const statusConfig = record.scheduleInfo
    ? PLANNING_STATUS_CONFIG[record.scheduleInfo.planningStatus]
    : null;
  const isLocked = Boolean(accountingLockDate && record.date <= accountingLockDate);

  const progressPercent = (() => {
    if (!record.entradaTimestamp || !record.scheduledHours || record.scheduledHours <= 0) return 0;
    const now = record.salidaTimestamp || Date.now();
    const diffHours = (now - record.entradaTimestamp) / (1000 * 60 * 60);
    return Math.min(Math.round((diffHours / record.scheduledHours) * 100), 100);
  })();

  const isJustified = Boolean(
    record.justification && record.justification.type !== "SYSTEM_ANOMALY",
  );
  const isSystemAnomaly = record.justification?.type === "SYSTEM_ANOMALY";

  const finalTooltip = isLocked
    ? "Registro bloqueado por cierre contable."
    : isSystemAnomaly
      ? record.justification.comment || "Anomalía detectada por el sistema."
      : isJustified
        ? `Registro justificado por ${record.justification?.type}. No se puede modificar.`
        : roleBasedTooltip;

  const statusVisualConfig = TIME_RECORD_STATUS_CONFIG[record.status] || {
    label: record.status || "Desconocido",
    bg: "bg-token-surface-stripe",
    text: "text-token-text-primary",
  };

  const getCellEditInfo = (field: TimeRecordField) => editsMap.get(`${record.id}-${field}`);

  return {
    finalTooltip,
    getCellEditInfo,
    isJustified,
    isLocked,
    pendingRequest,
    progressPercent,
    statusConfig,
    statusVisualConfig,
  };
};
