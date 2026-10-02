import { useQuery } from "@tanstack/react-query";
import { shiftService } from "../../services/shiftService";
import { AssignedShift } from "../../types/scheduling";

export const useAssignedShiftsQuery = () => {
  return useQuery<AssignedShift[]>({
    queryKey: ["assignedShifts"],
    queryFn: async () => {
      const response = await shiftService.getAssignments();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  });
};
