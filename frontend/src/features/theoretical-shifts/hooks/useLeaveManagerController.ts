import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Employee, LeaveRecord } from "../../../types";
import { useLeavesInfiniteQuery } from "../../../hooks/queries/useLeavesInfiniteQuery";
import { useLeaveMutations } from "../../../hooks/useLeaveMutations";
import { useEmployees } from "../../../hooks/useEmployees";
import { useToasts } from "../../../hooks/useToasts";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { normalizeString } from "../../../utils/stringUtils";
import {
  addBusinessDaysChile,
  compareBusinessDate,
  toBusinessDateChile,
} from "../../../utils/dateUtils";

type ProcessedLeave = LeaveRecord & { employeeName: string };
type LeaveTypeFilter = LeaveRecord["type"] | "";

export const useLeaveManagerController = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEmployeeName, setFilterEmployeeName] = useState("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useLeavesInfiniteQuery({
    showArchived,
    employeeId: filterEmployeeId || undefined,
  });

  const leaves = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data]);

  const { createLeave, deleteLeave } = useLeaveMutations();
  const { justifyRecordsForLeave } = useTimeRecords();
  const { activeEmployees, getEmployeeById } = useEmployees();
  const { addToast } = useToasts();

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null);
  const [leaveToDelete, setLeaveToDelete] = useState<ProcessedLeave | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<LeaveTypeFilter>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const processedLeaves = useMemo(() => {
    const lowerCaseFilter = normalizeString(filterEmployeeName).toLowerCase();

    const enriched: ProcessedLeave[] = leaves.map((l) => ({
      ...l,
      employeeName: getEmployeeById(l.employeeId)?.name || "N/A",
    }));

    return enriched.filter(
      (l) =>
        (!filterEmployeeName ||
          normalizeString(l.employeeName).toLowerCase().includes(lowerCaseFilter)) &&
        (!filterType ||
          normalizeString(l.type).toLowerCase() === normalizeString(filterType).toLowerCase()),
    );
  }, [leaves, filterEmployeeName, filterType, getEmployeeById]);

  const resetForm = useCallback(() => {
    setEmployeeId("");
    setType("");
    setStartDate("");
    setEndDate("");
    setNotes("");
    setEditingLeave(null);
    setSearchTerm("");
  }, []);

  const handleEditClick = useCallback(
    (leave: LeaveRecord) => {
      setEditingLeave(leave);
      setEmployeeId(leave.employeeId);
      setType(leave.type);
      setStartDate(leave.startDate);
      setEndDate(leave.endDate);
      setNotes(leave.notes || "");
      setSearchTerm(getEmployeeById(leave.employeeId)?.name || "");
      setIsFormVisible(true);
      document.getElementById("leave-manager-section")?.scrollIntoView({ behavior: "smooth" });
    },
    [getEmployeeById],
  );

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!employeeId || !type || !startDate || !endDate) {
        addToast("Empleado, tipo, fecha de inicio y fin son requeridos.", "warning");
        return;
      }
      if (startDate > endDate) {
        addToast("La fecha de fin no puede ser anterior a la de inicio.", "error");
        return;
      }

      const todayStr = toBusinessDateChile();
      const limitDate = addBusinessDaysChile(todayStr, -7);
      if (!editingLeave && compareBusinessDate(startDate, limitDate) < 0) {
        addToast("No se pueden registrar ausencias con más de 7 días de antigüedad.", "error");
        return;
      }

      if (editingLeave && compareBusinessDate(endDate, todayStr) < 0) {
        addToast("La fecha de término no puede ser anterior al día de hoy.", "error");
        return;
      }

      const conflict = leaves.find(
        (l) =>
          l.id !== editingLeave?.id &&
          l.employeeId === employeeId &&
          !(endDate < l.startDate || startDate > l.endDate),
      );

      if (conflict) {
        addToast("Conflicto: El empleado ya tiene una ausencia en este período.", "error");
        return;
      }

      const leaveData = { employeeId, type, startDate, endDate, notes };

      try {
        if (editingLeave) {
          const fullUpdatedLeave = await createLeave({
            ...leaveData,
            id: editingLeave.id,
          });
          if (fullUpdatedLeave) {
            await justifyRecordsForLeave(
              fullUpdatedLeave.employeeId,
              fullUpdatedLeave.startDate,
              fullUpdatedLeave.endDate,
              { type: fullUpdatedLeave.type, leaveId: fullUpdatedLeave.id },
            );
            setIsFormVisible(false);
            resetForm();
          }
        } else {
          const newLeave = await createLeave(leaveData);
          if (newLeave) {
            await justifyRecordsForLeave(
              newLeave.employeeId,
              newLeave.startDate,
              newLeave.endDate,
              { type: newLeave.type, leaveId: newLeave.id },
            );
            setIsFormVisible(false);
            resetForm();
          }
        }
      } catch {
        // Error handled by mutation
      }
    },
    [
      employeeId,
      type,
      startDate,
      endDate,
      notes,
      addToast,
      editingLeave,
      leaves,
      createLeave,
      justifyRecordsForLeave,
      resetForm,
    ],
  );

  const filteredEmployeesForSearch = useMemo(() => {
    if (!searchTerm) return [];
    const lowerCaseSearchTerm = normalizeString(searchTerm).toLowerCase();
    return activeEmployees
      .filter((e) => normalizeString(e.name).toLowerCase().includes(lowerCaseSearchTerm))
      .slice(0, 7);
  }, [searchTerm, activeEmployees]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setEmployeeId("");
    setIsDropdownOpen(true);
  };

  const handleSelectEmployee = (employee: Employee) => {
    setEmployeeId(employee.id);
    setSearchTerm(employee.name);
    setIsDropdownOpen(false);
  };

  const handleClearFilter = () => {
    setFilterEmployeeId("");
    setFilterEmployeeName("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirmDeleteLeave = async () => {
    if (!leaveToDelete) return;
    await deleteLeave(leaveToDelete.id);
    setLeaveToDelete(null);
  };

  return {
    showArchived,
    filterType,
    filterEmployeeName,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    processedLeaves,
    isFormVisible,
    editingLeave,
    leaveToDelete,
    employeeId,
    type,
    startDate,
    endDate,
    isStartDatePickerOpen,
    isEndDatePickerOpen,
    notes,
    searchTerm,
    isDropdownOpen,
    searchContainerRef,
    filteredEmployeesForSearch,
    setShowArchived,
    setFilterType,
    setFilterEmployeeName,
    setIsFormVisible,
    setLeaveToDelete,
    setType,
    setStartDate,
    setEndDate,
    setIsStartDatePickerOpen,
    setIsEndDatePickerOpen,
    setNotes,
    setIsDropdownOpen,
    resetForm,
    handleEditClick,
    handleSave,
    handleSearchChange,
    handleSelectEmployee,
    handleClearFilter,
    handleConfirmDeleteLeave,
  };
};
