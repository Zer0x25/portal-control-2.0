import React from "react";
import { DailyTimeRecord, TimeRecordField } from "../../../types";
import CorrectionRequestModalView from "./CorrectionRequestModal.view";
import { useCorrectionRequestModalController } from "../hooks/useCorrectionRequestModalController";

interface CorrectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DailyTimeRecord;
  field: TimeRecordField;
}

const CorrectionRequestModalContainer: React.FC<CorrectionRequestModalProps> = ({
  isOpen,
  onClose,
  record,
  field,
}) => {
  const controller = useCorrectionRequestModalController({
    isOpen,
    onClose,
    record,
    field,
  });

  return (
    <CorrectionRequestModalView
      isOpen={isOpen}
      onClose={onClose}
      record={record}
      field={field}
      requestedValue={controller.requestedValue}
      reason={controller.reason}
      attachment={controller.attachment}
      attachmentLabel={controller.attachmentLabel}
      isSubmitting={controller.isSubmitting}
      originalValue={controller.originalValue}
      onSetRequestedValue={controller.setRequestedValue}
      onSetReason={controller.setReason}
      onFileChange={controller.handleFileChange}
      onSubmit={controller.handleSubmit}
    />
  );
};

export default CorrectionRequestModalContainer;
