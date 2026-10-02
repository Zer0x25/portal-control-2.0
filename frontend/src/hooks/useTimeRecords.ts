import {
  useTimeRecordsQuery,
  useTimeRecordMutations,
  TimeRecordsFilterParams,
} from "./queries/useTimeRecordsQuery";
import { DailyTimeRecord, LeaveRecord } from "../types/index";
import { LEAVE_TYPES } from "../utils/mappings";

/**
 * Context passed when justifying a range of time records against a leave.
 * `type` is accepted as a loose string because callers forward it from other
 * modules; it is validated against `LEAVE_TYPES` before reaching the API.
 */
export interface LeaveJustificationMetadata {
  type?: string;
  notes?: string;
  leaveId?: LeaveRecord["id"];
}

const DEFAULT_LEAVE_TYPE: LeaveRecord["type"] = "Licencia Médica";

/** Narrows a free-form leave label to a canonical `LeaveRecord["type"]`. */
const resolveLeaveType = (type: string | undefined): LeaveRecord["type"] =>
  LEAVE_TYPES.find((candidate) => candidate === type) ?? DEFAULT_LEAVE_TYPE;

interface UseTimeRecordsParams extends Partial<TimeRecordsFilterParams> {
  page?: number;
}

export const useTimeRecords = (
  params: UseTimeRecordsParams = { page: 1, pageSize: 50, filters: {} },
) => {
  // Ensure strict params for the query
  const queryParams: TimeRecordsFilterParams = {
    pageSize: params.pageSize || 50,
    filters: params.filters || {},
  };

  // TanStack Query for data fetching
  const { data, isLoading: isLoadingRecords, refetch, error } = useTimeRecordsQuery(queryParams);

  const { punchMutation, updateRecordMutation, deleteRecordMutation, createLeaveMutation } =
    useTimeRecordMutations();

  return {
    // Data
    timeRecordsPage: data?.pages[0]?.data || [],
    totalRecords: data?.pages[0]?.total || 0,
    totalPages: data?.pages[0]?.totalPages || 0,
    currentPage: params.page || 1,
    allRecordsInDateRange: data?.pages.flatMap((page) => page.data) || [],
    error,
    // recentRecords: [], // Deprecated in Pure TanStack (or use separate query)
    isLoadingRecords,

    // Actions
    loadTimeRecordsPage: refetch, // Alias for compatibility
    refreshRecords: refetch,

    addOrUpdateRecord: (record: DailyTimeRecord) => updateRecordMutation.mutateAsync(record),
    deleteRecordById: (id: string) => deleteRecordMutation.mutateAsync(id),
    createClockInRecord: (employeeId: string, source?: string) =>
      punchMutation.mutateAsync({ employeeId, source, forcedType: "entrada" }),
    clockOut: (idOrRecord: string | DailyTimeRecord) => {
      const employeeId = typeof idOrRecord === "string" ? idOrRecord : idOrRecord.employeeId;
      return punchMutation.mutateAsync({ employeeId, forcedType: "salida" });
    },
    punch: (employeeId: string, forcedType?: string) =>
      punchMutation.mutateAsync({ employeeId, forcedType }),

    justifyRecordsForLeave: async (
      employeeId: string,
      startDate: string,
      endDate: string,
      metadata?: LeaveJustificationMetadata,
    ) =>
      createLeaveMutation.mutateAsync({
        employeeId,
        startDate,
        endDate,
        type: resolveLeaveType(metadata?.type),
        notes: metadata?.notes || "Justificación masiva",
      }),
    isPending:
      punchMutation.isPending ||
      updateRecordMutation.isPending ||
      deleteRecordMutation.isPending ||
      createLeaveMutation.isPending,
  };
};
