import { request as apiRequest } from "./apiClient";

import { ScheduleInfo, ScheduledEmployeeDetail, MonthlyDayScheduleView } from "../types/index";
import { logger } from "../utils/logger";

export type { ScheduleInfo, ScheduledEmployeeDetail, MonthlyDayScheduleView };

export interface ConflictValidationResult {
  hasConflicts: boolean;
  conflicts: { id: string; startDate: string; endDate: string | null }[];
  message: string;
}

/**
 * Get schedule info for a specific employee on a specific date.
 *
 * Un 404 es un caso de negocio (no hay turno para esa fecha), no un error:
 * por eso el cliente devuelve el resultado tipado en vez de lanzar.
 */
export const getEmployeeScheduleForDate = async (
  employeeId: string,
  date: string,
): Promise<ScheduleInfo | null> => {
  try {
    const result = await apiRequest<ScheduleInfo>({
      method: "GET",
      url: `/api/shifts/schedule/employee/${employeeId}`,
      params: { date },
      errorMode: "result",
    });

    if (result.status === 404) return null;
    if (!result.ok) {
      throw result.error ?? new Error(`Error ${result.status}`);
    }

    return result.data ?? null;
  } catch (error) {
    logger.error("Error fetching employee schedule for date:", error);
    throw error;
  }
};

/**
 * Get all employees scheduled to work on a specific date.
 */
export const getScheduledEmployeesOnDate = async (
  date: string,
): Promise<ScheduledEmployeeDetail[]> => {
  try {
    return await apiRequest<ScheduledEmployeeDetail[]>({
      method: "GET",
      url: "/api/shifts/schedule/employees-on-date",
      params: { date },
    });
  } catch (error) {
    logger.error("Error fetching scheduled employees on date:", error);
    throw error;
  }
};

/**
 * Get the full monthly schedule for an employee.
 */
export const getEmployeeMonthlySchedule = async (
  employeeId: string,
  year: number,
  month: number,
): Promise<MonthlyDayScheduleView[]> => {
  try {
    return await apiRequest<MonthlyDayScheduleView[]>({
      method: "GET",
      url: `/api/shifts/schedule/employee/${employeeId}/month`,
      params: { year, month },
    });
  } catch (error) {
    logger.error("Error fetching employee monthly schedule:", error);
    throw error;
  }
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
  try {
    return await apiRequest<ConflictValidationResult>({
      method: "POST",
      url: "/api/shifts/validate-conflicts",
      body: {
        employeeId,
        startDate,
        endDate,
        excludeAssignmentId,
      },
    });
  } catch (error) {
    logger.error("Error validating assignment conflicts:", error);
    throw error;
  }
};
