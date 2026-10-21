import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meterService } from "../services/meterService";
import { useToasts } from "./useToasts";
import { MeterReadingItem } from "../types/dashboard";
import { queryKeys } from "../lib/queryKeys";

export const useMeterMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const addReadingMutation = useMutation({
    mutationFn: (newReadings: MeterReadingItem[]) => meterService.saveBulk(newReadings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meterReadings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.config("meter_configs") });
      addToast("Lectura guardada exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  return {
    addReading: addReadingMutation.mutateAsync,
    isPending: addReadingMutation.isPending,
  };
};
