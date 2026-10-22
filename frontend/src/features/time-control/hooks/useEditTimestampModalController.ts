import { useStore } from "../../../store/useStore";
import { useTimestampEditor } from "../../../hooks/useTimestampEditor";
import { TIME_RECORD_FIELD_LABELS } from "../../../utils/mappings";

/**
 * Controlador del modal de ajuste de marcaje (spec 036 T12c).
 *
 * El borrador de hora sale del formulario que es propietario
 * `useTimestampEditor`: aqui solo se traduce a los props de la vista
 * (`value`/`setValue`/`error`/`formProps`).
 */
export const useEditTimestampModalController = () => {
  const isOpen = useStore((s) => s.isEditTimestampModalOpen);
  const editingInfo = useStore((s) => s.editingRecordInfo);
  const onClose = useStore((s) => s.closeEditTimestampModal);

  const { value, setValue, error, formProps, isLoading, maxTimeForExit } = useTimestampEditor();

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
