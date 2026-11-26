/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   This file contains the presentational layer for Dashboard.
   Changes to layout/visuals must be approved via PR label `ui/human-approved`.
*/

import React from "react";
import { ExclamationTriangleIcon } from "../../../components/ui/icons/index";
import {
  DashboardQuickNotesModal as QuickNotesModal,
  DashboardShiftReportModal as ShiftReportModal,
} from "../components/DashboardDeferredModals";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import EmptyState from "../../../components/ui/EmptyState";
import CinematicModal from "../../../components/ui/CinematicModal";
import PresentEmployeesModal from "../components/PresentEmployeesModal";
import WelcomePanel from "../components/WelcomePanel";
import Container from "../../../components/ui/Container";
import AmbientReminderManager from "../../../notifications/components/AmbientReminderManager";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import {
  DailyTimeRecord,
  DashboardWidget,
  EmployeeWithClockingStatus,
  ShiftReport,
} from "../../../types/index";

interface DashboardModalsState {
  showReportDetailsModal: ShiftReport | null;
  showResponsibleUserClockOutConfirmation: boolean;
  quickActionRecord: DailyTimeRecord | null;
  isAnomaliesModalOpen: boolean;
  isPresentModalOpen: boolean;
}

interface DashboardActionsState {
  closeReportDetailsModal: () => void;
  closeResponsibleClockOutConfirmation: () => void;
  confirmResponsibleClockOut: () => Promise<boolean>;
  closeAnomaliesModal: () => void;
  closePresentModal: () => void;
}

interface DashboardViewProps {
  currentUser: unknown;
  users?: unknown[];
  getEmployeeById?: (id: string) => unknown;
  isControlInternoEnabled?: boolean;
  isMobile?: boolean;
  modals: DashboardModalsState;
  isQuickNotesModalOpen: boolean;
  handleCloseQuickNotes: () => void;
  actions: DashboardActionsState;
  shiftReports: unknown[];
  isLoadingReports: boolean;
  isLoadingOverview: boolean;
  teamStatus: unknown;
  unscheduledPresent: unknown[];
  employeeStatuses: EmployeeWithClockingStatus[];
  isResolvingPresentRecord: boolean;
  visibleWidgets: DashboardWidget[];
  widgetProps: Record<string, Record<string, unknown>>;
  quickActionModal: React.ReactNode;
  editTimestampModal: React.ReactNode;
  handlePresentEmployeeDoubleClick: (employeeId: string, employeeName: string) => void;
  handleAnomalyRecordDoubleClick: (r: DailyTimeRecord) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  isQuickNotesModalOpen,
  handleCloseQuickNotes,
  actions,
  modals,
  shiftReports,
  isLoadingReports,
  isLoadingOverview,
  employeeStatuses,
  isResolvingPresentRecord,
  visibleWidgets,
  widgetProps,
  quickActionModal,
  editTimestampModal,
  handlePresentEmployeeDoubleClick,
}) => {
  if ((isLoadingReports && shiftReports.length === 0) || isLoadingOverview) {
    return (
      <Container noPadding data-ui-protected className="dashboard-ui-protected space-y-6">
        <WelcomePanel />

        <div role="status" className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
          <div className="relative mb-8">
            <LoadingSpinner size="md" variant="default" />
          </div>
          <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.4em] animate-pulse">
            Sincronizando Dashboard
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container noPadding data-ui-protected className="dashboard-ui-protected space-y-6">
      <WelcomePanel />

      <ul
        aria-label="Widgets del dashboard"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {visibleWidgets.length > 0 ? (
          visibleWidgets.map((widget) => {
            const WidgetComponent = widget.component as React.ComponentType<
              Record<string, unknown>
            >;
            const props = widgetProps[widget.id] || {};

            return (
              <li
                key={widget.id}
                className="animate-in fade-in zoom-in-95 [animation-duration:200ms]"
              >
                <WidgetComponent {...props} />
              </li>
            );
          })
        ) : (
          <li>
            <EmptyState
              icon={<ExclamationTriangleIcon />}
              title="No hay widgets disponibles"
              description="No tienes permisos para ver widgets en el dashboard o no hay widgets configurados."
            />
          </li>
        )}
      </ul>

      {/* Modals */}
      <QuickNotesModal isOpen={isQuickNotesModalOpen} onClose={handleCloseQuickNotes} />

      <ShiftReportModal
        isOpen={Boolean(modals.showReportDetailsModal)}
        onClose={actions.closeReportDetailsModal}
        report={modals.showReportDetailsModal ?? null}
      />

      <ConfirmationModal
        isOpen={modals.showResponsibleUserClockOutConfirmation}
        onClose={actions.closeResponsibleClockOutConfirmation}
        onConfirm={() => {
          void actions.confirmResponsibleClockOut();
        }}
        title="Confirmar Salida"
        message="¿Confirmar salida del empleado?"
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      {quickActionModal}
      {editTimestampModal}

      <CinematicModal
        isOpen={modals.isAnomaliesModalOpen}
        onClose={actions.closeAnomaliesModal}
        title="Anomalías del Equipo"
        maxWidth="max-w-6xl"
      >
        <div>Anomalías del equipo se mostrarán aquí</div>
      </CinematicModal>

      <PresentEmployeesModal
        isOpen={modals.isPresentModalOpen}
        onClose={actions.closePresentModal}
        employeeStatuses={employeeStatuses}
        isResolvingRecord={isResolvingPresentRecord}
        onEmployeeDoubleClick={handlePresentEmployeeDoubleClick}
      />

      <AmbientReminderManager />
    </Container>
  );
};

export default DashboardView;
