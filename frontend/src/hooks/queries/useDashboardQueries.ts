import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview, getDailyPlanningSummary } from "../../services/kpiService";
import { timeRecordService } from "../../services/timeRecordService";
import { useAuth } from "../useAuth";
import { DashboardOverviewResponse, DailyPlanningSummaryResponse } from "../../types";

export const useDashboardOverviewQuery = () => {
  const { currentUser } = useAuth();
  const isEnabled = !!currentUser;

  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview as () => Promise<DashboardOverviewResponse>,
    enabled: isEnabled,
    staleTime: 1000 * 60, // 1 minute (Real-time critical)
    refetchOnWindowFocus: true, // Auto-refresh when supervisor comes back
  });
};

export const useDailyPlanningQuery = () => {
  const { currentUser } = useAuth();
  const isEnabled = !!currentUser;

  return useQuery({
    queryKey: ["dashboard", "dailyPlanning"],
    queryFn: getDailyPlanningSummary as () => Promise<DailyPlanningSummaryResponse>,
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes (Planning doesn't change much during day)
  });
};

export const useRecentActivityQuery = () => {
  const { currentUser } = useAuth();
  const isEnabled = !!currentUser;

  return useQuery({
    queryKey: ["dashboard", "recentActivity"],
    queryFn: async () => {
      const response = await timeRecordService.getAll({ pageSize: 50, page: 1 });
      return response.data;
    },
    enabled: isEnabled,
    staleTime: 1000 * 30, // 30 seconds (Feed should be lively)
    refetchInterval: 1000 * 60, // Polling every minute
  });
};
