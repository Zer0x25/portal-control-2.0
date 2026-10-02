import { PatternSchedule } from "../schedulingService";

export interface PatternCreateInput {
  id?: string;
  name: string;
  cycleLengthDays: number;
  startDayOfWeek: number;
  dailySchedules: PatternSchedule[];
  color: string;
  maxHoursPattern: number;
  worksOnHolidays?: boolean;
}

export interface AssignmentCreateInput {
  id?: string;
  employeeId: string;
  shiftPatternId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  role?: string;
  since?: string;
  showArchived?: boolean;
}

export interface PatternPaginationOptions {
  page?: number;
  pageSize?: number;
  since?: string;
  showArchived?: boolean;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
