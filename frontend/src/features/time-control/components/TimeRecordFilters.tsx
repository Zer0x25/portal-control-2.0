import React, { useEffect, useState } from "react";
import { useClockingEmployeeOptionsQuery } from "../../../hooks/queries/useEmployeesQuery";
import { useTimeRecordsQuery } from "../../../hooks/queries/useTimeRecordsQuery";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { QuickFilterMode } from "../hooks/useTimeRecordFilters";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { toBusinessDateChile } from "../../../utils/dateUtils";
import { profileReactSubtree } from "../../../utils/RenderProfiler";

const CANONICAL_TIME_RECORD_STATUSES = [
  "Laborando",
  "Colacion",
  "Completado",
  "AnomaliaManual",
  "Ausente",
  "Permiso Especial",
  "Vacaciones",
  "DiaLibre",
  "SinMarcajeTurnoAsignado",
] as const;

const FILTER_SELECT_CLASS =
  "block w-full h-11 min-h-[44px] px-3 md:px-4 text-[11px] md:text-[12px] font-black uppercase tracking-tight text-token-text-primary bg-token-surface-card border border-token-border-technical rounded-md shadow-sm transition-all duration-300 cursor-pointer appearance-none focus:ring-2 focus:ring-token-border-focus focus:border-token-accent-brand outline-none disabled:opacity-50 disabled:cursor-not-allowed";

interface TimeRecordFiltersProps {
  clientFilters: { name: string; area: string; workdayType: string; status: string };
  dateFilters: { desde: string; hasta: string; is24h: boolean };
  onClientFilterChange: (updates: Partial<TimeRecordFiltersProps["clientFilters"]>) => void;
  onDateFilterChange: (
    updates: Partial<Omit<TimeRecordFiltersProps["dateFilters"], "is24h">>,
  ) => void;
  onQuickFilterClick: (mode: QuickFilterMode) => void;
  onApplyCustomFilters: () => void;
  onClearFilters: () => void;
  isApplyButtonEnabled: boolean;
  periodDisplayText: string;
  activeQuickFilter: QuickFilterMode | null;
}

const TimeRecordFiltersImpl: React.FC<TimeRecordFiltersProps> = ({
  clientFilters,
  dateFilters,
  onClientFilterChange,
  onDateFilterChange,
  onQuickFilterClick,
  onApplyCustomFilters,
  onClearFilters,
  isApplyButtonEnabled,
  periodDisplayText,
  activeQuickFilter,
}) => {
  const businessNow = useBusinessNow({ tickMs: null });
  const maxBusinessDate = toBusinessDateChile(businessNow);

  const { data: activeEmployees = [] } = useClockingEmployeeOptionsQuery();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const {
    data: recordsQuery,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isError,
  } = useTimeRecordsQuery({
    pageSize: 50,
    filters: {},
    allowCache: false,
    enabled: !isMobile || isExpanded,
  });

  useEffect(() => {
    if ((!isMobile || isExpanded) && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError, isMobile, isExpanded]);

  // Incluir valores históricos de registros, además de empleados activos.
  const options = [
    ...activeEmployees.map((employee) => ({
      area: employee.area,
      workdayType: employee.workdayType,
    })),
    ...(recordsQuery?.pages.flatMap((page) =>
      page.data.map((record) => ({
        area: record.employeeArea,
        workdayType: record.employeeWorkdayType,
      })),
    ) ?? []),
  ];
  const availableWorkdayTypes = Array.from(
    new Set(
      options
        .map((option) => option.workdayType)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const availableAreas = Array.from(
    new Set(
      options
        .filter(
          (option) =>
            !clientFilters.workdayType || option.workdayType === clientFilters.workdayType,
        )
        .map((option) => option.area)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();

  const availableStatuses = [...CANONICAL_TIME_RECORD_STATUSES];

  const ChevronDown = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-token-text-tertiary"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col">
        {/* Context Info + toggle móvil */}
        <div className="flex justify-between items-center gap-3 mb-3 md:mb-4">
          <div className="min-w-0">
            <span className="text-xxs font-black uppercase tracking-[0.2em] text-token-text-tertiary block mb-0.5">
              Periodo Actual
            </span>
            <div className="text-[11px] md:text-xs text-token-accent-brand font-black uppercase tracking-tight truncate">
              {periodDisplayText}
            </div>
          </div>
          {isMobile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-11 min-h-[44px] px-3 shrink-0 rounded-md font-black uppercase tracking-widest text-xxs bg-token-surface-card border border-token-border-technical"
              aria-expanded={isExpanded}
              aria-controls="time-record-filters-panel"
            >
              {isExpanded ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          )}
        </div>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ${!isExpanded && isMobile ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className="overflow-hidden">
            <div className="text-xs text-token-accent-brand font-bold mt-2 pt-2 border-t border-token-border-subtle capitalize">
              {periodDisplayText}
            </div>
          </div>
        </div>

        <div
          id="time-record-filters-panel"
          className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"}`}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 md:space-y-6">
              {(isError || isFetchNextPageError) && (
                <p role="status" className="text-xs text-token-status-error">
                  No se pudieron cargar todas las opciones históricas de filtros.
                </p>
              )}
              {hasNextPage && !isError && !isFetchNextPageError && (
                <p role="status" className="text-xs text-token-text-secondary">
                  Cargando opciones históricas de filtros...
                </p>
              )}
              {/* MAIN CONTROLS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 pb-4">
                {/* 1. Tipo Jornada */}
                <div className="w-full">
                  <label
                    htmlFor="filtroWorkdayType"
                    className="text-xxs font-black uppercase tracking-widest text-token-text-secondary mb-2 block"
                  >
                    Tipo Jornada
                  </label>
                  <div className="relative">
                    <select
                      id="filtroWorkdayType"
                      name="workdayType"
                      value={clientFilters.workdayType}
                      onChange={(e) => onClientFilterChange({ workdayType: e.target.value })}
                      className={FILTER_SELECT_CLASS}
                    >
                      <option value="">TODOS LOS TIPOS</option>
                      {availableWorkdayTypes.map((type: string) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {ChevronDown}
                  </div>
                </div>

                {/* 2. Área Operativa */}
                <div className="w-full">
                  <label
                    htmlFor="filtroAreaTC"
                    className="text-xxs font-black uppercase tracking-widest text-token-text-secondary mb-2 block"
                  >
                    Área Operativa
                  </label>
                  <div className="relative">
                    <select
                      id="filtroAreaTC"
                      name="area"
                      value={clientFilters.area}
                      onChange={(e) => onClientFilterChange({ area: e.target.value })}
                      className={FILTER_SELECT_CLASS}
                    >
                      <option value="">TODAS LAS ÁREAS</option>
                      {availableAreas.map((area: string) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                    {ChevronDown}
                  </div>
                </div>

                {/* 3. Estado */}
                <div className="w-full">
                  <label
                    htmlFor="filtroEstadoTC"
                    className="text-xxs font-black uppercase tracking-widest text-token-text-secondary mb-2 block"
                  >
                    Estado
                  </label>
                  <div className="relative">
                    <select
                      id="filtroEstadoTC"
                      name="status"
                      value={clientFilters.status}
                      onChange={(e) => onClientFilterChange({ status: e.target.value })}
                      className={FILTER_SELECT_CLASS}
                    >
                      <option value="">TODOS LOS ESTADOS</option>
                      {availableStatuses.map((status: string) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {ChevronDown}
                  </div>
                </div>

                {/* 4. Quick Filters (24h, 7d, 31d) */}
                <div className="w-full lg:w-auto">
                  <span className="text-xxs font-black uppercase tracking-widest text-token-text-secondary mb-2 block">
                    Rango Rápido
                  </span>
                  <div className="flex p-1 bg-token-surface-stripe border border-token-border-technical rounded-md w-full lg:w-auto h-11 min-h-[44px] items-center">
                    {(["24h", "week", "month"] as QuickFilterMode[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onQuickFilterClick(p)}
                        aria-label={
                          p === "24h"
                            ? "Filtrar las últimas 24 horas"
                            : p === "week"
                              ? "Filtrar los últimos 7 días"
                              : "Filtrar los últimos 31 días"
                        }
                        aria-pressed={activeQuickFilter === p}
                        className={`flex-1 min-w-15 h-full min-h-[40px] px-4 rounded-sm text-xxs font-black uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-token-border-focus focus-visible:ring-offset-1 focus-visible:ring-offset-token-surface-card
                              ${
                                activeQuickFilter === p
                                  ? "bg-token-accent-brand text-token-text-onAccent shadow-sm"
                                  : "text-token-text-secondary hover:text-token-text-primary hover:bg-token-surface-hover"
                              }
                            `}
                      >
                        {p === "24h" ? "24h" : p === "week" ? "7d" : "31d"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-10 bg-token-border-technical mx-2" />

                {/* 5. Custom Range Picker */}
                <div className="grid grid-cols-2 lg:flex lg:items-end gap-2 md:gap-3 w-full lg:w-auto">
                  <div className="col-span-1 w-full lg:w-36">
                    <Input
                      type="date"
                      label="Desde"
                      aria-label="Desde"
                      value={dateFilters.desde}
                      onChange={(e) => onDateFilterChange({ desde: e.target.value })}
                      className="h-11 min-h-[44px] py-2 text-[11px] md:text-[12px] uppercase"
                      max={maxBusinessDate}
                    />
                  </div>
                  <div className="col-span-1 w-full lg:w-36">
                    <Input
                      type="date"
                      label="Hasta"
                      aria-label="Hasta"
                      value={dateFilters.hasta}
                      onChange={(e) => onDateFilterChange({ hasta: e.target.value })}
                      className="h-11 min-h-[44px] py-2 text-[11px] md:text-[12px] uppercase"
                      max={maxBusinessDate}
                    />
                  </div>
                  <Button
                    onClick={onApplyCustomFilters}
                    disabled={!isApplyButtonEnabled}
                    variant="primary"
                    className="col-span-1 w-full lg:w-auto h-11 min-h-[44px] px-4 lg:px-6 rounded-md font-black uppercase tracking-widest text-xxs"
                  >
                    Aplicar
                  </Button>
                  <Button
                    onClick={onClearFilters}
                    variant="secondary"
                    className="col-span-1 w-full lg:w-auto h-11 min-h-[44px] px-4 rounded-md font-black uppercase tracking-widest text-xxs bg-token-surface-card border border-token-border-technical hover:bg-token-surface-active shadow-sm"
                    title="Limpiar Filtros"
                    aria-label="Limpiar Filtros"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfiledTimeRecordFilters: React.FC<TimeRecordFiltersProps> = (props) =>
  profileReactSubtree("time-control:filters", <TimeRecordFiltersImpl {...props} />);

export default import.meta.env.DEV ? ProfiledTimeRecordFilters : TimeRecordFiltersImpl;
