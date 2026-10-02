import { useMemo } from "react";
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
  externalPendingRequest?: CorrectionRequest;
}

export const useTimeRecordRowController = ({
  record,
  accountingLockDate,
  roleBasedTooltip,
  externalEdits,
  externalPendingRequest,
}: UseTimeRecordRowControllerParams) => {
  const editsMap = useMemo(() => {
    const map = new Map<string, { actor: string; timestamp: string; oldValue: string }>();
    (externalEdits || []).forEach((log) => {
      const field = log.details?.fieldEdited as string;
      if (!field) return;

      const key = `${record.id}-${field}`;
      if (!map.has(key)) {
        map.set(key, {
          actor: log.actorUsername,
          timestamp: log.timestamp,
          oldValue: (log.details?.oldValue as string) || "SIN DATOS",
        });
      }
    });
    return map;
  }, [externalEdits, record.id]);

  const pendingRequest = externalPendingRequest;
  const statusConfig = record.scheduleInfo
    ? PLANNING_STATUS_CONFIG[record.scheduleInfo.planningStatus]
    : null;
  const isLocked = Boolean(accountingLockDate && record.date <= accountingLockDate);

  const progressPercent = useMemo(() => {
    if (!record.entradaTimestamp || !record.scheduledHours || record.scheduledHours <= 0) return 0;
    const now = record.salidaTimestamp || Date.now();
    const diffHours = (now - record.entradaTimestamp) / (1000 * 60 * 60);
    return Math.min(Math.round((diffHours / record.scheduledHours) * 100), 100);
  }, [record.entradaTimestamp, record.salidaTimestamp, record.scheduledHours]);

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
