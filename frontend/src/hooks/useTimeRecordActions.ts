import { Employee, DailyTimeRecord, Justification } from "../types";
import { useTimeRecordMutations } from "./queries/useTimeRecordsQuery";

/**
 * Provides a clean, reusable API for components to perform time record actions.
 * It automatically handles the 'actor' (current user) for audit logging.
 * Refactored to use TanStack Query Mutations (Phase 4).
 */
export const useTimeRecordActions = () => {
  const { punchMutation, updateRecordMutation } = useTimeRecordMutations();

  // Wrap actions
  const clockIn = async (employee: Employee, context: "OPERATOR" | "SELF_SERVICE") => {
    return punchMutation.mutateAsync({
      employeeId: employee.id,
      source: context,
    });
  };

  const startBreak = async (record: DailyTimeRecord) => {
    if (!record.employeeId) throw new Error("No employee ID in record");
    return punchMutation.mutateAsync({
      employeeId: record.employeeId,
      forcedType: "inicio_colacion",
    });
  };

  const endBreak = async (record: DailyTimeRecord) => {
    if (!record.employeeId) throw new Error("No employee ID in record");
    return punchMutation.mutateAsync({
      employeeId: record.employeeId,
      forcedType: "fin_colacion",
    });
  };

  const clockOut = async (record: DailyTimeRecord) => {
    if (!record.employeeId) throw new Error("No employee ID in record");
    return punchMutation.mutateAsync({
      employeeId: record.employeeId,
      forcedType: "salida",
    });
  };

  const markAsManualAnomaly = async (record: DailyTimeRecord) => {
    const justification: Justification = {
      type: "Permiso Especial",
      leaveId: "Manual by Supervisor",
    };
    const updated: DailyTimeRecord = {
      ...record,
      status: "AnomaliaManual",
      justification,
    };
    return updateRecordMutation.mutateAsync(updated);
  };

  return {
    clockIn,
    startBreak,
    endBreak,
    clockOut,
    markAsManualAnomaly,
  };
};
