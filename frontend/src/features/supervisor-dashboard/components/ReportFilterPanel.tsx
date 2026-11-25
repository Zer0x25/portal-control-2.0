import React, { useState, useEffect, FC } from "react";
import { addMonths } from "date-fns";
import { useEmployees } from "../../../hooks/useEmployees";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { getBusinessDateRangePreset, getChileDateISO } from "../../../utils/dateUtils";
import {
  FunnelIcon,
  UsersIcon,
  MapPinIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../../components/ui/icons/index";
import AuditMonthSelector from "../../../components/ui/AuditMonthSelector";
import FilterSelect from "../../../components/ui/FilterSelect";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

interface ReportFilterPanelProps {
  onFiltersChange: (filters: {
    employeeId: string;
    area: string;
    workdayType: string;
    startDateISO: string;
    endDateISO: string;
  }) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const ReportFilterPanel: FC<ReportFilterPanelProps> = ({
  onFiltersChange,
  onGenerate,
  isLoading,
}) => {
  const businessNow = useBusinessNow({ tickMs: null });
  const { activeEmployees, isLoadingEmployees } = useEmployees();

  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedWorkdayType, setSelectedWorkdayType] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const [activeDate, setActiveDate] = useState(() => new Date(businessNow));
  type PeriodMode = "month" | "quarter" | "semester" | "year" | "custom";
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [customStartDate, setCustomStartDate] = useState<string>(getChileDateISO());
  const [customEndDate, setCustomEndDate] = useState<string>(getChileDateISO());
  // Ancla editable de los presets (trimestre/semestre/año): permite navegar
  // entre periodos sin quedar anclado al actual.
  const [presetAnchor, setPresetAnchor] = useState<Date>(() => new Date(businessNow));

  const { startDateISO, endDateISO } = (() => {
    if (periodMode === "custom") {
      return {
        startDateISO: customStartDate,
        endDateISO: customEndDate,
      };
    }

    switch (periodMode) {
      case "quarter":
        return (() => {
          const { startDate, endDate } = getBusinessDateRangePreset("quarter", presetAnchor);
          return { startDateISO: startDate, endDateISO: endDate };
        })();
      case "semester":
        return (() => {
          const { startDate, endDate } = getBusinessDateRangePreset("semester", presetAnchor);
          return { startDateISO: startDate, endDateISO: endDate };
        })();
      case "year":
        return (() => {
          const { startDate, endDate } = getBusinessDateRangePreset("year", presetAnchor);
          return { startDateISO: startDate, endDateISO: endDate };
        })();
      default:
        return (() => {
          const { startDate, endDate } = getBusinessDateRangePreset("month", activeDate);
          return { startDateISO: startDate, endDateISO: endDate };
        })();
    }
  })();

  const presetStepMonths = periodMode === "year" ? 12 : periodMode === "semester" ? 6 : 3;

  const shiftPresetAnchor = (delta: number) => {
    const shifted = addMonths(presetAnchor, delta * presetStepMonths);
    // El ancla arranca en el periodo en curso y solo puede retroceder.
    if (shifted > businessNow) return;
    setPresetAnchor(shifted);
  };

  // El botón "Siguiente" se desactiva al llegar al periodo en curso.
  const presetShiftDisabled =
    periodMode !== "month" && addMonths(presetAnchor, presetStepMonths) > businessNow;

  const presetLabel = (() => {
    if (periodMode === "year") return `Año ${presetAnchor.getFullYear()}`;
    if (periodMode === "semester") {
      return `Semestre ${presetAnchor.getMonth() < 6 ? "1" : "2"} ${presetAnchor.getFullYear()}`;
    }
    return `Trimestre ${Math.floor(presetAnchor.getMonth() / 3) + 1} ${presetAnchor.getFullYear()}`;
  })();

  useEffect(() => {
    onFiltersChange({
      employeeId: selectedEmployeeId,
      area: selectedArea,
      workdayType: selectedWorkdayType,
      startDateISO,
      endDateISO,
    });
  }, [
    selectedEmployeeId,
    selectedArea,
    selectedWorkdayType,
    startDateISO,
    endDateISO,
    onFiltersChange,
  ]);

  const employeesInDateRange = activeEmployees;

  const availableWorkdayTypes = Array.from(
    new Set(employeesInDateRange.map((e) => e.workdayType).filter(Boolean)),
  ).sort((a, b) => String(a).localeCompare(String(b))) as string[];

  const employeesAfterWorkdayTypeFilter = (() => {
    if (!selectedWorkdayType) return employeesInDateRange;
    return employeesInDateRange.filter((e) => e.workdayType === selectedWorkdayType);
  })();

  const availableAreas = Array.from(
    new Set(employeesAfterWorkdayTypeFilter.map((e) => e.area).filter(Boolean)),
  ).sort((a, b) => String(a).localeCompare(String(b))) as string[];

  const employeesForEmployeeDropdown = (() => {
    if (!selectedArea) return employeesAfterWorkdayTypeFilter;
    return employeesAfterWorkdayTypeFilter.filter((e) => e.area === selectedArea);
  })();

  if (isLoadingEmployees)
    return (
      <div className="p-8 text-center text-token-text-tertiary font-black uppercase tracking-widest text-[10px] animate-pulse">
        Sincronizando parámetros de reporte...
      </div>
    );

  return (
    <div className="bg-token-surface-card p-6 md:p-8 rounded-sm border border-token-border-technical shadow-sm space-y-8">
      {/* Search Header and Period Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-token-border-subtle pb-6 gap-6">
        <div className="space-y-1">
          <h2 className="text-[11px] font-black text-token-accent-brand uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-token-accent-brand animate-pulse" />
            Extracción Documental Parametrizada
          </h2>
          <p className="text-xxs font-bold text-token-text-tertiary uppercase tracking-widest ml-4.5 opacity-60">
            Protocolos de segmentación corporativa
          </p>
        </div>

        <div className="flex flex-wrap bg-token-surface-stripe p-1 rounded-sm border border-token-border-technical">
          {(["month", "quarter", "semester", "year", "custom"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={periodMode === mode}
              onClick={() => setPeriodMode(mode)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm ${
                periodMode === mode
                  ? "bg-token-accent-brand text-white shadow-sm"
                  : "text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-active"
              }`}
            >
              {mode === "month" && "Mensual"}
              {mode === "quarter" && "Trimestral"}
              {mode === "semester" && "Semestral"}
              {mode === "year" && "Anual"}
              {mode === "custom" && "Personalizado"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-end gap-10">
        <div className="min-w-0 shrink-0">
          {periodMode === "month" ? (
            <AuditMonthSelector currentDate={activeDate} onChange={setActiveDate} />
          ) : periodMode === "custom" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-token-surface-card p-5 rounded-sm border border-token-accent-brand/20 shadow-sm animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="min-w-0 space-y-1.5">
                <label
                  htmlFor="report-custom-start"
                  className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest ml-1"
                >
                  Inicio
                </label>
                <input
                  id="report-custom-start"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-token-surface-stripe border border-token-border-technical rounded-sm px-4 py-2 text-[11px] font-bold text-token-text-primary focus:ring-1 focus:ring-token-accent-brand outline-none transition-all uppercase"
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <label
                  htmlFor="report-custom-end"
                  className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest ml-1"
                >
                  Término
                </label>
                <input
                  id="report-custom-end"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-token-surface-stripe border border-token-border-technical rounded-sm px-4 py-2 text-[11px] font-bold text-token-text-primary focus:ring-1 focus:ring-token-accent-brand outline-none transition-all uppercase"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-token-surface-card p-1 rounded-sm border border-token-border-subtle group transition-colors shadow-sm">
              <button
                type="button"
                onClick={() => shiftPresetAnchor(-1)}
                title="Anterior"
                className="p-2 rounded-sm hover:bg-token-surface-active transition-all active:scale-95 border border-transparent hover:border-token-border-subtle text-token-text-tertiary"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>
              <div
                aria-live="polite"
                className="flex flex-col items-center justify-center px-4 border-x border-token-border-subtle min-w-[160px] text-center py-1 rounded-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-token-text-tertiary leading-none mb-1.5">
                  Periodo de Consulta
                </p>
                <p className="text-[13px] font-bold capitalize tracking-tight text-token-text-primary leading-none whitespace-nowrap">
                  {presetLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => shiftPresetAnchor(1)}
                disabled={presetShiftDisabled}
                title="Siguiente"
                className="p-2 rounded-sm transition-all border border-transparent text-token-text-tertiary disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:bg-token-surface-active enabled:hover:border-token-border-subtle enabled:active:scale-95"
              >
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="grow grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
          <FilterSelect
            id="report-workday-type"
            label="Tipo de Jornada"
            icon={<FunnelIcon className="w-4 h-4" />}
            value={selectedWorkdayType}
            onChange={(e) => setSelectedWorkdayType(e.target.value)}
            options={[
              { value: "", label: "Todas las Jornadas" },
              ...availableWorkdayTypes.map((t) => ({ value: t, label: t })),
            ]}
          />

          <FilterSelect
            id="report-area"
            label="Ubicación / Área"
            icon={<MapPinIcon className="w-4 h-4" />}
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            options={[
              { value: "", label: "Todas las Áreas" },
              ...availableAreas.map((a) => ({ value: a, label: a })),
            ]}
          />

          <FilterSelect
            id="report-employee"
            label="Colaborador Específico"
            icon={<UsersIcon className="w-4 h-4" />}
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            options={[
              { value: "", label: "Resumen de Equipo (General)" },
              ...employeesForEmployeeDropdown.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />
        </div>
      </div>

      {/* Action Button Section */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className={`group relative flex items-center gap-3 bg-token-accent-brand text-white px-10 py-4 rounded-sm font-black text-[12px] uppercase tracking-[0.15em] shadow-lg shadow-token-accent-brand/20 hover:bg-token-accent-brand/90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none`}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
          {isLoading ? (
            <LoadingSpinner size="xs" variant="onAccent" />
          ) : (
            <DocumentTextIcon className="w-4 h-4" />
          )}
          {isLoading ? "Procesando Datos..." : "Generar Reporte"}
          {!isLoading && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-1" />}
        </button>
      </div>
    </div>
  );
};

export default ReportFilterPanel;
