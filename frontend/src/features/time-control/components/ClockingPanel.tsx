import React, { useRef } from "react";
import { useClockingPanel } from "../hooks/useClockingPanel";
import Button from "../../../components/ui/Button";
import PremiumSearchInput from "../../../components/ui/PremiumSearchInput";
import { getClockingActionButtonClassName } from "../../../utils/clockingActionButtonStyles";
import { Z } from "../../../constants/zScale";

interface ClockingPanelProps {
  isActionDisabled: boolean;
  roleBasedTooltip: string;
}

const ClockingPanel: React.FC<ClockingPanelProps> = ({ isActionDisabled, roleBasedTooltip }) => {
  const {
    searchTerm,
    selectedEmployeeId,
    selectedEmployee,
    clockStatus,
    filteredEmployees,
    statusLabels,
    setSearchTerm,
    setSelectedEmployeeId,
    handleFocus,
    performActionAndReset,
    isLoadingRecords,
  } = useClockingPanel();

  const containerRef = useRef<HTMLDivElement>(null);
  const jornadaInicioDisabled =
    !selectedEmployeeId || !["fuera", "terminada"].includes(clockStatus) || isActionDisabled;
  const colacionInicioDisabled =
    !selectedEmployeeId || clockStatus !== "en_jornada" || isActionDisabled;
  const colacionFinDisabled =
    !selectedEmployeeId || clockStatus !== "en_colacion" || isActionDisabled;
  const jornadaFinDisabled =
    !selectedEmployeeId ||
    !["en_jornada", "en_jornada_post_colacion", "en_colacion"].includes(clockStatus) ||
    isActionDisabled;

  return (
    <div className="space-y-6">
      <div className="bg-token-surface-card rounded-xl border border-token-border-subtle p-6 shadow-sm">
        <h3 className="text-lg font-black text-token-text-primary uppercase tracking-tight mb-6">
          Panel de Registro Manual
        </h3>

        <div className="space-y-4" ref={containerRef}>
          <div className="relative">
            <PremiumSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onFocus={handleFocus}
              placeholder={isActionDisabled ? "Búsqueda deshabilitada" : "Buscar empleado..."}
              disabled={isActionDisabled}
              className="w-full"
            />

            {searchTerm && !selectedEmployeeId && (
              <div
                className={`absolute top-full left-0 right-0 mt-2 bg-token-surface-card border border-token-border-subtle rounded-lg shadow-lg ${Z.overlay} max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2`}
              >
                {filteredEmployees.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {filteredEmployees.map((e) => (
                      <div
                        key={e.id}
                        className={`p-3 rounded-md cursor-pointer transition-colors group animate-in fade-in ${
                          selectedEmployeeId === e.id
                            ? "bg-token-accent-brand/10 border border-token-accent-brand/30"
                            : "hover:bg-token-surface-active"
                        }`}
                        onClick={() => setSelectedEmployeeId(e.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-token-text-primary block">
                              {e.name}
                            </span>
                            <span className="text-xxs text-token-text-tertiary uppercase tracking-widest leading-none mt-0.5">
                              {e.area}
                            </span>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-token-accent-brand opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(0,87,146,0.5)]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-[10px] font-black uppercase text-token-text-tertiary tracking-[0.2em]">
                      No se encontraron resultados
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 bg-token-surface-stripe p-4 rounded-md border border-token-border-technical">
            <div className="flex-1 text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary block mb-2">
                Estado Actual
              </span>
              {selectedEmployee ? (
                <div>
                  <p className="text-sm font-bold text-token-text-primary">
                    {selectedEmployee.name}
                  </p>
                  <p className="text-xl font-black text-token-accent-brand dark:text-blue-400 uppercase tracking-tight">
                    {isLoadingRecords ? "Cargando..." : statusLabels[clockStatus]}
                  </p>
                </div>
              ) : (
                <p className="text-xl font-black text-token-accent-brand dark:text-blue-400 uppercase tracking-tight">
                  Seleccione un empleado
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:w-auto">
              <Button
                variant="none"
                onClick={() => performActionAndReset("jornada_inicio")}
                className={`h-11 rounded-md font-black uppercase tracking-widest text-[10px] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${getClockingActionButtonClassName("jornada_inicio", jornadaInicioDisabled)}`}
                disabled={jornadaInicioDisabled}
              >
                Inicio
              </Button>
              <Button
                variant="none"
                onClick={() => performActionAndReset("colacion_inicio")}
                className={`h-11 rounded-md font-black uppercase tracking-widest text-[10px] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${getClockingActionButtonClassName("colacion_inicio", colacionInicioDisabled)}`}
                disabled={colacionInicioDisabled}
              >
                C. Inicio
              </Button>
              <Button
                variant="none"
                onClick={() => performActionAndReset("colacion_fin")}
                className={`h-11 rounded-md font-black uppercase tracking-widest text-[10px] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${getClockingActionButtonClassName("colacion_fin", colacionFinDisabled)}`}
                disabled={colacionFinDisabled}
              >
                C. Fin
              </Button>
              <Button
                variant="none"
                onClick={() => performActionAndReset("jornada_fin")}
                className={`h-11 rounded-md font-black uppercase tracking-widest text-[10px] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${getClockingActionButtonClassName("jornada_fin", jornadaFinDisabled)}`}
                disabled={jornadaFinDisabled}
              >
                Fin
              </Button>
            </div>
          </div>
          {isActionDisabled && (
            <p className="text-[10px] font-black uppercase tracking-widest text-token-status-error text-center mt-4">
              {roleBasedTooltip}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// useClockingPanel reads refs during render and is a compiler bail-out; this
// boundary avoids rerunning that clocking hot path for unrelated parent renders.
export default React.memo(ClockingPanel);
