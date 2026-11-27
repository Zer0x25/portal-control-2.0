import React from "react";
import { SeedingOptions } from "../../../schemas/forms/seed";
import type { SeedPhase2Job } from "../../../services/seedingService";
import { useSeedingProgressController } from "../hooks/useSeedingProgressController";
import SeedingProgressModalView from "./SeedingProgressModal.view";

/**
 * Container del modal de progreso del seeding (spec 036 T10b, extension al
 * modal de progreso): unico punto donde vive el estado, instanciado via
 * `useSeedingProgressController`. La orquestacion de fases (stream fase 1,
 * job fase 2, polling y sockets) vive en `useDeveloperPanelController`.
 */
export interface SeedingProgressModalContainerProps {
  /** Visibilidad del modal. */
  isOpen: boolean;
  /** Cierre del modal. */
  onClose: () => void;
  /** Lineas de progreso de fase 1. */
  progressSteps: string[];
  /** Bandera de finalizacion de fase 1. */
  isFinished: boolean;
  /** Error de fase 1, si lo hubo. */
  error: string | null;
  /** Opciones con las que corrio la fase 1. */
  seedingOptions: SeedingOptions | null;
  /** Job persistente de fase 2, si existe. */
  job?: SeedPhase2Job | null;
  /** Logs del job de fase 2. */
  jobLogs?: string[];
  /** Error del poll de estado (backend caido); feedback en la vista. */
  pollError?: string | null;
  /** Inicia la fase 2. */
  onStartPhase2?: () => void;
  /** Pausa el job de fase 2. */
  onPausePhase2?: () => void;
  /** Reanuda el job pausado. */
  onResumePhase2?: () => void;
  /** Detiene el job de fase 2. */
  onStopPhase2?: () => void;
}

const SeedingProgressModalContainer: React.FC<SeedingProgressModalContainerProps> = ({
  isOpen,
  onClose,
  progressSteps,
  isFinished,
  error,
  seedingOptions,
  job,
  jobLogs = [],
  pollError = null,
  onStartPhase2,
  onPausePhase2,
  onResumePhase2,
  onStopPhase2,
}) => {
  const controller = useSeedingProgressController({
    isOpen,
    isFinished,
    error,
    job,
    jobLogs,
    progressSteps,
  });

  return (
    <SeedingProgressModalView
      isOpen={isOpen}
      onClose={onClose}
      progressSteps={progressSteps}
      isFinished={isFinished}
      seedingOptions={seedingOptions}
      job={job}
      pollError={pollError}
      onStartPhase2={onStartPhase2}
      onPausePhase2={onPausePhase2}
      onResumePhase2={onResumePhase2}
      onStopPhase2={onStopPhase2}
      controller={controller}
    />
  );
};

export default SeedingProgressModalContainer;
