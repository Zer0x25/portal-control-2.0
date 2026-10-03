import { useState, useEffect } from "react";
import { AssignedShift, Syncable } from "../types/index";
import { useShiftPatternsQuery } from "./queries/useShiftPatternsQuery";
import { useAssignedShiftsQuery } from "./queries/useAssignedShiftsQuery";
import { useShiftMutations } from "./useShiftMutations";
import { useToasts } from "./useToasts";
import { useStore } from "../store/useStore";
import {
  addBusinessDaysChile,
  compareBusinessDate,
  parseDateOnlyUTC,
  toBusinessDateChile,
} from "../utils/dateUtils";

export const useShiftAssignmentForm = () => {
  const { data: shiftPatterns = [] } = useShiftPatternsQuery();
  const { data: assignedShifts = [] } = useAssignedShiftsQuery();
  const { assignShift, updateAssignment } = useShiftMutations();
  const detectAssignmentConflicts = useStore((state) => state.detectAssignmentConflicts);

  const { addToast } = useToasts();

  const [editingAssignment, setEditingAssignment] = useState<AssignedShift | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedPatternId, setSelectedPatternId] = useState("");
  const [assignmentStartDate, setAssignmentStartDate] = useState("");
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [pendingAssignmentData, setPendingAssignmentData] = useState<{
    assignmentData: Omit<
      AssignedShift,
      "id" | "employeeName" | "shiftPatternName" | keyof Syncable
    >;
    isEditing: boolean;
  } | null>(null);

  useEffect(() => {
    if (editingAssignment) {
      setSelectedEmployeeId(editingAssignment.employeeId);
      setSelectedPatternId(editingAssignment.shiftPatternId);
      setAssignmentStartDate(editingAssignment.startDate);
      setAssignmentEndDate(editingAssignment.endDate || "");
    } else {
      clearForm();
    }
  }, [editingAssignment]);

  const clearForm = () => {
    setEditingAssignment(null);
    setSelectedEmployeeId("");
    setSelectedPatternId("");
    setAssignmentStartDate("");
    setAssignmentEndDate("");
    setPendingAssignmentData(null);
  };

  const [resolutionMode, setResolutionMode] = useState<"OVERLAP" | "SMART_TERMINATE">("OVERLAP");
  const [conflictingAssignment, setConflictingAssignment] = useState<AssignedShift | null>(null);

  const proceedWithSave = async (dataToSave?: typeof pendingAssignmentData) => {
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
    }
    setIsConflictModalOpen(false);
    return success;
  };

  const handleSaveAssignment = async (): Promise<boolean> => {
    if (!selectedEmployeeId || !selectedPatternId || !assignmentStartDate) {
      addToast("Empleado, patrón de turno y fecha de inicio son requeridos.", "warning");
      return false;
    }
    if (assignmentEndDate && assignmentStartDate > assignmentEndDate) {
      addToast("La fecha de término no puede ser anterior a la fecha de inicio.", "error");
      return false;
    }

    // Rule: Cannot assign more than 7 days in the past
    const limitDate = addBusinessDaysChile(toBusinessDateChile(), -7);
    if (compareBusinessDate(assignmentStartDate, limitDate) < 0) {
      addToast("No se pueden crear asignaciones con más de 7 días de antigüedad.", "error");
      return false;
    }

    // Validation for monthly patterns
    const selectedPattern = shiftPatterns.find((p) => p.id === selectedPatternId);
    if (selectedPattern) {
      const monthlyCycleLengths = [28, 29, 30, 31];
      if (monthlyCycleLengths.includes(selectedPattern.cycleLengthDays)) {
        const startDateObj = parseDateOnlyUTC(assignmentStartDate);
        if (startDateObj.getUTCDate() !== 1) {
          addToast(
            "Para patrones mensuales (28-31 días), la fecha de inicio debe ser el día 1 del mes.",
            "error",
            6000,
          );
          return false;
        }
        if (!assignmentEndDate) {
          addToast(
            "Para patrones mensuales (28-31 días), se requiere una fecha de término.",
            "error",
            6000,
          );
          return false;
        }
      }
    }

    const assignmentData: Omit<
      AssignedShift,
      "id" | "employeeName" | "shiftPatternName" | keyof Syncable
    > = {
      employeeId: selectedEmployeeId,
      shiftPatternId: selectedPatternId,
      startDate: assignmentStartDate,
      endDate: assignmentEndDate || undefined,
    };

    const dataToProcess = { assignmentData, isEditing: !!editingAssignment };

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

      if (conflict && !conflict.endDate && newOrUpdatedAssignment.startDate > conflict.startDate) {
        setResolutionMode("SMART_TERMINATE");
        setConflictingAssignment(conflict);
      } else {
        setResolutionMode("OVERLAP");
        setConflictingAssignment(null);
      }

      setIsConflictModalOpen(true);
      return false;
    }

    return await proceedWithSave(dataToProcess);
  };

  return {
    editingAssignment,
    setEditingAssignment,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedPatternId,
    setSelectedPatternId,
    assignmentStartDate,
    setAssignmentStartDate,
    assignmentEndDate,
    setAssignmentEndDate,
    handleSaveAssignment,
    clearForm,
    isConflictModalOpen,
    setIsConflictModalOpen,
    proceedWithSave,
    resolutionMode,
    conflictingAssignment,
  };
};
