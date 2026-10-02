import { useState, useCallback } from "react";
import { DailyTimeRecord, ModalState, ShiftReport, TimeRecordField } from "../../../types/index";
import { AugmentedTimeRecord } from "../../../types/derived";
import { useToasts } from "../../../hooks/useToasts";
import { useAuth } from "../../../hooks/useAuth";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { useStore } from "../../../store/useStore";
import { useTimeRecordMutations } from "../../../hooks/queries/useTimeRecordsQuery";
import { useAccountingLockDateQuery } from "../../../hooks/queries/useConfigQuery";
import { useReportsQuery } from "../../../hooks/queries/useReportsQuery";

export const useTimeControlModals = () => {
  const { addToast } = useToasts();
  const { currentUser } = useAuth();
  const actorUsername = currentUser?.username || "System";

  // Phase 5: TanStack Mutations
  const { deleteRecordMutation } = useTimeRecordMutations();

  const { data: accountingLockDate } = useAccountingLockDateQuery();
  // const deleteRecordById = useStore(s => s.deleteRecordById); // REMOVED
  const openEditTimestampModal = useStore((s) => s.openEditTimestampModal);
  const closeQuickActionModal = useStore((s) => s.closeQuickActionModal);
  // const dailyRecords = useStore(s => s.timeRecordsPage.data); // REMOVED
  const { data: shiftReports = [] } = useReportsQuery({ status: "open" });

  const [modalState, setModalState] = useState<ModalState>({ type: "none" });
  const [isAddNoveltyModalOpen, setIsAddNoveltyModalOpen] = useState(false);
  const [noveltyInitialText, setNoveltyInitialText] = useState("");
  const [activeShiftForNovelty, setActiveShiftForNovelty] = useState<ShiftReport | null>(null);

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
    [deleteRecordMutation, actorUsername],
  );

  const handleAddCommentClick = useCallback(
    async (record: DailyTimeRecord) => {
      if (accountingLockDate && record.date <= accountingLockDate) {
        addToast("No se pueden agregar comentarios a registros bloqueados.", "warning");
        return;
      }

      const activeShift = shiftReports.find((s) => s.status === "open");

      if (!activeShift) {
        addToast("No hay un turno activo para agregar una novedad.", "warning");
        return;
      }
      setActiveShiftForNovelty(activeShift);
      const timeToUse = record.entrada;
      setNoveltyInitialText(
        `Novedad sobre ${record.employeeName} (Registro del ${formatDisplayDateTime(timeToUse)}):\n`,
      );
      setIsAddNoveltyModalOpen(true);
      closeQuickActionModal();
    },
    [accountingLockDate, addToast, shiftReports, closeQuickActionModal],
  );

  const handleSaveNovelty = useCallback(
    async (annotation: string, time: string) => {
      if (!activeShiftForNovelty || !currentUser) return;

      // In a real backend-centric app, we would call a service here
      console.warn("Saving novelty to backend (mock):", {
        annotation,
        time,
        shiftFolio: activeShiftForNovelty.folio,
      });
      addToast("Novedad agregada (Simulación).", "success");
      setIsAddNoveltyModalOpen(false);
    },
    [activeShiftForNovelty, currentUser, addToast],
  );

  const handleEditClick = useCallback(
    (record: DailyTimeRecord, field: TimeRecordField) => {
      if (!record) return;
      openEditTimestampModal(record, field);
      closeQuickActionModal();
    },
    [openEditTimestampModal, closeQuickActionModal],
  );

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
