import React from "react";

import SingleMeterInputModalView from "./SingleMeterInputModal.view";
import { useSingleMeterReadingController } from "../hooks/useSingleMeterReadingController";
import type { MeterConfig } from "../../../types/dashboard";

/**
 * Spec 036 T9b: el container del modal de lectura de un medidor.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface SingleMeterInputModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Medidor al que se le carga la lectura (`null` si no hay ninguno). */
  meterConfig: MeterConfig | null;
}

const SingleMeterInputModalContainer: React.FC<SingleMeterInputModalContainerProps> = ({
  isOpen,
  onClose,
  meterConfig,
}) => {
  const controller = useSingleMeterReadingController({
    isOpen,
    meterConfig,
    onSaved: onClose,
  });

  return (
    <SingleMeterInputModalView
      isOpen={isOpen}
      onClose={onClose}
      meterConfig={meterConfig}
      values={controller.values}
      getError={controller.getError}
      handleValueChange={controller.handleValueChange}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default SingleMeterInputModalContainer;
