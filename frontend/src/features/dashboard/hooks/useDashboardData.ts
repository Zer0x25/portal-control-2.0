import { useReportsQuery } from "../../../hooks/queries/useReportsQuery";
import { useDashboardOverviewQuery } from "../../../hooks/queries/useDashboardQueries";
import { useControlInternoEnabledQuery } from "../../../hooks/queries/useConfigQuery";

export const useDashboardData = () => {
  const { data: isControlInternoEnabled = true } = useControlInternoEnabledQuery();
  const { data: shiftReports = [], isLoading: isLoadingReports } = useReportsQuery();
  const { data: overviewData, isLoading: isLoadingOverview } = useDashboardOverviewQuery();

  const teamStatus = overviewData?.teamStatus || {
    present: 0,
    total: 0,
    anomaliesCount: 0,
  };

  const unscheduledPresent = overviewData?.unscheduledPresent || [];

  return {
    isControlInternoEnabled,
    shiftReports,
    isLoadingReports,
    overviewData,
    isLoadingOverview,
    teamStatus,
    unscheduledPresent,
  };
};
