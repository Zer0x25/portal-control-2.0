import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import { CalendarDaysIcon, SparklesIcon } from "../../../components/ui/icons";
import { useEmployees } from "../../../hooks/useEmployees";
import { useToasts } from "../../../hooks/useToasts";
import {
  shiftService,
  type MonthlyDayScheduleItem,
  type MonthlyPlanDayInput,
} from "../../../services/shiftService";
import { toBusinessDateChile } from "../../../utils/dateUtils";
import { toCaughtError } from "../../../utils/caughtError";

const MONTH_OPTIONS = [
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
];

interface EditableDayRow {
  day: number;
  dateIso: string;
  dayOfWeek: string;
  currentScheduleText: string;
  type: "work" | "rest";
  startTime: string;
  endTime: string;
}

const computeShiftHours = (startTime: string, endTime: string): number => {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let startMin = sh * 60 + sm;
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

const WizardContainer: React.FC = () => {
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
  const [isSaving, setIsSaving] = useState(false);

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
    queryKey: ["monthly-plan", selectedEmployeeId, selectedYear, selectedMonth],
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
    } catch (err: unknown) {
      addToast(toCaughtError(err).message || "No se pudo sugerir el nombre.", "error");
    } finally {
      setIsSuggestingName(false);
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

  const handleSaveMonthlyPlan = async () => {
    if (!selectedEmployeeId || rows.length === 0) return;
    setIsSaving(true);
    try {
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

      await shiftService.createMonthlyPlan({
        employeeId: selectedEmployeeId,
        month: String(selectedMonth),
        year: String(selectedYear),
        patternName: patternName.trim() || undefined,
        dailySchedules,
      });

      addToast("Plan mensual guardado correctamente.", "success");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["monthly-plan", selectedEmployeeId, selectedYear, selectedMonth],
        }),
        queryClient.invalidateQueries({ queryKey: ["assignedShifts"] }),
        queryClient.invalidateQueries({ queryKey: ["shiftPatterns"] }),
        queryClient.invalidateQueries({ queryKey: ["calendarMatrix"] }),
      ]);
    } catch (err: unknown) {
      addToast(toCaughtError(err).message || "Error al guardar el plan mensual.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Configuración del Plan Mensual"
        badge={
          selectedEmployeeId ? (
            <Badge variant="info" fontMono>
              {totalWorkDays} días / {totalPlannedHours.toFixed(1)} hrs
            </Badge>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="monthly-plan-employee"
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary ml-1"
            >
              Colaborador
            </label>
            <select
              id="monthly-plan-employee"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={isLoadingEmployees}
              className="w-full h-11 px-4 bg-token-surface-card border border-token-border-technical rounded-md text-xs font-bold text-token-text-primary focus:ring-2 focus:ring-token-border-focus outline-none"
            >
              <option value="">Seleccionar colaborador...</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="monthly-plan-month"
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary ml-1"
            >
              Mes
            </label>
            <select
              id="monthly-plan-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full h-11 px-4 bg-token-surface-card border border-token-border-technical rounded-md text-xs font-bold text-token-text-primary focus:ring-2 focus:ring-token-border-focus outline-none"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="monthly-plan-year"
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary ml-1"
            >
              Año
            </label>
            <select
              id="monthly-plan-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full h-11 px-4 bg-token-surface-card border border-token-border-technical rounded-md text-xs font-bold text-token-text-primary focus:ring-2 focus:ring-token-border-focus outline-none"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Input
              id="monthly-plan-pattern-name"
              label="Nombre del Patrón"
              value={patternName}
              onChange={(e) => setPatternName(e.target.value)}
              placeholder="Ej: Plan Mensual Dic 2026"
              className="h-11 py-2!"
            />
            {selectedEmployeeId && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => void handleSuggestName()}
                loading={isSuggestingName}
                className="w-full"
              >
                <SparklesIcon className="w-3.5 h-3.5 mr-1.5" />
                Sugerir nombre
              </Button>
            )}
          </div>
        </div>
      </Card>

      {!selectedEmployeeId ? (
        <Card>
          <EmptyState
            icon={<CalendarDaysIcon className="w-8 h-8 text-token-accent-brand" />}
            title="Seleccione un colaborador"
            description="Elija un colaborador, mes y año para cargar su malla actual y configurar la planificación mensual."
          />
        </Card>
      ) : isLoadingPlan ? (
        <Card>
          <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-token-text-secondary">
            Cargando planificación del mes...
          </div>
        </Card>
      ) : isPlanError ? (
        <Card>
          <EmptyState
            icon={<CalendarDaysIcon className="w-8 h-8 text-token-status-error" />}
            title="No se pudo cargar el plan mensual"
            description={toCaughtError(planError).message}
          />
        </Card>
      ) : (
        <Card
          title="Distribución Diaria del Mes"
          badge={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="xs" onClick={handleApplyWeekdays}>
                Lun–Vie Trabajo
              </Button>
              <Button variant="secondary" size="xs" onClick={handleClearAllRest}>
                Todo Descanso
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSaving}
                disabled={isSaving || rows.length === 0}
                onClick={() => void handleSaveMonthlyPlan()}
              >
                Guardar Plan Mensual
              </Button>
            </div>
          }
        >
          <div className="flex flex-wrap items-end gap-4 mb-4 p-3 bg-token-surface-stripe border border-token-border-subtle rounded-md">
            <div className="w-36">
              <Input
                id="monthly-plan-default-start"
                label="Entrada Base"
                type="time"
                value={defaultStartTime}
                onChange={(e) => setDefaultStartTime(e.target.value)}
                className="py-2!"
              />
            </div>
            <div className="w-36">
              <Input
                id="monthly-plan-default-end"
                label="Salida Base"
                type="time"
                value={defaultEndTime}
                onChange={(e) => setDefaultEndTime(e.target.value)}
                className="py-2!"
              />
            </div>
          </div>

          <div
            role="region"
            aria-label="Grilla de días de planificación mensual"
            className="max-h-[480px] overflow-y-auto focus:outline-hidden border border-token-border-subtle rounded-md divide-y divide-token-border-subtle"
          >
            {rows.map((row) => {
              const hours = row.type === "work" ? computeShiftHours(row.startTime, row.endTime) : 0;
              return (
                <div
                  key={row.dateIso}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-token-surface-card hover:bg-token-surface-hover"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="typo-list-value w-8 text-center text-token-text-primary">
                      {String(row.day).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="typo-list-primary uppercase">{row.dayOfWeek}</div>
                      <div className="typo-list-secondary text-token-text-tertiary">
                        {row.dateIso} · Actual: {row.currentScheduleText}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={row.type === "work" ? "success" : "secondary"}
                      size="xs"
                      onClick={() => handleToggleDayType(row.day)}
                      aria-label={`Cambiar estado día ${row.day}`}
                    >
                      {row.type === "work" ? "Trabajo" : "Descanso"}
                    </Button>

                    {row.type === "work" && (
                      <>
                        <label htmlFor={`start-${row.day}`} className="sr-only">
                          Hora entrada día {row.day}
                        </label>
                        <input
                          id={`start-${row.day}`}
                          type="time"
                          value={row.startTime}
                          onChange={(e) => handleTimeChange(row.day, "startTime", e.target.value)}
                          className="h-9 px-2 bg-token-surface-card border border-token-border-technical rounded-sm text-xs font-mono text-token-text-primary"
                        />
                        <span className="text-xs text-token-text-tertiary">-</span>
                        <label htmlFor={`end-${row.day}`} className="sr-only">
                          Hora salida día {row.day}
                        </label>
                        <input
                          id={`end-${row.day}`}
                          type="time"
                          value={row.endTime}
                          onChange={(e) => handleTimeChange(row.day, "endTime", e.target.value)}
                          className="h-9 px-2 bg-token-surface-card border border-token-border-technical rounded-sm text-xs font-mono text-token-text-primary"
                        />
                        <Badge variant="neutral" size="sm" fontMono>
                          {hours.toFixed(1)}h
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default WizardContainer;
