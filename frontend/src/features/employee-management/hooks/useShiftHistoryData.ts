import { useCallback, useEffect, useState } from "react";
import { auditLogService } from "../../../services/auditLogService";

export interface ShiftHistoryEntry {
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

/** Carga el historial de asignaciones del colaborador para el modal. */
export const useShiftHistoryData = (isOpen: boolean, employeeId: string) => {
  const [historyEntries, setHistoryEntries] = useState<ShiftHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await auditLogService.getAll<ShiftHistoryEntry>({
        page: 1,
        pageSize: 100,
        filters: { category: "SHIFT_ASSIGNMENT" },
      });
      setHistoryEntries(result.data.filter((entry) => entry.details?.employeeId === employeeId));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isOpen && employeeId) void fetchHistory();
  }, [isOpen, employeeId, fetchHistory]);

  return { historyEntries, isLoading, error, fetchHistory };
};
