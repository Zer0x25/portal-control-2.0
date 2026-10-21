import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../../store/useStore";
import { useDashboardClockActions } from "./useDashboardClockActions";

export const useDashboardModalsLoading = () => {
  const modals = useStore(
    useShallow((s) => ({
      showReportDetailsModal: s.showReportDetailsModal,
      employeeToClockIn: s.employeeToClockIn,
      employeeToConfirmClockOut: s.employeeToConfirmClockOut,
      showResponsibleUserClockOutConfirmation: s.showResponsibleUserClockOutConfirmation,
      isAnomaliesModalOpen: s.isAnomaliesModalOpen,
      isPresentModalOpen: s.isPresentModalOpen,
      quickActionRecord: s.quickActionRecord,
    })),
  );

  return modals;
};

export const useDashboardActions = () => {
  const { confirmResponsibleClockOut } = useDashboardClockActions();

  const actions = useStore(
    useShallow((s) => ({
      openReportDetailsModal: s.openReportDetailsModal,
      closeReportDetailsModal: s.closeReportDetailsModal,
      openClockInConfirmation: s.openClockInConfirmation,
      closeClockInConfirmation: s.closeClockInConfirmation,
      closeResponsibleClockOutConfirmation: s.closeResponsibleClockOutConfirmation,
      openAnomaliesModal: s.openAnomaliesModal,
      closeAnomaliesModal: s.closeAnomaliesModal,
      openPresentModal: s.openPresentModal,
      closePresentModal: s.closePresentModal,
      openQuickActionModal: s.openQuickActionModal,
      closeQuickActionModal: s.closeQuickActionModal,
      addToast: s.addToast,
      openResponsibleUserClockOutConfirmation: s.openResponsibleUserClockOutConfirmation,
      openEditTimestampModal: s.openEditTimestampModal,
    })),
  );

  return { ...actions, confirmResponsibleClockOut };
};
