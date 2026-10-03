import React, { useState, useEffect } from "react";
import Button from "./Button";
import { ClockIcon, ChevronRightIcon, UserIcon } from "./icons/index";
import { authService } from "../../services/authService";
import { API_BASE_URL } from "../../services/apiBase";
import CinematicModal from "./CinematicModal";
import IconBox from "./IconBox";
import { IndustrialIndicator } from "./IndustrialIndicator";
import EmptyState from "./EmptyState";
import { ExclamationTriangleIcon } from "./icons/index";

interface ShiftHistoryEntry {
  id: string;
  timestamp: string;
  actorUsername: string;
  action: string;
  details: {
    employeeId: string;
    employeeName?: string;
    previousPatternId?: string;
    previousPatternName?: string;
    newPatternId?: string;
    newPatternName?: string;
    previousStartDate?: string;
    previousEndDate?: string | null;
    newStartDate?: string;
    newEndDate?: string | null;
  };
}

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}) => {
  const [historyEntries, setHistoryEntries] = useState<ShiftHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchHistory();
    }
  }, [isOpen, employeeId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_URL = `${API_BASE_URL}/audit-logs`;
      const response = await fetch(`${API_URL}?category=SHIFT_ASSIGNMENT&pageSize=100`, {
        headers: {
          ...(authService.getAuthHeader() as Record<string, string>),
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener historial");
      }

      const data = await response.json();

      // Filter entries that match this employee
      const filteredEntries = data.data.filter(
        (entry: ShiftHistoryEntry) => entry.details?.employeeId === employeeId,
      );

      setHistoryEntries(filteredEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "SHIFT_ASSIGNMENT_CREATE":
        return "Asignación Creada";
      case "SHIFT_ASSIGNMENT_UPDATE":
        return "Asignación Modificada";
      case "SHIFT_ASSIGNMENT_DELETE":
        return "Asignación Eliminada";
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "SHIFT_ASSIGNMENT_CREATE":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "SHIFT_ASSIGNMENT_UPDATE":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "SHIFT_ASSIGNMENT_DELETE":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Sin fecha";
    return new Date(dateStr).toLocaleDateString("es-CL");
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("es-CL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <IconBox icon={<ClockIcon />} variant="primary" size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase italic leading-none truncate">
              {employeeName}
            </h3>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1.5 italic leading-none">
              Historial de Cambios de Turno
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-sap-blue/20 border-t-sap-blue rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Recuperando secuencia histórica...
            </p>
          </div>
        )}

        {error && (
          <EmptyState
            icon={<ExclamationTriangleIcon />}
            title="Error de Conexión"
            description={error}
            className="py-12 border-rose-500/20"
            actionLabel="Reintentar"
            onAction={fetchHistory}
          />
        )}

        {!isLoading && !error && historyEntries.length === 0 && (
          <EmptyState
            icon={<ClockIcon />}
            title="Historial Vacío"
            description="No se registran cambios de turno para este colaborador."
            className="py-12"
          />
        )}

        {!isLoading && !error && historyEntries.length > 0 && (
          <div className="space-y-4">
            {historyEntries.map((entry) => (
              <div
                key={entry.id}
                className="group p-5 rounded-2xl bg-white dark:bg-white/3 border border-gray-100 dark:border-white/5 hover:border-sap-blue/20 transition-all flex items-start gap-4 shadow-sm"
              >
                <IndustrialIndicator height="h-full" color="bg-sap-blue/20" className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getActionColor(entry.action)}`}
                    >
                      {getActionLabel(entry.action)}
                    </span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter font-mono">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded-full bg-sap-blue/10 flex items-center justify-center">
                      <UserIcon className="w-3 h-3 text-sap-blue" />
                    </div>
                    <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Actor:{" "}
                      <span className="text-gray-900 dark:text-white italic">
                        {entry.actorUsername}
                      </span>
                    </p>
                  </div>

                  {entry.action === "SHIFT_ASSIGNMENT_UPDATE" && entry.details && (
                    <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 p-3 rounded-2xl border border-white/10">
                      <div className="flex-1 text-center">
                        <p className="text-[9px] font-black text-rose-500/60 uppercase mb-1 tracking-widest">
                          Anterior
                        </p>
                        <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">
                          {entry.details.previousPatternName || "N/A"}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 font-mono">
                          {formatDate(entry.details.previousStartDate)} -{" "}
                          {formatDate(entry.details.previousEndDate)}
                        </p>
                      </div>
                      <ChevronRightIcon className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 text-center">
                        <p className="text-[9px] font-black text-emerald-500/60 uppercase mb-1 tracking-widest">
                          Nuevo
                        </p>
                        <p className="text-xs font-black text-sap-blue truncate uppercase italic">
                          {entry.details.newPatternName || "N/A"}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 font-mono">
                          {formatDate(entry.details.newStartDate)} -{" "}
                          {formatDate(entry.details.newEndDate)}
                        </p>
                      </div>
                    </div>
                  )}

                  {(entry.action === "SHIFT_ASSIGNMENT_CREATE" ||
                    entry.action === "SHIFT_ASSIGNMENT_DELETE") &&
                    entry.details && (
                      <div
                        className={`p-4 rounded-2xl border ${entry.action === "SHIFT_ASSIGNMENT_CREATE" ? "bg-emerald-500/5 border-emerald-500/10" : "bg-rose-500/5 border-rose-500/10"}`}
                      >
                        <p
                          className={`text-sm font-black uppercase italic ${entry.action === "SHIFT_ASSIGNMENT_CREATE" ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {entry.action === "SHIFT_ASSIGNMENT_CREATE"
                            ? entry.details.newPatternName
                            : entry.details.previousPatternName}
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 font-mono mt-1">
                          Periodo:{" "}
                          {entry.action === "SHIFT_ASSIGNMENT_CREATE"
                            ? `${formatDate(entry.details.newStartDate)} - ${formatDate(entry.details.newEndDate)}`
                            : `${formatDate(entry.details.previousStartDate)} - ${formatDate(entry.details.previousEndDate)}`}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/5">
        <Button
          onClick={onClose}
          variant="secondary"
          className="rounded-xl px-8 font-bold h-10 text-[10px] uppercase tracking-widest"
        >
          Cerrar Bitácora
        </Button>
      </div>
    </CinematicModal>
  );
};

export default ShiftHistoryModal;
