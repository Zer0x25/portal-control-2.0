import { useEffect } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { useUsers } from "../../../hooks/useUsers";
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from "../../../schemas/forms/auth";

/**
 * Spec 036 T11 (AC1, AC2, AC3): formulario de **cambio de contraseña**
 * (`ChangePasswordModal.tsx`).
 *
 * Antes el modal guardaba las dos contraseñas en `useState` y, si no
 * coincidian o faltaban caracteres, lanzaba un toast: el usuario pulsaba
 * "Guardar Cambios" y el aviso aparecia lejos del campo. Ahora:
 *
 * - las contraseñas viven en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`changePasswordFormSchema`: las dos
 *   contraseñas con 6+ caracteres y que coincidan) (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * Las reglas de negocio que **no** son de campo (el usuario identificado y el
 * bloqueo de la cuenta `admin` por defecto) siguen siendo avisos del hook.
 *
 * El payload no cambia (T13): sigue viajando solo `{ password }`.
 * `passwordConfirm` es un campo exclusivamente de cliente.
 */

interface UseChangePasswordModalControllerParams {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** Cierra el modal. */
  readonly onClose: () => void;
  /** Usuario cuya contraseña se cambia (ausente = el propio usuario). */
  readonly userIdToUpdate?: string;
}

/** Controlador del formulario de cambio de contraseña (spec 036 T11). */
export const useChangePasswordModalController = ({
  isOpen,
  onClose,
  userIdToUpdate,
}: UseChangePasswordModalControllerParams) => {
  const { currentUser } = useAuth();
  const { getUserById, updateUser, changeOwnPassword } = useUsers();
  const { addToast } = useToasts();

  const targetUser = (() => {
    const targetId = userIdToUpdate || currentUser?.id;
    return targetId ? getUserById(targetId) : null;
  })();

  const isSelfChange = !userIdToUpdate;

  const form = useAppForm<ChangePasswordFormValues, { password: string }>({
    schema: changePasswordFormSchema,
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
      if (!targetUser || !currentUser) {
        addToast("No se pudo identificar al usuario para actualizar.", "error");
        return;
      }

      if (targetUser.id === "admin-001" && targetUser.username === "admin") {
        addToast(
          "La contraseña del administrador por defecto (admin) no puede ser cambiada.",
          "error",
          7000,
        );
        return;
      }

      const success = isSelfChange
        ? await changeOwnPassword({ newPassword: payload.password })
        : await updateUser(targetUser.id, { password: payload.password });

      if (success) {
        addToast(`Contraseña para '${targetUser.username}' actualizada con éxito.`, "success");
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
  const handlePasswordChange = (value: string) => {
    setValue("password", value);
  };

  /** Escribe la confirmación. */
  const handlePasswordConfirmChange = (value: string) => {
    setValue("passwordConfirm", value);
  };

  // Escape cierra el modal. El listener es un efecto del DOM: vive en el
  // controller, no en la vista (spec 033 AC1: sin hooks en *.view.tsx).
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const modalTitle = isSelfChange
    ? "Cambiar Mi Contraseña"
    : `Cambiar Contraseña para ${targetUser?.username}`;

  return {
    values: form.values,
    getError: form.getError,
    handlePasswordChange,
    handlePasswordConfirmChange,
    modalTitle,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
