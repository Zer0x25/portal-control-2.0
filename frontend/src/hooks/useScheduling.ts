import * as schedulingService from "../services/schedulingService";
import { useShiftPatternsQuery } from "./queries/useShiftPatternsQuery";
import { useAssignedShiftsQuery } from "./queries/useAssignedShiftsQuery";
import { useHolidaysQuery } from "./queries/useHolidaysQuery";
import { useLeavesQuery } from "./queries/useLeavesQuery";
import { useEmployees } from "./useEmployees";
import { useClockingEmployeeOptionsQuery } from "./queries/useEmployeesQuery";
import { useCorrectionRequestsQuery } from "./queries/useCorrectionRequestsQuery";
import {
  useGlobalMaxWeeklyHoursQuery,
  useAreaListQuery,
  useWorkdayTypeListQuery,
  useEmailRecipientsListQuery,
  useAccountingLockDateQuery,
} from "./queries/useConfigQuery";
import { useConfigMutations } from "./useConfigMutations";
import { useCorrectionRequestMutations } from "./useCorrectionRequestMutations";
import {
  ScheduledEmployeeDetail,
  EmployeeWithShiftDetails,
  MonthlyDayScheduleView,
  Employee,
} from "../types/index";
import { calculateHoursBetween } from "../utils/calculations";
import {
  extractScheduleLeaves,
  useEmployeeDailyScheduleLookup,
} from "./useEmployeeDailyScheduleLookup";

const formatUTCDateOnly = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const EMPTY_EMPLOYEES: Pick<
  Employee,
  "id" | "name" | "position" | "area" | "workdayType" | "status"
>[] = [];

export type SchedulingQueryMode = "full" | "schedule-enrichment" | "correction-requests";

export const useScheduling = (
  requestsStatus?: string,
  sinceRequests?: number,
  options: {
    enabled?: boolean;
    useClockingOptions?: boolean;
    queryMode?: SchedulingQueryMode;
  } = {},
) => {
  const queriesEnabled = options.enabled ?? true;
  const queryMode = options.queryMode ?? "full";
  const scheduleQueriesEnabled = queriesEnabled && queryMode !== "correction-requests";
  const includeAuxiliaryQueries = queriesEnabled && queryMode === "full";
  const includeEmployeeDirectory = includeAuxiliaryQueries;
  const includeCorrectionRequests = queriesEnabled && queryMode !== "schedule-enrichment";
  const useClockingOptions = options.useClockingOptions ?? false;

  // --- Config (spec 032 T4: única fuente = query hooks) ---
  const { data: globalMaxWeeklyHours = 44 } = useGlobalMaxWeeklyHoursQuery(includeAuxiliaryQueries);
  const { data: areaList = ["Otros"] } = useAreaListQuery(includeAuxiliaryQueries);
  const { data: workdayTypeList = ["Artículo 22", "Full-Time", "Part-Time"] } =
    useWorkdayTypeListQuery(includeAuxiliaryQueries);
  const { data: emailRecipientsList = ["info@test.lan"] } =
    useEmailRecipientsListQuery(includeAuxiliaryQueries);
  const { data: accountingLockDate = null } = useAccountingLockDateQuery(includeAuxiliaryQueries);
  const { updateConfig } = useConfigMutations();
  const updateGlobalMaxWeeklyHours = (v: number) =>
    updateConfig({ key: "global_max_hours", value: v });
  const updateAreaList = (v: string[]) => updateConfig({ key: "area_list", value: v });
  const updateWorkdayTypeList = (v: string[]) => updateConfig({ key: "workday_types", value: v });
  const updateEmailRecipientsList = (v: string[]) =>
    updateConfig({ key: "email_recipients", value: v });
  const updateAccountingLockDate = (v: string | null) =>
    updateConfig({ key: "accounting_lock_date", value: v });

  // --- Remote State (TanStack Query) ---
  const { data: shiftPatterns = [], isLoading: isLoadingShiftPatterns } =
    useShiftPatternsQuery(scheduleQueriesEnabled);
  const { data: assignedShifts = [], isLoading: isLoadingAssignedShifts } =
    useAssignedShiftsQuery(scheduleQueriesEnabled);
  const { data: holidays = [], isLoading: isLoadingHolidays } =
    useHolidaysQuery(scheduleQueriesEnabled);
  const { data: leavesResponse, isLoading: isLoadingLeaves } =
    useLeavesQuery(scheduleQueriesEnabled);
  const leaves = extractScheduleLeaves(leavesResponse);
  const { allEmployees: fullEmployees, isLoadingEmployees: isLoadingFullEmployeeList } =
    useEmployees(false, {
      enabled: includeEmployeeDirectory && !useClockingOptions,
    });
  const { data: clockingEmployees = [], isLoading: isLoadingClockingEmployees } =
    useClockingEmployeeOptionsQuery(includeEmployeeDirectory && useClockingOptions);
  const employees: Pick<
    Employee,
    "id" | "name" | "position" | "area" | "workdayType" | "status"
  >[] = !includeEmployeeDirectory
    ? EMPTY_EMPLOYEES
    : useClockingOptions
      ? clockingEmployees
      : fullEmployees;
  const isLoadingEmployees = !includeEmployeeDirectory
    ? false
    : useClockingOptions
      ? isLoadingClockingEmployees
      : isLoadingFullEmployeeList;
  const {
    data: infiniteRequests,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCorrectionRequestsQuery(requestsStatus, sinceRequests, includeCorrectionRequests);

  const requests = infiniteRequests?.pages.flatMap((page) => page.requests) || [];

  const {
    addCorrectionRequest,
    updateRequestStatus,
    isPending: isUpdatingRequestStatus,
  } = useCorrectionRequestMutations();

  const isLoadingSchedulingData =
    scheduleQueriesEnabled &&
    (isLoadingEmployees ||
      isLoadingShiftPatterns ||
      isLoadingAssignedShifts ||
      isLoadingHolidays ||
      isLoadingLeaves);

  const getRequestsForEmployee = (employeeId: string) => {
    return requests.filter((r) => r.employeeId === employeeId);
  };

  const getEmployeeDailyScheduleInfo = useEmployeeDailyScheduleLookup({
    employees,
    holidays,
    leaves,
    assignedShifts,
    shiftPatterns,
    allowUnknownEmployees: useClockingOptions,
  });

  const isEmployeeScheduledOnDate = (employeeId: string, targetDate: Date) => {
    const scheduleInfo = getEmployeeDailyScheduleInfo(employeeId, targetDate);
    if (scheduleInfo?.isWorkDay) {
      return {
        scheduled: true,
        shiftPatternName: scheduleInfo.shiftPatternName,
        startTime: scheduleInfo.startTime,
        endTime: scheduleInfo.endTime,
        patternColor: scheduleInfo.patternColor,
      };
    }
    return { scheduled: false };
  };

  const getScheduledEmployeesDetailsOnDate = (targetDate: Date) => {
    const results: ScheduledEmployeeDetail[] = [];
    const assignedEmployeeIds = new Set(assignedShifts.map((a) => a.employeeId));

    assignedEmployeeIds.forEach((employeeId) => {
      const scheduleInfo = getEmployeeDailyScheduleInfo(employeeId, targetDate);
      if (scheduleInfo?.isWorkDay) {
        const employee = employees.find((e) => e.id === employeeId);
        if (employee) {
          results.push({
            employeeId,
            employeeName: employee.name,
            shiftPatternName: scheduleInfo.shiftPatternName || "N/A",
            startTime: scheduleInfo.startTime,
            endTime: scheduleInfo.endTime,
            patternColor: scheduleInfo.patternColor,
          });
        }
      }
    });
    return results;
  };

  const getEmployeesWithAssignedShifts = () => {
    if (useClockingOptions || !fullEmployees || fullEmployees.length === 0) return [];
    return fullEmployees
      .map((employee) => {
        const assignments = assignedShifts.filter(
          (a) => a.employeeId === employee.id && !a.isDeleted,
        );
        if (assignments.length === 0) return null;
        const assignedShiftsDetails = assignments.map((assignment) => ({
          ...assignment,
          patternDetails: shiftPatterns.find(
            (p) => p.id === assignment.shiftPatternId && !p.isDeleted,
          ),
        }));
        return { ...employee, assignedShiftsDetails };
      })
      .filter((e): e is EmployeeWithShiftDetails => e !== null);
  };

  const getEmployeeScheduleForMonth = (
    employeeId: string,
    year: number,
    month: number,
  ): MonthlyDayScheduleView[] => {
    const schedule: MonthlyDayScheduleView[] = [];
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const scheduleInfo = getEmployeeDailyScheduleInfo(employeeId, d);
      const dateIso = formatUTCDateOnly(d);
      const dayOfWeek = d.toLocaleDateString("es-CL", {
        weekday: "short",
        timeZone: "UTC",
      });

      schedule.push({
        dateIso,
        dayOfWeek,
        dayOfMonth: d.getUTCDate(),
        scheduleText: scheduleInfo?.scheduleText || "N/A",
        isWorkDay: !!scheduleInfo?.isWorkDay,
      });
    }
    return schedule;
  };

  // --- ASYNC Service Wrappers ---
  const fetchEmployeeScheduleForDate = async (employeeId: string, date: Date) => {
    const dateString = formatUTCDateOnly(date);
    return schedulingService.getEmployeeScheduleForDate(employeeId, dateString);
  };

  const fetchScheduledEmployeesOnDate = async (date: Date) => {
    const dateString = formatUTCDateOnly(date);
    return schedulingService.getScheduledEmployeesOnDate(dateString);
  };

  const fetchEmployeeMonthlySchedule = async (employeeId: string, year: number, month: number) => {
    return schedulingService.getEmployeeMonthlySchedule(employeeId, year, month);
  };

  const fetchValidateAssignmentConflicts = async (
    employeeId: string,
    startDate: string,
    endDate?: string | null,
    excludeAssignmentId?: string,
  ) => {
    return schedulingService.validateAssignmentConflicts(
      employeeId,
      startDate,
      endDate,
      excludeAssignmentId,
    );
  };

  return {
    isLoadingSchedulingData,
    globalMaxWeeklyHours,
    areaList,
    workdayTypeList,
    emailRecipientsList,
    accountingLockDate,
    updateGlobalMaxWeeklyHours,
    updateAreaList,
    updateWorkdayTypeList,
    updateEmailRecipientsList,
    updateAccountingLockDate,

    // Data (Queries)
    shiftPatterns,
    assignedShifts,
    holidays,
    leaves,
    requests, // From Query

    // Mutations
    addCorrectionRequest, // From Mutation
    updateRequestStatus, // From Mutation
    isUpdatingRequestStatus,

    // Pagination
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,

    // Actions
    getRequestsForEmployee,

    // Logic
    getEmployeeDailyScheduleInfo,
    isEmployeeScheduledOnDate,
    getScheduledEmployeesDetailsOnDate,
    getEmployeesWithAssignedShifts,
    getEmployeeScheduleForMonth,
    calculateHoursBetween,

    // Async
    fetchEmployeeScheduleForDate,
    fetchScheduledEmployeesOnDate,
    fetchEmployeeMonthlySchedule,
    fetchValidateAssignmentConflicts,
  };
};
