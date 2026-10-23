import { useQueryClient } from "@tanstack/react-query";
import type { Employee } from "../../../types";
import { useToasts } from "../../../hooks/useToasts";
import { timeRecordService } from "../../../services/timeRecordService";
import { toCaughtError } from "../../../utils/caughtError";
import { queryKeys } from "../../../lib/queryKeys";

/**
 * Acción de reloj del dashboard (spec 032 T5): invalida las raíces afectadas
 * en lugar de recargar la colección desde el store.
 */
export const useDashboardClockActions = (
  employeeToConfirmClockOut: Employee | null,
  closeResponsibleClockOutConfirmation: () => void,
) => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const confirmResponsibleClockOut = async (): Promise<boolean> => {
    if (!employeeToConfirmClockOut) return false;
    try {
      // Clock out del responsable dispara el cierre automatico de turno en backend
      await timeRecordService.punch(employeeToConfirmClockOut.id, "WEB", "salida");
      closeResponsibleClockOutConfirmation();
      await queryClient.invalidateQueries({ queryKey: queryKeys.timeRecords() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.shiftReports() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
      addToast("Turno cerrado y salida registrada correctamente", "success");
      return true;
    } catch (error: unknown) {
      addToast(toCaughtError(error).message || "Error al cerrar turno", "error");
      return false;
    }
  };

  return { confirmResponsibleClockOut };
};
