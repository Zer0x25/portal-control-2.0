import React from "react";
import EditTimestampModalView from "./EditTimestampModal.view";
import { useEditTimestampModalController } from "../hooks/useEditTimestampModalController";
import type { DailyTimeRecord, TimeRecordField } from "../../../types";

interface EditTimestampModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingInfo: { record: DailyTimeRecord; field: TimeRecordField } | null;
}

const EditTimestampModalContainer: React.FC<EditTimestampModalProps> = (props) => {
  const controller = useEditTimestampModalController(props);

  return (
    <EditTimestampModalView
      isOpen={controller.isOpen}
      onClose={controller.onClose}
      editingInfo={controller.editingInfo}
      value={controller.value}
      setValue={controller.setValue}
      error={controller.error}
      formProps={controller.formProps}
      fieldLabel={controller.fieldLabel}
      isLoading={controller.isLoading}
      maxTimeForExit={controller.maxTimeForExit}
    />
  );
};

export default EditTimestampModalContainer;
