import React from "react";
import { useStore } from "../../../store/useStore";
import { useShallow } from "zustand/react/shallow";
import { AttendanceRecord, DailyTimeRecord, MissingClockOutStatus } from "../../../types/index";
import { getContractClockingStatus } from "../../../utils/mappings";
import { useTimeRecordActions } from "../../../hooks/useTimeRecordActions";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useUsers } from "../../../hooks/useUsers";
import { useEmployees } from "../../../hooks/useEmployees";

import { useDashboardModalController } from "../hooks/useDashboardModalController";
import { useDashboardData } from "../hooks/useDashboardData";

import DashboardView from "../views/Dashboard.view";
import { WIDGET_REGISTRY } from "../components/widgetRegistry";
import {
  DashboardEditTimestampModal,
  DashboardQuickActionModal,
} from "../components/DashboardTimeControlModals";

const DashboardContainer: React.FC = () => {
  const { currentUser } = useStore(
    useShallow((s) => ({
      currentUser: s.currentUser,
    })),
  );

  const { users } = useUsers();
  const { getEmployeeById } = useEmployees();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const { clockOut, startBreak, endBreak } = useTimeRecordActions();

  // Extract Logic to Hooks (Golden Path)
  const { actions, editingRecordInfo, hasUnreadNotes, isQuickNotesModalOpen, modals } =
    useDashboardModalController();
  const {
    isControlInternoEnabled,
    shiftReports,
    isLoadingReports,
    isLoadingOverview,
    teamStatus,
    unscheduledPresent,
  } = useDashboardData();

  const getResponsibleDisplayName = (username: string): string => {
    const user = users.find((u) => u.username === username);
    return user?.employeeId ? getEmployeeById(user.employeeId)?.name || username : username;
  };

  const handleMissingClockOutDoubleClick = (missing: MissingClockOutStatus) => {
    if (missing?.recordId) {
      // no-op: placeholder for future logic
    }
  };

  const handleUnscheduledPresentDoubleClick = (record: DailyTimeRecord) => {
    if (record) {
      actions.openQuickActionModal(record);
    }
  };

  const handleAnomalyRecordDoubleClick = (record: DailyTimeRecord) => {
    if (record) {
      actions.openQuickActionModal(record);
    }
  };

  const handlePresentEmployeeDoubleClick = (record: DailyTimeRecord) => {
    if (record) {
      actions.openQuickActionModal(record);
    }
  };

  const handleClockOutFromQuickAction = async () => {
    if (modals.quickActionRecord) {
      await clockOut(modals.quickActionRecord);
      actions.closeQuickActionModal();
    }
  };

  const handleStartBreakFromQuickAction = async () => {
    if (modals.quickActionRecord) {
      await startBreak(modals.quickActionRecord);
      actions.closeQuickActionModal();
    }
  };

  const handleEndBreakFromQuickAction = async () => {
    if (modals.quickActionRecord) {
      await endBreak(modals.quickActionRecord);
      actions.closeQuickActionModal();
    }
  };

  const handleEditQuickAction = (
    record: DailyTimeRecord,
    field: import("../../../types").TimeRecordField,
  ) => {
    actions.openEditTimestampModal(record, field);
    actions.closeQuickActionModal();
  };

  // Derived State for Rendering
  const visibleWidgets = (() => {
    if (!currentUser) return [];

    return WIDGET_REGISTRY.filter((widget) => {
      if (widget.module === "controlInterno" && !isControlInternoEnabled) return false;

      const hasRole = widget.roles.some((r) => r.toLowerCase() === currentUser.role.toLowerCase());
      if (!hasRole) return false;

      if (isMobile && !widget.mobileVisible) return false;

      return true;
    });
  })();

  const quickActionClockStatus = getContractClockingStatus(
    modals.quickActionRecord as AttendanceRecord,
    () => "fuera",
  );

  // Typing the widget props dictionary to avoid 'any' where possible
  const widgetProps: Record<string, Record<string, unknown>> = {
    alerts: {
      upcomingEmployees: [],
      missingClockOuts: [],
      openClockInConfirmation: actions.openClockInConfirmation,
      onMissingClockOutDoubleClick: handleMissingClockOutDoubleClick,
    },
    teamStatus: {
      teamStatus: teamStatus,
      unscheduledPresent: unscheduledPresent,
      onUnscheduledPresentDoubleClick: handleUnscheduledPresentDoubleClick,
      openAnomaliesModal: actions.openAnomaliesModal,
      openPresentModal: actions.openPresentModal,
    },
    latestReports: {
      shiftReports: shiftReports,
      getResponsibleDisplayName,
      openReportDetailsModal: actions.openReportDetailsModal,
    },
    tools: {
      onOpenQuickNotes: actions.openQuickNotes,
      hasUnreadNotes,
    },
  };

  const quickActionModal = modals.quickActionRecord ? (
    <DashboardQuickActionModal
      onClose={actions.closeQuickActionModal}
      record={modals.quickActionRecord}
      clockStatus={quickActionClockStatus}
      onStartBreak={handleStartBreakFromQuickAction}
      onEndBreak={handleEndBreakFromQuickAction}
      onClockOut={handleClockOutFromQuickAction}
      onEdit={handleEditQuickAction}
      isActionDisabled={false}
      disabledTooltip=""
    />
  ) : null;

  const editTimestampModal = editingRecordInfo ? (
    <DashboardEditTimestampModal
      onClose={actions.closeEditTimestampModal}
      editingInfo={editingRecordInfo}
    />
  ) : null;

  return (
    <DashboardView
      currentUser={currentUser}
      users={users}
      getEmployeeById={getEmployeeById}
      isControlInternoEnabled={isControlInternoEnabled}
      isMobile={isMobile}
      modals={modals}
      isQuickNotesModalOpen={isQuickNotesModalOpen}
      handleCloseQuickNotes={actions.closeQuickNotes}
      actions={actions}
      shiftReports={shiftReports}
      isLoadingReports={isLoadingReports}
      isLoadingOverview={isLoadingOverview}
      teamStatus={teamStatus}
      unscheduledPresent={unscheduledPresent}
      visibleWidgets={visibleWidgets}
      widgetProps={widgetProps}
      quickActionModal={quickActionModal}
      editTimestampModal={editTimestampModal}
      handlePresentEmployeeDoubleClick={handlePresentEmployeeDoubleClick}
      handleAnomalyRecordDoubleClick={handleAnomalyRecordDoubleClick}
    />
  );
};

export default DashboardContainer;
