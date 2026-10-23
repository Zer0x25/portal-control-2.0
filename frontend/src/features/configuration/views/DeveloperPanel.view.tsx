import type { FC } from "react";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Button from "../../../components/ui/Button";
import {
  CodeBracketSquareIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "../../../components/ui/icons/index";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import SeedingOptionsModal from "../components/SeedingOptionsModal.container";
import SeedingProgressModal from "../components/SeedingProgressModal";
import { Z } from "../../../constants/zScale";
import type { DeveloperPanelController } from "../hooks/useDeveloperPanelController";

const DeveloperPanelView: FC<DeveloperPanelController> = (controller) => {
  const {
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
    seedingProgress,
    isSeedingFinished,
    seedingError,
    isResetting,
    setIsResetting,
    resetProgress,
    resetError,
    phase2Job,
    phase2Logs,
    handleSeedData,
    handleStartPhase2,
    handlePausePhase2,
    handleResumePhase2,
    handleStopPhase2,
    handleClearLocal,
    handleClearServer,
  } = controller;

  return (
    <div className="relative" ref={panelRef}>
      {isResetting && (
        <div className={`fixed inset-0 bg-black/90 ${Z.max} flex items-center justify-center p-4`}>
          <div className="max-w-md w-full text-center">
            <LoadingSpinner
              size="xl"
              variant={resetError ? "subtle" : "default"}
              className="mx-auto mb-6"
            />
            <h2 className="text-white text-2xl font-bold mb-2">Reseteando Sistema</h2>
            <div className="bg-token-surface-stripe rounded-lg border border-token-border-technical p-4 text-left max-h-60 overflow-y-auto font-mono text-xs space-y-2 mb-6">
              {resetProgress.map((step, i) => (
                <div key={i} className="text-token-text-secondary">
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
        <div
          className={`fixed inset-0 bg-black/30 ${Z.dropdown}`}
          onClick={() => setIsDevPanelOpen(false)}
        />
      )}
      <div className={`relative ${Z.overlay}`}>
        {isDevPanelOpen && (
          <div className="absolute bottom-full right-0 mb-4 w-80 bg-token-surface-card/90 backdrop-blur-2xl text-token-text-primary rounded-2xl shadow-2xl border border-token-border-technical overflow-hidden">
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
                  setIsDevPanelOpen(false);
                  handleOpenDesignSystem();
                }}
                size="sm"
                className="w-full h-11 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 text-white"
              >
                <SparklesIcon className="w-4 h-4 mr-2" /> Abrir catalogo
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
        <Button
          variant="none"
          onClick={() => setIsDevPanelOpen((prev) => !prev)}
          className="bg-token-surface-card/90 backdrop-blur-xl text-purple-400 p-4 rounded-full shadow-2xl border border-token-border-technical transition-all hover:bg-token-surface-hover"
          title="Panel de Desarrollador"
        >
          <CodeBracketSquareIcon className="w-7 h-7" />
        </Button>
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
        onPausePhase2={handlePausePhase2}
        onResumePhase2={handleResumePhase2}
        onStopPhase2={handleStopPhase2}
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

export default DeveloperPanelView;
