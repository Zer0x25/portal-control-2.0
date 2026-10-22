import React from "react";

import ForceChangePasswordModalView from "./ForceChangePasswordModal.view";
import { useForceChangePasswordModalController } from "../hooks/useForceChangePasswordModalController";

/**
 * Spec 036 T11: el container del formulario de cambio de contraseña forzado.
 *
 * Es el unico punto donde vive el estado del formulario: instancia el hook de
 * dominio y se lo pasa a la vista (que es presentacion pura).
 */
export interface ForceChangePasswordModalProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
}

const ForceChangePasswordModalContainer: React.FC<ForceChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const controller = useForceChangePasswordModalController({ isOpen, onClose });

  return (
    <ForceChangePasswordModalView
      isOpen={isOpen}
      values={controller.values}
      getError={controller.getError}
      onPasswordChange={controller.handlePasswordChange}
      onPasswordConfirmChange={controller.handlePasswordConfirmChange}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default ForceChangePasswordModalContainer;
