import { useMemo } from "react";

export const useAnalyticsTabController = () => {
  const heatmapData = useMemo(() => [], []);
  const trendData = useMemo(() => [], []);

  return {
    heatmapData,
    trendData,
  };
};
