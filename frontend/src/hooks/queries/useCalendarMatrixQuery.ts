import { useQuery } from "@tanstack/react-query";

export const useCalendarMatrixQuery = (
  startDate: string,
  endDate: string,
  employeeIds?: string[],
) => {
  return useQuery({
    queryKey: ["calendarMatrix", startDate, endDate, employeeIds],
    queryFn: () =>
      import("../../services/shiftService").then((m) =>
        m.shiftService.getCalendarMatrix(startDate, endDate, employeeIds),
      ),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
