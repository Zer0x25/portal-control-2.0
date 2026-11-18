import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmployees } from "../../../hooks/useEmployees";
import { useToasts } from "../../../hooks/useToasts";
import { queryKeys } from "../../../lib/queryKeys";
import {
  shiftService,
  type MonthlyDayScheduleItem,
  type MonthlyPlanDayInput,
} from "../../../services/shiftService";
import { toBusinessDateChile } from "../../../utils/dateUtils";
import { toCaughtError } from "../../../utils/caughtError";

export const MONTH_OPTIONS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
] as const;

export interface EditableDayRow {
  day: number;
  dateIso: string;
  dayOfWeek: string;
  currentScheduleText: string;
  type: "work" | "rest";
  startTime: string;
  endTime: string;
}

export const computeShiftHours = (startTime: string, endTime: string): number => {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }
  return Math.round(((endMin - startMin) / 60) * 100) / 100;
};

const parseTimesFromText = (
  scheduleText: string,
  defaultStart: string,
  defaultEnd: string,
): { startTime: string; endTime: string } => {
  const match = scheduleText.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
  if (match) {
    return { startTime: match[1], endTime: match[2] };
  }
  return { startTime: defaultStart, endTime: defaultEnd };
};

const buildRowsFromSchedule = (
  items: MonthlyDayScheduleItem[],
  defaultStart: string,
  defaultEnd: string,
): EditableDayRow[] =>
  items.map((item) => {
    const times = parseTimesFromText(item.scheduleText, defaultStart, defaultEnd);
    return {
      day: item.dayOfMonth,
      dateIso: item.dateIso,
      dayOfWeek: item.dayOfWeek,
      currentScheduleText: item.scheduleText,
      type: item.isWorkDay ? "work" : "rest",
      startTime: times.startTime,
      endTime: times.endTime,
    };
  });

const isWeekendLabel = (dayOfWeek: string): boolean => {
  const lower = dayOfWeek.toLowerCase();
  return lower.startsWith("sáb") || lower.startsWith("sab") || lower.startsWith("dom");
};

/** Hook de dominio para el asistente de planificacion mensual. */
export const useMonthlyPlanWizard = () => {
  const { activeEmployees, isLoadingEmployees } = useEmployees();
  const { addToast } = useToasts();
  const queryClient = useQueryClient();

  const initialDateParts = useMemo(() => {
    const [y, m] = toBusinessDateChile().split("-").map(Number);
    return { year: y || 2026, month: m || 1 };
  }, []);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedYear, setSelectedYear] = useState(initialDateParts.year);
  const [selectedMonth, setSelectedMonth] = useState(initialDateParts.month);
  const [patternName, setPatternName] = useState("");
  const [defaultStartTime, setDefaultStartTime] = useState("08:00");
  const [defaultEndTime, setDefaultEndTime] = useState("17:00");
  const [rows, setRows] = useState<EditableDayRow[]>([]);
  const [isSuggestingName, setIsSuggestingName] = useState(false);

  const sortedEmployees = useMemo(
    () => [...activeEmployees].sort((a, b) => a.name.localeCompare(b.name)),
    [activeEmployees],
  );

  const yearOptions = useMemo(() => {
    const base = initialDateParts.year;
    return [base - 1, base, base + 1, base + 2];
  }, [initialDateParts.year]);

  const {
    data: monthlyPlan,
    isLoading: isLoadingPlan,
    isError: isPlanError,
    error: planError,
  } = useQuery({
    queryKey: queryKeys.monthlyPlan(selectedEmployeeId, selectedYear, selectedMonth),
    queryFn: () => shiftService.getMonthlyPlan(selectedEmployeeId, selectedYear, selectedMonth),
    enabled: Boolean(selectedEmployeeId),
  });

  useEffect(() => {
    if (!monthlyPlan) {
      setRows([]);
      return;
    }
    setRows(buildRowsFromSchedule(monthlyPlan, defaultStartTime, defaultEndTime));
  }, [monthlyPlan, defaultStartTime, defaultEndTime]);

  const handleSuggestName = async (employeeId = selectedEmployeeId) => {
    if (!employeeId) return;
    setIsSuggestingName(true);
    try {
      const suggested = await shiftService.getSuggestedPatternName(
        employeeId,
        selectedYear,
        selectedMonth,
      );
      setPatternName(suggested);
      setIsSuggestingName(false);
    } catch (err: unknown) {
      setIsSuggestingName(false);
      addToast(toCaughtError(err).message || "No se pudo sugerir el nombre.", "error");
    }
  };

  useEffect(() => {
    if (!selectedEmployeeId) {
      setPatternName("");
      return;
    }
    let active = true;
    setIsSuggestingName(true);
    shiftService
      .getSuggestedPatternName(selectedEmployeeId, selectedYear, selectedMonth)
      .then((suggested) => {
        if (active) setPatternName(suggested);
      })
      .catch(() => {
        if (active) setPatternName("");
      })
      .finally(() => {
        if (active) setIsSuggestingName(false);
      });
    return () => {
      active = false;
    };
  }, [selectedEmployeeId, selectedYear, selectedMonth]);

  const handleToggleDayType = (day: number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.day === day ? { ...row, type: row.type === "work" ? "rest" : "work" } : row,
      ),
    );
  };

  const handleTimeChange = (day: number, field: "startTime" | "endTime", value: string) => {
    setRows((prev) => prev.map((row) => (row.day === day ? { ...row, [field]: value } : row)));
  };

  const handleApplyWeekdays = () => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        type: isWeekendLabel(row.dayOfWeek) ? "rest" : "work",
        startTime: defaultStartTime,
        endTime: defaultEndTime,
      })),
    );
  };

  const handleClearAllRest = () => {
    setRows((prev) => prev.map((row) => ({ ...row, type: "rest" })));
  };

  const totalWorkDays = useMemo(() => rows.filter((r) => r.type === "work").length, [rows]);
  const totalPlannedHours = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          row.type === "work" ? sum + computeShiftHours(row.startTime, row.endTime) : sum,
        0,
      ),
    [rows],
  );

  const savePlanMutation = useMutation({
    mutationFn: (payload: Parameters<typeof shiftService.createMonthlyPlan>[0]) =>
      shiftService.createMonthlyPlan(payload),
    onSuccess: async () => {
      addToast("Plan mensual guardado correctamente.", "success");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.monthlyPlan(selectedEmployeeId, selectedYear, selectedMonth),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assignedShifts() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shiftPatterns() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.calendarMatrix() }),
      ]);
    },
    onError: (err: unknown) => {
      addToast(toCaughtError(err).message || "Error al guardar el plan mensual.", "error");
    },
  });

  const handleSaveMonthlyPlan = async () => {
    if (!selectedEmployeeId || rows.length === 0) return;
    const dailySchedules: MonthlyPlanDayInput[] = rows.map((row) =>
      row.type === "work"
        ? {
            day: row.day,
            type: "work",
            startTime: row.startTime,
            endTime: row.endTime,
            hours: computeShiftHours(row.startTime, row.endTime),
          }
        : {
            day: row.day,
            type: "rest",
          },
    );

    await savePlanMutation
      .mutateAsync({
        employeeId: selectedEmployeeId,
        month: String(selectedMonth),
        year: String(selectedYear),
        patternName: patternName.trim() || undefined,
        dailySchedules,
      })
      .catch(() => {
        // El toast de error ya se maneja en onError de la mutacion.
      });
  };

  return {
    sortedEmployees,
    isLoadingEmployees,
    yearOptions,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    patternName,
    setPatternName,
    defaultStartTime,
    setDefaultStartTime,
    defaultEndTime,
    setDefaultEndTime,
    rows,
    isSuggestingName,
    isSaving: savePlanMutation.isPending,
    isLoadingPlan,
    isPlanError,
    planErrorMessage: isPlanError ? toCaughtError(planError).message : "",
    totalWorkDays,
    totalPlannedHours,
    handleSuggestName,
    handleToggleDayType,
    handleTimeChange,
    handleApplyWeekdays,
    handleClearAllRest,
    handleSaveMonthlyPlan,
  };
};
