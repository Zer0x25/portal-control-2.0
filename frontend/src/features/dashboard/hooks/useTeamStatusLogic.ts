import { useMemo } from "react";
import { useDashboardOverviewQuery } from "../../../hooks/queries/useDashboardQueries";
import { TeamStatusData } from "../types";

export const useTeamStatusLogic = () => {
  const { data: overviewData } = useDashboardOverviewQuery();

  const teamStatus: TeamStatusData = overviewData?.teamStatus || {
    present: 0,
    total: 0,
    anomalies: [],
    presentRecords: [],
  };

  const unscheduledPresent = useMemo(() => {
    return overviewData?.unscheduledPresent || [];
  }, [overviewData]);

  const hasUnscheduledPresent = unscheduledPresent.length > 0;
  const hasAnomalies = teamStatus.anomalies.length > 0;
  const hasPresent = teamStatus.present > 0;

  return {
    teamStatus,
    unscheduledPresent,
    hasUnscheduledPresent,
    hasAnomalies,
    hasPresent,
  };
};
