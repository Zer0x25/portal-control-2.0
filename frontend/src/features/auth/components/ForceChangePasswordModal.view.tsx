import React from "react";
import Card from "../../../components/ui/Card";
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
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-101 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-change-password-modal-title"
    >
      <Card
        className="w-full max-w-md bg-white dark:bg-sap-dark-gray shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
              <KeyIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <h3
              id="force-change-password-modal-title"
              className="mt-3 text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
            >
              Cambio de Contraseña Requerido
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
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
        </div>
      </Card>
    </div>
  );
};

export default ForceChangePasswordModalView;
