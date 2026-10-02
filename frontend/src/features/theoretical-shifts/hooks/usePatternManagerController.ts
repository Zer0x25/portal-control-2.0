import { useMemo, useState } from "react";
import { AssignedShift, TheoreticalShiftPattern } from "../../../types";
import { useShiftPatternsInfiniteQuery } from "../../../hooks/queries/useShiftPatternsInfiniteQuery";
import { useAssignedShiftsQuery } from "../../../hooks/queries/useAssignedShiftsQuery";
import { useShiftMutations } from "../../../hooks/useShiftMutations";
import { useShiftPatternForm } from "../../../hooks/useShiftPatternForm";
import { useToasts } from "../../../hooks/useToasts";
import { useDebounce } from "../../../hooks/useDebounce";
import { useStore } from "../../../store/useStore";

export const usePatternManagerController = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useShiftPatternsInfiniteQuery({
      pageSize: 50,
      search: debouncedSearchTerm || undefined,
      showArchived: false,
    });
  const { data: assignedShifts = [] } = useAssignedShiftsQuery();
  const { deletePattern } = useShiftMutations();
  const patternForm = useShiftPatternForm();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [patternToDelete, setPatternToDelete] = useState<string | null>(null);
  const { addToast } = useToasts();
  const globalMaxWeeklyHours = useStore((state) => state.globalMaxWeeklyHours);

  const affectedAssignments = useMemo(() => {
    if (!patternToDelete) return [];
    return assignedShifts.filter((as: AssignedShift) => as.shiftPatternId === patternToDelete);
  }, [patternToDelete, assignedShifts]);

  const affectedEmployeesCount = useMemo(() => {
    const uniqueEmpIds = new Set(affectedAssignments.map((as: AssignedShift) => as.employeeId));
    return uniqueEmpIds.size;
  }, [affectedAssignments]);

  const handleOpenNewForm = () => {
    patternForm.clearForm();
    setIsFormVisible(true);
  };

  const handleCancelForm = () => {
    patternForm.clearForm();
    setIsFormVisible(false);
  };

  const handleSaveForm = async (): Promise<boolean> => {
    try {
      const success = await patternForm.handleSavePattern();
      if (success) {
        setIsFormVisible(false);
        addToast("Patrón guardado exitosamente", "success");
      }
      return success;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar el patrón";
      addToast(message, "error");
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!patternToDelete) return;
    try {
      await deletePattern(patternToDelete);
    } catch {
      // Toast handles inside mutation, but just in case
    } finally {
      setPatternToDelete(null);
    }
  };

  const handleEditPattern = (pattern: TheoreticalShiftPattern) => {
    patternForm.setEditingPattern(pattern);
    setIsFormVisible(true);
    document.getElementById("pattern-manager-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopyPattern = (pattern: TheoreticalShiftPattern) => {
    patternForm.startCopyOfPattern(pattern);
    setIsFormVisible(true);
    document.getElementById("pattern-manager-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const processedPatterns = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data]);

  return {
    searchTerm,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    patternForm,
    isFormVisible,
    patternToDelete,
    globalMaxWeeklyHours,
    affectedEmployeesCount,
    processedPatterns,
    setSearchTerm,
    setPatternToDelete,
    handleOpenNewForm,
    handleCancelForm,
    handleSaveForm,
    handleConfirmDelete,
    handleEditPattern,
    handleCopyPattern,
  };
};
