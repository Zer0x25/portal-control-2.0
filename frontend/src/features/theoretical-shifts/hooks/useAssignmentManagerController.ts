import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AssignedShift } from "../../../types";
import { useShiftPatternsQuery } from "../../../hooks/queries/useShiftPatternsQuery";
import { useAssignedShiftsInfiniteQuery } from "../../../hooks/queries/useAssignedShiftsInfiniteQuery";
import { useShiftMutations } from "../../../hooks/useShiftMutations";
import { useShiftAssignmentForm } from "../../../hooks/useShiftAssignmentForm";
import { useEmployees } from "../../../hooks/useEmployees";
import { useDebounce } from "../../../hooks/useDebounce";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { normalizeString } from "../../../utils/stringUtils";
import {
  addBusinessDaysChile,
  formatBusinessDate,
  toBusinessDateChile,
} from "../../../utils/dateUtils";
import { useAssignmentConflicts } from "./useAssignmentConflicts";

type ProcessedAssignment = AssignedShift & {
  assignmentWeeklyHours: number;
  employeeName: string;
  shiftPatternName: string;
};

export const useAssignmentManagerController = () => {
  const { data: shiftPatterns = [] } = useShiftPatternsQuery();
  const { deleteAssignment, updateAssignment } = useShiftMutations();
  const { activeEmployees } = useEmployees();
  const assignmentForm = useShiftAssignmentForm();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showArchived, setShowArchived] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useAssignedShiftsInfiniteQuery({
    pageSize: 50,
    employeeId: undefined,
    since: undefined,
    showArchived,
  });

  const flatAssignments = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const processedAssignments = useMemo(() => {
    return flatAssignments.map((as) => {
      const employee = activeEmployees.find((e) => e.id === as.employeeId);
      const pattern = shiftPatterns.find((p) => p.id === as.shiftPatternId);

      let assignmentWeeklyHours = 0;
      if (pattern?.cycleLengthDays && pattern.cycleLengthDays > 0) {
        const totalHoursInCycle = pattern.dailySchedules.reduce(
          (sum, day) => sum + (day.hours || 0),
          0,
        );
        assignmentWeeklyHours = (totalHoursInCycle / pattern.cycleLengthDays) * 7;
      }

      return {
        ...as,
        employeeName: employee?.name || as.employeeName || "Empleado no encontrado",
        shiftPatternName: pattern?.name || as.shiftPatternName || "Patrón no encontrado",
        assignmentWeeklyHours,
      } as ProcessedAssignment;
    });
  }, [flatAssignments, activeEmployees, shiftPatterns]);

  const filteredAssignments = useMemo(() => {
    if (!debouncedSearchTerm) return processedAssignments;
    const lower = debouncedSearchTerm.toLowerCase();
    return processedAssignments.filter(
      (as) =>
        as.employeeName.toLowerCase().includes(lower) ||
        as.shiftPatternName.toLowerCase().includes(lower),
    );
  }, [processedAssignments, debouncedSearchTerm]);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const conflictingAssignmentIds = useAssignmentConflicts(flatAssignments);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeSearchRef = useRef<HTMLDivElement>(null);

  const filteredEmployeesForSearch = useMemo(() => {
    if (!employeeSearchTerm) return [];
    const lower = normalizeString(employeeSearchTerm).toLowerCase();
    return activeEmployees
      .filter((e) => normalizeString(e.name).toLowerCase().includes(lower))
      .slice(0, 7);
  }, [employeeSearchTerm, activeEmployees]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeSearchRef.current && !employeeSearchRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [terminationMode, setTerminationMode] = useState<"DELETE" | "TERMINATE">("DELETE");

  const handleOpenNewForm = () => {
    assignmentForm.clearForm();
    setEmployeeSearchTerm("");
    setIsFormVisible(true);
  };

  const handleCancelForm = () => {
    assignmentForm.clearForm();
    setEmployeeSearchTerm("");
    setIsFormVisible(false);
  };

  const handleSaveForm = async () => {
    if (await assignmentForm.handleSaveAssignment()) {
      setEmployeeSearchTerm("");
      setIsFormVisible(false);
    }
  };

  const handleEditAssignment = (assignment: AssignedShift) => {
    const employee = activeEmployees.find((e) => e.id === assignment.employeeId);
    assignmentForm.setEditingAssignment(assignment);
    setEmployeeSearchTerm(employee?.name || "");
    setIsFormVisible(true);
    document.getElementById("assignment-manager-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const todayStr = toBusinessDateChile();

  const handleDeleteClick = (id: string) => {
    const assignment = flatAssignments.find((a) => a.id === id);
    if (!assignment) return;

    const isFuture = assignment.startDate > todayStr;
    const isRecentlyCreated =
      assignment.createdAt && Date.now() - (assignment.createdAt as number) < 24 * 60 * 60 * 1000;

    if (isFuture || isRecentlyCreated) {
      setTerminationMode("DELETE");
    } else {
      setTerminationMode("TERMINATE");
    }

    setAssignmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (assignmentToDelete) {
      if (terminationMode === "DELETE") {
        await deleteAssignment(assignmentToDelete);
      } else {
        const assignment = flatAssignments.find((a) => a.id === assignmentToDelete);
        if (assignment) {
          const yesterday = addBusinessDaysChile(todayStr, -1);
          await updateAssignment({
            id: assignmentToDelete,
            assignment: {
              ...assignment,
              endDate: yesterday,
            },
          });
        }
      }
      setAssignmentToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setAssignmentToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmConflict = useCallback(async () => {
    await assignmentForm.proceedWithSave();
  }, [assignmentForm]);

  return {
    shiftPatterns,
    assignmentForm,
    searchTerm,
    showArchived,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    flatAssignments,
    filteredAssignments,
    isMobile,
    isFormVisible,
    conflictingAssignmentIds,
    isStartDatePickerOpen,
    isEndDatePickerOpen,
    employeeSearchTerm,
    isEmployeeDropdownOpen,
    employeeSearchRef,
    filteredEmployeesForSearch,
    isDeleteModalOpen,
    assignmentToDelete,
    terminationMode,
    todayStr,
    setSearchTerm,
    setShowArchived,
    setIsStartDatePickerOpen,
    setIsEndDatePickerOpen,
    setEmployeeSearchTerm,
    setIsEmployeeDropdownOpen,
    handleOpenNewForm,
    handleCancelForm,
    handleSaveForm,
    handleEditAssignment,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete,
    handleConfirmConflict,
    addBusinessDaysChile,
    formatBusinessDate,
  };
};
