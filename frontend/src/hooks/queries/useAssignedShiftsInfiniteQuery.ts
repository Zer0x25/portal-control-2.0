import { useInfiniteQuery } from "@tanstack/react-query";
import { shiftService } from "../../services/shiftService";
import { PaginationOptions } from "../../types/scheduling";

export const useAssignedShiftsInfiniteQuery = (filters: PaginationOptions) => {
  return useInfiniteQuery({
    queryKey: ["assignedShifts", filters],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await shiftService.getAssignments({
        ...filters,
        page: pageParam as number,
        pageSize: 50,
      });
      return result;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta) return undefined;
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  });
};
