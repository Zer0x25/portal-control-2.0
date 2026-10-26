import { useCallback, useMemo } from "react";
import type { EmployeeDailyScheduleInfo, PlanningStatus } from "../types/derived";
import type {
  AssignedShift,
  Holiday,
  LeaveRecord,
  TheoreticalShiftPattern,
} from "../types/scheduling";
import type { Employee } from "../types/user";
import { parseISODateAtUTC } from "../utils/dateOnly";

type EmployeeIdentity = Pick<Employee, "id">;

const EMPTY_EMPLOYEES: EmployeeIdentity[] = [];
export const EMPTY_SCHEDULE_LEAVES: LeaveRecord[] = [];

interface EmployeeDailyScheduleLookupOptions {
  employees?: readonly EmployeeIdentity[];
  holidays: readonly Holiday[];
  leaves: readonly LeaveRecord[];
  assignedShifts: readonly AssignedShift[];
  shiftPatterns: readonly TheoreticalShiftPattern[];
  allowUnknownEmployees?: boolean;
}

const formatUTCDateOnly = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const extractScheduleLeaves = (value: unknown): LeaveRecord[] => {
  if (Array.isArray(value)) return value as LeaveRecord[];
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: LeaveRecord[] }).data;
  }
  return EMPTY_SCHEDULE_LEAVES;
};

export const useEmployeeDailyScheduleLookup = ({
  employees = EMPTY_EMPLOYEES,
  holidays,
  leaves,
  assignedShifts,
  shiftPatterns,
  allowUnknownEmployees = false,
}: EmployeeDailyScheduleLookupOptions) => {
  const employeesMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const holidaysMap = useMemo(
    () => new Map(holidays.map((holiday) => [holiday.date, holiday])),
    [holidays],
  );
  const leavesByEmployee = useMemo(() => {
    const map = new Map<string, LeaveRecord[]>();
    leaves.forEach((leave) => {
      if (!map.has(leave.employeeId)) map.set(leave.employeeId, []);
      map.get(leave.employeeId)?.push(leave);
    });
    return map;
  }, [leaves]);
  const assignmentsByEmployee = useMemo(() => {
    const map = new Map<string, AssignedShift[]>();
    assignedShifts.forEach((assignment) => {
      if (assignment.isDeleted) return;
      if (!map.has(assignment.employeeId)) map.set(assignment.employeeId, []);
      map.get(assignment.employeeId)?.push(assignment);
    });
    return map;
  }, [assignedShifts]);
  const patternsMap = useMemo(
    () => new Map(shiftPatterns.map((pattern) => [pattern.id, pattern])),
    [shiftPatterns],
  );

  return useCallback(
    (employeeId: string, targetDate: Date): EmployeeDailyScheduleInfo | null => {
      const employee = employeesMap.get(employeeId);
      if (!employee && !allowUnknownEmployees) return null;

      const targetDateString = formatUTCDateOnly(targetDate);
      const holidayOnDate = holidaysMap.get(targetDateString);

      const employeeLeaves = leavesByEmployee.get(employeeId) || [];
      const leaveOnDate = employeeLeaves.find(
        (leave) => targetDateString >= leave.startDate && targetDateString <= leave.endDate,
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

      const activeAssignment = (assignmentsByEmployee.get(employeeId) || []).find((assignment) => {
        if (targetDateString < assignment.startDate) return false;
        return !assignment.endDate || targetDateString <= assignment.endDate;
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

      const assignmentStartDate = parseISODateAtUTC(activeAssignment.startDate);
      const targetDayUTC = parseISODateAtUTC(targetDateString);
      const diffTime = targetDayUTC.getTime() - assignmentStartDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const dayInCycleIndex = diffDays % pattern.cycleLengthDays;
      const daySchedule = pattern.dailySchedules.find(
        (schedule) => schedule.dayIndex === dayInCycleIndex,
      );

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
    [
      employeesMap,
      holidaysMap,
      leavesByEmployee,
      assignmentsByEmployee,
      patternsMap,
      allowUnknownEmployees,
    ],
  );
};
