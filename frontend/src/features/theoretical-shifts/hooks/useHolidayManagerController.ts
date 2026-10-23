import { useEffect, useState } from "react";
import { Holiday } from "../../../types";
import { useHolidaysInfiniteQuery } from "../../../hooks/queries/useHolidaysInfiniteQuery";
import { useHolidayMutations } from "../../../hooks/useHolidayMutations";
import { compareBusinessDate, toBusinessDateChile } from "../../../utils/dateUtils";
import { useAppForm } from "../../../hooks/useAppForm";
import { buildHolidayFormSchema, type HolidayFormValues } from "../../../schemas/forms";

/**
 * Spec 036 T8 (AC1, AC2, AC3, AC4): formulario de **feriados**.
 *
 * Antes el formulario vivia entero dentro del componente `HolidayForm.tsx`
 * (cuatro `useState` y un `useEffect` que copiaba los datos de edicion): la
 * capa de componentes gestionaba estado, justo lo que la spec 033 prohibe.
 *
 * Ahora el estado vive en el **hook de dominio** (spec 036 AC1), las reglas
 * viven en el schema (`buildHolidayFormSchema`: la fecha no puede estar ya
 * ocupada) y el componente `HolidayForm` es presentacion pura (spec 036 AC2,
 * AC3).
 */
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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const holidays = data?.pages.flatMap((page) => page.data) || [];
  const today = toBusinessDateChile();

  const sortedHolidays = (() => {
    let sortableItems = [...holidays];

    if (!showArchived) {
      sortableItems = sortableItems.filter((h) => compareBusinessDate(h.date, today) >= 0);
    }

    sortableItems.sort((a, b) => b.date.localeCompare(a.date));
    return sortableItems;
  })();

  /** Fechas ya ocupadas (el feriado en edicion no cuenta como ocupado). */
  const existingDates = (() => {
    if (editingHoliday) {
      return holidays.filter((h) => h.id !== editingHoliday.id).map((h) => h.date);
    }
    return holidays.map((h) => h.date);
  })();

  /** Schema con la regla que depende del contexto (fecha ya ocupada). */
  const schema = buildHolidayFormSchema({ existingDates });

  const form = useAppForm<HolidayFormValues, { name: string; date: string; type: Holiday["type"] }>(
    {
      schema,
      defaultValues: { name: "", date: "", type: "Nacional" },
      /**
       * El payload viaja tal cual lo recibia el backend antes de la
       * migracion (spec 036 T13): sin campos derivados.
       */
      serialize: (values) => ({
        name: values.name,
        date: values.date,
        type: values.type,
      }),
      onSubmit: async (values) => {
        if (editingHoliday) {
          await createHoliday({ ...values, id: editingHoliday.id });
        } else {
          await createHoliday(values);
        }
        handleCancelForm();
      },
    },
  );

  const { setValue, reset } = form;

  const handleCancelForm = () => {
    setEditingHoliday(null);
    setIsFormVisible(false);
    reset({ name: "", date: "", type: "Nacional" });
  };

  const handleEditClick = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsFormVisible(true);
    document.getElementById("holiday-manager-section")?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Al editar, el formulario se rellena con los datos del feriado; al
   * cancelar, se vacia.
   */
  useEffect(() => {
    if (editingHoliday) {
      setValue("name", editingHoliday.name);
      setValue("date", editingHoliday.date);
      setValue("type", editingHoliday.type);
    }
  }, [editingHoliday, setValue]);

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
    formValues: form.values,
    formErrors: form.errors,
    getError: form.getError,
    setValue,
    isDatePickerOpen,
    setIsDatePickerOpen,
    isSubmitting: form.isSubmitting,
    submit: form.submit,
    formProps: form.formProps,
    setShowArchived,
    setIsFormVisible,
    setHolidayToDelete,
    handleCancelForm,
    handleEditClick,
    handleLoadHolidays,
    handleConfirmDeleteHoliday,
  };
};
