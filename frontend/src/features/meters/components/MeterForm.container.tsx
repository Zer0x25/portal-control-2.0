import React from "react";

import MeterFormView from "./MeterForm.view";
import { useMeterReadingsFormController } from "../hooks/useMeterReadingsFormController";

/**
 * Spec 036 T9b: el container del formulario de lecturas de la pagina.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface MeterFormContainerProps {
  /** Callback cuando las lecturas se guardaron. */
  onSaveSuccess?: () => void;
}

const MeterFormContainer: React.FC<MeterFormContainerProps> = ({ onSaveSuccess }) => {
  const controller = useMeterReadingsFormController({ onSaved: onSaveSuccess });

  return (
    <MeterFormView
      values={controller.values}
      getError={controller.getError}
      setValue={controller.setValue}
      meterConfigs={controller.meterConfigs}
      lastReadingById={controller.lastReadingById}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default MeterFormContainer;
