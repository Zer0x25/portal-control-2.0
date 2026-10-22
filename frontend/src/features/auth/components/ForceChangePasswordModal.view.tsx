import React from "react";

import CinematicModal from "../../../components/ui/CinematicModal";
import Button from "../../../components/ui/Button";
import { KeyIcon } from "../../../components/ui/icons/index";
import { PasswordChangeForm } from "../../../components/ui/PasswordChangeForm";
import type { ChangePasswordFormValues } from "../../../schemas/forms/auth";

/**
 * Spec 036 T11: `ForceChangePasswordModal` es **presentacion pura**.
 *
 * Los valores, los errores y el handler de envio entran por props (los lleva
 * el hook de dominio) y la maqueta es la misma.
 */
interface ForceChangePasswordModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
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

const ForceChangePasswordModalView: React.FC<ForceChangePasswordModalViewProps> = ({
  isOpen,
  values,
  getError,
  onPasswordChange,
  onPasswordConfirmChange,
  isSubmitting,
  formProps,
}) => (
  <CinematicModal
    isOpen={isOpen}
    // Modal bloqueante: sin botón de cierre; el Escape no debe descartarlo.
    onClose={() => undefined}
    showCloseButton={false}
    title="Cambio de Contraseña Requerido"
    maxWidth="max-w-md"
  >
    <div className="flex flex-col items-center text-center">
      <div className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
        <KeyIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm text-token-text-secondary">
        Por su seguridad, debe establecer una nueva contraseña personal para continuar.
      </p>
    </div>

    <form {...formProps} className="space-y-4 mt-6">
      <PasswordChangeForm
        newPassword={values.password}
        setNewPassword={onPasswordChange}
        newPasswordError={getError("password")}
        confirmPassword={values.passwordConfirm}
        setConfirmPassword={onPasswordConfirmChange}
        confirmPasswordError={getError("passwordConfirm")}
      />
      <div className="mt-6">
        <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Guardando..." : "Establecer Nueva Contraseña"}
        </Button>
      </div>
    </form>
  </CinematicModal>
);

export default ForceChangePasswordModalView;
