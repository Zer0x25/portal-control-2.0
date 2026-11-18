import { useState, useCallback } from "react";
import { DailyTimeRecord, ModalState, ShiftReport, TimeRecordField } from "../../../types/index";
import { AugmentedTimeRecord } from "../../../types/derived";
import { useToasts } from "../../../hooks/useToasts";
import { useAuth } from "../../../hooks/useAuth";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useAccountingLockDateQuery } from "../../../hooks/queries/useConfigQuery";
import { useReportsQuery } from "../../../hooks/queries/useReportsQuery";
import { logger } from "../../../utils/logger";
import { shiftReportService } from "../../../services/shiftReportService";

interface UseTimeControlModalsOptions {
  closeQuickActionModal: () => void;
}

export const useTimeControlModals = ({ closeQuickActionModal }: UseTimeControlModalsOptions) => {
  const { addToast } = useToasts();
  const { currentUser } = useAuth();

  // Phase 5: TanStack Mutations
  const { deleteRecordMutation } = useTimeRecordMutations();

  const { data: accountingLockDate } = useAccountingLockDateQuery();
  // const deleteRecordById = useStore(s => s.deleteRecordById); // REMOVED
  // const dailyRecords = useStore(s => s.timeRecordsPage.data); // REMOVED
  const { refetch: refetchOpenShiftReports } = useReportsQuery(
    { status: "open" },
    { enabled: false },
  );

  const [modalState, setModalState] = useState<ModalState>({ type: "none" });
  const [editingRecordInfo, setEditingRecordInfo] = useState<{
    record: DailyTimeRecord;
    field: TimeRecordField;
  } | null>(null);
  const [isAddNoveltyModalOpen, setIsAddNoveltyModalOpen] = useState(false);
  const [noveltyInitialText, setNoveltyInitialText] = useState("");
  const [activeShiftForNovelty, setActiveShiftForNovelty] = useState<ShiftReport | null>(null);
  const [recordForNovelty, setRecordForNovelty] = useState<DailyTimeRecord | null>(null);

  // Keep modal action props stable while each modal's own state changes.
  const handleDeleteClick = useCallback(
    (record: DailyTimeRecord) => {
      if (accountingLockDate && record.date <= accountingLockDate) {
        addToast(
          "Este registro está bloqueado por cierre contable y no puede ser eliminado.",
          "error",
        );
        return;
      }
      setModalState({ type: "deleteRecord", data: record });
      closeQuickActionModal();
    },
    [accountingLockDate, addToast, closeQuickActionModal],
  );

  const handleConfirmDelete = useCallback(
    async (recordToDelete: DailyTimeRecord) => {
      if (!recordToDelete) return;

      try {
        await deleteRecordMutation.mutateAsync(recordToDelete.id);
        setModalState({ type: "none" });
      } catch {
        // Error handled by mutation
      }
    },
    [deleteRecordMutation],
  );

  const handleAddCommentClick = useCallback(
    async (record: DailyTimeRecord) => {
      if (accountingLockDate && record.date <= accountingLockDate) {
        addToast("No se pueden agregar comentarios a registros bloqueados.", "warning");
        return;
      }

      let openShiftReports: ShiftReport[];
      try {
        const result = await refetchOpenShiftReports({ throwOnError: true });
        openShiftReports = result.data ?? [];
      } catch (error) {
        logger.error("No se pudieron cargar los turnos abiertos para agregar una novedad:", error);
        addToast("No se pudo verificar el turno activo. Inténtalo nuevamente.", "error");
        return;
      }

      const activeShift = openShiftReports.find((s) => s.status === "open");

      if (!activeShift) {
        addToast("No hay un turno activo para agregar una novedad.", "warning");
        return;
      }
      setActiveShiftForNovelty(activeShift);
      setRecordForNovelty(record);
      const timeToUse = record.entrada;
      setNoveltyInitialText(
        `Novedad sobre ${record.employeeName} (Registro del ${formatDisplayDateTime(timeToUse)}):\n`,
      );
      setIsAddNoveltyModalOpen(true);
      closeQuickActionModal();
    },
    [accountingLockDate, addToast, refetchOpenShiftReports, closeQuickActionModal],
  );

  const handleSaveNovelty = useCallback(
    async (annotation: string, time: string) => {
      if (!activeShiftForNovelty || !currentUser || !recordForNovelty) return;
      try {
        await shiftReportService.addAttendanceNovelty(activeShiftForNovelty.id, {
          recordId: recordForNovelty.id,
          annotation,
          time,
        });
        addToast("Novedad agregada a la bitácora.", "success");
        setIsAddNoveltyModalOpen(false);
        void refetchOpenShiftReports();
      } catch (error) {
        logger.error("No se pudo guardar la novedad:", error);
        addToast(
          "No se pudo guardar la novedad. Verifica que el turno siga abierto e inténtalo nuevamente.",
          "error",
        );
      }
    },
    [activeShiftForNovelty, currentUser, recordForNovelty, addToast, refetchOpenShiftReports],
  );

  const handleEditClick = useCallback(
    (record: DailyTimeRecord, field: TimeRecordField) => {
      if (!record) return;
      setEditingRecordInfo({ record, field });
      closeQuickActionModal();
    },
    [closeQuickActionModal],
  );

  const closeEditTimestampModal = useCallback(() => setEditingRecordInfo(null), []);

  const handleViewHistory = useCallback(
    (record: DailyTimeRecord) => {
      setModalState({ type: "viewHistory", data: record });
      closeQuickActionModal();
    },
    [closeQuickActionModal],
  );

  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [recordToResolve, setRecordToResolve] = useState<AugmentedTimeRecord | null>(null);
  const { resolveAnomalyMutation } = useTimeRecordMutations();

  const handleResolveAnomalyClick = useCallback(
    (record: AugmentedTimeRecord) => {
      setRecordToResolve(record);
      setIsResolutionModalOpen(true);
      closeQuickActionModal();
    },
    [closeQuickActionModal],
  );

  const handleConfirmResolution = useCallback(
    async (
      id: string,
      resolution:
        "ABSENCE_MARK" | "SHIFT_HOURS_ACK" | "PERMIT_MARK" | "DAY_OFF_MARK" | "VACATION_MARK",
    ) => {
      try {
        await resolveAnomalyMutation.mutateAsync({ id, resolution });
        setIsResolutionModalOpen(false);
      } catch {
        // Error handled by mutation
      }
    },
    [resolveAnomalyMutation],
  );

  return {
    modalState,
    setModalState,
    editingRecordInfo,
    closeEditTimestampModal,
    isAddNoveltyModalOpen,
    setIsAddNoveltyModalOpen,
    noveltyInitialText,
    handleDeleteClick,
    handleConfirmDelete,
    handleAddCommentClick,
    handleSaveNovelty,
    handleEditClick,
    handleViewHistory,
    isResolutionModalOpen,
    setIsResolutionModalOpen,
    recordToResolve,
    handleResolveAnomalyClick,
    handleConfirmResolution,
    isProcessingResolution: resolveAnomalyMutation.isPending,
  };
};
