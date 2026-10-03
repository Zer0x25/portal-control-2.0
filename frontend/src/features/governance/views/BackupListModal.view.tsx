import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import { ArrowPathIcon, CircleStackIcon, ClockIcon } from "../../../components/ui/icons/index";
import { formatDateTime } from "../../../utils/dateUtils";
import type { BackupFile } from "../../../types";

interface BackupListModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupFile[];
  loading: boolean;
  restoring: string | null;
  error: string | null;
  handleRestore: (filename: string) => Promise<void>;
}

export const BackupListModalView: React.FC<BackupListModalViewProps> = ({
  isOpen,
  onClose,
  backups,
  loading,
  restoring,
  error,
  handleRestore,
}) => {
  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <CircleStackIcon className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white uppercase tracking-tight italic leading-none">
              Respaldo de Sistema
            </h3>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1 italic leading-none">
              Listado de Snapshots y Backups
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando respaldos...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/20 text-center">
            <p className="text-rose-600 dark:text-rose-400 font-medium text-sm">{error}</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No se encontraron respaldos disponibles.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {backups.map((backup) => (
              <div
                key={backup.name}
                className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-white/2 border border-gray-100 dark:border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-gray-400 group-hover:text-indigo-500 transition-colors">
                    <ClockIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatDateTime(backup.createdAt)}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {backup.sizeFormatted}
                      </span>
                      <span
                        className="text-[10px] text-gray-400 truncate max-w-[200px]"
                        title={backup.name}
                      >
                        {backup.name}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRestore(backup.name)}
                  disabled={restoring !== null}
                  className={`opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${
                    restoring === backup.name
                      ? "bg-amber-500 text-white cursor-wait opacity-100"
                      : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                  }`}
                >
                  {restoring === backup.name ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-3 h-3" />
                      Restaurar
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CinematicModal>
  );
};
