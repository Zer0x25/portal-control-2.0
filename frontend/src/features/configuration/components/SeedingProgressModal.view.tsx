import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import Button from "../../../components/ui/Button";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "../../../components/ui/icons/index";
import { SeedingOptions } from "../../../schemas/forms/seed";
import type { SeedingProgressController } from "../hooks/useSeedingProgressController";

export interface SeedingProgressModalViewProps {
  /** Visibilidad del modal. */
  isOpen: boolean;
  /** Cierre del modal ( footer / X ). */
  onClose: () => void;
  /** Lineas de progreso de fase 1 (stream NDJSON). */
  progressSteps: string[];
  /** Bandera de finalizacion de fase 1. */
  isFinished: boolean;
  /** Opciones con las que corrio la fase 1 (resumen superior). */
  seedingOptions: SeedingOptions | null;
  /** Job persistente de fase 2 (via controller; tipado completo en el servicio). */
  job?: import("../../../services/seedingService").SeedPhase2Job | null;
  /** Error del poll de estado (backend caido); banner de conexion en la vista. */
  pollError?: string | null;
  /** Inicia la fase 2 ( boton del estado intermedio ). */
  onStartPhase2?: () => void;
  /** Pausa el job de fase 2. */
  onPausePhase2?: () => void;
  /** Reanuda el job pausado. */
  onResumePhase2?: () => void;
  /** Detiene el job de fase 2. */
  onStopPhase2?: () => void;
  /** Estado y acciones extraidos del monolito (cronometro, derived, reload). */
  controller: SeedingProgressController;
}

/**
 * Vista pura del modal de progreso del seeding: render sin estado propio.
 * Toda la logica vive en `useSeedingProgressController` y la orquestacion
 * de fases en `useDeveloperPanelController`.
 */
const SeedingProgressModalView: React.FC<SeedingProgressModalViewProps> = ({
  isOpen,
  onClose,
  progressSteps: _progressSteps,
  isFinished: _isFinished,
  seedingOptions,
  job,
  pollError,
  onStartPhase2,
  onPausePhase2,
  onResumePhase2,
  onStopPhase2,
  controller,
}) => {
  const {
    logEndRef,
    isPhase2Active,
    effectiveIsFinished,
    effectiveError,
    isPhase1DonePhase2Pending,
    healthData,
    displayedLogs,
    elapsedLabel,
    currentPercent,
    handleReload,
  } = controller;

  if (!isOpen) return null;

  const renderOptionsSummary = () => {
    // Fase 2: el job solo persiste los cuatro numeros de su contrato
    // (days/leaveRatio/correctionRequestRatio/batchSize). El resumen de
    // fase 1 usa las siete opciones completas del formulario.
    if (isPhase2Active) {
      const config = job?.config;
      if (!config) return null;
      return (
        <div className="grid grid-cols-2 text-xs text-token-text-secondary gap-x-4 gap-y-1 mb-3">
          <span>
            Días: <strong>{config.days}</strong>
          </span>
          <span className="col-span-2 text-token-accent-brand">
            FASE 2: Generación de Marcaciones
          </span>
          <div className="col-span-2 flex items-center text-token-accent-brand font-mono mt-1">
            <span className="mr-1">Tiempo Transcurrido:</span>
            <strong className="text-sm">{elapsedLabel}</strong>
          </div>
        </div>
      );
    }
    const opts = seedingOptions;
    if (!opts) return null;
    return (
      <div className="grid grid-cols-2 text-xs text-token-text-secondary gap-x-4 gap-y-1 mb-3">
        <span>
          Empleados: <strong>{opts.employees ?? "-"}</strong>
        </span>
        <span>
          Días: <strong>{opts.days}</strong>
        </span>
        <span>
          Patrones: <strong>{opts.basePatternsCount}</strong>
        </span>
        <span>
          Reportes: <strong>{opts.shiftReportsPerDay}</strong>
        </span>
        <div className="col-span-2 flex items-center text-token-accent-brand font-mono mt-1">
          <span className="mr-1">Tiempo Transcurrido:</span>
          <strong className="text-sm">{elapsedLabel}</strong>
        </div>
      </div>
    );
  };

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      title={
        isPhase2Active ? "Progreso Fase 2: Marcaciones" : "Simulación: Fase 1 (Sincronización)"
      }
      bodyClassName="p-0 overflow-y-auto custom-scrollbar max-h-[85vh]"
    >
      <div className="p-6">
        {pollError && !effectiveError && (
          <div
            role="alert"
            className="mb-3 p-2 rounded-md bg-token-status-warning/10 border border-token-status-warning/30 text-token-status-warning text-[10px] font-bold"
          >
            Sin conexión con el servidor: {pollError}. Reintentando...
          </div>
        )}
        {renderOptionsSummary()}

        {isPhase2Active && job?.progress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span>
                Día {job.progress.currentDay} de {job.progress.totalDays}
              </span>
              <span>{currentPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Progreso de la fase 2"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={currentPercent}
              className="w-full bg-token-surface-technical h-2 rounded-full overflow-hidden"
            >
              <div
                className="bg-token-accent-brand h-full"
                style={{ width: `${currentPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-center">
              <div className="bg-token-surface-technical p-1 rounded">
                <div className="text-token-text-secondary">CREADOS</div>
                <div className="font-bold">{job.progress.processedRecords}</div>
              </div>
              <div className="bg-token-surface-technical p-1 rounded">
                <div className="text-token-text-secondary">SELLADOS</div>
                <div className="font-bold">{job.progress.sealedRecords}</div>
              </div>
              <div className="bg-token-surface-technical p-1 rounded">
                <div className="text-token-text-secondary">ERRORES</div>
                <div className="font-bold text-token-status-error">{job.progress.errors}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-3 text-[10px]">
          <div className="bg-token-surface-technical rounded p-1.5 text-center">
            <div className="text-token-text-secondary">DB MS</div>
            <div className="font-mono text-token-text-primary leading-tight">
              {healthData?.database.latency ?? "-"}
            </div>
          </div>
          <div className="bg-token-surface-technical rounded p-1.5 text-center">
            <div className="text-token-text-secondary">API MS</div>
            <div className="font-mono text-token-text-primary leading-tight">
              {healthData?.responseTime ?? "-"}
            </div>
          </div>
          <div className="bg-token-surface-technical rounded p-1.5 text-center">
            <div className="text-token-text-secondary">HEAP</div>
            <div className="font-mono text-token-text-primary leading-tight">
              {healthData?.system.memory.heapUsed ?? "-"}
            </div>
          </div>
          <div className="bg-token-surface-technical rounded p-1.5 text-center">
            <div className="text-token-text-secondary">RSS</div>
            <div className="font-mono text-token-text-primary leading-tight">
              {healthData?.system.memory.rss ?? "-"}
            </div>
          </div>
        </div>

        <div
          aria-live="polite"
          aria-label="Registro de progreso del seeding"
          className="bg-token-surface-technical p-3 rounded-md max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 border border-token-border-subtle"
        >
          {displayedLogs.map((step, index) => (
            <div key={index} className="flex items-start">
              <span className="text-token-text-tertiary mr-2 shrink-0">
                {String(index + 1).padStart(3, "0")}:
              </span>
              <span className="flex-1 opacity-90">{step}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        <div className="mt-4 text-center min-h-[60px] flex items-center justify-center">
          {isPhase1DonePhase2Pending ? (
            <div className="flex flex-col items-center">
              <CheckCircleIcon className="w-8 h-8 mb-1 text-token-status-success" />
              <span className="text-sm font-bold text-token-status-success">Fase 1 Completada</span>
              <p className="text-[10px] mt-1 text-token-text-secondary">
                ¿Deseas iniciar la generación de marcaciones históricas?
              </p>
            </div>
          ) : !effectiveIsFinished && job?.status === "pending" ? (
            <div className="flex items-center justify-center text-token-status-info text-sm italic">
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              <span>Fase 2 en cola, esperando al worker...</span>
            </div>
          ) : !effectiveIsFinished && job?.status !== "paused" ? (
            <div className="flex items-center justify-center text-token-status-warning text-sm italic">
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              <span>
                {isPhase2Active
                  ? "Generando registros históricos..."
                  : "Sincronizando entidades base..."}
              </span>
            </div>
          ) : job?.status === "paused" ? (
            <div className="text-token-status-warning text-sm font-bold">PROCESO PAUSADO</div>
          ) : effectiveError ? (
            <div className="flex flex-col items-center justify-center text-token-status-error">
              <ExclamationTriangleIcon className="w-8 h-8 mb-1" />
              <span className="text-sm font-bold">Error Detectado</span>
              <p className="text-[10px] mt-1 text-token-text-secondary max-w-xs">
                {effectiveError}
              </p>
            </div>
          ) : effectiveIsFinished ? (
            <div className="flex flex-col items-center justify-center text-token-status-success">
              <CheckCircleIcon className="w-8 h-8 mb-1" />
              <span className="text-sm font-bold">Simulación Completada</span>
              <p className="text-[10px] mt-1 text-token-text-secondary">
                Todos los datos fueron generados correctamente.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4 border-t border-token-border-subtle flex justify-end gap-2 bg-token-surface-stripe">
        {isPhase2Active && job && job.status !== "pending" && (
          <>
            {job.status === "running" && (
              <Button onClick={onPausePhase2} variant="secondary" size="sm">
                Pausar
              </Button>
            )}
            {job.status === "paused" && (
              <Button onClick={onResumePhase2} variant="primary" size="sm">
                Reanudar
              </Button>
            )}
            {(job.status === "running" || job.status === "paused") && (
              <Button onClick={onStopPhase2} variant="danger" size="sm">
                Detener
              </Button>
            )}
          </>
        )}

        {isPhase1DonePhase2Pending && !effectiveError && (
          <Button onClick={onStartPhase2} variant="primary" size="sm" className="px-6">
            Iniciar Fase 2
          </Button>
        )}

        {effectiveIsFinished && !effectiveError ? (
          <Button onClick={handleReload} variant="secondary" size="sm">
            Finalizar y Salir
          </Button>
        ) : (
          <Button type="button" onClick={onClose} variant="secondary" size="sm">
            Cerrar
          </Button>
        )}
      </div>
    </CinematicModal>
  );
};

export default SeedingProgressModalView;
