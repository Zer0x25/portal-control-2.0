import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
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

export const useDeveloperPanelController = () => {
  const { addToast } = useToasts();

  const panelRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const handleOpenDesignSystem = () => navigate(ROUTES.DESIGN_SYSTEM);

  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);

  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);

  const [isSeedingOptionsOpen, setIsSeedingOptionsOpen] = useState(false);

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const [isClearServerConfirmOpen, setIsClearServerConfirmOpen] = useState(false);

  const [seedingOptions, setSeedingOptions] = useState<SeedingOptions | null>(null);

  const [seedingProgress, setSeedingProgress] = useState<string[]>([]);

  const [isSeedingFinished, setIsSeedingFinished] = useState(false);

  const [seedingError, setSeedingError] = useState<string | null>(null);

  const [isResetting, setIsResetting] = useState(false);

  const [resetProgress, setResetProgress] = useState<string[]>([]);

  const [resetError, setResetError] = useState<string | null>(null);

  const [phase2Job, setPhase2Job] = useState<SeedPhase2Job | null>(null);

  const [phase2Logs, setPhase2Logs] = useState<string[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsDevPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const refreshPhase2Status = async (jobId?: string) => {
    // Optimization: Don't poll if tab is hidden
    if (!isTabVisible && !jobId) return;
    try {
      const status = await getSeedPhase2Status(jobId || phase2Job?.id);
      if (status.job) {
        setPhase2Job(status.job);
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
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Only poll for Phase 2 status when Phase 1 is done or when panel is open
    // AND the tab is visible to prevent CPU spikes
    const shouldPoll =
      isTabVisible &&
      (isDevPanelOpen ||
        (isSeedingFinished && isSeedingModalOpen) ||
        phase2Job?.status === "running" ||
        phase2Job?.status === "paused");
    if (!shouldPoll) return;

    void refreshPhase2Status();
    const i = setInterval(() => {
      void refreshPhase2Status();
    }, 3000);
    return () => clearInterval(i);
  }, [isDevPanelOpen, isSeedingFinished, isSeedingModalOpen, phase2Job?.status, isTabVisible]);

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
      const onCompleted = () => addToast("Seeder Fase 2 completada", "success");
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
  }, [addToast]);

  useEffect(() => {
    // Check for active job on mount to auto-reconnect
    const checkActiveJob = async () => {
      try {
        const status = await getSeedPhase2Status();
        if (status.job && ["running", "paused", "pending"].includes(status.job.status)) {
          setPhase2Job(status.job);
          setIsSeedingFinished(true); // Phase 1 is implicitly done if Phase 2 job exists
          setIsSeedingModalOpen(true);
        }
      } catch (err) {
        console.warn("Failed to check active seeder job:", err);
      }
    };
    void checkActiveJob();
  }, []);

  const handleSeedData = async (options: SeedingOptions) => {
    // Safety check: don't allow Phase 1 if Phase 2 is already active
    if (phase2Job && ["running", "paused", "pending"].includes(phase2Job.status)) {
      addToast("Hay una hidratación activa en curso. No se puede iniciar otra.", "warning");
      setIsSeedingModalOpen(true);
      return;
    }

    // Close dev panel to prevent polling interference during Phase 1
    setIsDevPanelOpen(false);
    // Clear any previous Phase 2 state so the modal starts fresh in Phase 1
    setPhase2Job(null);
    setPhase2Logs([]);
    setIsSeedingModalOpen(true);
    setIsSeedingFinished(false);
    setSeedingError(null);
    setSeedingProgress([]);
    setSeedingOptions(options);

    const onProgress = (message: string) => {
      setSeedingProgress((prev) => [...prev, message]);
    };

    const result = await seedPhase1(options, onProgress);
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
    if (!seedingOptions) return;
    try {
      const res = await startSeedPhase2({
        days: seedingOptions.days,
        leaveRatio: seedingOptions.leaveRatio,
        correctionRequestRatio: seedingOptions.correctionRequestRatio,
      });
      setPhase2Job(res.job);
      addToast("Fase 2 iniciada en background.", "success");

      // Modal is already open, it will now transition to Phase 2 view
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo iniciar Fase 2";
      addToast(msg, "error");
    }
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
    isTabVisible,
    setIsTabVisible,
    handleSeedData,
    handleStartPhase2,
    handlePausePhase2,
    handleResumePhase2,
    handleStopPhase2,
    handleClearLocal,
    handleClearServer,
  };
};

export type DeveloperPanelController = ReturnType<typeof useDeveloperPanelController>;
