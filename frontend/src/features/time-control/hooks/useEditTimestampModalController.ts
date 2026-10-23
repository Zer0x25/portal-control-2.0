import type { DailyTimeRecord, TimeRecordField } from "../../../types";
import { useTimestampEditor } from "../../../hooks/useTimestampEditor";
import { TIME_RECORD_FIELD_LABELS } from "../../../utils/mappings";

/**
 * Controlador del modal de ajuste de marcaje (spec 036 T12c).
 *
 * El borrador de hora sale del formulario que es propietario
 * `useTimestampEditor`: aqui solo se traduce a los props de la vista
 * (`value`/`setValue`/`error`/`formProps`).
 */
interface EditTimestampModalControllerOptions {
  isOpen: boolean;
  onClose: () => void;
  editingInfo: { record: DailyTimeRecord; field: TimeRecordField } | null;
}

export const useEditTimestampModalController = ({
  isOpen,
  onClose,
  editingInfo,
}: EditTimestampModalControllerOptions) => {
  const { value, setValue, error, formProps, isLoading, maxTimeForExit } = useTimestampEditor(
    editingInfo,
    onClose,
  );

  const fieldLabel = editingInfo
    ? TIME_RECORD_FIELD_LABELS[editingInfo.field] || "Marcaje"
    : "Marcaje";

  return {
    editingInfo,
    fieldLabel,
    error,
    formProps,
    isLoading,
    isOpen,
    maxTimeForExit,
    onClose,
    setValue,
    value,
  };
};
