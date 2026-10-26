import React from "react";
import { RenderProfiler } from "../../../utils/RenderProfiler";
import TimeControlView from "../views/TimeControl.view";
import { useTimeControlData } from "../hooks/useTimeControlData";

/**
 * TimeControlContainer - Contenedor de la página de Control de Tiempos
 *
 * Implementación siguiendo el "Golden Path":
 * - Container: Orquesta el hook de datos y delega el renderizado a la View.
 * - Hook: Centraliza toda la lógica de negocio y estado.
 * - View: Renderizado puro de UI (UI-PROTECTED).
 */
interface TimeControlContainerProps {
  isControlInternoEnabled: boolean;
  isConfigLoading: boolean;
}

const TimeControlContainer: React.FC<TimeControlContainerProps> = ({
  isControlInternoEnabled,
  isConfigLoading,
}) => {
  const logic = useTimeControlData({ isControlInternoEnabled, isConfigLoading });

  return (
    <RenderProfiler id="time-control:view">
      <TimeControlView {...logic} />
    </RenderProfiler>
  );
};

export default TimeControlContainer;
