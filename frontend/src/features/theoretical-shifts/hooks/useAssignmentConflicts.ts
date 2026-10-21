import { useEffect, useState } from "react";
import { AssignedShift } from "../../../types";
import { detectAssignmentConflicts } from "../../../utils/shiftUtils";

export const useAssignmentConflicts = (assignments: AssignedShift[]) => {
  const [conflictingAssignmentIds, setConflictingAssignmentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const conflicts = detectAssignmentConflicts(assignments);
    setConflictingAssignmentIds(conflicts);
  }, [assignments, detectAssignmentConflicts]);

  return conflictingAssignmentIds;
};
