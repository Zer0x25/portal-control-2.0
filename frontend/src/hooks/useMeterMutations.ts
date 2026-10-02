import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meterService } from "../services/meterService";
import { useToasts } from "./useToasts";
import { useStore } from "../store/useStore";
import { MeterReadingItem } from "../types/dashboard";

export const useMeterMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  const loadMeterData = useStore((state) => state.loadMeterData);

  const addReadingMutation = useMutation({
    mutationFn: (newReadings: MeterReadingItem[]) => meterService.saveBulk(newReadings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meterReadings"] });
      loadMeterData();
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
