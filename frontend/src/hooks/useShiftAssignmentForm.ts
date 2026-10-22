import { useCallback, useEffect, useMemo, useState } from "react";
import { AssignedShift, Syncable } from "../types/index";
import { useShiftPatternsQuery } from "./queries/useShiftPatternsQuery";
import { useAssignedShiftsQuery } from "./queries/useAssignedShiftsQuery";
import { useShiftMutations } from "./useShiftMutations";
import { detectAssignmentConflicts } from "../utils/shiftUtils";
import { addBusinessDaysChile, toBusinessDateChile } from "../utils/dateUtils";
import { useAppForm } from "./useAppForm";
import { buildShiftAssignmentSchema, type ShiftAssignmentFormValues } from "../schemas/forms";

/**
 * Spec 036 T8 (AC1, AC2, AC3, AC4): formulario de **asignacion de turno**.
 *
 * Antes eran 233 lineas de maquina de formulario a mano (cinco `useState`,
 * validaciones con `addToast` y el payload montado a mano). Ahora el estado
 * vive en `useAppForm`, las reglas viven en el schema y el envio esta
 * protegido contra el doble envio por la capa.
 *
 * El **conflicto de solapamiento** no es una regla de validacion: abre un
 * modal que pregunta como resolverlo, asi que lo decide el hook (no el
 * schema).
 */

/** Datos de una asignacion pendientes de guardar (tras validar). */
interface PendingAssignment {
  assignmentData: Omit<AssignedShift, "id" | "employeeName" | "shiftPatternName" | keyof Syncable>;
  isEditing: boolean;
}

/** Opciones del hook de asignacion de turno. */
export interface UseShiftAssignmentFormOptions {
  /** Callback que se ejecuta cuando la asignacion se guardo correctamente. */
  readonly onSaved?: () => void;
}

export const useShiftAssignmentForm = (options?: UseShiftAssignmentFormOptions) => {
  const { data: shiftPatterns = [] } = useShiftPatternsQuery();
  const { data: assignedShifts = [] } = useAssignedShiftsQuery();
  const { assignShift, updateAssignment } = useShiftMutations();

  const [editingAssignment, setEditingAssignment] = useState<AssignedShift | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [pendingAssignmentData, setPendingAssignmentData] = useState<PendingAssignment | null>(
    null,
  );
  const [resolutionMode, setResolutionMode] = useState<"OVERLAP" | "SMART_TERMINATE">("OVERLAP");
  const [conflictingAssignment, setConflictingAssignment] = useState<AssignedShift | null>(null);

  /**
   * No se pueden crear asignaciones con mas de 7 dias de antiguedad (regla de
   * la pantalla, no del backend).
   */
  const oldestAllowedStartDate = useMemo(() => addBusinessDaysChile(toBusinessDateChile(), -7), []);

  const schema = useMemo(
    () =>
      buildShiftAssignmentSchema({
        patterns: shiftPatterns,
        oldestAllowedStartDate,
      }),
    [shiftPatterns, oldestAllowedStartDate],
  );

  const form = useAppForm<ShiftAssignmentFormValues>({
    schema,
    defaultValues: { employeeId: "", shiftPatternId: "", startDate: "", endDate: "" },
    onSubmit: async (values) => {
      const assignmentData = {
        employeeId: values.employeeId,
        shiftPatternId: values.shiftPatternId,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
      };

      const dataToProcess: PendingAssignment = {
        assignmentData,
        isEditing: !!editingAssignment,
      };

      const tempId = "temp-" + Date.now();
      const newOrUpdatedAssignment: AssignedShift = {
        ...assignmentData,
        id: editingAssignment ? editingAssignment.id : tempId,
        createdAt: editingAssignment?.createdAt || Date.now(),
        syncStatus: "pending",
        isDeleted: false,
        lastModified: Date.now(),
      };

      const otherAssignments = assignedShifts.filter(
        (a) =>
          a.id !== newOrUpdatedAssignment.id && a.employeeId === newOrUpdatedAssignment.employeeId,
      );
      const potentialConflicts = detectAssignmentConflicts([
        newOrUpdatedAssignment,
        ...otherAssignments,
      ]);

      if (potentialConflicts.has(newOrUpdatedAssignment.id)) {
        setPendingAssignmentData(dataToProcess);

        // Analyze Conflict Type
        // Find the specific assignment it conflicts with (simplified: find first overlapping)
        const conflict = otherAssignments.find((a) => {
          const startA = newOrUpdatedAssignment.startDate;
          const endA = newOrUpdatedAssignment.endDate || "9999-12-31";
          const startB = a.startDate;
          const endB = a.endDate || "9999-12-31";
          return startA <= endB && startB <= endA;
        });

        if (
          conflict &&
          !conflict.endDate &&
          newOrUpdatedAssignment.startDate > conflict.startDate
        ) {
          setResolutionMode("SMART_TERMINATE");
          setConflictingAssignment(conflict);
        } else {
          setResolutionMode("OVERLAP");
          setConflictingAssignment(null);
        }

        setIsConflictModalOpen(true);
        return;
      }

      await proceedWithSave(dataToProcess);
    },
  });

  const { setValue, reset } = form;

  const clearForm = useCallback(() => {
    setEditingAssignment(null);
    setPendingAssignmentData(null);
    reset({ employeeId: "", shiftPatternId: "", startDate: "", endDate: "" });
  }, [reset]);

  const proceedWithSave = useCallback(
    async (dataToSave?: PendingAssignment) => {
      const dataToProcess = dataToSave || pendingAssignmentData;
      if (!dataToProcess) return false;

      const { assignmentData, isEditing } = dataToProcess;
      let success: boolean;
      try {
        if (resolutionMode === "SMART_TERMINATE" && conflictingAssignment) {
          // Smart Resolution: Terminate old, Create new
          const yesterday = addBusinessDaysChile(assignmentData.startDate, -1);

          // 1. Terminate existing
          await updateAssignment({
            id: conflictingAssignment.id,
            assignment: {
              ...conflictingAssignment,
              endDate: yesterday,
            },
          });

          // 2. Create new
          await assignShift({
            ...assignmentData,
            id: crypto.randomUUID(),
          } as AssignedShift);

          success = true;
        } else if (isEditing) {
          await updateAssignment({
            id: editingAssignment!.id,
            assignment: {
              ...assignmentData,
              id: editingAssignment!.id,
            } as AssignedShift,
          });
          success = true;
        } else {
          await assignShift({
            ...assignmentData,
            id: crypto.randomUUID(),
          } as AssignedShift);
          success = true;
        }
      } catch {
        success = false;
      }

      if (success) {
        clearForm();
        options?.onSaved?.();
      }
      setIsConflictModalOpen(false);
      return success;
    },
    [
      assignShift,
      clearForm,
      conflictingAssignment,
      editingAssignment,
      options,
      pendingAssignmentData,
      resolutionMode,
      updateAssignment,
    ],
  );

  useEffect(() => {
    if (editingAssignment) {
      setValue("employeeId", editingAssignment.employeeId);
      setValue("shiftPatternId", editingAssignment.shiftPatternId);
      setValue("startDate", editingAssignment.startDate);
      setValue("endDate", editingAssignment.endDate || "");
    } else {
      clearForm();
    }
  }, [editingAssignment, clearForm, setValue]);

  return {
    editingAssignment,
    setEditingAssignment,
    values: form.values,
    errors: form.errors,
    getError: form.getError,
    setValue,
    clearForm,
    isConflictModalOpen,
    setIsConflictModalOpen,
    proceedWithSave,
    resolutionMode,
    conflictingAssignment,
    isSubmitting: form.isSubmitting,
    submit: form.submit,
    formProps: form.formProps,
  };
};
