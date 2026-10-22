import React from "react";

import MfaLoginModalView from "./MFALoginModal.view";
import { useMfaLoginModalController } from "../hooks/useMfaLoginModalController";

/**
 * Spec 036 T11: el container del formulario de codigo MFA de inicio de sesion.
 *
 * Es el unico punto donde vive el estado del formulario: instancia el hook de
 * dominio y se lo pasa a la vista (que es presentacion pura). El patron es el
 * de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface MfaLoginModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** El codigo fue validado. */
  onSuccess: () => void;
  /** Cancela la verificacion. */
  onCancel: () => void;
}

const MfaLoginModalContainer: React.FC<MfaLoginModalContainerProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const controller = useMfaLoginModalController({ isOpen, onSuccess });

  return (
    <MfaLoginModalView
      isOpen={isOpen}
      onCancel={onCancel}
      code={controller.values.code}
      error={controller.getError("code")}
      onCodeChange={controller.handleCodeChange}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default MfaLoginModalContainer;
