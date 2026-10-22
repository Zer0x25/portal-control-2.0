import { useCallback, useEffect, useState } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { localNoveltyFormSchema, type LocalNoveltyFormValues } from "../../../schemas/forms/note";
import { formatTime } from "../../../utils/formatters";

/**
 * Spec 036 T10 (AC1, AC2, AC3): formulario de **novedad de la libreta de
 * turnos** (`AddNoveltyModal.tsx`).
 *
 * Antes el modal guardaba la anotacion y la hora en dos `useState` y, si
 * faltaba alguna de las dos, el envio se ignoraba en silencio. Ahora:
 *
 * - el estado vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`localNoveltyFormSchema`: la anotacion es
 *   obligatoria y la hora tiene el formato `HH:mm`) (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * La novedad es un dato **local** del turno en curso: no hay contraparte en
 * el backend, asi que el schema no se verifica contra el OpenAPI.
 *
 * El payload no cambia: el modal sigue entregando la anotacion y la hora
 * por separado (spec 036 T13).
 */

/** Opciones del hook del formulario de novedad. */
export interface UseNoveltyFormControllerOptions {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** Anotacion inicial (edicion). */
  readonly initialText?: string;
  /** Hora inicial (edicion). */
  readonly initialTime?: string;
  /** Guarda la novedad. */
  readonly onSave: (annotation: string, time: string) => Promise<void> | void;
}

/** Controlador del formulario de novedad (spec 036 T10). */
export const useNoveltyFormController = ({
  isOpen,
  initialText,
  initialTime,
  onSave,
}: UseNoveltyFormControllerOptions) => {
  /** Visibilidad del selector de hora (estado de la pantalla, no del formulario). */
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const form = useAppForm<LocalNoveltyFormValues>({
    schema: localNoveltyFormSchema,
    defaultValues: { annotation: "", time: "" },
    onSubmit: async (values) => {
      await onSave(values.annotation, values.time);
    },
  });

  const { reset, setValue } = form;

  /**
   * Al abrir el modal se cargan los datos de la novedad editada (o la hora
   * actual cuando es una novedad nueva).
   */
  useEffect(() => {
    if (!isOpen) return;
    reset({ annotation: initialText ?? "", time: initialTime || formatTime(new Date()) });
  }, [isOpen, initialText, initialTime, reset]);

  const handleAnnotationChange = useCallback(
    (value: string) => {
      setValue("annotation", value);
    },
    [setValue],
  );

  const handleTimeChange = useCallback(
    (value: string) => {
      setValue("time", value);
    },
    [setValue],
  );

  const openTimePicker = useCallback(() => setIsTimePickerOpen(true), []);
  const closeTimePicker = useCallback(() => setIsTimePickerOpen(false), []);

  return {
    values: form.values,
    getError: form.getError,
    handleAnnotationChange,
    handleTimeChange,
    isTimePickerOpen,
    openTimePicker,
    closeTimePicker,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
