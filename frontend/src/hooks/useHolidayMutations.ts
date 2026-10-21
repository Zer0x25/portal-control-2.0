import { useMutation, useQueryClient } from "@tanstack/react-query";
import { holidayService, CreateHolidayPayload } from "../services/holidayService";
import { useToasts } from "./useToasts";
import { Holiday, BulkCreateHolidayPayload } from "../types/scheduling";
import { QUERY_KEYS } from "../lib/queryKeys";

export const useHolidayMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  type UpdateHolidayPayload = Partial<Pick<Holiday, "name" | "date" | "type">>;

  const createHolidayMutation = useMutation({
    mutationFn: (holiday: CreateHolidayPayload) => holidayService.create(holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holidays.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarMatrix.all });
      addToast("Feriado creado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: string) => holidayService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holidays.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarMatrix.all });
      addToast("Feriado eliminado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const syncHolidaysMutation = useMutation({
    mutationFn: () => holidayService.syncExternalHolidays(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holidays.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarMatrix.all });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holidays.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarMatrix.all });
      addToast("Feriado actualizado exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const createBulkHolidaysMutation = useMutation({
    mutationFn: (holidays: BulkCreateHolidayPayload[]) => holidayService.bulkCreate(holidays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holidays.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarMatrix.all });
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
