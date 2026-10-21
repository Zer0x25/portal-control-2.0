import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../store/useStore";
import { useToasts } from "../../../hooks/useToasts";
import { timeRecordService } from "../../../services/timeRecordService";
import { toCaughtError } from "../../../utils/caughtError";

/**
 * Relojes del dashboard (spec 032 T5): antes vivian en `dashboardSlice` con
 * import de `timeRecordService`. Aqui invalidan las raices afectadas en lugar
 * de recargar la coleccion desde el store.
 */
export const useDashboardClockActions = () => {
  const employeeToConfirmClockOut = useStore((state) => state.employeeToConfirmClockOut);
  const closeResponsibleClockOutConfirmation = useStore(
    (state) => state.closeResponsibleClockOutConfirmation,
  );
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const confirmResponsibleClockOut = async (): Promise<boolean> => {
    if (!employeeToConfirmClockOut) return false;
    try {
      // Clock out del responsable dispara el cierre automatico de turno en backend
      await timeRecordService.punch(employeeToConfirmClockOut.id, "WEB", "salida");
      closeResponsibleClockOutConfirmation();
      await queryClient.invalidateQueries({ queryKey: ["timeRecords"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addToast("Turno cerrado y salida registrada correctamente", "success");
      return true;
    } catch (error: unknown) {
      addToast(toCaughtError(error).message || "Error al cerrar turno", "error");
      return false;
    }
  };

  return { confirmResponsibleClockOut };
};
