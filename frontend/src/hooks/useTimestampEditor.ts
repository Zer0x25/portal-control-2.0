import { useLayoutEffect } from "react";
import { useTimeRecordMutations } from "./queries/useTimeRecordsQuery";
import type { DailyTimeRecord, TimeRecordField } from "../types/index";
import { useToasts } from "./useToasts";
import { useAppForm } from "./useAppForm";
import { editTimestampFormSchema, type EditTimestampFormValues } from "../schemas/forms/timestamp";
import { formatInTimeZone } from "date-fns-tz";
import { parseBusinessDateTimeCL } from "../utils/dateUtils";
import { formatChileTimeHHmm } from "../utils/chileClock";
import { logger } from "../utils/logger";

const CHILE_TZ = "America/Santiago";

/**
 * Editor de un marcaje (`EditTimestampModal`), spec 036 T12c (AC1, AC2, AC3).
 *
 * El borrador de hora no vive en el store: el formulario es propietario de su
 * estado (`useAppForm`) y la feature que monta el modal pasa por props qué
 * marcaje se edita.
 * La regla `HH:mm` vive en `editTimestampFormSchema` (AC2) y el error se pinta
 * junto al input (AC3); el hook solo expone `value`/`setValue`/`error` y los
 * `formProps` del `<form>`.
 *
 * El payload que sale de aqui **no es el formulario**: a partir de la hora y
 * del registro existente se construye el registro completo que manda
 * `updateRecordMutation` (contrato documentado en `timeRecordWriteFormSchema`).
 */
interface TimestampEditingInfo {
  record: DailyTimeRecord;
  field: TimeRecordField;
}

export const useTimestampEditor = (
  editingInfo: TimestampEditingInfo | null,
  closeEditTimestampModal: () => void,
) => {
  const { updateRecordMutation } = useTimeRecordMutations();
  const { addToast } = useToasts();

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

  /**
   * Valor inicial del borrador: la hora del marcaje (o la hora de ahora si el
   * campo no tiene marcaje). Antes este calculo vivia en
   * `openEditTimestampModal`.
   */
  const initialValue = (() => {
    if (!editingInfo) return "";
    const currentValue = editingInfo.record[editingInfo.field];
    return currentValue && currentValue !== "SIN REGISTRO"
      ? formatChileTimeHHmm(new Date(currentValue))
      : formatChileTimeHHmm(new Date());
  })();

  const form = useAppForm<EditTimestampFormValues>({
    schema: editTimestampFormSchema,
    defaultValues: { time: initialValue },
    onSubmit: async (values) => {
      if (!editingInfo) return;

      const { record: recordToUpdate, field } = editingInfo;
      if (!recordToUpdate.employeeId) {
        addToast("No se pudo identificar el empleado del registro.", "error");
        return;
      }

      // El formato de la hora ya lo garantiza `editTimestampFormSchema`.
      const normalizedDate = String(recordToUpdate.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        addToast("Fecha de registro inválida para aplicar corrección.", "error");
        return;
      }

      // Keep record date fixed and interpret user input via the central business time policy.
      let nextDate: Date;
      try {
        nextDate = parseBusinessDateTimeCL(normalizedDate, `${values.time}:00`);
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
        logger.error("Failed to save timestamp edit", error);
        // Toast is handled by mutation hook error
      }
    },
  });

  const { reset } = form;

  /**
   * El modal abre con un registro (o lo reabre con otro): el borrador vuelve
   * a la hora del marcaje, como hacia `openEditTimestampModal` antes. Se usa
   * `useLayoutEffect` para que el input nunca pinte un frame en blanco, y no
   * se resetea al cerrar (el container conserva el valor hasta el siguiente
   * registro que recibe).
   */
  useLayoutEffect(() => {
    if (editingInfo) reset({ time: initialValue });
  }, [editingInfo, initialValue, reset]);

  // `setValue` con la clave fija: la vista solo conoce el campo "time".
  const setValue = (value: string) => form.setValue("time", value);

  return {
    value: form.values.time,
    setValue,
    error: form.getError("time"),
    formProps: form.formProps,
    isLoading: updateRecordMutation.isPending,
    maxTimeForExit,
  };
};
