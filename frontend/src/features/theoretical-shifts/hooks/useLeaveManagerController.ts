import { useEffect, useRef, useState } from "react";
import { Employee, LeaveRecord } from "../../../types";
import { useLeavesInfiniteQuery } from "../../../hooks/queries/useLeavesInfiniteQuery";
import { useLeaveMutations } from "../../../hooks/useLeaveMutations";
import { useEmployees } from "../../../hooks/useEmployees";
import { useTimeRecords } from "../../../hooks/useTimeRecords";
import { normalizeString } from "../../../utils/stringUtils";
import { addBusinessDaysChile, toBusinessDateChile } from "../../../utils/dateUtils";
import { useAppForm } from "../../../hooks/useAppForm";
import { buildLeaveFormSchema, type LeaveFormValues } from "../../../schemas/forms";

type ProcessedLeave = LeaveRecord & { employeeName: string };

/**
 * Spec 036 T8 (AC1, AC2, AC3, AC4): formulario de **ausencias**.
 *
 * Antes de la migracion el controller llevaba a mano el estado de cinco
 * campos (`employeeId`, `type`, `startDate`, `endDate`, `notes`), cinco
 * `useState` sueltos y cinco validaciones hechas con `addToast`. Ahora:
 *
 * - el estado vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`buildLeaveFormSchema`): rango de fechas,
 *   antiguedad de 7 dias, fecha de termino en pasado al editar y solapamiento
 *   con otra ausencia del mismo empleado (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * El `searchTerm` **no** es un campo del formulario: es el buscador que
 * permite elegir el empleado, asi que sigue siendo estado de la pantalla.
 */
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

  const leaves = data?.pages.flatMap((page) => page.data) || [];

  const { createLeave, deleteLeave } = useLeaveMutations();
  const { justifyRecordsForLeave } = useTimeRecords();
  const { activeEmployees, getEmployeeById } = useEmployees();

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null);
  const [leaveToDelete, setLeaveToDelete] = useState<ProcessedLeave | null>(null);

  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  /** Fecha de hoy del negocio (`YYYY-MM-DD`). */
  const todayStr = toBusinessDateChile();
  /** No se pueden registrar ausencias con mas de 7 dias de antiguedad. */
  const oldestAllowedStartDate = addBusinessDaysChile(todayStr, -7);

  /**
   * Schema con las reglas que dependen del contexto (solapamiento con otras
   * ausencias del empleado).
   */
  const schema = buildLeaveFormSchema({
    existingLeaves: leaves,
    editingLeaveId: editingLeave?.id,
    oldestAllowedStartDate,
    today: todayStr,
  });

  const processedLeaves = (() => {
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
  })();

  const form = useAppForm<LeaveFormValues>({
    schema,
    defaultValues: { employeeId: "", type: "", startDate: "", endDate: "", notes: "" },
    /**
     * El payload es identico al de antes de la migracion (spec 036 T13): las
     * notas viajan como cadena vacia cuando no hay, no como `undefined`.
     */
    serialize: (values) => ({ ...values, notes: values.notes ?? "" }),
    onSubmit: async (values) => {
      const leaveData = {
        employeeId: values.employeeId,
        // El backend acepta cualquier texto (el schema es una copia del
        // contrato), pero la pantalla solo ofrece los tipos de `LEAVE_TYPES`.
        type: values.type as LeaveRecord["type"],
        startDate: values.startDate,
        endDate: values.endDate,
        notes: values.notes ?? "",
      };

      const savedLeave = editingLeave
        ? await createLeave({ ...leaveData, id: editingLeave.id })
        : await createLeave(leaveData);

      if (!savedLeave) return;

      await justifyRecordsForLeave(
        savedLeave.employeeId,
        savedLeave.startDate,
        savedLeave.endDate,
        { type: savedLeave.type, leaveId: savedLeave.id },
      );
      setIsFormVisible(false);
      resetForm();
    },
  });

  const { setValue, reset } = form;

  const resetForm = () => {
    setEditingLeave(null);
    setSearchTerm("");
    reset({ employeeId: "", type: "", startDate: "", endDate: "", notes: "" });
  };

  const handleEditClick = (leave: LeaveRecord) => {
    setEditingLeave(leave);
    setValue("employeeId", leave.employeeId);
    setValue("type", leave.type);
    setValue("startDate", leave.startDate);
    setValue("endDate", leave.endDate);
    setValue("notes", leave.notes || "");
    setSearchTerm(getEmployeeById(leave.employeeId)?.name || "");
    setIsFormVisible(true);
    document.getElementById("leave-manager-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredEmployeesForSearch = (() => {
    if (!searchTerm) return [];
    const lowerCaseSearchTerm = normalizeString(searchTerm).toLowerCase();
    return activeEmployees
      .filter((e) => normalizeString(e.name).toLowerCase().includes(lowerCaseSearchTerm))
      .slice(0, 7);
  })();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setValue("employeeId", "");
    setIsDropdownOpen(true);
  };

  const handleSelectEmployee = (employee: Employee) => {
    setValue("employeeId", employee.id);
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
    formValues: form.values,
    formErrors: form.errors,
    getError: form.getError,
    setValue,
    isStartDatePickerOpen,
    isEndDatePickerOpen,
    searchTerm,
    isDropdownOpen,
    searchContainerRef,
    filteredEmployeesForSearch,
    isSubmitting: form.isSubmitting,
    submit: form.submit,
    formProps: form.formProps,
    setShowArchived,
    setFilterType,
    setFilterEmployeeName,
    setIsFormVisible,
    setLeaveToDelete,
    setIsStartDatePickerOpen,
    setIsEndDatePickerOpen,
    setIsDropdownOpen,
    resetForm,
    handleEditClick,
    handleSearchChange,
    handleSelectEmployee,
    handleClearFilter,
    handleConfirmDeleteLeave,
  };
};
