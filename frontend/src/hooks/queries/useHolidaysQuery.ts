import { useQuery } from "@tanstack/react-query";
import { holidayService } from "../../services/holidayService";
import { queryKeys } from "../../lib/queryKeys";

export const useHolidaysQuery = () => {
  return useQuery({
    queryKey: queryKeys.holidays(),
    queryFn: () => holidayService.getAll(),
    staleTime: 1000 * 60 * 60, // 1 hour for holidays as they change rarely
  });
};
