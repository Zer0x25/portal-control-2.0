import { useEffect } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { mfaLoginFormSchema, type MfaLoginFormValues } from "../../../schemas/forms/auth";

/**
 * Spec 036 T11 (AC1, AC2, AC3): formulario del **codigo MFA de inicio de
 * sesion** (`MFALoginModal.tsx`).
 *
 * Antes el modal guardaba el codigo en un `useState`, lo filtraba a digitos
 * en el `onChange` y, si no tenia 6, mostraba un toast y ademas tenia el
 * boton "Confirmar" deshabilitado. Ahora:
 *
 * - el codigo vive en `useAppForm` (spec 036 AC1);
 * - la regla vive en el schema (`mfaLoginFormSchema`: exactamente 6) y es la
 *   del backend (`MFAValidate`) (spec 036 AC2);
 * - el error sale junto al campo (spec 036 AC3).
 *
 * El boton ya no se deshabilita por longitud incompleta: pulsarlo con un
 * codigo corto ahora explica **que** falta, junto al campo.
 *
 * El payload no cambia (T13): se sigue enviando solo el codigo. El token MFA
 * lo aporta la sesion (`validateMFACode` lo toma del store).
 */

/** Opciones del hook del formulario de codigo MFA. */
export interface UseMfaLoginModalControllerOptions {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** El codigo MFA fue validado (el login continua). */
  readonly onSuccess: () => void;
}

/** Controlador del formulario de codigo MFA (spec 036 T11). */
export const useMfaLoginModalController = ({
  isOpen,
  onSuccess,
}: UseMfaLoginModalControllerOptions) => {
  const { validateMFACode } = useAuth();
  const { addToast } = useToasts();

  const form = useAppForm<MfaLoginFormValues, string>({
    schema: mfaLoginFormSchema,
    defaultValues: { code: "" },
    /** El payload sigue siendo **solo el codigo** (el token lo aporta la sesion). */
    serialize: (values) => values.code,
    onSubmit: async (code) => {
      try {
        await validateMFACode(code);
        addToast("Verificación exitosa", "success");
        onSuccess();
      } catch (error) {
        addToast(error instanceof Error ? error.message : "Código inválido", "error");
      }
    },
  });

  const { reset, setValue } = form;

  /** Al entrar el codigo arranca vacio. */
  useEffect(() => {
    if (!isOpen) return;
    reset({ code: "" });
  }, [isOpen, reset]);

  /** Escribe el codigo: solo digitos, como maximo 6. */
  const handleCodeChange = (raw: string) => {
    setValue("code", raw.replace(/\D/g, "").slice(0, 6));
  };

  return {
    values: form.values,
    getError: form.getError,
    handleCodeChange,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
