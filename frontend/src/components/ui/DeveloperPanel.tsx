import React, { useEffect, useRef, useState } from "react";
import { useToasts } from "../../hooks/useToasts";
import { getDBInstance } from "../../utils/indexedDB";
import Button from "./Button";
import {
  CodeBracketSquareIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "./icons/index";
import ConfirmationModal from "./ConfirmationModal";
import SeedingOptionsModal, { SeedingOptions } from "./SeedingOptionsModal";
import SeedingProgressModal from "./SeedingProgressModal";
import DesignSystemShowcaseModal from "./DesignSystemShowcaseModal";
import {
  seedPhase1,
  startSeedPhase2,
  pauseSeedPhase2,
  resumeSeedPhase2,
  stopSeedPhase2,
  getSeedPhase2Status,
  getSeedPhase2Logs,
  SeedPhase2Job,
} from "../../services/seedingService";
import { API_BASE_URL } from "../../services/apiBase";
import { authService } from "../../services/authService";

export const DeveloperPanel: React.FC = () => {
  const { addToast } = useToasts();
  const panelRef = useRef<HTMLDivElement>(null);

  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [isDesignShowcaseOpen, setIsDesignShowcaseOpen] = useState(false);
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
      const { socketService } = await import("../../services/socketService");
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
      const token = authService.getToken();
      const response = await fetch(`${API_BASE_URL}/maintenance/clear-database`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error reseteando servidor");
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

  return (
    <div className="relative" ref={panelRef}>
      {isResetting && (
        <div className="fixed inset-0 bg-black/90 z-9999 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div
              className={`animate-spin rounded-full h-16 w-16 border-b-4 ${resetError ? "border-red-500" : "border-purple-500"} mx-auto mb-6`}
            />
            <h2 className="text-white text-2xl font-bold mb-2">Reseteando Sistema</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 text-left max-h-60 overflow-y-auto font-mono text-xs space-y-2 mb-6">
              {resetProgress.map((step, i) => (
                <div key={i} className="text-gray-300">
                  {step}
                </div>
              ))}
              {resetError && <div className="text-red-400 font-bold">ERROR: {resetError}</div>}
            </div>
            {resetError && (
              <Button onClick={() => setIsResetting(false)} variant="secondary" className="w-full">
                Cerrar
              </Button>
            )}
          </div>
        </div>
      )}

      {isDevPanelOpen && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsDevPanelOpen(false)} />
      )}
      <div className="relative z-50">
        {isDevPanelOpen && (
          <div className="absolute bottom-full right-0 mb-4 w-80 bg-gray-900/80 backdrop-blur-2xl text-white rounded-4xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5 bg-white/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center">
                <CodeBracketSquareIcon className="w-4 h-4 mr-2 text-purple-400" /> Dev Panel
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {phase2Job && ["running", "paused", "pending"].includes(phase2Job.status) && (
                <Button
                  onClick={() => {
                    setIsSeedingModalOpen(true);
                    setIsDevPanelOpen(false);
                  }}
                  size="sm"
                  className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" /> Ver Progreso Activo
                </Button>
              )}
              <Button
                onClick={() => {
                  setIsDesignShowcaseOpen(true);
                  setIsDevPanelOpen(false);
                }}
                size="sm"
                className="w-full h-11 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 text-white"
              >
                <SparklesIcon className="w-4 h-4 mr-2" /> Design System Gallery
              </Button>
              <Button
                onClick={() => setIsSeedingOptionsOpen(true)}
                size="sm"
                className="w-full h-11 rounded-2xl bg-linear-to-r from-purple-500 to-indigo-600 border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20"
              >
                <SparklesIcon className="w-4 h-4 mr-2" /> Seeder por Fases
              </Button>
              <Button
                onClick={() => setIsClearConfirmOpen(true)}
                variant="secondary"
                size="sm"
                className="w-full h-11 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 font-black text-[10px] uppercase tracking-widest"
              >
                <ExclamationTriangleIcon className="w-4 h-4 mr-2 text-yellow-500" /> Limpiar Caché
              </Button>
              <Button
                onClick={() => setIsClearServerConfirmOpen(true)}
                variant="danger"
                size="sm"
                className="w-full h-11 rounded-2xl bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black text-[10px] uppercase tracking-widest"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" /> Reset Servidor
              </Button>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsDevPanelOpen((prev) => !prev)}
          className="bg-gray-900/80 backdrop-blur-xl text-purple-400 p-4 rounded-full shadow-2xl border border-white/10 transition-all hover:bg-gray-800"
          title="Panel de Desarrollador"
        >
          <CodeBracketSquareIcon className="w-7 h-7" />
        </button>
      </div>

      <SeedingOptionsModal
        isOpen={isSeedingOptionsOpen}
        onClose={() => setIsSeedingOptionsOpen(false)}
        onConfirm={handleSeedData}
      />
      <SeedingProgressModal
        isOpen={isSeedingModalOpen}
        onClose={() => setIsSeedingModalOpen(false)}
        progressSteps={seedingProgress}
        isFinished={isSeedingFinished}
        error={seedingError}
        seedingOptions={seedingOptions}
        job={phase2Job}
        jobLogs={phase2Logs}
        onStartPhase2={handleStartPhase2}
        onPausePhase2={() =>
          phase2Job &&
          void pauseSeedPhase2(phase2Job.id).then(() => refreshPhase2Status(phase2Job.id))
        }
        onResumePhase2={() =>
          phase2Job &&
          void resumeSeedPhase2(phase2Job.id).then(() => refreshPhase2Status(phase2Job.id))
        }
        onStopPhase2={() =>
          phase2Job &&
          void stopSeedPhase2(phase2Job.id).then(() => refreshPhase2Status(phase2Job.id))
        }
      />

      <DesignSystemShowcaseModal
        isOpen={isDesignShowcaseOpen}
        onClose={() => setIsDesignShowcaseOpen(false)}
      />

      {isClearServerConfirmOpen && (
        <ConfirmationModal
          isOpen={isClearServerConfirmOpen}
          onClose={() => setIsClearServerConfirmOpen(false)}
          onConfirm={handleClearServer}
          title="Reset total del sistema"
          message={<p>Eliminará datos del servidor y caché local. ¿Deseas continuar?</p>}
          confirmText="Sí, reset total"
          confirmVariant="danger"
        />
      )}

      {isClearConfirmOpen && (
        <ConfirmationModal
          isOpen={isClearConfirmOpen}
          onClose={() => setIsClearConfirmOpen(false)}
          onConfirm={handleClearLocal}
          title="Limpiar caché local"
          message={<p>Esto limpia IndexedDB local. No borra el servidor.</p>}
          confirmText="Sí, limpiar"
          confirmVariant="danger"
        />
      )}
    </div>
  );
};
