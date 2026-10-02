import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useToasts } from "../../../hooks/useToasts";
import { useScheduling } from "../../../hooks/useScheduling";
import { employeeService } from "../../../services/employeeService";
import { getContractAttendanceMetrics, getContractClockingStatus } from "../../../utils/mappings";
import * as kpiService from "../../../services/kpiService";
import { formatDateUTCISO, parseBusinessDateCL } from "../../../utils/dateUtils";
import { formatDecimalHoursToHHMM, formatDisplayDateTime } from "../../../utils/formatters";
import {
  AttendanceRecord,
  DailyTimeRecord,
  TimeRecordField,
  CorrectionRequest,
  ClockingStatus,
  AugmentedTimeRecord,
} from "../../../types/index";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useBusinessNow } from "../../../hooks/useBusinessNow";

const getCurrentMonthYYYYMM = (now: Date) => {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export const useWorkerPortalData = () => {
  const businessNow = useBusinessNow({ tickMs: null });
  const { currentUser } = useAuth();
  const { getEmployeeById, allEmployees, isLoadingEmployees, refreshEmployees } = useEmployees();
  const { timeRecordsPage: recentRecordData, allRecordsInDateRange: recordsData } = useTimeRecords({
    page: 1,
    pageSize: -1,
    filters: {},
  });
  const { punchMutation } = useTimeRecordMutations();
  const { addToast } = useToasts();
  const { requests, getEmployeeDailyScheduleInfo, isLoadingSchedulingData } = useScheduling();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    record: DailyTimeRecord | null;
    field: TimeRecordField | null;
  }>({
    isOpen: false,
    record: null,
    field: null,
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getCurrentMonthYYYYMM(businessNow),
  );
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isResolvingEmployeeLink, setIsResolvingEmployeeLink] = useState(false);
  const [isEmployeeResolutionFinished, setIsEmployeeResolutionFinished] = useState(false);
  const [resolvedEmployee, setResolvedEmployee] = useState<ReturnType<
    typeof getEmployeeById
  > | null>(null);
  const hasTriedResolvingEmployeeLink = useRef(false);

  const storeEmployee = useMemo(() => {
    if (currentUser?.employeeId) {
      const linkedEmployee = getEmployeeById(currentUser.employeeId);
      if (linkedEmployee) return linkedEmployee;
    }

    if (currentUser?.role === "Usuario" && allEmployees.length === 1) {
      return allEmployees[0] || null;
    }

    return null;
  }, [allEmployees, currentUser, getEmployeeById]);

  const employee = resolvedEmployee || storeEmployee;

  useEffect(() => {
    if (!currentUser) {
      setIsEmployeeResolutionFinished(true);
      return;
    }

    if (currentUser.role !== "Usuario") {
      setIsEmployeeResolutionFinished(true);
      return;
    }

    if (currentUser?.role !== "Usuario") return;
    if (storeEmployee) {
      hasTriedResolvingEmployeeLink.current = false;
      setResolvedEmployee(null);
      setIsEmployeeResolutionFinished(true);
      return;
    }
    if (isLoadingEmployees || isResolvingEmployeeLink || hasTriedResolvingEmployeeLink.current)
      return;

    let cancelled = false;

    const resolveEmployeeLink = async () => {
      hasTriedResolvingEmployeeLink.current = true;
      setIsResolvingEmployeeLink(true);
      try {
        await refreshEmployees();
        const directEmployees = await employeeService.getAll();
        if (!cancelled) {
          if (currentUser.employeeId) {
            const linkedEmployee = directEmployees.find(
              (item) => item.id === currentUser.employeeId,
            );
            setResolvedEmployee(linkedEmployee || null);
          } else if (directEmployees.length === 1) {
            setResolvedEmployee(directEmployees[0]);
          } else {
            setResolvedEmployee(null);
          }
        }
      } finally {
        if (!cancelled) {
          setIsResolvingEmployeeLink(false);
          setIsEmployeeResolutionFinished(true);
        }
      }
    };

    void resolveEmployeeLink();

    return () => {
      cancelled = true;
    };
  }, [currentUser, storeEmployee, isLoadingEmployees, isResolvingEmployeeLink, refreshEmployees]);

  const monthOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const now = businessNow;
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const value = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("es-CL", { month: "long", year: "numeric" });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value, label: capitalizedLabel });
    }
    return options;
  }, [businessNow]);

  const dateRangeRecords = recordsData || [];
  const [status, setStatus] = useState<ClockingStatus>("fuera");
  const [latestOpenRecord, setLatestOpenRecord] = useState<DailyTimeRecord | null>(null);

  useEffect(() => {
    if (!employee || !recentRecordData) {
      if (recentRecordData?.length === 0) setStatus("fuera");
      return;
    }

    const latest = recentRecordData[0];
    if (latest) {
      const nextStatus = getContractClockingStatus(latest as AttendanceRecord, () => "fuera");
      setStatus(nextStatus);
      if (["fuera", "terminada", "jornada_terminada_anomalia"].includes(nextStatus)) {
        setLatestOpenRecord(null);
      } else {
        setLatestOpenRecord(latest);
      }
    } else {
      setStatus("fuera");
      setLatestOpenRecord(null);
    }
  }, [employee, recentRecordData]);

  const requestsMap = useMemo(() => {
    const map = new Map<string, CorrectionRequest>();
    if (employee) {
      requests
        .filter((r: CorrectionRequest) => r.employeeId === employee.id)
        .forEach((req: CorrectionRequest) => {
          map.set(`${req.timeRecordId}-${req.recordField}`, req);
        });
    }
    return map;
  }, [requests, employee]);

  const enrichedRecords = useMemo(() => {
    if (!employee) return [];

    return (dateRangeRecords as AugmentedTimeRecord[])
      .filter((r) => r.employeeId === employee.id)
      .map((record) => {
        const scheduleInfo = getEmployeeDailyScheduleInfo(
          employee.id,
          parseBusinessDateCL(record.date),
        );
        const hours = getContractAttendanceMetrics(record, () => ({
          scheduledHours: 0,
          workedHours: 0,
          overtimeHours: 0,
          isDayOffWorked: false,
        }));
        return {
          ...record,
          ...hours,
          scheduleInfo,
        };
      })
      .sort((a, b) => (b.entradaTimestamp || 0) - (a.entradaTimestamp || 0));
  }, [dateRangeRecords, employee, getEmployeeDailyScheduleInfo]);

  const getPeriodDates = useCallback(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = parseBusinessDateCL(`${year}-${String(month).padStart(2, "0")}-01`);
    const end = parseBusinessDateCL(
      `${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0, 12)).getUTCDate().toString().padStart(2, "0")}`,
    );
    return { startDate: start, endDate: end };
  }, [selectedMonth]);

  const handleExportPDF = useCallback(async () => {
    if (!employee) {
      addToast("Empleado no encontrado para exportar.", "error");
      return;
    }

    const { startDate, endDate } = getPeriodDates();
    const startISO = formatDateUTCISO(startDate);
    const endISO = formatDateUTCISO(endDate);

    try {
      await kpiService.downloadReportPDF({
        startDate: startISO,
        endDate: endISO,
        employeeId: employee.id,
      });
      addToast("PDF descargado correctamente", "success");
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      addToast("Error al descargar el PDF", "error");
    }
  }, [employee, getPeriodDates, addToast]);

  const handleClockingAction = useCallback(
    async (type: "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin") => {
      if (!employee || !currentUser) {
        addToast("Empleado no encontrado.", "error");
        return;
      }

      let backendAction: "entrada" | "inicio_colacion" | "fin_colacion" | "salida" | undefined;

      switch (type) {
        case "jornada_inicio":
          backendAction = "entrada";
          break;
        case "colacion_inicio":
          backendAction = "inicio_colacion";
          break;
        case "colacion_fin":
          backendAction = "fin_colacion";
          break;
        case "jornada_fin":
          backendAction = "salida";
          break;
      }

      try {
        const result = await punchMutation.mutateAsync({
          employeeId: employee.id,
          source: "WEB",
          forcedType: backendAction,
        });

        if (result.success) {
          addToast(`Acción registrada: ${result.action}`, "success");
        } else {
          addToast(`Error: ${result.action}`, "error");
        }
      } catch (error: unknown) {
        console.error("Clocking error:", error);
      }
    },
    [employee, currentUser, punchMutation, addToast],
  );

  const openCorrectionModal = useCallback((record: DailyTimeRecord, field: TimeRecordField) => {
    setModalState({ isOpen: true, record, field });
  }, []);

  return {
    currentUser,
    employee,
    isLoadingEmployees:
      !isEmployeeResolutionFinished && (isLoadingEmployees || isResolvingEmployeeLink),
    isLoadingSchedulingData,
    modalState,
    setModalState,
    selectedMonth,
    setSelectedMonth,
    isMobile,
    monthOptions,
    enrichedRecords,
    status,
    latestOpenRecord,
    requestsMap,
    handleExportPDF,
    handleClockingAction,
    openCorrectionModal,
    formatDisplayDateTime,
    formatDecimalHoursToHHMM,
  } as const;
};
