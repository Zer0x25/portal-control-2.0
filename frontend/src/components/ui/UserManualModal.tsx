import React, { useId } from "react";
import Button from "./Button";
import CinematicModal from "./CinematicModal";
import { CloseIcon, BookOpenIcon } from "./icons/index";
import LoadingSpinner from "./LoadingSpinner";
import { Z } from "../../constants/zScale";
import { useUserManual } from "../../hooks/useUserManual";

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const titleId = useId();
  const { manualContent, isLoading, hasLoadError } = useUserManual(isOpen);

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      zClass={Z.modal}
      maxWidth="max-w-4xl"
      showHeader={false}
      ariaLabelledBy={titleId}
      overlayClassName="bg-black/60 backdrop-blur-md p-4 md:p-8"
      panelClassName="relative max-h-[90vh] h-full border-token-border-subtle flex flex-col"
      bodyClassName="flex flex-col grow min-h-0"
      testId="user-manual-modal"
    >
      {/* Header Cinematic */}
      <div className="p-8 pb-6 border-b border-token-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-token-status-info-surface flex items-center justify-center text-token-status-info-text border border-token-status-info/20">
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <h2
              id={titleId}
              className="text-xl font-black text-token-text-primary uppercase tracking-tight italic"
            >
              Manual de Usuario
            </h2>
            <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em] mt-0.5">
              Guía de Operación y Procedimientos
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="none"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="p-2 hover:bg-token-status-error-surface text-token-text-tertiary hover:text-token-status-error-text rounded-xl transition-all shadow-none"
        >
          <CloseIcon className="w-6 h-6" />
        </Button>
      </div>

      <div className="grow overflow-y-auto p-8 scrollbar-premium">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
            <LoadingSpinner size="lg" variant="default" />
            <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest animate-pulse">
              Consultando base de conocimientos...
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2">
            {hasLoadError ? (
              <p className="text-token-status-error-text">{manualContent}</p>
            ) : (
              <div
                className="prose dark:prose-invert max-w-none manual-content-premium"
                dangerouslySetInnerHTML={{ __html: manualContent }}
              />
            )}
          </div>
        )}
      </div>

      <div className="p-6 bg-token-surface-stripe border-t border-token-border-subtle flex justify-end shrink-0">
        <Button
          variant="primary"
          onClick={onClose}
          className="px-8 rounded-lg font-black uppercase text-xs tracking-widest shadow-md h-10"
        >
          Cerrar Manual
        </Button>
      </div>

      {/* Decorative ambient glow */}
      <div className="ambient-glow ambient-glow-subtle absolute -bottom-24 -right-24 w-64 h-64 pointer-events-none" />
    </CinematicModal>
  );
};

export default UserManualModal;
