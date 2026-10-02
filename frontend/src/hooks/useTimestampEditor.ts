import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { useTimeRecordMutations } from "./queries/useTimeRecordsQuery";
import { DailyTimeRecord } from "../types/index";
import { useToasts } from "./useToasts";
import { formatInTimeZone } from "date-fns-tz";
import { parseBusinessDateTimeCL } from "../utils/dateUtils";

const CHILE_TZ = "America/Santiago";

export const useTimestampEditor = () => {
  const { updateRecordMutation } = useTimeRecordMutations();
  const { addToast } = useToasts();

  // UI State from Store
  const editingInfo = useStore((s) => s.editingRecordInfo);
  const newTimestampValue = useStore((s) => s.newTimestampValue);
  const closeEditTimestampModal = useStore((s) => s.closeEditTimestampModal);

  const maxTimeForExit = (() => {
    if (!editingInfo || editingInfo.field !== "salida" || !editingInfo.record.entrada) return null;
    const entradaDate = new Date(editingInfo.record.entrada);
    if (isNaN(entradaDate.getTime())) return null;
    const maxDate = new Date(entradaDate.getTime() + 12 * 60 * 60 * 1000);
    const hh = formatInTimeZone(maxDate, CHILE_TZ, "HH");
    const mm = formatInTimeZone(maxDate, CHILE_TZ, "mm");
    const dd = formatInTimeZone(maxDate, CHILE_TZ, "dd");
    const mmMonth = formatInTimeZone(maxDate, CHILE_TZ, "MM");
    return `${hh}:${mm} (${dd}-${mmMonth})`;
  })();

  const handleSave = useCallback(async () => {
    if (!editingInfo || !newTimestampValue) return;

    const { record: recordToUpdate, field } = editingInfo;
    if (!recordToUpdate.employeeId) {
      addToast("No se pudo identificar el empleado del registro.", "error");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(newTimestampValue)) {
      addToast("Formato de hora inválido.", "error");
      return;
    }

    const normalizedDate = String(recordToUpdate.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      addToast("Fecha de registro inválida para aplicar corrección.", "error");
      return;
    }

    // Keep record date fixed and interpret user input via the central business time policy.
    let nextDate: Date;
    try {
      nextDate = parseBusinessDateTimeCL(normalizedDate, `${newTimestampValue}:00`);
    } catch {
      addToast("Fecha de registro inválida para aplicar corrección.", "error");
      return;
    }
    let nextTimestamp = nextDate.toISOString();

    if (field === "salida" && recordToUpdate.entrada) {
      const entradaDate = new Date(recordToUpdate.entrada);
      if (!isNaN(entradaDate.getTime()) && !isNaN(nextDate.getTime())) {
        if (nextDate <= entradaDate) {
          nextDate = new Date(nextDate.getTime() + 24 * 60 * 60 * 1000);
          nextTimestamp = nextDate.toISOString();
        }
      }
    }

    const updatedRecord = {
      id: recordToUpdate.id,
      employeeId: recordToUpdate.employeeId,
      employeeName: recordToUpdate.employeeName,
      employeePosition: recordToUpdate.employeePosition,
      employeeArea: recordToUpdate.employeeArea,
      employeeWorkdayType: recordToUpdate.employeeWorkdayType,
      date: normalizedDate,
      entrada: recordToUpdate.entrada,
      inicioColacion: recordToUpdate.inicioColacion,
      finColacion: recordToUpdate.finColacion,
      salida: recordToUpdate.salida,
      status: recordToUpdate.status,
      source: recordToUpdate.source,
      justification: recordToUpdate.justification,
      lastModified: Date.now(),
      syncStatus: "synced",
      isDeleted: recordToUpdate.isDeleted,
    } as DailyTimeRecord;
    (updatedRecord as unknown as Record<string, unknown>).justification =
      typeof recordToUpdate.justification === "string" || recordToUpdate.justification == null
        ? recordToUpdate.justification
        : JSON.stringify(recordToUpdate.justification);
    (updatedRecord as unknown as Record<string, unknown>)[field] = nextTimestamp;

    try {
      await updateRecordMutation.mutateAsync(updatedRecord);
      closeEditTimestampModal();
    } catch (error) {
      console.error("Failed to save timestamp edit", error);
      // Toast is handled by mutation hook error
    }
  }, [editingInfo, newTimestampValue, updateRecordMutation, closeEditTimestampModal, addToast]);

  return {
    handleSave,
    isLoading: updateRecordMutation.isPending,
    maxTimeForExit,
  };
};
