import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { DailyTimeRecord, KpiCacheItem } from "../../../types/index";
import { ROUTES } from "../../../constants";
import { isDateRangeValid } from "../../../utils/validation";
import { useEmployees } from "../../../hooks/useEmployees";
import { runKpiCalculation } from "../../../services/kpiService";
import { idbPut, STORES } from "../../../utils/indexedDB";
import { useAccountingLockDateQuery } from "../../../hooks/queries/useConfigQuery";
import { useConfigMutations } from "../../../hooks/useConfigMutations";
import { auditLogService } from "../../../services/auditLogService";
import {
  addBusinessDaysChile,
  compareBusinessDate,
  toBusinessDateChile,
} from "../../../utils/dateUtils";
import { configService } from "../../../services/configService";
import { AuditLog } from "../../../types";

interface ValidationResult {
  status: "idle" | "success" | "failure";
  anomalies: { id: string; employeeName: string; date: string; status: string }[];
  pendingRequests: { id: string; employeeId: string; timeRecordId: string; status: "pending" }[];
  openShifts: DailyTimeRecord[];
}

export const useAccountingClosureTabController = () => {
  const { timeRecordsPage: recentRecords } = useTimeRecords();
  const { data: accountingLockDate } = useAccountingLockDateQuery();
  const { updateConfig } = useConfigMutations();
  const { currentUser } = useAuth();
  const { addToast } = useToasts();
  const navigate = useNavigate();
  const { activeEmployees } = useEmployees();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    status: "idle",
    anomalies: [],
    pendingRequests: [],
    openShifts: [],
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [closureHistory, setClosureHistory] = useState<AuditLog[]>([]);

  const nextDayAfterLock = useMemo(() => {
    if (!accountingLockDate) return undefined;
    return addBusinessDaysChile(accountingLockDate, 1);
  }, [accountingLockDate]);

  const yesterdayStr = useMemo(() => addBusinessDaysChile(toBusinessDateChile(), -1), []);

  useEffect(() => {
    if (nextDayAfterLock) {
      setStartDate(nextDayAfterLock);
    }
  }, [nextDayAfterLock]);

  const resetValidation = () => {
    setValidationResult({
      status: "idle",
      anomalies: [],
      pendingRequests: [],
      openShifts: [],
    });
  };

  const handleValidation = () => {
    if (!startDate || !endDate) {
      addToast("Debe seleccionar una fecha de inicio y fin.", "error");
      return;
    }
    if (!isDateRangeValid(startDate, endDate)) {
      addToast("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
      return;
    }
    if (compareBusinessDate(endDate, yesterdayStr) > 0) {
      addToast("La fecha de fin no puede ser el día actual o una fecha futura.", "error");
      return;
    }

    setIsLoading(true);
    resetValidation();

    configService
      .validateClosure(endDate)
      .then((result) => {
        if (!result.allowed && result.details) {
          const anomalies = result.details.anomalies.map((a) => ({
            id: a.id,
            employeeName: a.employeeName,
            date: a.date,
            status: a.status,
          }));

          const pendingRequests = result.details.pendingCorrections.map((p) => ({
            id: p.id,
            employeeId: p.employeeId,
            timeRecordId: p.timeRecordId,
            status: "pending" as const,
          }));

          setValidationResult({
            status: "failure",
            anomalies,
            pendingRequests,
            openShifts: [],
          });
          return;
        }

        setValidationResult({
          status: "success",
          anomalies: [],
          pendingRequests: [],
          openShifts: [],
        });
      })
      .catch((err) => {
        console.error("Validation error:", err);
        addToast(err.message || "Error al validar integridad estructural.", "error");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleConfirmClosure = async () => {
    if (validationResult.status !== "success" || !currentUser || !endDate) {
      addToast("La validación no fue exitosa o falta información.", "error");
      return;
    }

    let success = false;
    try {
      await updateConfig({ key: "accounting_lock_date", value: endDate });
      success = true;
    } catch (error: unknown) {
      console.error("Failed to update accounting lock date:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al actualizar la fecha de cierre contable.";
      addToast(errorMessage, "error");
    }

    if (success) {
      addToast("Generando caché de KPIs para el período cerrado...", "info");
      try {
        const filtersIdentifier = "ALL_EMPLOYEES_GLOBAL";
        const kpiResult = await runKpiCalculation({
          filters: {
            employees: activeEmployees,
            startDate,
            endDate,
          },
        });

        const cacheId = `${startDate}_${endDate}_${filtersIdentifier}`;
        const cacheItem: KpiCacheItem = {
          id: cacheId,
          startDate,
          endDate,
          filtersIdentifier,
          kpis: kpiResult.kpis,
          details: kpiResult.kpiDetails,
          timestamp: Date.now(),
        };

        await idbPut(STORES.KPI_CACHE, cacheItem);
        addToast("Caché de KPIs generado con éxito.", "success");
      } catch (error) {
        console.error("Failed to generate KPI cache:", error);
        addToast("Error al generar el caché de KPIs.", "error");
      }
    }

    resetValidation();
    setIsConfirmModalOpen(false);
    setStartDate("");
    setEndDate("");
  };

  const handleNavigateToCorrections = (type: "anomalies" | "requests" | "openShifts") => {
    if (type === "anomalies") {
      navigate(`${ROUTES.TIME_CONTROL}?startDate=${startDate}&endDate=${endDate}&show=anomalies`);
    } else if (type === "requests") {
      navigate(ROUTES.SUPERVISOR_DASHBOARD, {
        state: { openRequestsTab: true },
      });
    } else if (type === "openShifts") {
      navigate(`${ROUTES.TIME_CONTROL}?startDate=${startDate}&endDate=${endDate}`);
    }
  };

  const parseDetailsObject = (details: unknown): Record<string, unknown> => {
    if (!details) return {};
    if (typeof details === "object") return details as Record<string, unknown>;
    return {};
  };

  const loadClosureHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const [manualRes, autoAppliedRes, autoAnomaliesRes] = await Promise.all([
        auditLogService.getAll({
          page: 1,
          pageSize: 200,
          filters: {
            action: "CONFIG_SET",
            category: ["OPERATIONS"],
          },
          sortBy: "timestamp",
          sortOrder: "desc",
        }),
        auditLogService.getAll({
          page: 1,
          pageSize: 100,
          filters: {
            action: "CIERRE_CONTABLE_AUTOMATICO_APLICADO",
            category: ["CTRL_HOURS"],
          },
          sortBy: "timestamp",
          sortOrder: "desc",
        }),
        auditLogService.getAll({
          page: 1,
          pageSize: 100,
          filters: {
            action: "CIERRE_CONTABLE_AUTOMATICO_CON_ANOMALIAS",
            category: ["CTRL_HOURS"],
          },
          sortBy: "timestamp",
          sortOrder: "desc",
        }),
      ]);

      const manualLogs = (manualRes.data || []).filter((log) => {
        const details = parseDetailsObject(log.details);
        return details.key === "accounting_lock_date";
      });
      const autoLogs = [...(autoAppliedRes.data || []), ...(autoAnomaliesRes.data || [])];

      const merged = [...manualLogs, ...autoLogs].sort((a, b) =>
        String(b.timestamp).localeCompare(String(a.timestamp)),
      );
      setClosureHistory(merged);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "No se pudo cargar el historial de cierres.";
      setHistoryError(errorMessage);
      setClosureHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const openHistoryModal = () => {
    setIsHistoryModalOpen(true);
    void loadClosureHistory();
  };

  return {
    accountingLockDate,
    closureHistory,
    currentUser,
    endDate,
    handleConfirmClosure,
    handleNavigateToCorrections,
    handleValidation,
    historyError,
    isConfirmModalOpen,
    isEndDatePickerOpen,
    isHistoryLoading,
    isHistoryModalOpen,
    isLoading,
    openHistoryModal,
    parseDetailsObject,
    recentRecords,
    resetValidation,
    setEndDate,
    setIsConfirmModalOpen,
    setIsEndDatePickerOpen,
    setIsHistoryModalOpen,
    setStartDate,
    startDate,
    validationResult,
  };
};
