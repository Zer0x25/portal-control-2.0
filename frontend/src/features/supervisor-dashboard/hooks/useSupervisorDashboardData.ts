import { useCorrectionRequestsStatsQuery } from "../../../hooks/queries/useCorrectionRequestsStatsQuery";

/**
 * Hook para manejar los datos del supervisor dashboard
 */
export const useSupervisorDashboardData = () => {
  const { data: stats } = useCorrectionRequestsStatsQuery();

  const requestCount = stats?.pending ?? 0;

  return {
    requestCount,
  };
};
