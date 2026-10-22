import React from "react";

import SeedingOptionsModalView from "./SeedingOptionsModal.view";
import { useSeedingOptionsController } from "../hooks/useSeedingOptionsController";
import type { SeedingOptions } from "../../../schemas/forms/seed";

/**
 * Spec 036 T10b: el container del formulario de simulacion.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface SeedingOptionsModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Confirma las opciones (recibe los valores ya validados). */
  onConfirm: (options: SeedingOptions) => void;
}

const SeedingOptionsModalContainer: React.FC<SeedingOptionsModalContainerProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const controller = useSeedingOptionsController({
    onClose,
    onConfirm,
  });

  return (
    <SeedingOptionsModalView
      isOpen={isOpen}
      onClose={onClose}
      values={controller.values}
      getError={controller.getError}
      handleNumberChange={controller.handleNumberChange}
      applyQuickSeedPreset={controller.applyQuickSeedPreset}
      applyIncrementalPreset={controller.applyIncrementalPreset}
      incrementalLevel={controller.incrementalLevel}
      maxIncrementalLevel={controller.maxIncrementalLevel}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default SeedingOptionsModalContainer;
