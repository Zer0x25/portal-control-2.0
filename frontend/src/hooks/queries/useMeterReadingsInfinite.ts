import { useInfiniteQuery } from "@tanstack/react-query";
import { meterService } from "../../services/meterService";
import { queryKeys } from "../../lib/queryKeys";

export const useMeterReadingsInfinite = (
  filters: { meterId?: string; startDate?: string; endDate?: string } = {},
  pageSize = 50,
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.meterReadingsInfinite(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await meterService.getPaginated(pageParam, pageSize, filters);
      return {
        data: response.data,
        pagination: response.pagination,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
  });
};
