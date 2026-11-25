import React, { useEffect, useState } from "react";
import { useClockingEmployeeOptionsQuery } from "../../../hooks/queries/useEmployeesQuery";
import { useTimeRecordsQuery } from "../../../hooks/queries/useTimeRecordsQuery";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import FilterSelect from "../../../components/ui/FilterSelect";
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
              className="h-11 min-h-11 px-3 shrink-0 rounded-md font-black uppercase tracking-widest text-xxs bg-token-surface-card border border-token-border-technical"
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
              {/* CONTROLES DE FILTRO: grilla unica para evitar recortes entre breakpoints.
                    items-end alinea los controles por su base: la casilla de fechas no lleva
                    encabezado (sus labels "Desde"/"Hasta" ya son autoexplicativos), asi que
                    sin esto quedaria 23px arriba respecto a "Rango Rapido" y "Acciones". */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 pb-4 items-end">
                {/* 1. Tipo Jornada */}
                <FilterSelect
                  id="filtroWorkdayType"
                  label="Tipo Jornada"
                  value={clientFilters.workdayType}
                  onChange={(e) => onClientFilterChange({ workdayType: e.target.value })}
                  options={[
                    { value: "", label: "Todos los Tipos" },
                    ...availableWorkdayTypes.map((type) => ({ value: type, label: type })),
                  ]}
                />

                {/* 2. Área Operativa */}
                <FilterSelect
                  id="filtroAreaTC"
                  label="Área Operativa"
                  value={clientFilters.area}
                  onChange={(e) => onClientFilterChange({ area: e.target.value })}
                  options={[
                    { value: "", label: "Todas las Áreas" },
                    ...availableAreas.map((area) => ({ value: area, label: area })),
                  ]}
                />

                {/* 3. Estado */}
                <FilterSelect
                  id="filtroEstadoTC"
                  label="Estado"
                  value={clientFilters.status}
                  onChange={(e) => onClientFilterChange({ status: e.target.value })}
                  options={[
                    { value: "", label: "Todos los Estados" },
                    ...availableStatuses.map((status) => ({ value: status, label: status })),
                  ]}
                />

                {/* 4. Rango rapido (24h / 7d / 31d) */}
                <div className="w-full">
                  <span className="text-xxs font-black uppercase tracking-widest text-token-text-secondary mb-2 block">
                    Rango Rápido
                  </span>
                  <div className="flex p-1 bg-token-surface-stripe border border-token-border-technical rounded-md w-full h-11 min-h-11 items-center">
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
                        className={`flex-1 min-w-15 h-full min-h-10 px-4 rounded-sm text-xxs font-black uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-token-border-focus focus-visible:ring-offset-1 focus-visible:ring-offset-token-surface-card
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

                {/* 5. Rango de fechas: Desde y Hasta en su propia casilla.
                      Cada Input trae su propio <label>, que aqui se oculta con sr-only: el
                      titulo "Fechas" ya cubre la casilla y el label visible apilaba una
                      segunda linea de etiquetas que bajaba los controles 23px. */}
                <div className="w-full">
                  <span className="text-xxs font-black uppercase tracking-widest text-token-text-secondary mb-2 block">
                    Fechas
                  </span>
                  <div className="flex items-end gap-2 md:gap-3 w-full">
                    <div className="min-w-0 flex-1 basis-0">
                      <div className="[&>label]:sr-only">
                        <Input
                          type="date"
                          label="Desde"
                          aria-label="Desde"
                          value={dateFilters.desde}
                          onChange={(e) => onDateFilterChange({ desde: e.target.value })}
                          className="h-11 min-h-11 py-2 text-[11px] md:text-[12px] uppercase"
                          max={maxBusinessDate}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 basis-0">
                      <div className="[&>label]:sr-only">
                        <Input
                          type="date"
                          label="Hasta"
                          aria-label="Hasta"
                          value={dateFilters.hasta}
                          onChange={(e) => onDateFilterChange({ hasta: e.target.value })}
                          className="h-11 min-h-11 py-2 text-[11px] md:text-[12px] uppercase"
                          max={maxBusinessDate}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Acciones: Aplicar y Limpiar en su propia casilla */}
                <div className="w-full">
                  <span className="text-xxs font-black uppercase tracking-widest text-token-text-secondary mb-2 block">
                    Acciones
                  </span>
                  <div className="flex items-end gap-2 md:gap-3 w-full">
                    <Button
                      onClick={onApplyCustomFilters}
                      disabled={!isApplyButtonEnabled}
                      variant="primary"
                      className="flex-1 h-11 min-h-11 px-4 xl:px-5 rounded-md font-black uppercase tracking-widest text-xxs"
                    >
                      Aplicar
                    </Button>
                    <Button
                      onClick={onClearFilters}
                      variant="secondary"
                      className="flex-1 h-11 min-h-11 px-4 xl:px-5 rounded-md font-black uppercase tracking-widest text-xxs bg-token-surface-card border border-token-border-technical hover:bg-token-surface-active shadow-sm"
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
    </div>
  );
};

const ProfiledTimeRecordFilters: React.FC<TimeRecordFiltersProps> = (props) =>
  profileReactSubtree("time-control:filters", <TimeRecordFiltersImpl {...props} />);

export default import.meta.env.DEV ? ProfiledTimeRecordFilters : TimeRecordFiltersImpl;
