import React from "react";
import { DailyTimeRecord, TimeRecordField, ClockingStatus } from "../../../types";
import QuickActionModalView from "./QuickActionModal.view";
import { useQuickActionModalController } from "../hooks/useQuickActionModalController";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DailyTimeRecord | null;
  clockStatus: ClockingStatus;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onClockOut: () => void;
  onEdit: (record: DailyTimeRecord, field: TimeRecordField) => void;
  onResolveAnomaly?: (record: DailyTimeRecord) => void;
  isActionDisabled: boolean;
  disabledTooltip: string;
}

const QuickActionModalContainer: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  record,
  clockStatus,
  onStartBreak,
  onEndBreak,
  onClockOut,
  onEdit,
  onResolveAnomaly,
  isActionDisabled,
  disabledTooltip,
}) => {
  const controller = useQuickActionModalController({
    isOpen,
    record,
    clockStatus,
    isActionDisabled,
    disabledTooltip,
  });

  return (
    <QuickActionModalView
      isOpen={isOpen}
      onClose={onClose}
      record={record}
      clockStatus={clockStatus}
      onStartBreak={onStartBreak}
      onEndBreak={onEndBreak}
      onClockOut={onClockOut}
      onEdit={onEdit}
      onResolveAnomaly={onResolveAnomaly}
      activeTab={controller.activeTab}
      setActiveTab={controller.setActiveTab}
      allowEdit={controller.allowEdit}
      isControlInternoEnabled={controller.isControlInternoEnabled}
      isArmed={controller.isArmed}
      isLocked={controller.isLocked}
      isJustified={controller.isJustified}
      isShiftOpen={controller.isShiftOpen}
      finalDisabledState={controller.finalDisabledState}
      finalTooltip={controller.finalTooltip}
      canStartBreak={controller.canStartBreak}
      canEndBreak={controller.canEndBreak}
      canClockOut={controller.canClockOut}
      statusConfig={controller.statusConfig}
    />
  );
};

export default QuickActionModalContainer;
