import { useCallback, useEffect, useState } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { localSupplierFormSchema, type LocalSupplierFormValues } from "../../../schemas/forms/note";
import { formatTime } from "../../../utils/formatters";
import type { SupplierEntry } from "../../../types/index";

/**
 * Spec 036 T10 (AC1, AC2, AC3): formulario de **acceso vehicular**
 * (`AddSupplierModal.tsx`).
 *
 * Antes el modal guardaba los seis campos de la entrega en un `useState`, con
 * una mascara de patente escrita a mano y una comprobacion de campos
 * obligatorios repetida en tres sitios (el envio, el `Enter` del textarea y el
 * `disabled` del boton). Ahora:
 *
 * - el estado vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`localSupplierFormSchema`: patente con el
 *   formato de la pantalla, conductor, empresa, motivo y hora `HH:mm`
 *   obligatorios, pasajeros no negativos) (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * El registro del proveedor es un dato **local** del turno en curso: no hay
 * contraparte en el backend, asi que el schema no se verifica contra el
 * OpenAPI.
 *
 * El payload no cambia: el modal sigue entregando los mismos seis campos
 * (spec 036 T13).
 */

/** Opciones del hook del formulario de proveedor. */
export interface UseSupplierFormControllerOptions {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** Registro en edicion (`null` cuando es uno nuevo). */
  readonly initialData?: SupplierEntry | null;
  /** Guarda el registro. */
  readonly onSave: (data: Omit<SupplierEntry, "id" | "timestamp">) => Promise<void> | void;
}

/**
 * Formatea la patente mientras el usuario escribe.
 *
 * Regla de la pantalla (no del backend): solo letras y digitos, hasta 6, en
 * grupos de dos (`AA-BB-11`).
 */
export const formatLicensePlateInput = (input: string): string => {
  const value = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const groups: string[] = [];
  for (let index = 0; index < value.length; index += 2) {
    groups.push(value.slice(index, index + 2));
  }
  return groups.join("-");
};

/** Valores iniciales del formulario a partir del registro en edicion. */
const toFormValues = (initialData: SupplierEntry | null | undefined): LocalSupplierFormValues => ({
  licensePlate: initialData?.licensePlate ?? "",
  driverName: initialData?.driverName ?? "",
  paxCount: initialData?.paxCount ?? 0,
  company: initialData?.company ?? "",
  reason: initialData?.reason ?? "",
  time: initialData?.time ?? "",
});

/** Controlador del formulario de proveedor (spec 036 T10). */
export const useSupplierFormController = ({
  isOpen,
  initialData,
  onSave,
}: UseSupplierFormControllerOptions) => {
  /** Visibilidad del selector de hora (estado de la pantalla, no del formulario). */
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const form = useAppForm<LocalSupplierFormValues>({
    schema: localSupplierFormSchema,
    defaultValues: toFormValues(initialData),
    onSubmit: async (values) => {
      await onSave({
        licensePlate: values.licensePlate,
        driverName: values.driverName,
        paxCount: values.paxCount,
        company: values.company,
        reason: values.reason,
        time: values.time,
      });
    },
  });

  const { reset, setValue } = form;

  /**
   * Al abrir el modal se cargan los datos del registro editado (o la hora
   * actual cuando es uno nuevo).
   */
  useEffect(() => {
    if (!isOpen) return;
    reset({
      ...toFormValues(initialData),
      time: initialData?.time || formatTime(new Date()),
    });
  }, [isOpen, initialData, reset]);

  const handleLicensePlateChange = useCallback(
    (value: string) => {
      setValue("licensePlate", formatLicensePlateInput(value));
    },
    [setValue],
  );

  const handleDriverNameChange = useCallback(
    (value: string) => {
      setValue("driverName", value);
    },
    [setValue],
  );

  const handleCompanyChange = useCallback(
    (value: string) => {
      setValue("company", value);
    },
    [setValue],
  );

  const handleReasonChange = useCallback(
    (value: string) => {
      setValue("reason", value);
    },
    [setValue],
  );

  const handlePaxCountChange = useCallback(
    (value: string) => {
      setValue("paxCount", value === "" ? 0 : Number.parseInt(value, 10));
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
    handleLicensePlateChange,
    handleDriverNameChange,
    handleCompanyChange,
    handleReasonChange,
    handlePaxCountChange,
    handleTimeChange,
    isTimePickerOpen,
    openTimePicker,
    closeTimePicker,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
