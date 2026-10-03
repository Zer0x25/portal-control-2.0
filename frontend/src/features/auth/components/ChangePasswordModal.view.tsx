import React from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { CloseIcon } from "../../../components/ui/icons/index";
import { PasswordChangeForm } from "../../../components/ui/PasswordChangeForm";

interface ChangePasswordModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  modalTitle: string;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  onSetNewPassword: (value: string) => void;
  onSetConfirmPassword: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
}

const ChangePasswordModalView: React.FC<ChangePasswordModalViewProps> = ({
  isOpen,
  onClose,
  modalTitle,
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
      className="fixed inset-0 z-100 flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
    >
      <Card
        title={modalTitle}
        className="w-full max-w-md bg-white dark:bg-sap-dark-gray shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Cerrar modal"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <form onSubmit={onSave} className="space-y-4">
          <PasswordChangeForm
            newPassword={newPassword}
            setNewPassword={onSetNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={onSetConfirmPassword}
          />

          <div className="mt-6 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChangePasswordModalView;
