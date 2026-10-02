import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftReportService } from "../services/shiftReportService";
import { ShiftReport } from "../types";

export const useReportMutations = () => {
  const queryClient = useQueryClient();

  const addReportMutation = useMutation({
    mutationFn: (report: ShiftReport) => shiftReportService.save(report),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: (report: ShiftReport) => shiftReportService.update(report.id, report),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => shiftReportService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  return {
    addReport: (report: ShiftReport) => addReportMutation.mutateAsync(report),
    updateReport: (report: ShiftReport) => updateReportMutation.mutateAsync(report),
    deleteReport: (id: string) => deleteReportMutation.mutateAsync(id),
    isPending:
      addReportMutation.isPending ||
      updateReportMutation.isPending ||
      deleteReportMutation.isPending,
  };
};
