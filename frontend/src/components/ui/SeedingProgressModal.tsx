import React from "react";
import Button from "./Button";
import { CloseIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from "./icons/index";
import { SeedingOptions } from "./SeedingOptionsModal";
import { getDBInstance } from "../../utils/indexedDB";
import { healthService, HealthData } from "../../services/healthService";

interface SeedingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressSteps: string[];
  isFinished: boolean;
  error: string | null;
  seedingOptions: SeedingOptions | null;
  job?: import("../../services/seedingService").SeedPhase2Job | null;
  jobLogs?: string[];
  onStartPhase2?: () => void;
  onPausePhase2?: () => void;
  onResumePhase2?: () => void;
  onStopPhase2?: () => void;
}

const SeedingProgressModal: React.FC<SeedingProgressModalProps> = ({
  isOpen,
  onClose,
  progressSteps,
  isFinished,
  error,
  seedingOptions,
  job,
  jobLogs = [],
  onStartPhase2,
  onPausePhase2,
  onResumePhase2,
  onStopPhase2,
}) => {
  const [seconds, setSeconds] = React.useState(0);
  const [healthData, setHealthData] = React.useState<HealthData | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const logContainerRef = React.useRef<HTMLDivElement | null>(null);
  const logEndRef = React.useRef<HTMLDivElement | null>(null);

  // Phase 2 is only "active" when the job is actually running or in a terminal state.
  // A stopped/pending job means Phase 1 finished but Phase 2 hasn't started yet.
  const isPhase2Active = !!job && job.status !== "stopped" && job.status !== "pending";

  const effectiveIsFinished = isPhase2Active
    ? job?.status === "completed" || job?.status === "failed"
    : isFinished;
  const effectiveError = isPhase2Active ? job?.errorSummary || null : error;

  // Phase 1 done and Phase 2 waiting to be started
  const isPhase1DonePhase2Pending = isFinished && !isPhase2Active;

  React.useEffect(() => {
    if (isOpen) {
      setSeconds(0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && !effectiveIsFinished) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, effectiveIsFinished]);

  React.useEffect(() => {
    if (!isOpen || effectiveIsFinished) return;
    let cancelled = false;
    const loadHealth = async () => {
      try {
        const data = await healthService.getHealth();
        if (!cancelled) setHealthData(data);
      } catch {
        // Keep seeding UI running even if health probe fails intermittently
      }
    };
    void loadHealth();
    const interval = setInterval(loadHealth, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, effectiveIsFinished]);

  React.useEffect(() => {
    if (!isOpen) return;
    const hasLogs = isPhase2Active ? jobLogs.length > 0 : progressSteps.length > 0;
    if (!hasLogs) return;

    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [isOpen]); // Scroll to bottom when opening

  if (!isOpen) return null;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleReload = async () => {
    try {
      const db = await getDBInstance();
      await Promise.all(Array.from(db.objectStoreNames).map((storeName) => db.clear(storeName)));
    } catch (e) {
      console.warn("Error clearing IndexedDB:", e);
    }
    localStorage.removeItem("lastSyncTime");
    sessionStorage.clear();
    window.location.href = "/";
  };

  const renderOptionsSummary = () => {
    const opts = job?.config || seedingOptions;
    if (!opts) return null;
    return (
      <div className="grid grid-cols-2 text-xs text-token-text-secondary gap-x-4 gap-y-1 mb-3">
        <span>
          Empleados: <strong>{(opts.employees as number) || "-"}</strong>
        </span>
        <span>
          Días: <strong>{opts.days as number}</strong>
        </span>
        {isPhase2Active ? (
          <>
            <span className="col-span-2 text-token-accent-brand">
              FASE 2: Generación de Marcaciones
            </span>
          </>
        ) : (
          <>
            <span>
              Patrones: <strong>{opts.basePatternsCount as number}</strong>
            </span>
            <span>
              Reportes: <strong>{opts.shiftReportsPerDay as number}</strong>
            </span>
          </>
        )}
        <div className="col-span-2 flex items-center text-token-accent-brand font-mono mt-1">
          <span className="mr-1">Tiempo Transcurrido:</span>
          <strong className="text-sm">{formatTime(seconds)}</strong>
        </div>
      </div>
    );
  };

  const currentPercent = job?.progress
    ? Math.round((job.progress.currentDay / job.progress.totalDays) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-token-surface-card text-token-text-primary rounded-lg shadow-2xl border border-token-border-technical w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-token-border-subtle flex justify-between items-center bg-token-surface-stripe">
          <h3 className="font-semibold text-lg flex items-center text-token-text-primary">
            {isPhase2Active
              ? "Progreso Fase 2: Marcaciones"
              : "Simulación: Fase 1 (Sincronización)"}
          </h3>
          <Button
            variant="none"
            onClick={onClose}
            className="p-1 rounded-full text-token-text-tertiary hover:text-token-text-primary shadow-none"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-6">
          {renderOptionsSummary()}

          {isPhase2Active && job?.progress && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span>
                  Día {job.progress.currentDay} de {job.progress.totalDays}
                </span>
                <span>{currentPercent}%</span>
              </div>
              <div className="w-full bg-token-surface-technical h-2 rounded-full overflow-hidden">
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
            ref={logContainerRef}
            className="bg-token-surface-technical p-3 rounded-md max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 border border-token-border-subtle"
          >
            {(isPhase2Active && jobLogs.length > 0 ? jobLogs : progressSteps).map((step, index) => (
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
                <span className="text-sm font-bold text-token-status-success">
                  Fase 1 Completada
                </span>
                <p className="text-[10px] mt-1 text-token-text-secondary">
                  ¿Deseas iniciar la generación de marcaciones históricas?
                </p>
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
          {isPhase2Active && job && (
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
      </div>
    </div>
  );
};

export default SeedingProgressModal;
