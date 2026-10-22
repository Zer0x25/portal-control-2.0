import { useCallback, useLayoutEffect, useState } from "react";
import type {
  DailyTimeRecord,
  Employee,
  ShiftReport,
  TimeRecordField,
  UpcomingEmployeeStatus,
} from "../../../types";
import { useStore } from "../../../store/useStore";
import { useDashboardClockActions } from "./useDashboardClockActions";

export const useDashboardModalController = () => {
  const [showReportDetailsModal, setShowReportDetailsModal] = useState<ShiftReport | null>(null);
  const [employeeToClockIn, setEmployeeToClockIn] = useState<UpcomingEmployeeStatus | null>(null);
  const [employeeToConfirmClockOut, setEmployeeToConfirmClockOut] = useState<Employee | null>(null);
  const [isAnomaliesModalOpen, setIsAnomaliesModalOpen] = useState(false);
  const [isPresentModalOpen, setIsPresentModalOpen] = useState(false);
  const [quickActionRecord, setQuickActionRecord] = useState<DailyTimeRecord | null>(null);
  const [editingRecordInfo, setEditingRecordInfo] = useState<{
    record: DailyTimeRecord;
    field: TimeRecordField;
  } | null>(null);
  const [isQuickNotesModalOpen, setIsQuickNotesModalOpen] = useState(false);

  const hasUnreadNotes = useStore((state) => state.hasUnreadNotes);
  const clearQuickNotesUnread = useStore((state) => state.clearQuickNotesUnread);
  const { confirmResponsibleClockOut } = useDashboardClockActions(employeeToConfirmClockOut, () =>
    setEmployeeToConfirmClockOut(null),
  );

  useLayoutEffect(() => {
    if (isQuickNotesModalOpen && hasUnreadNotes) clearQuickNotesUnread();
  }, [clearQuickNotesUnread, hasUnreadNotes, isQuickNotesModalOpen]);

  const openQuickNotes = useCallback(() => {
    setIsQuickNotesModalOpen(true);
    clearQuickNotesUnread();
  }, [clearQuickNotesUnread]);

  const closeQuickNotes = useCallback(() => setIsQuickNotesModalOpen(false), []);
  const closeQuickActionModal = useCallback(() => setQuickActionRecord(null), []);
  const closeEditTimestampModal = useCallback(() => setEditingRecordInfo(null), []);
  const closeResponsibleClockOutConfirmation = useCallback(
    () => setEmployeeToConfirmClockOut(null),
    [],
  );

  const modals = {
    showReportDetailsModal,
    employeeToClockIn,
    employeeToConfirmClockOut,
    showResponsibleUserClockOutConfirmation: employeeToConfirmClockOut !== null,
    isAnomaliesModalOpen,
    isPresentModalOpen,
    quickActionRecord,
  };

  const actions = {
    openReportDetailsModal: setShowReportDetailsModal,
    closeReportDetailsModal: () => setShowReportDetailsModal(null),
    openClockInConfirmation: setEmployeeToClockIn,
    closeClockInConfirmation: () => setEmployeeToClockIn(null),
    openAnomaliesModal: () => setIsAnomaliesModalOpen(true),
    closeAnomaliesModal: () => setIsAnomaliesModalOpen(false),
    openPresentModal: () => setIsPresentModalOpen(true),
    closePresentModal: () => setIsPresentModalOpen(false),
    openQuickActionModal: setQuickActionRecord,
    closeQuickActionModal,
    openResponsibleUserClockOutConfirmation: setEmployeeToConfirmClockOut,
    closeResponsibleClockOutConfirmation,
    openEditTimestampModal: (record: DailyTimeRecord, field: TimeRecordField) =>
      setEditingRecordInfo({ record, field }),
    closeEditTimestampModal,
    confirmResponsibleClockOut,
    openQuickNotes,
    closeQuickNotes,
  };

  return {
    actions,
    editingRecordInfo,
    hasUnreadNotes,
    isQuickNotesModalOpen,
    modals,
  };
};
