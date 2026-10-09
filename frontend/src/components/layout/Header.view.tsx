import React from "react";
import { APP_TITLE } from "../../constants";
import { SystemStatusIndicator } from "../ui/IndustrialIndicator";
const ChangePasswordModal = React.lazy(() =>
  import("../../features/auth").then((m) => ({ default: m.ChangePasswordModal })),
);
const UserManualModal = React.lazy(() => import("../ui/UserManualModal"));
import NotificationCenter from "./NotificationCenter";
import { SpeakerWaveIcon, SpeakerXMarkIcon, UserCircleIcon } from "../ui/icons/index";

interface HeaderViewProps {
  toggleSidebar: () => void;
  currentUser: { role: string } | null;
  welcomeName?: string;
  systemStatus: string;
  soundEnabled: boolean;
  isDropdownOpen: boolean;
  isChangePasswordModalOpen: boolean;
  isManualModalOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggleSound: () => void;
  onToggleDropdown: () => void;
  onOpenChangePassword: () => void;
  onOpenManual: () => void;
  onCloseChangePassword: () => void;
  onCloseManual: () => void;
  onLogout: () => void;
}

const HeaderView: React.FC<HeaderViewProps> = ({
  toggleSidebar,
  currentUser,
  welcomeName,
  systemStatus,
  soundEnabled,
  isDropdownOpen,
  isChangePasswordModalOpen,
  isManualModalOpen,
  dropdownRef,
  onToggleSound,
  onToggleDropdown,
  onOpenChangePassword,
  onOpenManual,
  onCloseChangePassword,
  onCloseManual,
  onLogout,
}) => {
  return (
    <>
      <header
        role="banner"
        data-testid="app-header"
        className="sticky top-0 left-0 right-0 z-60 bg-token-surface-header border-b border-token-border-technical transition-all shadow-sm"
      >
        <div className="mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              data-testid="sidebar-toggle-button"
              aria-controls="app-sidebar"
              onClick={toggleSidebar}
              className="group flex items-center justify-center transition-all active:scale-95"
              aria-label="Abrir Menú"
            >
              <div className="w-12 h-12 rounded-md bg-token-accent-brand flex items-center justify-center text-token-text-onAccent font-bold text-xl shadow-lg hover:brightness-110 active:scale-95 transition-all border border-token-border-technical">
                {APP_TITLE ? APP_TITLE.charAt(0) : "P"}
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-2">
              <h1 className="text-xs font-bold text-token-text-secondary uppercase tracking-tighter">
                {APP_TITLE} <span className="text-token-border-technical mx-1">|</span>{" "}
                <span className="text-token-accent-brand font-bold tracking-widest opacity-80">
                  CONTROL SYSTEM
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:block">
              <SystemStatusIndicator
                status={systemStatus === "offline" ? "offline" : "online"}
                label={systemStatus === "offline" ? "SISTEMA DESCONECTADO" : "SISTEMA ACTIVO"}
              />
            </div>

            <button
              data-testid="sound-toggle-button"
              onClick={onToggleSound}
              className="p-2.5 rounded-md border border-token-border-subtle hover:bg-token-surface-active transition-all group"
              title={soundEnabled ? "Silenciar sonidos" : "Activar sonidos"}
              aria-label="Silenciar o activar sonidos"
            >
              {soundEnabled ? (
                <SpeakerWaveIcon className="w-5 h-5 text-token-text-tertiary group-hover:text-token-accent-brand" />
              ) : (
                <SpeakerXMarkIcon className="w-5 h-5 text-token-status-error/60 group-hover:text-token-status-error" />
              )}
            </button>

            <NotificationCenter />

            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  data-testid="user-menu-button"
                  onClick={onToggleDropdown}
                  className="group flex items-center gap-3 p-1.5 h-13 rounded-md border border-token-border-subtle hover:bg-token-surface-active transition-all"
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                  aria-label="Menú de usuario"
                >
                  <div className="w-10 h-10 rounded-md bg-token-surface-active flex items-center justify-center border border-token-border-subtle">
                    <UserCircleIcon className="w-6 h-6 text-token-text-tertiary group-hover:text-token-accent-brand transition-colors" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-token-text-primary uppercase tracking-tight leading-none">
                      {welcomeName}
                    </p>
                    <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest mt-1.5">
                      {currentUser.role}
                    </p>
                  </div>
                </button>

                {isDropdownOpen && (
                  <div
                    data-testid="user-menu-dropdown"
                    className="animate-in fade-in slide-in-from-top-1 duration-150 absolute right-0 mt-2 w-56 rounded-md bg-token-surface-card border border-token-border-technical shadow-2xl z-70 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-token-border-subtle bg-token-surface-stripe">
                      <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-widest mb-1">
                        Usuario Activo
                      </p>
                      <p className="text-xs font-bold text-token-text-primary truncate">
                        {welcomeName}
                      </p>
                    </div>

                    <div className="p-1">
                      <button
                        data-testid="security-modal-button"
                        onClick={onOpenChangePassword}
                        className="flex items-center w-full px-3 py-2 text-xs font-bold text-token-text-secondary uppercase tracking-widest hover:bg-token-surface-active rounded-sm transition-all"
                      >
                        Seguridad
                      </button>
                      <button
                        data-testid="help-modal-button"
                        onClick={onOpenManual}
                        className="flex items-center w-full px-3 py-2 text-xs font-bold text-token-text-secondary uppercase tracking-widest hover:bg-token-surface-active rounded-sm transition-all"
                      >
                        Ayuda
                      </button>
                    </div>

                    <div className="p-1 border-t border-token-border-subtle">
                      <button
                        data-testid="dropdown-logout-button"
                        onClick={onLogout}
                        className="flex items-center w-full px-3 py-2 text-xs font-bold text-token-status-error uppercase tracking-widest hover:bg-token-status-error/10 rounded-sm transition-all"
                      >
                        Finalizar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="hidden sm:block">
              {currentUser && (
                <button
                  data-testid="header-logout-button"
                  onClick={onLogout}
                  className="px-4 py-2.5 h-11 rounded-md border border-token-status-error/20 bg-token-status-error/10 hover:bg-token-status-error/20 text-token-status-error text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                >
                  Salir
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {isChangePasswordModalOpen && (
        <React.Suspense fallback={null}>
          <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={onCloseChangePassword} />
        </React.Suspense>
      )}
      {isManualModalOpen && (
        <React.Suspense fallback={null}>
          <UserManualModal isOpen={isManualModalOpen} onClose={onCloseManual} />
        </React.Suspense>
      )}
    </>
  );
};

export default HeaderView;
