import { AssignedShift, TheoreticalShiftPattern, DayInCycleSchedule } from "../types/index";

export const detectAssignmentConflicts = (assignments: AssignedShift[]): Set<string> => {
  const conflicts = new Set<string>();
  const employeeMap = new Map<string, AssignedShift[]>();

  assignments.forEach((as: AssignedShift) => {
    if (!employeeMap.has(as.employeeId)) employeeMap.set(as.employeeId, []);
    employeeMap.get(as.employeeId)!.push(as);
  });

  employeeMap.forEach((empAssignments) => {
    for (let i = 0; i < empAssignments.length; i++) {
      for (let j = i + 1; j < empAssignments.length; j++) {
        const a = empAssignments[i];
        const b = empAssignments[j];
        const startA = a.startDate;
        const endA = a.endDate || "9999-12-31";
        const startB = b.startDate;
        const endB = b.endDate || "9999-12-31";

        if (startA <= endB && startB <= endA) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
  });
  return conflicts;
};

export const calculateAverageWeeklyHours = (
  assignments: AssignedShift[],
  patterns: TheoreticalShiftPattern[],
  employeeId: string,
  newAssignment?: AssignedShift,
  assignmentToExcludeId?: string,
): number => {
  const relevantAssignments = assignments.filter(
    (as: AssignedShift) => as.employeeId === employeeId && as.id !== assignmentToExcludeId,
  );

  if (newAssignment) {
    relevantAssignments.push(newAssignment);
  }

  if (relevantAssignments.length === 0) return 0;
  relevantAssignments.sort((a: AssignedShift, b: AssignedShift) =>
    a.startDate.localeCompare(b.startDate),
  );

  const latestAssignment = relevantAssignments[relevantAssignments.length - 1];
  const pattern = patterns.find((p) => p.id === latestAssignment.shiftPatternId);

  if (!pattern || pattern.cycleLengthDays <= 0) return 0;
  const totalHoursInCycle = pattern.dailySchedules.reduce(
    (sum: number, day: DayInCycleSchedule) => sum + (day.hours || 0),
    0,
  );
  return (totalHoursInCycle / pattern.cycleLengthDays) * 7;
};
