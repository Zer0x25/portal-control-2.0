import { useQuery } from "@tanstack/react-query";
import { shiftReportService } from "../../services/shiftReportService";
import { useAuth } from "../useAuth";
export const useReportsQuery = (params: { status?: "open" | "closed"; pageSize?: number } = {}) => {
  const { currentUser } = useAuth();
  const canReadReports =
    !!currentUser &&
    ["Administrador", "Supervisor Elevado", "Supervisor", "Reloj Control"].includes(
      currentUser.role,
    );

  return useQuery({
    queryKey: ["reports", params],
    queryFn: async () => {
      const result = await shiftReportService.getAll({
        ...params,
        pageSize: params.pageSize || 100, // Default to a reasonable number for active/recent
      });
      return result.data; // Return the data array for backward compatibility where possible
    },
    enabled: canReadReports,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
