import { apiClient } from "./apiClient";
import type { ScheduleInfo, ConflictValidationResult } from "../types/scheduling";
import type { ScheduledEmployeeDetail, MonthlyDayScheduleView } from "../types/derived";

export type {
  ScheduleInfo,
  ScheduledEmployeeDetail,
  MonthlyDayScheduleView,
  ConflictValidationResult,
};

/**
 * Get schedule info for a specific employee on a specific date.
 */
export const getEmployeeScheduleForDate = async (
  employeeId: string,
  date: string,
): Promise<ScheduleInfo | null> => {
  const result = await apiClient.request<ScheduleInfo>(
    `/api/shifts/schedule/employee/${employeeId}`,
    {
      params: { date },
      mode: "result",
    },
  );

  if (!result.ok) {
    if (result.status === 404) {
      return null;
    }
    throw result.error;
  }

  return result.data;
};

/**
 * Get all employees scheduled to work on a specific date.
 */
export const getScheduledEmployeesOnDate = async (
  date: string,
): Promise<ScheduledEmployeeDetail[]> => {
  return (await apiClient.get("/api/shifts/schedule/employees-on-date" as never, {
    params: { date },
  })) as ScheduledEmployeeDetail[];
};

/**
 * Get the full monthly schedule for an employee.
 */
export const getEmployeeMonthlySchedule = async (
  employeeId: string,
  year: number,
  month: number,
): Promise<MonthlyDayScheduleView[]> => {
  return (await apiClient.get(`/api/shifts/schedule/employee/${employeeId}/month` as never, {
    params: { year, month },
  })) as MonthlyDayScheduleView[];
};

/**
 * Validate if a new assignment would conflict with existing ones.
 * Use this before creating/updating an assignment for early feedback.
 */
export const validateAssignmentConflicts = async (
  employeeId: string,
  startDate: string,
  endDate?: string | null,
  excludeAssignmentId?: string,
): Promise<ConflictValidationResult> => {
  return (await apiClient.post("/api/shifts/validate-conflicts" as never, {
    body: {
      employeeId,
      startDate,
      endDate,
      excludeAssignmentId,
    } as never,
  })) as ConflictValidationResult;
};

export const schedulingService = {
  getEmployeeScheduleForDate,
  getScheduledEmployeesOnDate,
  getEmployeeMonthlySchedule,
  validateAssignmentConflicts,
};
