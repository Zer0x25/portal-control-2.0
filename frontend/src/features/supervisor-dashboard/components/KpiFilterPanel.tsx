import React, { useState, useEffect, useMemo, FC } from "react";
import { useEmployees } from "../../../hooks/useEmployees";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { usePeriodNavigator } from "../../../hooks/usePeriodNavigator";
import { getBusinessDateRangePreset, getChileDateISO } from "../../../utils/dateUtils";
import {
  FunnelIcon,
  UsersIcon,
  MapPinIcon,
  CalendarDaysIcon,
} from "../../../components/ui/icons/index";
import { Employee } from "../../../types/index";
import CalendarMonthSelector from "../../../components/ui/CalendarMonthSelector";

interface KpiFilterPanelProps {
  onFiltersChange: (filters: {
    employees: Employee[];
    startDate: string | null;
    endDate: string | null;
  }) => void;
  isLoading?: boolean;
}

/**
 * 🛠️ KpiFilterPanel: Sistema de Filtrado Analítico
 * Refactorizado bajo el estándar Industrial-Elegant
 */
const KpiFilterPanel: FC<KpiFilterPanelProps> = ({ onFiltersChange, isLoading }) => {
  const businessNow = useBusinessNow({ tickMs: null });
  const periodNavigator = usePeriodNavigator("month");
  const { activeEmployees, isLoadingEmployees } = useEmployees();

  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedWorkdayType, setSelectedWorkdayType] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  type PeriodMode = "month" | "quarter" | "semester" | "year" | "custom";
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [customStartDate, setCustomStartDate] = useState<string>(getChileDateISO());
  const [customEndDate, setCustomEndDate] = useState<string>(getChileDateISO());

  const { startDate, endDate } = useMemo(() => {
    switch (periodMode) {
      case "custom":
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      case "quarter":
        return getBusinessDateRangePreset("quarter", businessNow);
      case "semester":
        return getBusinessDateRangePreset("semester", businessNow);
      case "year":
        return getBusinessDateRangePreset("year", businessNow);
      default: {
        return getBusinessDateRangePreset("month", periodNavigator.currentDate);
      }
    }
  }, [businessNow, periodNavigator.currentDate, periodMode, customStartDate, customEndDate]);

  useEffect(() => {
    setSelectedWorkdayType("");
    setSelectedArea("");
    setSelectedEmployeeId("");
  }, [startDate, endDate]);

  const employeesInDateRange = useMemo(() => activeEmployees, [activeEmployees]);

  const availableWorkdayTypes = useMemo(() => {
    return Array.from(new Set(employeesInDateRange.map((e) => e.workdayType).filter(Boolean))).sort(
      (a, b) => String(a).localeCompare(String(b)),
    ) as string[];
  }, [employeesInDateRange]);

  const employeesAfterWorkdayTypeFilter = useMemo(() => {
    if (!selectedWorkdayType) return employeesInDateRange;
    return employeesInDateRange.filter((e) => e.workdayType === selectedWorkdayType);
  }, [employeesInDateRange, selectedWorkdayType]);

  const availableAreas = useMemo(() => {
    return Array.from(
      new Set(employeesAfterWorkdayTypeFilter.map((e) => e.area).filter(Boolean)),
    ).sort((a, b) => String(a).localeCompare(String(b))) as string[];
  }, [employeesAfterWorkdayTypeFilter]);

  const employeesForEmployeeDropdown = useMemo(() => {
    if (!selectedArea) return employeesAfterWorkdayTypeFilter;
    return employeesAfterWorkdayTypeFilter.filter((e) => e.area === selectedArea);
  }, [employeesAfterWorkdayTypeFilter, selectedArea]);

  const employeesToAnalyze = useMemo(() => {
    if (!selectedEmployeeId) return employeesForEmployeeDropdown;
    return employeesForEmployeeDropdown.filter((emp) => emp.id === selectedEmployeeId);
  }, [employeesForEmployeeDropdown, selectedEmployeeId]);

  const handleApplyFilters = () => {
    onFiltersChange({
      employees: employeesToAnalyze,
      startDate,
      endDate,
    });
  };

  const handleMonthChange = (newDate: Date) => {
    periodNavigator.setCurrentDate(newDate);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(periodNavigator.currentDate);
    newDate.setUTCMonth(newDate.getUTCMonth() - 1);
    handleMonthChange(newDate);
  };

  const handleNextMonth = () => {
    if (periodNavigator.isViewingCurrentPeriod) return;
    periodNavigator.handleNext();
  };

  if (isLoadingEmployees)
    return (
      <div className="p-8 text-center text-token-text-tertiary font-black uppercase tracking-widest text-[10px] animate-pulse">
        Sincronizando parámetros de equipo...
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Search Header and Period Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-token-border-subtle pb-6 gap-6">
        <h2 className="text-[11px] font-black text-sap-blue uppercase tracking-[0.2em] flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-sap-blue animate-pulse" />
          Análisis Operativo Estratégico
        </h2>

        <div className="flex bg-token-surface-stripe p-1 rounded-sm border border-token-border-technical">
          {(["month", "quarter", "semester", "year", "custom"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPeriodMode(mode)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm ${
                periodMode === mode
                  ? "bg-sap-blue text-white shadow-sm"
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
        <div className="shrink-0">
          {periodMode === "month" ? (
            <CalendarMonthSelector
              currentDate={periodNavigator.currentDate}
              onChange={handleMonthChange}
              label="VENTANA CRONOLÓGICA"
              viewMode="month"
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
            />
          ) : periodMode === "custom" ? (
            <div className="flex items-end gap-4 bg-token-surface-card p-5 rounded-sm border border-sap-blue/20 shadow-sm animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest ml-1">
                  Inicio
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-token-surface-stripe border border-token-border-technical rounded-sm px-4 py-2 text-[11px] font-bold text-token-text-primary focus:ring-1 focus:ring-sap-blue outline-none transition-all uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest ml-1">
                  Término
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-token-surface-stripe border border-token-border-technical rounded-sm px-4 py-2 text-[11px] font-bold text-token-text-primary focus:ring-1 focus:ring-sap-blue outline-none transition-all uppercase"
                />
              </div>
            </div>
          ) : (
            <div className="bg-sap-blue/3 border border-sap-blue/10 p-5 rounded-sm flex flex-col justify-center min-w-[200px] h-[78px] animate-in fade-in duration-500">
              <span className="text-[10px] font-black text-sap-blue uppercase tracking-widest opacity-60">
                Periodo Automático
              </span>
              <span className="text-[13px] font-bold text-token-text-primary uppercase mt-1">
                {periodMode === "quarter" && "Trimestre Actual"}
                {periodMode === "semester" && "Semestre Actual"}
                {periodMode === "year" && `Año Fiscal ${businessNow.getFullYear()}`}
              </span>
            </div>
          )}
        </div>

        <div className="grow grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="relative group">
            <label className="text-[11px] font-semibold text-token-text-tertiary mb-1.5 ml-1 block">
              Tipo de Jornada
            </label>
            <div className="absolute left-4 top-[38px] -translate-y-1/2 text-sap-blue opacity-40 pointer-events-none group-focus-within:opacity-100 transition-opacity">
              <FunnelIcon className="w-4 h-4" />
            </div>
            <select
              value={selectedWorkdayType}
              onChange={(e) => setSelectedWorkdayType(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-token-surface-stripe border border-token-border-technical rounded-sm appearance-none focus:ring-1 focus:ring-sap-blue outline-none transition-all text-[11px] font-bold text-token-text-primary uppercase tracking-tight shadow-sm hover:bg-token-surface-active cursor-pointer"
            >
              <option value="">Todas las Jornadas</option>
              {availableWorkdayTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <label className="text-[11px] font-semibold text-token-text-tertiary mb-1.5 ml-1 block">
              Filtrar por Área
            </label>
            <div className="absolute left-4 top-[38px] -translate-y-1/2 text-sap-blue opacity-40 pointer-events-none group-focus-within:opacity-100 transition-opacity">
              <MapPinIcon className="w-4 h-4" />
            </div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-token-surface-stripe border border-token-border-technical rounded-sm appearance-none focus:ring-1 focus:ring-sap-blue outline-none transition-all text-[11px] font-bold text-token-text-primary uppercase tracking-tight shadow-sm hover:bg-token-surface-active cursor-pointer"
            >
              <option value="">Todas las Áreas</option>
              {availableAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="relative group md:col-span-1 xl:col-span-2">
            <label className="text-[11px] font-semibold text-token-text-tertiary mb-1.5 ml-1 block">
              Especificar Colaborador
            </label>
            <div className="absolute left-4 top-[38px] -translate-y-1/2 text-sap-blue opacity-40 pointer-events-none group-focus-within:opacity-100 transition-opacity">
              <UsersIcon className="w-4 h-4" />
            </div>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-token-surface-stripe border border-token-border-technical rounded-sm appearance-none focus:ring-1 focus:ring-sap-blue outline-none transition-all text-[11px] font-bold text-token-text-primary uppercase tracking-tight shadow-sm hover:bg-token-surface-active cursor-pointer"
            >
              <option value="">TODOS LOS EMPLEADOS</option>
              {employeesForEmployeeDropdown.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleApplyFilters}
          disabled={isLoading}
          className={`group relative flex items-center gap-3 px-8 py-3.5 rounded-sm font-black text-[12px] uppercase tracking-[0.15em] shadow-lg transition-all duration-300 ${
            isLoading
              ? "bg-sap-blue/50 text-white/50 cursor-not-allowed shadow-none"
              : "bg-sap-blue text-white shadow-sap-blue/20 hover:bg-sap-blue/90 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CalendarDaysIcon className="w-4 h-4" />
          )}
          {isLoading ? "Calculando..." : "Calcular Métricas"}
          <div
            className={`w-1.5 h-1.5 rounded-full bg-white ml-1 ${
              isLoading ? "animate-bounce" : "animate-pulse"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default KpiFilterPanel;
