import { useEffect, useState } from "react";
import { useStore } from "../../../store/useStore";
import { AssignedShift } from "../../../types";

export const useAssignmentConflicts = (assignments: AssignedShift[]) => {
  const detectAssignmentConflicts = useStore((state) => state.detectAssignmentConflicts);
  const [conflictingAssignmentIds, setConflictingAssignmentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const conflicts = detectAssignmentConflicts(assignments);
    setConflictingAssignmentIds(conflicts);
  }, [assignments, detectAssignmentConflicts]);

  return conflictingAssignmentIds;
};
