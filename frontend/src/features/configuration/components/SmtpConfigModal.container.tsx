import React from "react";

import SmtpConfigModalView from "./SmtpConfigModal.view";
import { useSmtpConfigController } from "../hooks/useSmtpConfigController";

/**
 * Spec 036 T10c: el container del formulario de perfiles SMTP.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface SmtpConfigModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
}

const SmtpConfigModalContainer: React.FC<SmtpConfigModalContainerProps> = ({ isOpen, onClose }) => {
  const controller = useSmtpConfigController({ isOpen, onClose });

  return (
    <SmtpConfigModalView
      isOpen={isOpen}
      onClose={onClose}
      values={controller.values}
      getError={controller.getError}
      handleFieldChange={controller.handleFieldChange}
      applyPreset={controller.applyPreset}
      handleTestConnection={controller.handleTestConnection}
      handleSetActive={controller.handleSetActive}
      selectSlot={controller.selectSlot}
      currentSlot={controller.currentSlot}
      activeProfileIndex={controller.activeProfileIndex}
      isLoading={controller.isLoading}
      isVerifying={controller.isVerifying}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default SmtpConfigModalContainer;
