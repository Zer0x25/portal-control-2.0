import { useEffect, useMemo, useState } from "react";
import { DailyTimeRecord, TimeRecordField } from "../../../types";
import { useScheduling } from "../../../hooks/useScheduling";
import { useToasts } from "../../../hooks/useToasts";
import { fileToBase64 } from "../../../utils/fileUtils";
import { formatDateToDateTimeLocal } from "../../../utils/formatters";
import { getBusinessNow } from "../../../hooks/useBusinessNow";
import { parseBusinessDateTimeCL } from "../../../utils/dateUtils";

const MAX_FILE_SIZE_MB = 5;

interface UseCorrectionRequestModalControllerParams {
  isOpen: boolean;
  onClose: () => void;
  record: DailyTimeRecord;
  field: TimeRecordField;
}

export const useCorrectionRequestModalController = ({
  isOpen,
  onClose,
  record,
  field,
}: UseCorrectionRequestModalControllerParams) => {
  const { addToast } = useToasts();
  const { addCorrectionRequest } = useScheduling();

  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originalValue = record[field];

  useEffect(() => {
    if (isOpen) {
      const initialDate =
        originalValue && originalValue !== "SIN REGISTRO"
          ? new Date(originalValue)
          : getBusinessNow();
      setRequestedValue(formatDateToDateTimeLocal(initialDate));
      setReason("");
      setAttachment(null);
      setIsSubmitting(false);
    }
  }, [isOpen, originalValue]);

  const attachmentLabel = useMemo(() => {
    return attachment ? attachment.name : "Subir archivo (PDF, PNG, JPG)";
  }, [attachment]);

  // Tope del input datetime-local: no se solicitan correcciones futuras (spec 030).
  const maxRequestedValue = useMemo(() => formatDateToDateTimeLocal(getBusinessNow()), [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      addToast("El motivo de la solicitud es requerido.", "warning");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(requestedValue)) {
      addToast("La fecha y hora solicitadas no tienen un formato válido.", "warning");
      return;
    }

    let requestedValueIso: string;
    try {
      const [datePart, timePart] = requestedValue.split("T");
      requestedValueIso = parseBusinessDateTimeCL(datePart, `${timePart}:00`).toISOString();
    } catch {
      addToast("La fecha y hora solicitadas no tienen un formato válido.", "warning");
      return;
    }

    if (new Date(requestedValueIso).getTime() > getBusinessNow().getTime()) {
      addToast("No se puede solicitar una corrección con fecha futura.", "warning");
      return;
    }

    setIsSubmitting(true);

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
        setIsSubmitting(false);
        return;
      }
    }

    const success = await addCorrectionRequest({
      employeeId: record.employeeId,
      timeRecordId: record.id,
      recordField: field,
      originalValue,
      requestedValue: requestedValueIso,
      reason,
      attachment: attachmentData,
    });

    if (success) {
      onClose();
    }

    setIsSubmitting(false);
  };

  return {
    attachment,
    attachmentLabel,
    handleFileChange,
    handleSubmit,
    isSubmitting,
    maxRequestedValue,
    originalValue,
    reason,
    requestedValue,
    setReason,
    setRequestedValue,
  };
};
