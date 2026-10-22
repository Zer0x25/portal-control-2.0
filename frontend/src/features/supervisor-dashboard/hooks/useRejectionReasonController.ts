import { useCallback, useEffect } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import {
  rejectionReasonFormSchema,
  type RejectionReasonFormValues,
} from "../../../schemas/forms/correction";

/**
 * Spec 036 T10 (AC1, AC2, AC3): formulario de **motivo de rechazo**
 * (`RejectionReasonModal.tsx`).
 *
 * Antes el modal guardaba el motivo en un `useState` y, si venia vacio, no
 * hacia nada: el usuario pulsaba "Confirmar Rechazo" y no sabia por que no
 * pasaba nada. Ahora:
 *
 * - el estado del campo vive en `useAppForm` (spec 036 AC1);
 * - la regla vive en el schema (`rejectionReasonFormSchema`: el motivo es
 *   obligatorio, que es lo que el backend exige cuando el estado es
 *   `rejected`) (spec 036 AC2);
 * - el error sale junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * El payload no cambia: el modal sigue entregando **solo el motivo** (el
 * estado y el supervisor que resuelve los pone la pantalla que lo abre).
 */

/** Opciones del hook del formulario de motivo de rechazo. */
export interface UseRejectionReasonControllerOptions {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** Confirma el rechazo (recibe el motivo escrito). */
  readonly onConfirm: (reason: string) => void;
}

/** Controlador del formulario de motivo de rechazo (spec 036 T10). */
export const useRejectionReasonController = ({
  isOpen,
  onConfirm,
}: UseRejectionReasonControllerOptions) => {
  const form = useAppForm<RejectionReasonFormValues>({
    schema: rejectionReasonFormSchema,
    defaultValues: { rejectionReason: "" },
    onSubmit: async (values) => {
      onConfirm(values.rejectionReason);
    },
  });

  const { reset, setValue } = form;

  /** Al abrir el modal el motivo empieza vacio. */
  useEffect(() => {
    if (!isOpen) return;
    reset({ rejectionReason: "" });
  }, [isOpen, reset]);

  const handleReasonChange = useCallback(
    (value: string) => {
      setValue("rejectionReason", value);
    },
    [setValue],
  );

  return {
    values: form.values,
    getError: form.getError,
    handleReasonChange,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
