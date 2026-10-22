import React from "react";

import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { CloseIcon } from "../../../components/ui/icons/index";
import { PasswordChangeForm } from "../../../components/ui/PasswordChangeForm";
import { Z } from "../../../constants/zScale";
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
    <div
      className={`fixed inset-0 ${Z.modal} flex items-center justify-center bg-black/60 p-4`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
    >
      <Card
        title={modalTitle}
        className="w-full max-w-md bg-token-surface-card shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="xs"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-token-text-secondary hover:text-token-text-primary"
          aria-label="Cerrar modal"
        >
          <CloseIcon className="w-5 h-5" />
        </Button>

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
      </Card>
    </div>
  );
};

export default ChangePasswordModalView;
