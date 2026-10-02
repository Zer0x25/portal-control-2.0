import { useInfiniteQuery } from "@tanstack/react-query";
import { leaveService } from "../../services/leaveService";
import { PaginationOptions } from "../../types/scheduling";

export const useLeavesInfiniteQuery = (
  filters: Omit<PaginationOptions, "page" | "pageSize"> = {},
) => {
  return useInfiniteQuery({
    queryKey: ["leaves", filters],
    queryFn: ({ pageParam = 1 }) =>
      leaveService.getLeaves({
        ...filters,
        page: pageParam,
        pageSize: 50,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
