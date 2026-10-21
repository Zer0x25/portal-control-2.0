import { useInfiniteQuery } from "@tanstack/react-query";
import { shiftReportService } from "../../services/shiftReportService";
import { queryKeys } from "../../lib/queryKeys";

export interface ShiftReportsFilterParams {
  pageSize: number;
  status?: "open" | "closed";
}

export const useShiftReportsInfinite = (params: ShiftReportsFilterParams) => {
  return useInfiniteQuery({
    queryKey: queryKeys.shiftReportsList(params),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await shiftReportService.getAll({
        ...params,
        page: pageParam as number,
      });

      return {
        ...result,
        page: pageParam as number,
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
