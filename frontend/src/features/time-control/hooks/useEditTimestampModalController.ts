import { useStore } from "../../../store/useStore";
import { useTimestampEditor } from "../../../hooks/useTimestampEditor";
import { TIME_RECORD_FIELD_LABELS } from "../../../utils/mappings";

export const useEditTimestampModalController = () => {
  const isOpen = useStore((s) => s.isEditTimestampModalOpen);
  const editingInfo = useStore((s) => s.editingRecordInfo);
  const value = useStore((s) => s.newTimestampValue);
  const setValue = useStore((s) => s.setNewTimestampValue);
  const onClose = useStore((s) => s.closeEditTimestampModal);

  const { handleSave, isLoading, maxTimeForExit } = useTimestampEditor();

  const fieldLabel = editingInfo
    ? TIME_RECORD_FIELD_LABELS[editingInfo.field] || "Marcaje"
    : "Marcaje";

  return {
    editingInfo,
    fieldLabel,
    handleSave,
    isLoading,
    isOpen,
    maxTimeForExit,
    onClose,
    setValue,
    value,
  };
};
