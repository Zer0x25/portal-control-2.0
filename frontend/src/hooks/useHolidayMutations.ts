import { useMutation, useQueryClient } from "@tanstack/react-query";
import { holidayService, CreateHolidayPayload } from "../services/holidayService";
import { useToasts } from "./useToasts";
import { useStore } from "../store/useStore";
import { Holiday, BulkCreateHolidayPayload } from "../types/scheduling";

export const useHolidayMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  const loadAbsenceData = useStore((state) => state.loadAbsenceData);
  type UpdateHolidayPayload = Partial<Pick<Holiday, "name" | "date" | "type">>;

  const createHolidayMutation = useMutation({
    mutationFn: (holiday: CreateHolidayPayload) => holidayService.create(holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      // Refresh Zustand/IDB state to keep everything in sync
      loadAbsenceData();
      addToast("Feriado creado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: string) => holidayService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      // Refresh Zustand/IDB state
      loadAbsenceData();
      addToast("Feriado eliminado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const syncHolidaysMutation = useMutation({
    mutationFn: () => holidayService.syncExternalHolidays(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      // Refresh Zustand/IDB state
      loadAbsenceData();
      addToast(`${data.added} feriados nuevos cargados.`, "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: ({ id, holiday }: { id: string; holiday: UpdateHolidayPayload }) =>
      holidayService.update(id, holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      loadAbsenceData();
      addToast("Feriado actualizado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const createBulkHolidaysMutation = useMutation({
    mutationFn: (holidays: BulkCreateHolidayPayload[]) => holidayService.bulkCreate(holidays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      loadAbsenceData();
      addToast("Feriados cargados exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  return {
    createHoliday: createHolidayMutation.mutateAsync,
    updateHoliday: updateHolidayMutation.mutateAsync,
    deleteHoliday: deleteHolidayMutation.mutateAsync,
    syncHolidays: syncHolidaysMutation.mutateAsync,
    createBulkHolidays: createBulkHolidaysMutation.mutateAsync,
    isPending:
      createHolidayMutation.isPending ||
      updateHolidayMutation.isPending ||
      deleteHolidayMutation.isPending ||
      syncHolidaysMutation.isPending ||
      createBulkHolidaysMutation.isPending,
  };
};
