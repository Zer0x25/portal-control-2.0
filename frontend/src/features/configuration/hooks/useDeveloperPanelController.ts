import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "../../../constants";
import { useToasts } from "../../../hooks/useToasts";
import { getDBInstance } from "../../../utils/indexedDB";
import { SeedingOptions } from "../../../schemas/forms/seed";
import {
  seedPhase1,
  startSeedPhase2,
  pauseSeedPhase2,
  resumeSeedPhase2,
  stopSeedPhase2,
  getSeedPhase2Status,
  getSeedPhase2Logs,
  SeedPhase2Job,
} from "../../../services/seedingService";
import { healthService } from "../../../services/healthService";
import { invalidateSeedDataQueries } from "../../../lib/queryInvalidation";
import { purgePersistedQueryCache } from "../../../lib/queryCache";
import { logger } from "../../../utils/logger";

/**
 * Ventana en la que un job fase 2 `stopped` (pre-creado al terminar la fase
 * 1) se considera retomable tras un reload. Pasado ese plazo la fase 1 pudo
 * quedar desalineada de la DB y lo correcto es volver a correrla.
 */
const RESUMABLE_JOB_WINDOW_MS = 24 * 60 * 60 * 1000;

export const useDeveloperPanelController = () => {
  const { addToast } = useToasts();
  const queryClient = useQueryClient();

  const panelRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const handleOpenDesignSystem = () => navigate(ROUTES.DESIGN_SYSTEM);

  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);

  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);

  const [isSeedingOptionsOpen, setIsSeedingOptionsOpen] = useState(false);

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const [isClearServerConfirmOpen, setIsClearServerConfirmOpen] = useState(false);

  const [seedingOptions, setSeedingOptions] = useState<SeedingOptions | null>(null);

  /**
   * Fase 1 corriendo (o a punto de correr). Bloquea un segundo lanzamiento
   * desde el modal de opciones: el backend ya responde 409, pero la UI debe
   * prevenir el intento en vez de solo reaccionar al conflicto.
   */
  const [isPhase1Running, setIsPhase1Running] = useState(false);

  /**
   * Un job fase 2 `stopped` reciente (pre-creado al terminar fase 1) que
   * todavia puede retomarse. `null` cuando no hay nada que retomar.
   */
  const [resumablePhase2Job, setResumablePhase2Job] = useState<SeedPhase2Job | null>(null);

  const [seedingProgress, setSeedingProgress] = useState<string[]>([]);

  const [isSeedingFinished, setIsSeedingFinished] = useState(false);

  const [seedingError, setSeedingError] = useState<string | null>(null);

  const [isResetting, setIsResetting] = useState(false);

  const [resetProgress, setResetProgress] = useState<string[]>([]);

  const [resetError, setResetError] = useState<string | null>(null);

  const [phase2Job, setPhase2Job] = useState<SeedPhase2Job | null>(null);

  const [phase2Logs, setPhase2Logs] = useState<string[]>([]);

  /**
   * Ultimo error del poll de fase 2 (backend caido / respuesta invalida).
   * Visible en el modal de progreso para no dejar la UI "running" eterna.
   */
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsDevPanelOpen(false);
      }
    };
    /** Cierre del menu por teclado (accesibilidad). */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDevPanelOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  /**
   * Setea `phase2Job` solo cuando el contenido material cambia (id, status,
   * progreso o resumen de error). El POST de status devuelve un objeto nuevo
   * en cada respuesta; re-setearlo incondicionalmente hacia que el callback
   * se recreara en cada poll, el effect se re-ejecutara de inmediato y el
   * "poll de 3s" degenerara en un loop de decenas de requests por segundo.
   */
  const phase2JobRef = useRef<SeedPhase2Job | null>(null);
  const setPhase2JobIfChanged = useCallback((job: SeedPhase2Job | null) => {
    const prev = phase2JobRef.current;
    const changed =
      !prev !== !job ||
      (!!prev &&
        !!job &&
        (prev.id !== job.id ||
          prev.status !== job.status ||
          prev.progress.currentDay !== job.progress.currentDay ||
          prev.progress.processedRecords !== job.progress.processedRecords ||
          prev.progress.sealedRecords !== job.progress.sealedRecords ||
          prev.progress.errors !== job.progress.errors ||
          prev.errorSummary !== job.errorSummary));
    if (!changed) return;
    phase2JobRef.current = job;
    setPhase2Job(job);
  }, []);

  const refreshPhase2Status = useCallback(
    async (jobId?: string) => {
      // Optimization: Don't poll if tab is hidden
      if (!isTabVisible && !jobId) return;
      try {
        // Sin jobId explicito se consulta el job mas reciente del backend:
        // tras una fase 1 nueva el job viejo (completed/stopped) no debe
        // secuestrar el visor del run actual.
        const status = await getSeedPhase2Status(jobId || phase2JobRef.current?.id);
        setPollError(null);
        if (status.job) {
          const isNewJob = status.job.id !== phase2JobRef.current?.id;
          setPhase2JobIfChanged(status.job);
          // Los logs solo se recargan cuando cambia el job: el poll de 3s no
          // debe pedir 200 lineas por tick con el mismo id.
          if (isNewJob || phase2Logs.length === 0) {
            const logsResp = await getSeedPhase2Logs(status.job.id);
            if (Array.isArray(logsResp.logs)) {
              setPhase2Logs(
                logsResp.logs
                  .slice()
                  .reverse() // Reverse because backend now sends recent first (DESC)
                  .map(
                    (l: { createdAt: string | number | Date; message: string }) =>
                      `${new Date(l.createdAt).toLocaleTimeString()} ${l.message}`,
                  ),
              );
            }
          }
        }
      } catch (e) {
        // Sin este estado el modal quedaria "running" para siempre sin
        // feedback cuando el backend cae o responde mal.
        const message = e instanceof Error ? e.message : "Estado del seeding no disponible";
        setPollError(message);
        logger.warn("Poll de fase 2 fallo:", e);
      }
    },
    [isTabVisible, phase2Logs.length, setPhase2JobIfChanged],
  );

  useEffect(() => {
    // Only poll for Phase 2 status when Phase 1 is done or a job is active,
    // and only while the tab is visible to prevent CPU spikes. El panel de
    // desarrollador abierto NO habilita el poll por si solo: sin job activo
    // solo generaria ruido de requests cada 3s.
    const shouldPoll =
      isTabVisible &&
      ((isSeedingFinished && isSeedingModalOpen) ||
        phase2Job?.status === "running" ||
        phase2Job?.status === "paused" ||
        phase2Job?.status === "pending");
    if (!shouldPoll) return;

    void refreshPhase2Status();
    const i = setInterval(() => {
      void refreshPhase2Status();
    }, 3000);
    return () => clearInterval(i);
  }, [isSeedingFinished, isSeedingModalOpen, phase2Job?.status, isTabVisible, refreshPhase2Status]);

  useEffect(() => {
    let mounted = true;
    let cleanupSocketListeners: (() => void) | undefined;

    const setupSocket = async () => {
      const { socketService } = await import("../../../services/socketService");
      if (!mounted) return;

      const socket = socketService.connect();
      const onProgress = (data: { dayCompleted: number; totalDays: number; jobId: string }) => {
        if (document.visibilityState !== "visible") return;
        if (!data) return;

        addToast(`Seeder Fase 2: dia ${data.dayCompleted}/${data.totalDays} listo`, "info");
      };

      const onPaused = () => addToast("Seeder Fase 2 pausada", "warning");
      const onResumed = () => addToast("Seeder Fase 2 reanudada", "success");
      const onStopped = () => addToast("Seeder Fase 2 detenida", "warning");
      const onCompleted = () => {
        addToast("Seeder Fase 2 completada", "success");
        // El servidor acaba de escribir marcaciones/correcciones: sin esta
        // invalidacion la app sigue sirviendo la data pre-seed de TanStack
        // Query (staleTime 5 min + cache persistido).
        invalidateSeedDataQueries(queryClient);
      };
      const onFailed = () => addToast("Seeder Fase 2 falló", "error");

      socket.on("seeder:phase2_progress", onProgress);
      socket.on("seeder:phase2_paused", onPaused);
      socket.on("seeder:phase2_resumed", onResumed);
      socket.on("seeder:phase2_stopped", onStopped);
      socket.on("seeder:phase2_completed", onCompleted);
      socket.on("seeder:phase2_failed", onFailed);

      cleanupSocketListeners = () => {
        socket.off("seeder:phase2_progress", onProgress);
        socket.off("seeder:phase2_paused", onPaused);
        socket.off("seeder:phase2_resumed", onResumed);
        socket.off("seeder:phase2_stopped", onStopped);
        socket.off("seeder:phase2_completed", onCompleted);
        socket.off("seeder:phase2_failed", onFailed);
      };
    };

    void setupSocket();

    return () => {
      mounted = false;
      cleanupSocketListeners?.();
    };
  }, [addToast, queryClient]);

  /** Marca `_phase2Job` y su ref espejo (usada por el poll estable). */
  const setPhase2JobTracked = useCallback((job: SeedPhase2Job | null) => {
    phase2JobRef.current = job;
    setPhase2Job(job);
  }, []);

  useEffect(() => {
    // Check for active job on mount to auto-reconnect
    const checkActiveJob = async () => {
      try {
        const status = await getSeedPhase2Status();
        if (!status.job) return;
        if (["running", "paused", "pending"].includes(status.job.status)) {
          setPhase2JobTracked(status.job);
          setIsSeedingFinished(true); // Phase 1 is implicitly done if Phase 2 job exists
          setIsSeedingModalOpen(true);
          return;
        }
        // Un job `stopped` reciente es la marca de una fase 1 completada
        // cuya fase 2 nunca se inicio (o se cancelo antes de correr):
        // la app ofrece retomarla sin repetir la fase 1.
        if (status.job.status === "stopped") {
          const createdAt = status.job.createdAt ? new Date(status.job.createdAt).getTime() : NaN;
          const isRecent =
            Number.isFinite(createdAt) && Date.now() - createdAt <= RESUMABLE_JOB_WINDOW_MS;
          if (isRecent) {
            setResumablePhase2Job(status.job);
            setPhase2JobTracked(status.job);
          }
        }
      } catch (err) {
        logger.warn("Failed to check active seeder job:", err);
      }
    };
    void checkActiveJob();
  }, [setPhase2JobTracked]);

  const handleSeedData = async (options: SeedingOptions) => {
    // Guard de doble submit: mientras fase 1 o fase 2 estan activas no se
    // puede lanzar otra simulacion (el backend responderia 409 igual, pero
    // la UI debe bloquear el intento antes de gastar la request).
    if (isPhase1Running) {
      addToast("La Fase 1 ya está corriendo. Espera a que termine.", "warning");
      return;
    }
    if (phase2Job && ["running", "paused", "pending"].includes(phase2Job.status)) {
      addToast("Hay una hidratación activa en curso. No se puede iniciar otra.", "warning");
      setIsSeedingModalOpen(true);
      return;
    }

    // Close dev panel to prevent polling interference during Phase 1
    setIsDevPanelOpen(false);
    // Clear any previous Phase 2 state so the modal starts fresh in Phase 1
    setPhase2JobTracked(null);
    setPhase2Logs([]);
    setResumablePhase2Job(null);
    setIsSeedingModalOpen(true);
    setIsSeedingFinished(false);
    setSeedingError(null);
    setSeedingProgress([]);
    setSeedingOptions(options);
    setIsPhase1Running(true);

    const onProgress = (message: string) => {
      setSeedingProgress((prev) => [...prev, message]);
    };

    const result = await seedPhase1(options, onProgress);
    setIsPhase1Running(false);
    if (!result.success) {
      setSeedingError(result.error || "Error desconocido en Fase 1.");
      setIsSeedingFinished(true);
    } else {
      addToast("Fase 1 completada.", "success");
      // Mark as finished for Phase 1 to show Phase 2 start button in modal
      setIsSeedingFinished(true);
    }
  };

  const handleStartPhase2 = async () => {
    // Al retomar tras un reload, `seedingOptions` se perdio: el job
    // `stopped` persiste la config real con la que corrio la fase 1.
    const configSource =
      seedingOptions ?? resumablePhase2Job?.config ?? phase2JobRef.current?.config;
    if (!configSource) {
      // Sin config no hay nada que iniciar: el boton no deberia estar
      // visible en este estado, pero no morimos en silencio.
      addToast("No hay configuración de seeding disponible para la Fase 2.", "warning");
      return;
    }
    try {
      const res = await startSeedPhase2({
        days: configSource.days,
        leaveRatio: configSource.leaveRatio,
        correctionRequestRatio: configSource.correctionRequestRatio,
      });
      setPhase2JobTracked(res.job);
      // Los logs del job viejo no deben colarse en el visor del nuevo.
      setPhase2Logs([]);
      setResumablePhase2Job(null);
      addToast("Fase 2 iniciada en background.", "success");

      // Modal is already open, it will now transition to Phase 2 view
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo iniciar Fase 2";
      addToast(msg, "error");
    }
  };

  /**
   * Retoma el visor de un run cuyo job fase 2 quedo `stopped` (fase 1
   * completada, fase 2 nunca iniciada o cerrada antes de empezar). El job
   * trae la config real de la fase 1, asi que "Iniciar Fase 2" usara esos
   * valores aunque el cliente se haya recargado.
   */
  const handleResumePendingPhase2 = () => {
    if (!resumablePhase2Job) return;
    if (seedingOptions) setSeedingOptions(null);
    setPhase2JobTracked(resumablePhase2Job);
    setIsSeedingFinished(true);
    setIsSeedingModalOpen(true);
    setIsDevPanelOpen(false);
    void refreshPhase2Status(resumablePhase2Job.id);
  };

  const handlePausePhase2 = () => {
    if (!phase2Job) return;
    void pauseSeedPhase2(phase2Job.id).then(() => refreshPhase2Status(phase2Job.id));
  };

  const handleResumePhase2 = () => {
    if (!phase2Job) return;
    void resumeSeedPhase2(phase2Job.id).then(() => refreshPhase2Status(phase2Job.id));
  };

  const handleStopPhase2 = () => {
    if (!phase2Job) return;
    void stopSeedPhase2(phase2Job.id).then(() => refreshPhase2Status(phase2Job.id));
  };

  const handleClearLocal = async () => {
    setIsClearConfirmOpen(false);
    const db = await getDBInstance();
    await Promise.all(Array.from(db.objectStoreNames).map((storeName) => db.clear(storeName)));
    localStorage.removeItem("lastSyncTime");
    // La limpieza de cache tambien debe soltar el cache persistido de
    // queries: si no, la recarga sigue sirviendo la data anterior.
    try {
      await purgePersistedQueryCache();
    } catch (e) {
      logger.warn("Error purgando cache de queries:", e);
    }
    addToast("Caché local limpia. Recargando...", "success");
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearServer = async () => {
    setIsClearServerConfirmOpen(false);
    setIsResetting(true);
    setResetProgress(["Iniciando reset del servidor..."]);
    setResetError(null);
    try {
      await healthService.clearDatabase();
      setResetProgress((p) => [...p, "Reset completado."]);
      const db = await getDBInstance();
      await Promise.all(Array.from(db.objectStoreNames).map((storeName) => db.clear(storeName)));
      localStorage.removeItem("lastSyncTime");
      // El reset del servidor cambio la instancia de datos: el cache
      // persistido de queries queda invalido y debe purgarse antes de
      // recargar, o la app arranca sirviendo data de la DB anterior.
      await purgePersistedQueryCache();
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error de reset";
      setResetError(msg);
      addToast(msg, "error");
    }
  };

  return {
    addToast,
    panelRef,
    handleOpenDesignSystem,
    isDevPanelOpen,
    setIsDevPanelOpen,
    isSeedingModalOpen,
    setIsSeedingModalOpen,
    isSeedingOptionsOpen,
    setIsSeedingOptionsOpen,
    isClearConfirmOpen,
    setIsClearConfirmOpen,
    isClearServerConfirmOpen,
    setIsClearServerConfirmOpen,
    seedingOptions,
    setSeedingOptions,
    seedingProgress,
    setSeedingProgress,
    isSeedingFinished,
    setIsSeedingFinished,
    seedingError,
    setSeedingError,
    isResetting,
    setIsResetting,
    resetProgress,
    setResetProgress,
    resetError,
    setResetError,
    phase2Job,
    setPhase2Job,
    phase2Logs,
    setPhase2Logs,
    resumablePhase2Job,
    setResumablePhase2Job,
    isPhase1Running,
    pollError,
    setPollError,
    isTabVisible,
    setIsTabVisible,
    handleSeedData,
    handleStartPhase2,
    handleResumePendingPhase2,
    handlePausePhase2,
    handleResumePhase2,
    handleStopPhase2,
    handleClearLocal,
    handleClearServer,
  };
};

export type DeveloperPanelController = ReturnType<typeof useDeveloperPanelController>;
