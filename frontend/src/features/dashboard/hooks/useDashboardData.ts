import { useMemo } from "react";
import { useReportsQuery } from "../../../hooks/queries/useReportsQuery";
import { useDashboardOverviewQuery } from "../../../hooks/queries/useDashboardQueries";
import { useControlInternoEnabledQuery } from "../../../hooks/queries/useConfigQuery";

export const useDashboardData = () => {
  const { data: isControlInternoEnabled = true } = useControlInternoEnabledQuery();
  const { data: shiftReports = [], isLoading: isLoadingReports } = useReportsQuery();
  const { data: overviewData, isLoading: isLoadingOverview } = useDashboardOverviewQuery();

  const teamStatus = useMemo(() => {
    return (
      overviewData?.teamStatus || {
        present: 0,
        total: 0,
        anomalies: [],
        presentRecords: [],
      }
    );
  }, [overviewData]);

  const unscheduledPresent = useMemo(() => {
    return overviewData?.unscheduledPresent || [];
  }, [overviewData]);

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
