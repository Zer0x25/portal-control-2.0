import { useQuery } from "@tanstack/react-query";
import { shiftService } from "../../services/shiftService";

export const useShiftPatternsQuery = () => {
  return useQuery({
    queryKey: ["shiftPatterns"],
    queryFn: async () => {
      const patterns = await shiftService.getPatterns();
      return patterns;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  });
};
