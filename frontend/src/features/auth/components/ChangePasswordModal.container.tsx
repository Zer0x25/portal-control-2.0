import React from "react";

import ChangePasswordModalView from "./ChangePasswordModal.view";
import { useChangePasswordModalController } from "../hooks/useChangePasswordModalController";

/**
 * Spec 036 T11: el container del formulario de cambio de contraseña.
 *
 * Es el unico punto donde vive el estado del formulario: instancia el hook de
 * dominio y se lo pasa a la vista (que es presentacion pura).
 */
export interface ChangePasswordModalProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Usuario cuya contraseña se cambia (ausente = el propio usuario). */
  userIdToUpdate?: string;
}

const ChangePasswordModalContainer: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userIdToUpdate,
}) => {
  const controller = useChangePasswordModalController({
    isOpen,
    onClose,
    userIdToUpdate,
  });

  return (
    <ChangePasswordModalView
      isOpen={isOpen}
      onClose={onClose}
      modalTitle={controller.modalTitle}
      values={controller.values}
      getError={controller.getError}
      onPasswordChange={controller.handlePasswordChange}
      onPasswordConfirmChange={controller.handlePasswordConfirmChange}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default ChangePasswordModalContainer;
