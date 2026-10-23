import { useEffect, useState } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { getBusinessNow } from "../../../hooks/useBusinessNow";
import { useScheduling } from "../../../hooks/useScheduling";
import { useToasts } from "../../../hooks/useToasts";
import {
  correctionRequestFormSchema,
  type CorrectionRequestFormValues,
} from "../../../schemas/forms/correction";
import { DailyTimeRecord, TimeRecordField } from "../../../types";
import { parseBusinessDateTimeCL } from "../../../utils/dateUtils";
import { fileToBase64 } from "../../../utils/fileUtils";
import { formatDateToDateTimeLocal } from "../../../utils/formatters";

const MAX_FILE_SIZE_MB = 5;

/**
 * Spec 036 T11 (AC1, AC2, AC3): formulario de **solicitud de correccion**
 * (`CorrectionRequestModal.tsx`).
 *
 * Antes el modal guardaba el valor y el motivo en dos `useState` y, si faltaba
 * el motivo o la fecha tenia mala pinta, lanzaba un toast lejos del campo.
 * Ahora:
 *
 * - el valor y el motivo viven en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`correctionRequestFormSchema`: el motivo es
 *   obligatorio y la fecha-hora es `YYYY-MM-DDTHH:mm`) (spec 036 AC2);
 * - los errores salen junto al campo (spec 036 AC3).
 *
 * El formulario escribe **solo** esos dos campos: el empleado, el marcaje, el
 * campo y el valor actual los aporta la pantalla que lo abre (divergencia
 * declarada en `correctionRequestForm`).
 *
 * Tres reglas viven aqui, en el payload, porque necesitan el valor ya
 * convertido: la conversion a ISO-8601 con offset, que la correccion no este
 * en el futuro y la conversion del adjunto a base64.
 *
 * El payload no cambia (T13): sigue siendo el mismo objeto de siempre, con
 * `requestedValue` convertido a ISO y `reason` recortado por la
 * normalizacion de la capa.
 */

interface UseCorrectionRequestModalControllerParams {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** Cierra el modal. */
  readonly onClose: () => void;
  /** Marcaje que se quiere corregir. */
  readonly record: DailyTimeRecord;
  /** Campo del marcaje que se quiere corregir. */
  readonly field: TimeRecordField;
}

/** Controlador del formulario de solicitud de correccion (spec 036 T11). */
export const useCorrectionRequestModalController = ({
  isOpen,
  onClose,
  record,
  field,
}: UseCorrectionRequestModalControllerParams) => {
  const { addToast } = useToasts();
  const { addCorrectionRequest } = useScheduling();

  /** Adjunto opcional: es un `File`, no un campo del contrato. */
  const [attachment, setAttachment] = useState<File | null>(null);

  const originalValue = record[field];

  const form = useAppForm<CorrectionRequestFormValues>({
    schema: correctionRequestFormSchema,
    defaultValues: { requestedValue: "", reason: "" },
    onSubmit: async (values) => {
      // Conversion a ISO-8601 con offset (hora de Chile -> UTC). El formato ya
      // lo garantizo el schema; el `try/catch` cubre fechas de calendario
      // imposibles (2026-02-31T10:00).
      let requestedValueIso: string;
      try {
        const [datePart, timePart] = values.requestedValue.split("T");
        requestedValueIso = parseBusinessDateTimeCL(datePart, `${timePart}:00`).toISOString();
      } catch {
        addToast("La fecha y hora solicitadas no tienen un formato válido.", "warning");
        return;
      }

      // El backend tambien rechaza correcciones futuras; avisar aqui evita
      // el viaje de ida y vuelta. Necesita la fecha ya convertida.
      if (new Date(requestedValueIso).getTime() > getBusinessNow().getTime()) {
        addToast("No se puede solicitar una corrección con fecha futura.", "warning");
        return;
      }

      let attachmentData;
      if (attachment) {
        try {
          const base64String = await fileToBase64(attachment);
          attachmentData = {
            filename: attachment.name,
            mimeType: attachment.type,
            data: base64String,
          };
        } catch {
          addToast("Error al procesar el archivo adjunto.", "error");
          return;
        }
      }

      const success = await addCorrectionRequest({
        employeeId: record.employeeId,
        timeRecordId: record.id,
        recordField: field,
        originalValue,
        requestedValue: requestedValueIso,
        reason: values.reason,
        attachment: attachmentData,
      });

      if (success) {
        onClose();
      }
    },
  });

  const { reset, setValue } = form;

  /**
   * Al abrir el modal el valor propuesto arranca en el del registro (o en
   * "ahora" si no hay marcaje previo) y no queda nada del intento anterior.
   */
  useEffect(() => {
    if (!isOpen) return;
    const initialDate =
      originalValue && originalValue !== "SIN REGISTRO"
        ? new Date(originalValue)
        : getBusinessNow();
    reset({ requestedValue: formatDateToDateTimeLocal(initialDate), reason: "" });
    setAttachment(null);
  }, [isOpen, originalValue, reset]);

  const attachmentLabel = attachment ? attachment.name : "Subir archivo (PDF, PNG, JPG)";

  // Tope del input datetime-local: no se solicitan correcciones futuras (spec 030).
  const maxRequestedValue = isOpen ? formatDateToDateTimeLocal(getBusinessNow()) : "";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      addToast(`El archivo no debe exceder los ${MAX_FILE_SIZE_MB}MB.`, "error");
      e.target.value = "";
      setAttachment(null);
      return;
    }

    setAttachment(file);
  };

  /** Escribe la fecha-hora solicitada. */
  const handleRequestedValueChange = (value: string) => {
    setValue("requestedValue", value);
  };

  /** Escribe el motivo. */
  const handleReasonChange = (value: string) => {
    setValue("reason", value);
  };

  return {
    attachment,
    attachmentLabel,
    handleFileChange,
    handleRequestedValueChange,
    handleReasonChange,
    values: form.values,
    getError: form.getError,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
    maxRequestedValue,
    originalValue,
  };
};
