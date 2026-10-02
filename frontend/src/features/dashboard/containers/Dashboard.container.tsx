import React, { useCallback, useMemo } from "react";
import { useStore } from "../../../store/useStore";
import { useShallow } from "zustand/react/shallow";
import { AttendanceRecord, DailyTimeRecord, MissingClockOutStatus } from "../../../types/index";
import { getContractClockingStatus } from "../../../utils/mappings";
import { useTimeRecordActions } from "../../../hooks/useTimeRecordActions";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useUsers } from "../../../hooks/useUsers";
import { useEmployees } from "../../../hooks/useEmployees";

import { useDashboardModalsLoading, useDashboardActions } from "../hooks/useDashboardStore";
import { useDashboardData } from "../hooks/useDashboardData";

import DashboardView from "../views/Dashboard.view";
import { WIDGET_REGISTRY } from "../components/widgetRegistry";

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
  const modals = useDashboardModalsLoading();
  const actions = useDashboardActions();
  const {
    isControlInternoEnabled,
    shiftReports,
    isLoadingReports,
    isLoadingOverview,
    teamStatus,
    unscheduledPresent,
  } = useDashboardData();

  // QuickNotes state selectors
  const { isQuickNotesModalOpen, handleCloseQuickNotes } = useStore(
    useShallow((s) => ({
      isQuickNotesModalOpen: s.isQuickNotesModalOpen,
      handleCloseQuickNotes: s.handleCloseQuickNotes,
    })),
  );

  const getResponsibleDisplayName = useCallback(
    (username: string): string => {
      const user = users.find((u) => u.username === username);
      return user?.employeeId ? getEmployeeById(user.employeeId)?.name || username : username;
    },
    [users, getEmployeeById],
  );

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

  const handleEditClick = () => {
    if (modals.quickActionRecord) {
      actions.openEditTimestampModal(modals.quickActionRecord, "entrada");
      actions.closeQuickActionModal();
    }
  };

  // Derived State for Rendering
  const visibleWidgets = useMemo(() => {
    if (!currentUser) return [];

    return WIDGET_REGISTRY.filter((widget) => {
      if (widget.module === "controlInterno" && !isControlInternoEnabled) return false;

      const hasRole = widget.roles.some((r) => r.toLowerCase() === currentUser.role.toLowerCase());
      if (!hasRole) return false;

      if (isMobile && !widget.mobileVisible) return false;

      return true;
    });
  }, [currentUser, isMobile, isControlInternoEnabled]);

  const quickActionClockStatus = useMemo(
    () => getContractClockingStatus(modals.quickActionRecord as AttendanceRecord, () => "fuera"),
    [modals.quickActionRecord],
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
  };

  return (
    <DashboardView
      currentUser={currentUser}
      users={users}
      getEmployeeById={getEmployeeById}
      isControlInternoEnabled={isControlInternoEnabled}
      isMobile={isMobile}
      modals={modals}
      isQuickNotesModalOpen={isQuickNotesModalOpen}
      handleCloseQuickNotes={handleCloseQuickNotes}
      actions={actions}
      shiftReports={shiftReports}
      isLoadingReports={isLoadingReports}
      isLoadingOverview={isLoadingOverview}
      teamStatus={teamStatus}
      unscheduledPresent={unscheduledPresent}
      visibleWidgets={visibleWidgets}
      widgetProps={widgetProps}
      quickActionClockStatus={quickActionClockStatus}
      handleClockOutFromQuickAction={handleClockOutFromQuickAction}
      handleStartBreakFromQuickAction={handleStartBreakFromQuickAction}
      handleEndBreakFromQuickAction={handleEndBreakFromQuickAction}
      handleEditClick={handleEditClick}
      handlePresentEmployeeDoubleClick={handlePresentEmployeeDoubleClick}
      handleAnomalyRecordDoubleClick={handleAnomalyRecordDoubleClick}
    />
  );
};

export default DashboardContainer;
