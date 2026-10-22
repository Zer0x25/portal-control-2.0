import React from "react";
import EditTimestampModalView from "./EditTimestampModal.view";
import { useEditTimestampModalController } from "../hooks/useEditTimestampModalController";

const EditTimestampModalContainer: React.FC = () => {
  const controller = useEditTimestampModalController();

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
