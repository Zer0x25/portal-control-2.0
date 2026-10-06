import { createShiftFlows } from "../modules/shifts";
import { shiftService } from "./shiftService";
import { schedulingService } from "./schedulingService";
import { MonthlyShiftService } from "./MonthlyShiftService";
import { parseBusinessDateCL } from "../utils/timePolicy";
export const shiftFlows = createShiftFlows({
  service: {
    patterns: (query) => shiftService.getPatterns(query),
    createPattern: (data) => shiftService.createPattern(data),
    updatePattern: (id, data) => shiftService.updatePattern(id, data),
    deletePattern: (id) => shiftService.deletePattern(id),
    bulkPatterns: (data) => shiftService.bulkCreatePatterns(data),
    assignments: (query) =>
      shiftService.getAssignments({ ...query, employeeId: query.employeeId ?? undefined }),
    assign: (data, actor) => shiftService.assignShift(data, actor),
    updateAssignment: (id, data, actor) => shiftService.updateAssignment(id, data, actor),
    deleteAssignment: (id, actor) => shiftService.deleteAssignment(id, actor),
    bulkAssignments: (data) => shiftService.bulkAssignShifts(data),
    daily: (id, date) => schedulingService.getEmployeeDailyScheduleInfo(id, date),
    scheduled: (date) => schedulingService.getScheduledEmployeesOnDate(date),
    month: (id, year, month) => schedulingService.getEmployeeScheduleForMonth(id, year, month),
    matrix: (start, end, ids) => schedulingService.getCalendarMatrix(start, end, ids),
    conflicts: (id, start, end, exclude) => shiftService.validateConflicts(id, start, end, exclude),
    monthlyPlan: (id, year, month) => MonthlyShiftService.getMonthlyPlan(id, year, month),
    saveMonthlyPlan: async (data) => {
      await MonthlyShiftService.createMonthlyPlan(data);
    },
    suggest: (id, year, month) => MonthlyShiftService.getSuggestedPatternName(id, year, month),
  },
  parseDate: parseBusinessDateCL,
});
