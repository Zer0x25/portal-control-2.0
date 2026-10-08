/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for TimeControl page.
*/

import React from "react";
import { DailyTimeRecord, AugmentedTimeRecord, ClockingStatus } from "../../../types/index";
import { ModalState } from "../../../types/ui";
import { QuickFilterMode } from "../hooks/useTimeRecordFilters";
import { ClockIcon } from "../../../components/ui/icons";
import PageHeader from "../../../components/ui/PageHeader";
import ServerClock from "../../../components/ui/ServerClock";
import Card from "../../../components/ui/Card";
import ClockingPanel from "../components/ClockingPanel";
import TimeRecordFilters from "../components/TimeRecordFilters";
import TimeRecordTable from "../components/TimeRecordTable";
const RecordHistoryModal = React.lazy(() => import("../../../components/ui/RecordHistoryModal"));
const ConfirmationModal = React.lazy(() => import("../../../components/ui/ConfirmationModal"));
const QuickActionModal = React.lazy(() =>
  import("..").then((m) => ({ default: m.QuickActionModal })),
);
const AnomalyResolutionModal = React.lazy(
  () => import("../../../components/ui/AnomalyResolutionModal"),
);
const EditTimestampModal = React.lazy(() =>
  import("..").then((m) => ({ default: m.EditTimestampModal })),
);

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for TimeControl page.
*/

export interface TimeControlViewProps {
  isActionDisabledForRole: boolean;
  roleBasedTooltip?: string | null;
  clientFilters: {
    name: string;
    area: string;
    workdayType: string;
    status: string;
    showAnomalies?: boolean;
  };
  dateFilters: { desde: string; hasta: string; is24h: boolean };
  handleClientFilterChange: (
    f: Partial<{ name: string; area: string; workdayType: string; status: string }>,
  ) => void;
  handleDateFilterChange: (f: Partial<{ desde: string; hasta: string }>) => void;
  handleQuickFilterClick: (q: QuickFilterMode) => void;
  handleApplyCustomFilters: () => void;
  clearFilters: () => void;
  filteredRecords: AugmentedTimeRecord[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  handleRowDoubleClick: (r: DailyTimeRecord) => void;
  handleAddCommentClick: (r: DailyTimeRecord) => void;
  handleDeleteClick: (r: DailyTimeRecord) => void;
  isAddNoveltyModalOpen: boolean;
  setIsAddNoveltyModalOpen: (v: boolean) => void;
  noveltyInitialText?: string;
  handleSaveNovelty: (annotation: string, time: string) => Promise<void>;
  modalState: ModalState;
  setModalState: (s: ModalState) => void;
  handleConfirmDelete: (r: DailyTimeRecord) => void;
  quickActionRecord?: DailyTimeRecord | null;
  closeQuickActionModal: () => void;
  quickActionClockStatus?: ClockingStatus | null;
  handleEditClick: (r?: DailyTimeRecord, field?: string) => void;
  isLoading: boolean;
  isApplyButtonEnabled: boolean;
  periodDisplayText?: string;
  activeQuickFilter: QuickFilterMode | null;
  handleExportStreaming: (format: "csv" | "excel") => void;
  handleViewHistory: (record: DailyTimeRecord) => void;
  totalRecords: number;
  filtersKey?: string;
  // Anomaly resolution
  isResolutionModalOpen: boolean;
  setIsResolutionModalOpen: (v: boolean) => void;
  recordToResolve?: AugmentedTimeRecord | null;
  handleResolveAnomalyClick: (r: AugmentedTimeRecord) => void;
  handleConfirmResolution: (
    id: string,
    resolution:
      "ABSENCE_MARK" | "SHIFT_HOURS_ACK" | "PERMIT_MARK" | "DAY_OFF_MARK" | "VACATION_MARK",
  ) => Promise<void>;
  isProcessingResolution?: boolean;
  // Config
  isControlInternoEnabled?: boolean;
  effectiveLockDate: string;
  isPageLoading?: boolean;
  // optional action helpers attached by container
  startBreak?: (r: DailyTimeRecord) => Promise<unknown>;
  endBreak?: (r: DailyTimeRecord) => Promise<unknown>;
  clockOut?: (r: DailyTimeRecord) => Promise<unknown>;
}

const TimeControlView: React.FC<React.PropsWithChildren<TimeControlViewProps>> = (props) => {
  if (props.isPageLoading) {
    return (
      <div className="py-20 text-center text-token-text-primary min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sap-blue"></div>
          <p className="text-sm font-medium animate-pulse">
            Optimizando registros de asistencia...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-ui-protected className="space-y-6">
      <div className="w-full">
        <PageHeader
          className="w-full"
          eyebrow="Operaciones"
          eyebrowIcon={<ClockIcon className="w-3.5 h-3.5" />}
          icon={<ClockIcon className="w-4 h-4" />}
          title="Control de Asistencia"
          subtitle="Gestión de marcajes en tiempo real y registro histórico de jornadas."
          actions={
            <div className="bg-token-surface-header p-3 sm:p-4 rounded-sm flex items-center gap-6 border border-token-border-technical shadow-sm overflow-hidden relative group transition-all">
              <ServerClock
                containerClassName="flex flex-col items-start text-left shrink-0"
                dateClassName="font-bold text-[11px] text-token-text-tertiary uppercase tracking-widest mb-0.5 leading-none"
                timeClassName="font-bold text-2xl sm:text-3xl text-token-text-primary leading-none tabular-nums font-mono tracking-tighter"
              />
            </div>
          }
        />
      </div>

      {props.isControlInternoEnabled && (
        <Card
          variant="premium"
          title="CONSOLA DE MARCAJE"
          className="border-token-border-technical"
        >
          <ClockingPanel
            isActionDisabled={props.isActionDisabledForRole}
            roleBasedTooltip={props.roleBasedTooltip}
          />
        </Card>
      )}

      <Card
        variant="premium"
        title="BÚSQUEDA Y SEGMENTACIÓN"
        className="border-token-border-technical"
      >
        <TimeRecordFilters
          clientFilters={props.clientFilters}
          dateFilters={props.dateFilters}
          onClientFilterChange={props.handleClientFilterChange}
          onDateFilterChange={props.handleDateFilterChange}
          onQuickFilterClick={props.handleQuickFilterClick}
          onApplyCustomFilters={props.handleApplyCustomFilters}
          onClearFilters={props.clearFilters}
          isApplyButtonEnabled={props.isApplyButtonEnabled}
          periodDisplayText={props.periodDisplayText}
          activeQuickFilter={props.activeQuickFilter}
        />
      </Card>

      <Card
        variant="premium"
        noPadding
        title="REGISTROS DE ASISTENCIA"
        badge={
          <div className="flex items-center gap-2 px-3 py-1 bg-token-surface-technical rounded-md border border-token-border-technical shadow-inner animate-in fade-in zoom-in duration-300">
            <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
              Seleccionados
            </span>
            <span className="text-xs font-black text-sap-blue font-mono tabular-nums leading-none">
              {props.totalRecords.toLocaleString()}
            </span>
          </div>
        }
        className="border-token-border-technical overflow-hidden"
      >
        <div className="p-4 sm:p-8">
          <TimeRecordTable
            records={props.filteredRecords}
            fetchNextPage={props.fetchNextPage}
            hasNextPage={props.hasNextPage}
            isFetchingNextPage={props.isFetchingNextPage}
            isLoading={props.isLoading}
            onRowDoubleClick={props.handleRowDoubleClick}
            onAddComment={props.handleAddCommentClick}
            onDelete={props.handleDeleteClick}
            isActionDisabledForRole={props.isActionDisabledForRole}
            roleBasedTooltip={props.roleBasedTooltip}
            accountingLockDate={props.effectiveLockDate}
            isControlInternoEnabled={props.isControlInternoEnabled}
            searchName={props.clientFilters.name}
            onSearchChange={(name: string) => props.handleClientFilterChange({ name })}
            onExportStreaming={props.handleExportStreaming}
            onViewHistory={props.handleViewHistory}
            filtersKey={props.filtersKey}
          />
        </div>
      </Card>

      {props.modalState.type === "viewHistory" && (
        <React.Suspense fallback={null}>
          <RecordHistoryModal
            isOpen={true}
            onClose={() => props.setModalState({ type: "none" })}
            recordId={props.modalState.data?.id || null}
            employeeName={props.modalState.data?.employeeName || ""}
            date={props.modalState.data?.date || ""}
          />
        </React.Suspense>
      )}

      {props.modalState.type === "deleteRecord" && props.modalState.data && (
        <React.Suspense fallback={null}>
          <ConfirmationModal
            isOpen={true}
            onClose={() => props.setModalState({ type: "none" })}
            onConfirm={() => props.handleConfirmDelete(props.modalState.data as DailyTimeRecord)}
            title="¿Eliminar registro?"
            message="¿Estás seguro que deseas eliminar este registro de asistencia?"
          />
        </React.Suspense>
      )}

      {props.quickActionRecord && (
        <React.Suspense fallback={null}>
          <QuickActionModal
            isOpen={true}
            onClose={props.closeQuickActionModal}
            record={props.quickActionRecord}
            clockStatus={props.quickActionClockStatus}
            onStartBreak={() =>
              props.quickActionRecord &&
              props.startBreak &&
              props.startBreak(props.quickActionRecord)
            }
            onEndBreak={() =>
              props.quickActionRecord && props.endBreak && props.endBreak(props.quickActionRecord)
            }
            onClockOut={() =>
              props.quickActionRecord && props.clockOut && props.clockOut(props.quickActionRecord)
            }
            onEdit={props.handleEditClick}
            onResolveAnomaly={props.handleResolveAnomalyClick}
            isActionDisabled={props.isActionDisabledForRole}
            disabledTooltip={props.roleBasedTooltip}
          />
        </React.Suspense>
      )}

      {props.isResolutionModalOpen && (
        <React.Suspense fallback={null}>
          <AnomalyResolutionModal
            isOpen={true}
            onClose={() => props.setIsResolutionModalOpen(false)}
            record={props.recordToResolve}
            onEdit={(record: AugmentedTimeRecord) => props.handleEditClick(record, "entrada")}
            onResolve={props.handleConfirmResolution}
            isProcessing={props.isProcessingResolution}
          />
        </React.Suspense>
      )}

      <React.Suspense fallback={null}>
        <EditTimestampModal />
      </React.Suspense>
    </div>
  );
};

export default TimeControlView;
