import { useShiftPatternsQuery } from "../../../hooks/queries/useShiftPatternsQuery";
import { useAssignedShiftsQuery } from "../../../hooks/queries/useAssignedShiftsQuery";
import { useHolidaysQuery } from "../../../hooks/queries/useHolidaysQuery";
import { useLeavesQuery } from "../../../hooks/queries/useLeavesQuery";
import {
  extractScheduleLeaves,
  useEmployeeDailyScheduleLookup,
} from "../../../hooks/useEmployeeDailyScheduleLookup";

/** Returns the schedule lookup needed by Time Control without unrelated observers. */
export const useTimeControlScheduleEnrichment = () => {
  const { data: shiftPatterns = [] } = useShiftPatternsQuery();
  const { data: assignedShifts = [] } = useAssignedShiftsQuery();
  const { data: holidays = [] } = useHolidaysQuery();
  const { data: leavesResponse } = useLeavesQuery();
  const leaves = extractScheduleLeaves(leavesResponse);

  return useEmployeeDailyScheduleLookup({
    holidays,
    leaves,
    assignedShifts,
    shiftPatterns,
    allowUnknownEmployees: true,
  });
};
