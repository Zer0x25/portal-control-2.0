import { useMemo } from "react";
import { useDashboardOverviewQuery } from "../../../hooks/queries/useDashboardQueries";
import { TeamStatusData } from "../types";

export const useTeamStatusData = () => {
  const { data: overviewData } = useDashboardOverviewQuery();

  const teamStatus: TeamStatusData = overviewData?.teamStatus || {
    present: 0,
    total: 0,
    anomaliesCount: 0,
  };

  const unscheduledPresent = useMemo(() => {
    return overviewData?.unscheduledPresent || [];
  }, [overviewData]);

  // El backend esbelto envía anomaliesCount; el fallback cubre la ventana de
  // despliegue contra el backend previo (array completo).
  const anomaliesCount = teamStatus.anomaliesCount ?? teamStatus.anomalies?.length ?? 0;
  const hasUnscheduledPresent = unscheduledPresent.length > 0;
  const hasAnomalies = anomaliesCount > 0;
  const hasPresent = teamStatus.present > 0;

  return {
    teamStatus,
    unscheduledPresent,
    hasUnscheduledPresent,
    hasAnomalies,
    hasPresent,
    anomaliesCount,
  };
};
