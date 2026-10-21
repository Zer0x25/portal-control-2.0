import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import Button from "../../../components/ui/Button";
import { KeyIcon } from "../../../components/ui/icons/index";
import { PasswordChangeForm } from "../../../components/ui/PasswordChangeForm";

interface ForceChangePasswordModalViewProps {
  isOpen: boolean;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  onSetNewPassword: (value: string) => void;
  onSetConfirmPassword: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
}

const ForceChangePasswordModalView: React.FC<ForceChangePasswordModalViewProps> = ({
  isOpen,
  newPassword,
  confirmPassword,
  isLoading,
  onSetNewPassword,
  onSetConfirmPassword,
  onSave,
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

    <form onSubmit={onSave} className="space-y-4 mt-6">
      <PasswordChangeForm
        newPassword={newPassword}
        setNewPassword={onSetNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={onSetConfirmPassword}
      />
      <div className="mt-6">
        <Button type="submit" variant="primary" disabled={isLoading} className="w-full">
          {isLoading ? "Guardando..." : "Establecer Nueva Contraseña"}
        </Button>
      </div>
    </form>
  </CinematicModal>
);

export default ForceChangePasswordModalView;
