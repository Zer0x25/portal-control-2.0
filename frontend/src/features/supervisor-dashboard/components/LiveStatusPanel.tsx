import React, { useState, useMemo, useRef } from "react";
import { CLOCKING_STATUS_CONFIG } from "../../../utils/mappings";
import { ClockingStatus, Employee } from "../../../types";
import Input from "../../../components/ui/Input";
import KpiCard from "../../../components/ui/KpiCard";
import { UsersIcon } from "../../../components/ui/icons/index";

interface EmployeeWithStatus {
  employee: Employee;
  status: ClockingStatus;
}

interface LiveStatusPanelProps {
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  employeesWithStatus: EmployeeWithStatus[];
  onEmployeeClick?: (employee: Employee) => void;
}

/**
 * 🛰️ LiveStatusPanel: Monitoreo de Personal en Tiempo Real
 * Limpieza Industrial "DIV clean"
 */
import { useVirtualizer } from "@tanstack/react-virtual";

const LiveStatusPanel: React.FC<LiveStatusPanelProps> = ({
  selectedStatuses,
  onStatusesChange,
  employeesWithStatus,
  onEmployeeClick,
}) => {
  const [nameFilter, setNameFilter] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredEmployees = useMemo(() => {
    return employeesWithStatus.filter(({ employee, status }) => {
      const nameMatch = employee.name.toLowerCase().includes(nameFilter.toLowerCase());

      if (selectedStatuses.includes("all")) return nameMatch;

      const isStatusMatch = selectedStatuses.some((s) => {
        if (s === "en_jornada")
          return status === "en_jornada" || status === "en_jornada_post_colacion";
        return status === s;
      });

      return nameMatch && isStatusMatch;
    });
  }, [employeesWithStatus, nameFilter, selectedStatuses]);

  const virtualizer = useVirtualizer({
    count: filteredEmployees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70, // Rough estimate of row height
    overscan: 5,
  });

  return (
    <KpiCard
      title={
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-token-text-primary">
            Presencia en Tiempo Real
          </span>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              Live
            </span>
          </div>
        </div>
      }
      icon={<UsersIcon />}
      className="h-full"
    >
      <div className="space-y-6 mt-4">
        {/* 🔍 Búsqueda Técnica */}
        <div className="w-full">
          <Input
            type="search"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Filtrar por nombre..."
            className="py-2.5! text-[11px] bg-token-surface-stripe border-token-border-technical focus:border-sap-blue font-semibold rounded-sm placeholder:text-token-text-tertiary placeholder:opacity-50"
          />
          {selectedStatuses.length > 0 && !selectedStatuses.includes("all") && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider">
                Filtros Activos:
              </span>
              <button
                onClick={() => onStatusesChange(["all"])}
                className="text-[10px] font-bold text-sap-blue hover:text-indigo-700 uppercase tracking-wider border-b border-sap-blue/30 transition-all active:scale-95"
              >
                Limpiar Parámetros
              </button>
            </div>
          )}
        </div>

        {/* 📋 Lista de Colaboradores Virtualizada */}
        <div ref={parentRef} className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
          {filteredEmployees.length > 0 ? (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
              className="divide-y divide-token-border-subtle"
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const { employee, status } = filteredEmployees[virtualItem.index];
                const config = CLOCKING_STATUS_CONFIG[status];
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    onClick={() => onEmployeeClick?.(employee)}
                    className="group flex items-center justify-between py-4 hover:bg-token-surface-active cursor-pointer transition-all active:scale-[0.99] border-l-2 border-transparent hover:border-sap-blue px-2"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ring-2 ring-token-surface-card ${config.dot} shadow-[0_0_8px_currentcolor]`}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-token-text-primary uppercase tracking-tight truncate leading-none">
                          {employee.name}
                        </p>
                        <p className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1.5 opacity-70">
                          {employee.position}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`
                          text-[9px] font-bold px-3 py-1.5 rounded-sm border border-black/5 dark:border-white/10 tracking-widest uppercase whitespace-nowrap transition-transform group-hover:scale-105
                          ${config.bg} ${config.text}
                      `}
                    >
                      {config.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <div className="p-6 rounded-sm bg-token-surface-stripe mb-4 border border-token-border-subtle">
                <UsersIcon className="w-8 h-8 text-token-text-tertiary" />
              </div>
              <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em]">
                Sin coincidencias operativas
              </p>
            </div>
          )}
        </div>
      </div>
    </KpiCard>
  );
};

export default LiveStatusPanel;
