import { authService } from "./authService";

import { API_BASE_URL } from "./apiBase";

const API_URL = API_BASE_URL;

export interface ScheduleInfo {
  scheduleText: string;
  isWorkDay: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  justificationType?: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
  shiftPatternId?: string;
  shiftPatternName?: string;
  patternColor?: string;
  hasColacion?: boolean;
  colacionMinutes?: number;
  planningStatus?: string;
}

export interface ScheduledEmployeeDetail {
  employeeId: string;
  employeeName: string;
  shiftPatternName: string;
  startTime?: string;
  endTime?: string;
  patternColor?: string;
}

export interface MonthlyDayScheduleView {
  dateIso: string;
  dayOfWeek: string;
  dayOfMonth: number;
  scheduleText: string;
  isWorkDay: boolean;
}

/**
 * Get schedule info for a specific employee on a specific date.
 */
export const getEmployeeScheduleForDate = async (
  employeeId: string,
  date: string,
): Promise<ScheduleInfo | null> => {
  try {
    const response = await fetch(`${API_URL}/shifts/schedule/employee/${employeeId}?date=${date}`, {
      method: "GET",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching employee schedule for date:", error);
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
    const response = await fetch(`${API_URL}/shifts/schedule/employees-on-date?date=${date}`, {
      method: "GET",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching scheduled employees on date:", error);
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
    const response = await fetch(
      `${API_URL}/shifts/schedule/employee/${employeeId}/month?year=${year}&month=${month}`,
      {
        method: "GET",
        headers: {
          ...(authService.getAuthHeader() as Record<string, string>),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching employee monthly schedule:", error);
    throw error;
  }
};

export interface ConflictValidationResult {
  hasConflicts: boolean;
  conflicts: { id: string; startDate: string; endDate: string | null }[];
  message: string;
}

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
    const response = await fetch(`${API_URL}/shifts/validate-conflicts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({
        employeeId,
        startDate,
        endDate,
        excludeAssignmentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error validating assignment conflicts:", error);
    throw error;
  }
};
