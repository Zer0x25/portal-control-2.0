/**
 * Dynamic imports live outside React-compiled components and hooks.
 * Calling one of these functions warms the same lazy chunks on demand.
 */
export const preloadSupervisorAnalytics = (): void => {
  void import("./components/analytics/AttendanceAnalyticsWidget");
  void import("./components/analytics/AttendanceHeatmap");
  void import("./components/analytics/TrendAnalysis");
};

export const preloadSupervisorKpis = (): void => {
  void import("./components/KpisTab");
  void import("./hooks/useKpisController");
};

export const preloadSupervisorReports = (): void => {
  void import("./components/ReportsTab");
};
