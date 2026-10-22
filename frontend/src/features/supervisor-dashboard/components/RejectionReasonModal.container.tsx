import React from "react";

import RejectionReasonModalView from "./RejectionReasonModal.view";
import { useRejectionReasonController } from "../hooks/useRejectionReasonController";

/**
 * Spec 036 T10: el container del formulario de motivo de rechazo.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface RejectionReasonModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Confirma el rechazo (recibe el motivo escrito). */
  onConfirm: (reason: string) => void;
  /** Hay un envio en vuelo. */
  isSubmitting?: boolean;
}

const RejectionReasonModalContainer: React.FC<RejectionReasonModalContainerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const controller = useRejectionReasonController({
    isOpen,
    onConfirm,
  });

  return (
    <RejectionReasonModalView
      isOpen={isOpen}
      onClose={onClose}
      values={controller.values}
      getError={controller.getError}
      handleReasonChange={controller.handleReasonChange}
      isSubmitting={isSubmitting || controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default RejectionReasonModalContainer;
