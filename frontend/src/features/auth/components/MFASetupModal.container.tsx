import React from "react";

import MfaSetupModalView from "./MFASetupModal.view";
import { useMfaSetupModalController } from "../hooks/useMfaSetupModalController";

/**
 * Spec 036 T11: el container del formulario de alta de MFA.
 *
 * Es el unico punto donde vive el estado del formulario: instancia el hook de
 * dominio y se lo pasa a la vista (que es presentacion pura). El patron es el
 * de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface MfaSetupModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** El alta se verifico correctamente. */
  onSuccess: () => void;
  /** Cierra el modal. */
  onClose: () => void;
}

const MfaSetupModalContainer: React.FC<MfaSetupModalContainerProps> = ({
  isOpen,
  onSuccess,
  onClose,
}) => {
  const controller = useMfaSetupModalController({ isOpen, onSuccess, onClose });

  return (
    <MfaSetupModalView
      isOpen={isOpen}
      onClose={onClose}
      step={controller.step}
      mfaData={controller.mfaData}
      token={controller.values.token}
      error={controller.getError("token")}
      onTokenChange={controller.handleTokenChange}
      onStartSetup={() => void controller.handleStartSetup()}
      onGoToScanning={controller.goToScanning}
      onGoToVerifying={controller.goToVerifying}
      isStarting={controller.isStarting}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default MfaSetupModalContainer;
