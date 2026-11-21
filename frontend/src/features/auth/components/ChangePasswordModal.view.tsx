import React from "react";

import CinematicModal from "../../../components/ui/CinematicModal";
import Button from "../../../components/ui/Button";
import { PasswordChangeForm } from "../../../components/ui/PasswordChangeForm";
import type { ChangePasswordFormValues } from "../../../schemas/forms/auth";

/**
 * Spec 036 T11: `ChangePasswordModal` es **presentacion pura**.
 *
 * Los valores, los errores y el handler de envio entran por props (los lleva
 * el hook de dominio) y la maqueta es la misma.
 */
interface ChangePasswordModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Titulo del modal. */
  modalTitle: string;
  /** Valores del formulario. */
  values: ChangePasswordFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe la contraseña nueva. */
  onPasswordChange: (value: string) => void;
  /** Escribe la confirmación. */
  onPasswordConfirmChange: (value: string) => void;
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
}

const ChangePasswordModalView: React.FC<ChangePasswordModalViewProps> = ({
  isOpen,
  onClose,
  modalTitle,
  values,
  getError,
  onPasswordChange,
  onPasswordConfirmChange,
  isSubmitting,
  formProps,
}) => {
  if (!isOpen) return null;

  return (
    <CinematicModal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-md">
      <form {...formProps} className="space-y-4">
        <PasswordChangeForm
          newPassword={values.password}
          setNewPassword={onPasswordChange}
          newPasswordError={getError("password")}
          confirmPassword={values.passwordConfirm}
          setConfirmPassword={onPasswordConfirmChange}
          confirmPasswordError={getError("passwordConfirm")}
        />

        <div className="mt-6 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </CinematicModal>
  );
};

export default ChangePasswordModalView;
