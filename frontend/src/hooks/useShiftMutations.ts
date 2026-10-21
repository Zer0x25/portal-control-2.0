import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftService } from "../services/shiftService";
import { TheoreticalShiftPattern, AssignedShift } from "../types";
import { useToasts } from "./useToasts";
import { queryKeys } from "../lib/queryKeys";

export const useShiftMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  type MonthlyPlanPayload = Record<string, unknown>;

  // --- Patterns ---
  const createPatternMutation = useMutation({
    mutationFn: (pattern: TheoreticalShiftPattern) => shiftService.savePattern(pattern),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftPatterns() });
      addToast("Patrón creado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const updatePatternMutation = useMutation({
    mutationFn: (pattern: TheoreticalShiftPattern) => shiftService.updatePattern(pattern),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftPatterns() });
      addToast("Patrón actualizado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const deletePatternMutation = useMutation({
    mutationFn: (id: string) => shiftService.deletePattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftPatterns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedShifts() });
      addToast("Patrón eliminado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  // --- Assignments ---
  const assignShiftMutation = useMutation({
    mutationFn: (assignment: AssignedShift) => shiftService.assignShift(assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedShifts() });
      addToast("Turno asignado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, assignment }: { id: string; assignment: AssignedShift }) =>
      shiftService.updateAssignment(id, assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedShifts() });
      addToast("Asignación actualizada exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => shiftService.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedShifts() });
      addToast("Asignación eliminada exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const createMonthlyPlanMutation = useMutation({
    mutationFn: (planData: MonthlyPlanPayload) => shiftService.createMonthlyPlan(planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedShifts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftPatterns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarMatrix() });
      addToast("Plan mensual creado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  return {
    createPattern: createPatternMutation.mutateAsync,
    updatePattern: updatePatternMutation.mutateAsync,
    deletePattern: deletePatternMutation.mutateAsync,
    assignShift: assignShiftMutation.mutateAsync,
    updateAssignment: updateAssignmentMutation.mutateAsync,
    deleteAssignment: deleteAssignmentMutation.mutateAsync,
    createMonthlyPlan: createMonthlyPlanMutation.mutateAsync,
    isLoading:
      createPatternMutation.isPending ||
      updatePatternMutation.isPending ||
      deletePatternMutation.isPending ||
      assignShiftMutation.isPending ||
      updateAssignmentMutation.isPending ||
      deleteAssignmentMutation.isPending ||
      createMonthlyPlanMutation.isPending,
  };
};
