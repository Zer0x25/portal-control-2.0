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
      requestedValue={controller.values.requestedValue}
      requestedValueError={controller.getError("requestedValue")}
      maxRequestedValue={controller.maxRequestedValue}
      reason={controller.values.reason}
      reasonError={controller.getError("reason")}
      isSubmitting={controller.isSubmitting}
      originalValue={controller.originalValue}
      onRequestedValueChange={controller.handleRequestedValueChange}
      onReasonChange={controller.handleReasonChange}
      formProps={controller.formProps}
    />
  );
};

export default CorrectionRequestModalContainer;
