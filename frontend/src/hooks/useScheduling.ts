import { useCallback, useMemo } from "react";
import { useStore } from "../store/useStore";
import * as schedulingService from "../services/schedulingService";
import { useShiftPatternsQuery } from "./queries/useShiftPatternsQuery";
import { useAssignedShiftsQuery } from "./queries/useAssignedShiftsQuery";
import { useHolidaysQuery } from "./queries/useHolidaysQuery";
import { useLeavesQuery } from "./queries/useLeavesQuery";
import { useEmployees } from "./useEmployees";
import { useCorrectionRequestsQuery } from "./queries/useCorrectionRequestsQuery";
import { useCorrectionRequestMutations } from "./useCorrectionRequestMutations";
import {
  EmployeeDailyScheduleInfo,
  ScheduledEmployeeDetail,
  EmployeeWithShiftDetails,
  MonthlyDayScheduleView,
  PlanningStatus,
  LeaveRecord,
} from "../types/index";
import { calculateHoursBetween } from "../utils/calculations";
import { parseDateOnlyUTC } from "../utils/dateUtils";

const formatUTCDateOnly = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useScheduling = (requestsStatus?: string, sinceRequests?: number) => {
  const extractLeaves = (value: unknown): LeaveRecord[] => {
    if (Array.isArray(value)) return value as LeaveRecord[];
    if (
      value &&
      typeof value === "object" &&
      "data" in value &&
      Array.isArray((value as { data?: unknown }).data)
    ) {
      return (value as { data: LeaveRecord[] }).data;
    }
    return [];
  };

  // --- Config (Kept in Store) ---
  const globalMaxWeeklyHours = useStore((state) => state.globalMaxWeeklyHours);
  const areaList = useStore((state) => state.areaList);
  const workdayTypeList = useStore((state) => state.workdayTypeList);
  const emailRecipientsList = useStore((state) => state.emailRecipientsList);
  const accountingLockDate = useStore((state) => state.accountingLockDate);
  const updateGlobalMaxWeeklyHours = useStore((state) => state.updateGlobalMaxWeeklyHours);
  const updateAreaList = useStore((state) => state.updateAreaList);
  const updateWorkdayTypeList = useStore((state) => state.updateWorkdayTypeList);
  const updateEmailRecipientsList = useStore((state) => state.updateEmailRecipientsList);
  const updateAccountingLockDate = useStore((state) => state.updateAccountingLockDate);

  // --- Remote State (TanStack Query) ---
  const { data: shiftPatterns = [] } = useShiftPatternsQuery();
  const { data: assignedShifts = [] } = useAssignedShiftsQuery();
  const { data: holidays = [] } = useHolidaysQuery();
  const { data: leavesResponse } = useLeavesQuery();
  const leaves = useMemo(() => extractLeaves(leavesResponse), [leavesResponse]);
  const { allEmployees: employees, isLoadingEmployees } = useEmployees();
  const {
    data: infiniteRequests,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCorrectionRequestsQuery(requestsStatus, sinceRequests);

  const requests = useMemo(
    () => infiniteRequests?.pages.flatMap((page) => page.requests) || [],
    [infiniteRequests],
  );

  const {
    addCorrectionRequest,
    updateRequestStatus,
    isPending: isUpdatingRequestStatus,
  } = useCorrectionRequestMutations();

  const isLoadingSchedulingData = isLoadingEmployees; // Or composite loading

  const getRequestsForEmployee = useCallback(
    (employeeId: string) => {
      return requests.filter((r) => r.employeeId === employeeId);
    },
    [requests],
  );

  // --- Optimization: Memoized Lookup Maps (O(1) access) ---
  const employeesMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const holidaysMap = useMemo(() => new Map(holidays.map((h) => [h.date, h])), [holidays]);

  const leavesByEmployee = useMemo(() => {
    const map = new Map<string, typeof leaves>();
    leaves.forEach((l) => {
      if (!map.has(l.employeeId)) map.set(l.employeeId, []);
      map.get(l.employeeId)?.push(l);
    });
    return map;
  }, [leaves]);

  const assignmentsByEmployee = useMemo(() => {
    const map = new Map<string, typeof assignedShifts>();
    assignedShifts.forEach((a) => {
      if (a.isDeleted) return;
      if (!map.has(a.employeeId)) map.set(a.employeeId, []);
      map.get(a.employeeId)?.push(a);
    });
    return map;
  }, [assignedShifts]);

  const patternsMap = useMemo(() => new Map(shiftPatterns.map((p) => [p.id, p])), [shiftPatterns]);

  // --- Business Logic ---
  const getEmployeeDailyScheduleInfo = useCallback(
    (employeeId: string, targetDate: Date): EmployeeDailyScheduleInfo | null => {
      const employee = employeesMap.get(employeeId);
      if (!employee) return null;

      const targetDateString = formatUTCDateOnly(targetDate);
      const holidayOnDate = holidaysMap.get(targetDateString);

      const employeeLeaves = leavesByEmployee.get(employeeId) || [];
      const leaveOnDate = employeeLeaves.find(
        (l) => targetDateString >= l.startDate && targetDateString <= l.endDate,
      );

      if (leaveOnDate) {
        let planningStatus: PlanningStatus = "PermisoEspecial";
        if (leaveOnDate.type === "Vacaciones") planningStatus = "Vacaciones";
        if (leaveOnDate.type === "Licencia Médica") planningStatus = "LicenciaMedica";

        return {
          scheduleText: leaveOnDate.type,
          isWorkDay: false,
          justificationType: leaveOnDate.type,
          patternColor: "#8E44AD",
          planningStatus,
        };
      }

      const activeAssignment = (assignmentsByEmployee.get(employeeId) || []).find((a) => {
        if (targetDateString < a.startDate) return false;
        return !a.endDate || targetDateString <= a.endDate;
      });

      if (!activeAssignment) {
        if (holidayOnDate) {
          return {
            scheduleText: `Feriado: ${holidayOnDate.name}`,
            isWorkDay: false,
            isHoliday: true,
            holidayName: holidayOnDate.name,
            planningStatus: "Feriado",
          };
        }
        return {
          scheduleText: "Sin Turno Asignado",
          isWorkDay: false,
          planningStatus: "SinTurnoAsignado",
        };
      }

      const pattern = patternsMap.get(activeAssignment.shiftPatternId);
      if (!pattern || pattern.cycleLengthDays <= 0) {
        return {
          scheduleText: "Patrón Inválido",
          isWorkDay: false,
          planningStatus: "SinTurnoAsignado",
        };
      }

      if (holidayOnDate && !pattern.worksOnHolidays) {
        return {
          scheduleText: `Feriado: ${holidayOnDate.name}`,
          isWorkDay: false,
          isHoliday: true,
          holidayName: holidayOnDate.name,
          planningStatus: "Feriado",
        };
      }

      const assignmentStartDate = parseDateOnlyUTC(activeAssignment.startDate);
      const targetDayUTC = parseDateOnlyUTC(targetDateString);
      const diffTime = targetDayUTC.getTime() - assignmentStartDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const dayInCycleIndex = diffDays % pattern.cycleLengthDays;

      const daySchedule = pattern.dailySchedules.find((s) => s.dayIndex === dayInCycleIndex);

      if (!daySchedule || daySchedule.isOffDay) {
        return {
          scheduleText: holidayOnDate ? `Feriado: ${holidayOnDate.name}` : "Día Libre",
          isWorkDay: false,
          patternColor: typeof pattern.color === "string" ? pattern.color : undefined,
          planningStatus: holidayOnDate ? "Feriado" : "DiaLibre",
          isHoliday: !!holidayOnDate,
          holidayName: holidayOnDate?.name,
        };
      }

      const result: EmployeeDailyScheduleInfo = {
        scheduleText: `${daySchedule.startTime} - ${daySchedule.endTime}`,
        isWorkDay: true,
        startTime: daySchedule.startTime,
        endTime: daySchedule.endTime,
        hours: daySchedule.hours,
        shiftPatternId: pattern.id,
        shiftPatternName: pattern.name,
        patternColor: typeof pattern.color === "string" ? pattern.color : undefined,
        hasColacion: daySchedule.hasColacion,
        colacionMinutes: daySchedule.colacionMinutes,
        planningStatus: "Programado",
      };

      if (holidayOnDate) {
        result.isHoliday = true;
        result.holidayName = holidayOnDate.name;
      }

      return result;
    },
    [employeesMap, holidaysMap, leavesByEmployee, assignmentsByEmployee, patternsMap],
  );

  const isEmployeeScheduledOnDate = useCallback(
    (employeeId: string, targetDate: Date) => {
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
    },
    [getEmployeeDailyScheduleInfo],
  );

  const getScheduledEmployeesDetailsOnDate = useCallback(
    (targetDate: Date) => {
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
    },
    [assignedShifts, getEmployeeDailyScheduleInfo, employees],
  );

  const getEmployeesWithAssignedShifts = useCallback(() => {
    if (!employees || employees.length === 0) return [];
    return employees
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
  }, [employees, assignedShifts, shiftPatterns]);

  const getEmployeeScheduleForMonth = useCallback(
    (employeeId: string, year: number, month: number): MonthlyDayScheduleView[] => {
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
    },
    [getEmployeeDailyScheduleInfo],
  );

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
