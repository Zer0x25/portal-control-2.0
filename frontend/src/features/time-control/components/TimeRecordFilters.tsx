import React, { useMemo, useState } from "react";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { QuickFilterMode } from "../hooks/useTimeRecordFilters";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { toBusinessDateChile } from "../../../utils/dateUtils";

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

const TimeRecordFilters: React.FC<TimeRecordFiltersProps> = React.memo(
  ({
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

    const { activeEmployees } = useEmployees();
    const { allRecordsInDateRange, isLoadingRecords } = useTimeRecords();
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [isExpanded, setIsExpanded] = useState(!isMobile);

    const employeesInDateRange = useMemo(() => {
      if (isLoadingRecords) return activeEmployees;
      const employeeIdsWithRecordsInPeriod = new Set(
        allRecordsInDateRange?.map((r: { employeeId: string }) => r.employeeId) || [],
      );
      return activeEmployees.filter((e) => employeeIdsWithRecordsInPeriod.has(e.id));
    }, [allRecordsInDateRange, activeEmployees, isLoadingRecords]);

    const availableWorkdayTypes = useMemo(() => {
      return Array.from(new Set(employeesInDateRange.map((e) => e.workdayType))).sort();
    }, [employeesInDateRange]);

    const employeesAfterWorkdayTypeFilter = useMemo(() => {
      if (!clientFilters.workdayType) return employeesInDateRange;
      return employeesInDateRange.filter((e) => e.workdayType === clientFilters.workdayType);
    }, [employeesInDateRange, clientFilters.workdayType]);

    const availableAreas = useMemo(() => {
      return Array.from(new Set(employeesAfterWorkdayTypeFilter.map((e) => e.area))).sort();
    }, [employeesAfterWorkdayTypeFilter]);

    const availableStatuses = useMemo(() => {
      return [...CANONICAL_TIME_RECORD_STATUSES];
    }, []);

    return (
      <div className="space-y-6">
        <div className="flex flex-col">
          {/* Context Info (since we removed the header) */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-tertiary block mb-0.5">
                Periodo Actual
              </span>
              <div className="text-[11px] text-sap-blue font-black uppercase tracking-tight">
                {periodDisplayText}
              </div>
            </div>
            {isMobile && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 px-3 rounded-md font-black uppercase tracking-widest text-[9px] bg-token-surface-card border border-token-border-technical"
              >
                {isExpanded ? "Ocultar Filtros" : "Mostrar Filtros"}
              </Button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {!isExpanded && isMobile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-sap-blue dark:text-sap-light-blue font-bold mt-2 pt-2 border-t border-token-border-subtle capitalize"
              >
                {periodDisplayText}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={isMobile ? { opacity: 0, height: 0, marginTop: 0 } : false}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-6">
                  {/* MAIN CONTROLS ROW */}
                  <div className="flex flex-col xl:flex-row pb-4 gap-4 items-end flex-wrap">
                    {/* 1. Tipo Jornada */}
                    <div className="w-full md:w-auto min-w-[180px]">
                      <label
                        htmlFor="filtroWorkdayType"
                        className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary mb-2 block"
                      >
                        Tipo Jornada
                      </label>
                      <select
                        id="filtroWorkdayType"
                        name="workdayType"
                        value={clientFilters.workdayType}
                        onChange={(e) => onClientFilterChange({ workdayType: e.target.value })}
                        className="block w-full px-4 py-2 bg-token-surface-card border border-token-border-technical rounded-md focus:ring-1 focus:ring-sap-blue focus:border-sap-blue text-[11px] font-black uppercase tracking-tight text-token-text-primary transition-all h-10"
                      >
                        <option value="">TODOS LOS TIPOS</option>
                        {availableWorkdayTypes.map((type: string) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Área Operativa */}
                    <div className="w-full md:w-auto min-w-[180px]">
                      <label
                        htmlFor="filtroAreaTC"
                        className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary mb-2 block"
                      >
                        Área Operativa
                      </label>
                      <select
                        id="filtroAreaTC"
                        name="area"
                        value={clientFilters.area}
                        onChange={(e) => onClientFilterChange({ area: e.target.value })}
                        className="block w-full px-4 py-2 bg-token-surface-card border border-token-border-technical rounded-md focus:ring-1 focus:ring-sap-blue focus:border-sap-blue text-[11px] font-black uppercase tracking-tight text-token-text-primary transition-all h-10"
                      >
                        <option value="">TODAS LAS ÁREAS</option>
                        {availableAreas.map((area: string) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Estado */}
                    <div className="w-full md:w-auto min-w-[180px]">
                      <label
                        htmlFor="filtroEstadoTC"
                        className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary mb-2 block"
                      >
                        Estado
                      </label>
                      <select
                        id="filtroEstadoTC"
                        name="status"
                        value={clientFilters.status}
                        onChange={(e) => onClientFilterChange({ status: e.target.value })}
                        className="block w-full px-4 py-2 bg-token-surface-card border border-token-border-technical rounded-md focus:ring-1 focus:ring-sap-blue focus:border-sap-blue text-[11px] font-black uppercase tracking-tight text-token-text-primary transition-all h-10"
                      >
                        <option value="">TODOS LOS ESTADOS</option>
                        {availableStatuses.map((status: string) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Quick Filters (24h, 7d, 31d) */}
                    <div className="w-full md:w-auto">
                      <span className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary mb-2 block">
                        Rango Rápido
                      </span>
                      <div className="flex p-1 bg-token-surface-stripe border border-token-border-technical rounded-md w-full md:w-auto h-10 items-center">
                        {(["24h", "week", "month"] as QuickFilterMode[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => onQuickFilterClick(p)}
                            className={`flex-1 min-w-[60px] h-full px-4 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all duration-300
                              ${
                                activeQuickFilter === p
                                  ? "bg-sap-blue text-white shadow-sm"
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
                    <div className="hidden xl:block w-px h-10 bg-token-border-technical mx-2" />

                    {/* 5. Custom Range Picker */}
                    <div className="grid grid-cols-2 md:flex md:items-end gap-2 w-full xl:w-auto">
                      <div className="col-span-1 md:w-32">
                        <Input
                          type="date"
                          label="Desde"
                          value={dateFilters.desde}
                          onChange={(e) => onDateFilterChange({ desde: e.target.value })}
                          className="h-10 py-2 text-[11px] uppercase w-full"
                          max={maxBusinessDate}
                        />
                      </div>
                      <div className="col-span-1 md:w-32">
                        <Input
                          type="date"
                          label="Hasta"
                          value={dateFilters.hasta}
                          onChange={(e) => onDateFilterChange({ hasta: e.target.value })}
                          className="h-10 py-2 text-[11px] uppercase w-full"
                          max={maxBusinessDate}
                        />
                      </div>
                      <Button
                        onClick={onApplyCustomFilters}
                        disabled={!isApplyButtonEnabled}
                        variant="primary"
                        className="col-span-1 md:w-auto h-10 px-4 md:px-6 rounded-md font-black uppercase tracking-widest text-[10px] mb-px"
                      >
                        Aplicar
                      </Button>
                      <Button
                        onClick={onClearFilters}
                        variant="secondary"
                        className="col-span-1 md:w-auto h-10 px-4 rounded-md font-black uppercase tracking-widest text-[10px] bg-token-surface-card border border-token-border-technical hover:bg-token-surface-active shadow-sm mb-px"
                        title="Limpiar Filtros"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  },
);

export default TimeRecordFilters;
