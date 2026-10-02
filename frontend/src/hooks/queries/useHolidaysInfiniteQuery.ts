import { useInfiniteQuery } from "@tanstack/react-query";
import { holidayService } from "../../services/holidayService";

interface HolidaysInfiniteParams {
  pageSize?: number;
  search?: string;
  showArchived?: boolean;
}

export const useHolidaysInfiniteQuery = (params: HolidaysInfiniteParams = {}) => {
  const pageSize = params.pageSize ?? 50;

  return useInfiniteQuery({
    queryKey: ["holidays", "infinite", params],
    queryFn: async ({ pageParam = 1 }) =>
      holidayService.getAllPaginated({
        page: pageParam as number,
        pageSize,
        search: params.search,
        showArchived: params.showArchived,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
  });
};
