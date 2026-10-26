import React from "react";
import type { ClockingStatus, DailyTimeRecord, TimeRecordField } from "../../../types";

const QuickActionModal = React.lazy(
  () => import("../../time-control/components/QuickActionModal.container"),
);
const EditTimestampModal = React.lazy(
  () => import("../../time-control/components/EditTimestampModal.container"),
);

interface DashboardQuickActionModalProps {
  record: DailyTimeRecord;
  clockStatus: ClockingStatus;
  onClose: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onClockOut: () => void;
  onEdit: (record: DailyTimeRecord, field: TimeRecordField) => void;
  isActionDisabled: boolean;
  disabledTooltip: string;
}

export const DashboardQuickActionModal: React.FC<DashboardQuickActionModalProps> = (props) => (
  <React.Suspense fallback={null}>
    <QuickActionModal isOpen {...props} />
  </React.Suspense>
);

interface DashboardEditTimestampModalProps {
  onClose: () => void;
  editingInfo: { record: DailyTimeRecord; field: TimeRecordField };
}

export const DashboardEditTimestampModal: React.FC<DashboardEditTimestampModalProps> = (props) => (
  <React.Suspense fallback={null}>
    <EditTimestampModal isOpen {...props} />
  </React.Suspense>
);
