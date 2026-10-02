import { useCallback, useMemo, useState } from "react";
import { Holiday } from "../../../types";
import { useHolidaysInfiniteQuery } from "../../../hooks/queries/useHolidaysInfiniteQuery";
import { useHolidayMutations } from "../../../hooks/useHolidayMutations";
import { compareBusinessDate, toBusinessDateChile } from "../../../utils/dateUtils";

export const useHolidayManagerController = () => {
  const [showArchived, setShowArchived] = useState(false);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useHolidaysInfiniteQuery({
      pageSize: 50,
      showArchived,
    });
  const { createHoliday, deleteHoliday, syncHolidays, isPending } = useHolidayMutations();

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const holidays = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data]);
  const today = useMemo(() => toBusinessDateChile(), []);

  const sortedHolidays = useMemo(() => {
    let sortableItems = [...holidays];

    if (!showArchived) {
      sortableItems = sortableItems.filter((h) => compareBusinessDate(h.date, today) >= 0);
    }

    sortableItems.sort((a, b) => b.date.localeCompare(a.date));
    return sortableItems;
  }, [holidays, showArchived, today]);

  const existingDates = useMemo(() => {
    if (editingHoliday) {
      return holidays.filter((h) => h.id !== editingHoliday.id).map((h) => h.date);
    }
    return holidays.map((h) => h.date);
  }, [holidays, editingHoliday]);

  const handleCancelForm = useCallback(() => {
    setEditingHoliday(null);
    setIsFormVisible(false);
  }, []);

  const handleEditClick = useCallback((holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsFormVisible(true);
    document.getElementById("holiday-manager-section")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSaveWrapper = async (data: { name: string; date: string; type: Holiday["type"] }) => {
    try {
      if (editingHoliday) {
        await createHoliday({ ...data, id: editingHoliday.id });
      } else {
        await createHoliday(data);
      }
      handleCancelForm();
    } catch {
      // Toast handled by mutation
    }
  };

  const handleLoadHolidays = async () => {
    await syncHolidays();
  };

  const handleConfirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    await deleteHoliday(holidayToDelete.id);
    setHolidayToDelete(null);
  };

  return {
    showArchived,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isPending,
    isFormVisible,
    editingHoliday,
    holidayToDelete,
    sortedHolidays,
    existingDates,
    holidays,
    setShowArchived,
    setIsFormVisible,
    setHolidayToDelete,
    handleCancelForm,
    handleEditClick,
    handleSaveWrapper,
    handleLoadHolidays,
    handleConfirmDeleteHoliday,
  };
};
