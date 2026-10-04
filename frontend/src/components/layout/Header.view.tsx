import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_TITLE } from "../../constants";
import { SystemStatusIndicator } from "../ui/IndustrialIndicator";
import { ChangePasswordModal } from "../../features/auth";
import UserManualModal from "../ui/UserManualModal";
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
      <header className="sticky top-0 left-0 right-0 z-60 bg-(--surface-header) border-b border-token-border-technical transition-all shadow-sm">
        <div className="mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="group flex items-center justify-center transition-all active:scale-95"
              aria-label="Abrir Menú"
            >
              <div className="w-12 h-12 rounded-md bg-(--sidebar-text-active) flex items-center justify-center text-white font-bold text-xl shadow-lg hover:brightness-110 active:scale-95 transition-all border border-token-border-technical">
                {APP_TITLE ? APP_TITLE.charAt(0) : "P"}
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-2">
              <h1 className="text-xs font-bold text-token-text-secondary uppercase tracking-tighter">
                {APP_TITLE} <span className="text-token-border-technical mx-1">|</span>{" "}
                <span className="text-(--sidebar-text-active) font-bold tracking-widest opacity-80">
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
              onClick={onToggleSound}
              className="p-2.5 rounded-md border border-token-border-subtle hover:bg-token-surface-active transition-all group"
              title={soundEnabled ? "Silenciar sonidos" : "Activar sonidos"}
            >
              {soundEnabled ? (
                <SpeakerWaveIcon className="w-5 h-5 text-token-text-tertiary group-hover:text-(--sidebar-text-active)" />
              ) : (
                <SpeakerXMarkIcon className="w-5 h-5 text-rose-500/60 group-hover:text-rose-500" />
              )}
            </button>

            <NotificationCenter />

            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={onToggleDropdown}
                  className="group flex items-center gap-3 p-1.5 h-13 rounded-md border border-token-border-subtle hover:bg-token-surface-active transition-all"
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                >
                  <div className="w-10 h-10 rounded-md bg-token-surface-active flex items-center justify-center border border-token-border-subtle">
                    <UserCircleIcon className="w-6 h-6 text-token-text-tertiary group-hover:text-(--sidebar-text-active) transition-colors" />
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

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-56 rounded-md bg-token-surface-card border border-token-border-technical shadow-2xl z-70 overflow-hidden"
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
                          onClick={onOpenChangePassword}
                          className="flex items-center w-full px-3 py-2 text-xs font-bold text-token-text-secondary uppercase tracking-widest hover:bg-token-surface-active rounded-sm transition-all"
                        >
                          Seguridad
                        </button>
                        <button
                          onClick={onOpenManual}
                          className="flex items-center w-full px-3 py-2 text-xs font-bold text-token-text-secondary uppercase tracking-widest hover:bg-token-surface-active rounded-sm transition-all"
                        >
                          Ayuda
                        </button>
                      </div>

                      <div className="p-1 border-t border-token-border-subtle">
                        <button
                          onClick={onLogout}
                          className="flex items-center w-full px-3 py-2 text-xs font-bold text-(--status-error) uppercase tracking-widest hover:bg-(--status-error)/10 rounded-sm transition-all"
                        >
                          Finalizar Sesión
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="hidden sm:block">
              {currentUser && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2.5 h-11 rounded-md border border-(--status-error)/20 bg-(--status-error)/5 hover:bg-(--status-error)/10 text-red-700 dark:text-(--status-error) text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                >
                  Salir
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={onCloseChangePassword} />
      <UserManualModal isOpen={isManualModalOpen} onClose={onCloseManual} />
    </>
  );
};

export default HeaderView;
