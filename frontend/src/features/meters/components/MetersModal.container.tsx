import React from "react";

import MetersModalView from "./MetersModal.view";
import { useMeterReadingsFormController } from "../hooks/useMeterReadingsFormController";

/**
 * Spec 036 T9b: el container del modal de lecturas.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface MetersModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
}

const MetersModalContainer: React.FC<MetersModalContainerProps> = ({ isOpen, onClose }) => {
  const controller = useMeterReadingsFormController({ isActive: isOpen, onSaved: onClose });

  return (
    <MetersModalView
      isOpen={isOpen}
      onClose={onClose}
      values={controller.values}
      getError={controller.getError}
      setValue={controller.setValue}
      meterConfigs={controller.meterConfigs}
      readings={controller.readings}
      isSubmitting={controller.isSubmitting}
      isLoading={controller.isLoadingReadings}
      formProps={controller.formProps}
    />
  );
};

export default MetersModalContainer;
