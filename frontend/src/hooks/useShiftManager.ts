import { useCallback } from "react";
import { useAuth } from "./useAuth";
import { useToasts } from "./useToasts";
import { ShiftReport, LogbookEntryItem } from "../types/index";
import { formatTime } from "../utils/formatters";
import { idFactory } from "../utils/idFactory";
import { useReportsQuery } from "./queries/useReportsQuery";
import { useReportMutations } from "./useReportMutations";
import { toBusinessDateChile } from "../utils/dateUtils";

export interface StartShiftResult {
  success: boolean;
  message: string;
  shift?: ShiftReport;
  type: "created" | "conflict" | "continued" | "error";
}

export const useShiftManager = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToasts();

  const { refetch: refetchReports } = useReportsQuery();
  const { addReport, isPending } = useReportMutations();

  const startNewShift = useCallback(async (): Promise<StartShiftResult> => {
    if (!currentUser) {
      return {
        success: false,
        message: "Usuario no autenticado.",
        type: "error",
      };
    }

    const actor = currentUser.username;
    const now = new Date();

    // 1. Ensure fresh data
    const { data: currentReports = [] } = await refetchReports();

    // 2. Conflict Check
    const openShifts = currentReports.filter((s) => s.status === "open");

    if (openShifts.length > 0) {
      const myOpenShift = openShifts.find((s) => s.responsibleUser === actor);
      if (myOpenShift) {
        const message = `Continuando con su turno activo (Folio: ${myOpenShift.folio}).`;
        addToast(message, "info");
        return {
          success: true,
          message,
          type: "continued",
          shift: myOpenShift,
        };
      } else {
        const otherShift = openShifts[0];
        const message = `No se puede iniciar turno. El turno de ${otherShift.responsibleUser} (Folio: ${otherShift.folio}) está abierto. Debe ser cerrado primero.`;
        addToast(message, "error", 10000);
        return { success: false, message, type: "conflict" };
      }
    }

    // 3. Shift Creation Logic
    let maxFolio = 0;
    for (const shift of currentReports) {
      const folioNum = parseInt(shift.folio, 10);
      if (!isNaN(folioNum) && folioNum > maxFolio) {
        maxFolio = folioNum;
      }
    }

    const newFolio = String(maxFolio + 1).padStart(3, "0");
    const shiftName = now.getHours() >= 8 && now.getHours() < 20 ? "DÍA" : "NOCHE";

    const startingEntry: LogbookEntryItem = {
      id: idFactory.ulid(),
      time: formatTime(now),
      annotation: "Inicio de Turno, con Novedades Mencionadas",
      timestamp: now.getTime(),
    };

    const newShift: ShiftReport = {
      id: idFactory.ulid(),
      folio: newFolio,
      date: toBusinessDateChile(now),
      shiftName,
      responsibleUser: actor,
      startTime: now.toISOString(),
      status: "open",
      logEntries: [startingEntry],
      supplierEntries: [],
      reportCreatedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastModified: now.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    };

    try {
      const savedShift = await addReport(newShift);
      const message = `Turno ${savedShift.folio} (${shiftName}) iniciado.`;
      addToast(message, "success");
      return { success: true, message, type: "created", shift: savedShift };
    } catch (error) {
      const message = "Error al iniciar el turno en el servidor.";
      console.error(message, error);
      addToast(message, "error");
      return { success: false, message, type: "error" };
    }
  }, [currentUser, addToast, addReport, refetchReports]);

  return { startNewShift, isPending };
};
