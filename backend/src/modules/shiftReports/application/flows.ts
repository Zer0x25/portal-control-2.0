import { AppError, ConflictError } from "../../../utils/AppError";
import { toCaughtError } from "../../../utils/caughtError";
import type { ShiftReportFlowDependencies, ShiftReportInput, ShiftReportQuery } from "./contracts";
function conflictingShift(error: unknown) {
  if (typeof error !== "object" || error === null || !("conflictingShift" in error))
    return { responsibleUser: undefined, folio: undefined };
  const value = error.conflictingShift;
  if (typeof value !== "object" || value === null)
    return { responsibleUser: undefined, folio: undefined };
  return {
    responsibleUser: "responsibleUser" in value ? value.responsibleUser : undefined,
    folio: "folio" in value ? value.folio : undefined,
  };
}
export function createShiftReportFlows<Row, List>(deps: ShiftReportFlowDependencies<Row, List>) {
  return {
    async list(query: ShiftReportQuery) {
      return deps.service.list(query);
    },
    async save(input: ShiftReportInput, actor = "SYSTEM") {
      try {
        return await deps.service.save(input, actor);
      } catch (error) {
        if (toCaughtError(error).message === "SHIFT_START_BLOCKED") {
          const conflict = conflictingShift(error);
          throw new ConflictError(
            `No se puede iniciar turno. El turno de ${String(conflict.responsibleUser)} (Folio: ${String(conflict.folio)}) ya está abierto.`,
          );
        }
        throw new AppError(
          "Error al guardar reporte de turno: " +
            (error instanceof Error ? error.message : "Error desconocido"),
          500,
          "SHIFT_REPORT_ERROR",
        );
      }
    },
  };
}
export type ShiftReportFlows = ReturnType<typeof createShiftReportFlows>;
