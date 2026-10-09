/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   This file contains the presentational layer for Dashboard.
   Changes to layout/visuals must be approved via PR label `ui/human-approved`.
*/

import React from "react";
import { motion } from "framer-motion";
import { ExclamationTriangleIcon } from "../../../components/ui/icons/index";
import { QuickNotesModal } from "..";
import ShiftReportModal from "../../../components/ui/ShiftReportModal";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import { EditTimestampModal, QuickActionModal } from "../../time-control";
import EmptyState from "../../../components/ui/EmptyState";
import CinematicModal from "../../../components/ui/CinematicModal";
import WelcomePanel from "../components/WelcomePanel";
import Container from "../../../components/ui/Container";
import AmbientReminderManager from "../../../notifications/components/AmbientReminderManager";
import {
  DailyTimeRecord,
  ClockingStatus,
  DashboardWidget,
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
  closeQuickActionModal: () => void;
  openEditTimestampModal: (record: DailyTimeRecord, field: string) => void;
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
  visibleWidgets: DashboardWidget[];
  widgetProps: Record<string, Record<string, unknown>>;
  quickActionClockStatus: ClockingStatus;
  handleClockOutFromQuickAction: () => Promise<void>;
  handleStartBreakFromQuickAction: () => Promise<void>;
  handleEndBreakFromQuickAction: () => Promise<void>;
  handleEditClick: () => void;
  handlePresentEmployeeDoubleClick: (r: DailyTimeRecord) => void;
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
  visibleWidgets,
  widgetProps,
  quickActionClockStatus,
  handleClockOutFromQuickAction,
  handleStartBreakFromQuickAction,
  handleEndBreakFromQuickAction,
}) => {
  if ((isLoadingReports && shiftReports.length === 0) || isLoadingOverview) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <div className="relative mb-8">
          <div className="w-10 h-10 border-2 border-token-border-subtle border-t-sap-blue rounded-full animate-spin opacity-40"></div>
        </div>
        <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.4em] animate-pulse">
          Sincronizando Dashboard
        </p>
      </div>
    );
  }

  return (
    <Container
      variant="standard"
      noPadding
      data-ui-protected
      className="dashboard-ui-protected space-y-6"
    >
      <WelcomePanel />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleWidgets.length > 0 ? (
          visibleWidgets.map((widget) => {
            const WidgetComponent = widget.component as React.ComponentType<
              Record<string, unknown>
            >;
            const props = widgetProps[widget.id] || {};

            return (
              <motion.div
                key={widget.id}
                layoutId={widget.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <WidgetComponent {...props} />
              </motion.div>
            );
          })
        ) : (
          <EmptyState
            icon={<ExclamationTriangleIcon />}
            title="No hay widgets disponibles"
            description="No tienes permisos para ver widgets en el dashboard o no hay widgets configurados."
          />
        )}
      </div>

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

      <QuickActionModal
        isOpen={!!modals.quickActionRecord}
        onClose={actions.closeQuickActionModal}
        record={modals.quickActionRecord}
        clockStatus={quickActionClockStatus}
        onStartBreak={() => {
          void handleStartBreakFromQuickAction();
        }}
        onEndBreak={() => {
          void handleEndBreakFromQuickAction();
        }}
        onClockOut={handleClockOutFromQuickAction}
        onEdit={(record, field) => actions.openEditTimestampModal(record, field)}
        isActionDisabled={false}
        disabledTooltip=""
      />

      <EditTimestampModal />

      <CinematicModal
        isOpen={modals.isAnomaliesModalOpen}
        onClose={actions.closeAnomaliesModal}
        title="Anomalías del Equipo"
        maxWidth="max-w-6xl"
      >
        <div>Anomalías del equipo se mostrarán aquí</div>
      </CinematicModal>

      <CinematicModal
        isOpen={modals.isPresentModalOpen}
        onClose={actions.closePresentModal}
        title="Personal Presente"
        maxWidth="max-w-6xl"
      >
        <div>Personal presente se mostrará aquí</div>
      </CinematicModal>

      <AmbientReminderManager />
    </Container>
  );
};

export default DashboardView;
