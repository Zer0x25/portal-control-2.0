import { useAuditLogsInfinite } from "./queries/useAuditLogsInfinite";

export const useLogs = () => {
  const { data, isLoading: isLoadingLogs } = useAuditLogsInfinite({
    pageSize: 20,
    filters: {},
    sortBy: "timestamp",
    sortOrder: "desc",
  });

  const logsPage = data?.pages[0] || { data: [], total: 0 };

  return {
    logsPage,
    isLoadingLogs,
    loadLogsPage: () => {},
    clearAllLogs: () => {},
  };
};
