import { useEffect, useMemo, useState } from "react";
import { DailyTimeRecord, ClockingStatus } from "../../../types";
import { useAuth } from "../../../hooks/useAuth";
import {
  useAccountingLockDateQuery,
  useControlInternoEnabledQuery,
} from "../../../hooks/queries/useConfigQuery";
import { TIME_RECORD_STATUS_CONFIG } from "../../../utils/mappings";

interface UseQuickActionModalControllerParams {
  isOpen: boolean;
  record: DailyTimeRecord | null;
  clockStatus: ClockingStatus;
  isActionDisabled: boolean;
  disabledTooltip: string;
}

export const useQuickActionModalController = ({
  isOpen,
  record,
  clockStatus,
  isActionDisabled,
  disabledTooltip,
}: UseQuickActionModalControllerParams) => {
  const [activeTab, setActiveTab] = useState<"live" | "edit">("live");
  const [isArmed, setIsArmed] = useState(false);

  const { data: accountingLockDate } = useAccountingLockDateQuery();
  const { data: isControlInternoEnabled = true } = useControlInternoEnabledQuery();
  const { currentUser } = useAuth();

  const allowEdit =
    currentUser && ["Administrador", "Supervisor Elevado"].includes(currentUser.role);

  useEffect(() => {
    if (isOpen) {
      if (isControlInternoEnabled) {
        setActiveTab("live");
      } else if (allowEdit) {
        setActiveTab("edit");
      } else {
        setActiveTab("live");
      }
      setIsArmed(false);
      const timer = setTimeout(() => setIsArmed(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isControlInternoEnabled, allowEdit]);

  const isLocked = Boolean(record && accountingLockDate && record.date <= accountingLockDate);
  const isJustified = Boolean(
    record?.justification && record.justification.type !== "SYSTEM_ANOMALY",
  );
  const isShiftOpen = Boolean(record && ["Laborando", "Colacion"].includes(record.status));

  const statusConfig = useMemo(() => {
    if (!record) {
      return {
        label: "Desconocido",
        bg: "bg-gray-100 dark:bg-gray-700",
        text: "text-gray-800 dark:text-gray-300",
      };
    }

    return (
      TIME_RECORD_STATUS_CONFIG[record.status] || {
        label: record.status || "Desconocido",
        bg: "bg-gray-100 dark:bg-gray-700",
        text: "text-gray-800 dark:text-gray-300",
      }
    );
  }, [record]);

  const finalDisabledState = !isArmed || isActionDisabled || isJustified || isLocked;
  const finalTooltip = isLocked
    ? "Registro bloqueado por cierre contable."
    : isJustified
      ? `Registro justificado por ${record?.justification?.type}. No se puede modificar.`
      : !isArmed
        ? "Preparando..."
        : isActionDisabled
          ? disabledTooltip
          : "";

  const canStartBreak = clockStatus === "en_jornada";
  const canEndBreak = clockStatus === "en_colacion";
  const canClockOut = ["en_jornada", "en_jornada_post_colacion", "en_colacion"].includes(
    clockStatus,
  );

  return {
    activeTab,
    allowEdit,
    canClockOut,
    canEndBreak,
    canStartBreak,
    finalDisabledState,
    finalTooltip,
    isArmed,
    isControlInternoEnabled,
    isJustified,
    isLocked,
    isShiftOpen,
    setActiveTab,
    statusConfig,
  };
};
