import React from "react";
import { Holiday } from "../../../types/index";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { PlusCircleIcon, EditIcon, ChevronRightIcon } from "../../../components/ui/icons/index";
import DatePickerDialog from "../../../components/ui/DatePickerDialog";
import { HOLIDAY_TYPES } from "../../../utils/mappings";
import type { HolidayFormValues } from "../../../schemas/forms";

/**
 * Spec 036 T8: `HolidayForm` es **presentacion pura**.
 *
 * Antes este componente tenia cuatro `useState` y un `useEffect` (la capa de
 * componentes gestionaba estado, lo que la spec 033 prohibe). Ahora el estado
 * y las reglas viven en el hook de dominio (`useHolidayManagerController`) y
 * el componente solo pinta: valores, errores y handlers entran por props.
 */
interface HolidayFormProps {
  /** Feriado en edicion (`null` cuando se crea uno nuevo). */
  initialData?: Holiday | null;
  /** Valores actuales del formulario. */
  values: HolidayFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe el valor de un campo. */
  setValue: <K extends keyof HolidayFormValues & string>(
    name: K,
    value: HolidayFormValues[K],
  ) => void;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** El selector de fecha esta abierto. */
  isDatePickerOpen: boolean;
  /** Abre el selector de fecha. */
  onOpenDatePicker: () => void;
  /** Cierra el selector de fecha. */
  onCloseDatePicker: () => void;
  /** Cancela la edicion. */
  onCancel: () => void;
}

const HolidayForm: React.FC<HolidayFormProps> = ({
  initialData,
  values,
  getError,
  setValue,
  formProps,
  isSubmitting,
  isDatePickerOpen,
  onOpenDatePicker,
  onCloseDatePicker,
  onCancel,
}) => {
  const dateError = getError("date");
  const nameError = getError("name");

  return (
    <form {...formProps} className="space-y-8">
      <h3 className="text-lg font-bold text-token-text-primary flex items-center gap-2">
        <div className="w-2 h-6 bg-token-accent-brand rounded-full"></div>
        {initialData ? "Actualizar Feriado" : "Nuevo Feriado"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        {/* Date Picker */}
        <div className="relative group">
          <label
            htmlFor="holiday-date"
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 pl-1"
          >
            Fecha
          </label>
          <Button
            id="holiday-date"
            type="button"
            variant="secondary"
            onClick={onOpenDatePicker}
            aria-invalid={dateError ? "true" : undefined}
            aria-describedby={dateError ? "holiday-date-error" : undefined}
            className="w-full px-4 py-3 justify-between text-token-text-primary text-left font-normal"
          >
            <span>
              {values.date
                ? new Date(values.date + "T12:00:00").toLocaleDateString("es-CL")
                : "Seleccionar"}
            </span>
            <ChevronRightIcon className="w-4 h-4 text-token-accent-brand rotate-90 opacity-60" />
          </Button>
          <DatePickerDialog
            isOpen={isDatePickerOpen}
            onClose={onCloseDatePicker}
            onSelect={(selectedDate) => setValue("date", selectedDate)}
            initialDate={values.date}
          />
          {dateError && (
            <p
              id="holiday-date-error"
              className="mt-2 text-[10px] font-black uppercase tracking-widest text-token-status-error"
            >
              {dateError}
            </p>
          )}
        </div>

        {/* Name Input */}
        <Input
          label="Nombre del Feriado"
          value={values.name}
          onChange={(e) => setValue("name", e.target.value)}
          error={nameError}
          required
          placeholder="Ej: Año Nuevo"
        />

        {/* Type Select */}
        <Select
          label="Tipo"
          value={values.type}
          onChange={(e) => setValue("type", e.target.value as Holiday["type"])}
          options={HOLIDAY_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting} className="px-8 flex items-center gap-2">
          {initialData ? <EditIcon className="w-5 h-5" /> : <PlusCircleIcon className="w-5 h-5" />}
          {initialData ? "Actualizar" : "Guardar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-8">
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default HolidayForm;
