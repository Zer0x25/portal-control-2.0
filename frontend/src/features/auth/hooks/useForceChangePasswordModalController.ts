import { useCallback, useEffect } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useToasts } from "../../../hooks/useToasts";
import { useUsers } from "../../../hooks/useUsers";
import {
  forceChangePasswordFormSchema,
  type ChangePasswordFormValues,
} from "../../../schemas/forms/auth";

/**
 * Spec 036 T11 (AC1, AC2, AC3): formulario de **cambio de contraseña
 * forzado** (`ForceChangePasswordModal.tsx`).
 *
 * Antes el modal guardaba las dos contraseñas en `useState` y, si no
 * coincidian o faltaban caracteres, lanzaba un toast lejos del campo. Ahora:
 *
 * - las contraseñas viven en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`forceChangePasswordFormSchema`: las dos
 *   contraseñas con 6+ caracteres y que coincidan) (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * El modal es **bloqueante** (sin boton de cierre, sin Escape): solo se
 * cierra cuando el usuario guarda, asi que `onClose` no se expone en la
 * vista.
 *
 * El payload no cambia (T13): sigue viajando solo `{ password }`.
 * `passwordConfirm` es un campo exclusivamente de cliente.
 */

interface UseForceChangePasswordModalControllerParams {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** Cierra el modal (en la app es `closeForcePasswordChangeModal`). */
  readonly onClose: () => void;
}

/** Controlador del formulario de cambio de contraseña forzado (spec 036 T11). */
export const useForceChangePasswordModalController = ({
  isOpen,
  onClose,
}: UseForceChangePasswordModalControllerParams) => {
  const { changeOwnPassword } = useUsers();
  const { addToast } = useToasts();

  const form = useAppForm<ChangePasswordFormValues, { password: string }>({
    schema: forceChangePasswordFormSchema,
    defaultValues: { password: "", passwordConfirm: "" },
    /**
     * La contraseña **no** se recorta: viaja byte a byte como se escribio.
     * Recortarla cambiaria la credencial en silencio (un espacio final
     * pegado formaria parte de la contraseña original).
     */
    normalize: (values) => values,
    /** `passwordConfirm` es solo de cliente y no viaja al backend. */
    serialize: (values) => ({ password: values.password }),
    onSubmit: async (payload) => {
      const success = await changeOwnPassword({ newPassword: payload.password });
      if (success) {
        addToast("Contraseña actualizada con éxito.", "success");
        // El modal es bloqueante: sin boton de cierre ni Escape. Solo se
        // cierra cuando el usuario guarda.
        onClose();
      }
    },
  });

  const { reset, setValue } = form;

  /** Al abrir el modal las dos contraseñas empiezan vacias. */
  useEffect(() => {
    if (isOpen) reset({ password: "", passwordConfirm: "" });
  }, [isOpen, reset]);

  /** Escribe la contraseña nueva. */
  const handlePasswordChange = useCallback(
    (value: string) => {
      setValue("password", value);
    },
    [setValue],
  );

  /** Escribe la confirmación. */
  const handlePasswordConfirmChange = useCallback(
    (value: string) => {
      setValue("passwordConfirm", value);
    },
    [setValue],
  );

  return {
    values: form.values,
    getError: form.getError,
    handlePasswordChange,
    handlePasswordConfirmChange,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
