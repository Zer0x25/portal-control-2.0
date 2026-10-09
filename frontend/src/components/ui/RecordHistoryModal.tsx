import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon, UserIcon, InformationCircleIcon, ShieldIcon, ActivityIcon } from "./icons";
import { useRecordHistory } from "../../hooks/queries/useRecordHistory";
import { formatLogTimestamp } from "../../utils/formatters";
import LoadingSpinner from "./LoadingSpinner";
import Button from "./Button";

interface RecordHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string | null;
  employeeName: string;
  date: string;
}

const ACTION_LABELS: Record<string, string> = {
  TIME_RECORD_EDITED: "Marcaje editado",
  TIME_RECORD_CREATED: "Marcaje creado",
  TIME_RECORD_DELETED: "Marcaje eliminado",
};

const getActionLabel = (action: string) => ACTION_LABELS[action] ?? action;

const RecordHistoryModal: React.FC<RecordHistoryModalProps> = ({
  isOpen,
  onClose,
  recordId,
  employeeName,
  date,
}) => {
  const { data: logs, isLoading } = useRecordHistory(recordId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-token-surface-card rounded-xl shadow-2xl overflow-hidden border border-token-border-technical flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-token-border-subtle flex items-center justify-between bg-token-surface-card">
            <div>
              <h3 className="text-lg font-black text-token-text-primary uppercase tracking-tighter">
                Historial de Cambios
              </h3>
              <p className="text-[10px] font-bold text-token-text-secondary uppercase tracking-widest">
                {employeeName} • {date}
              </p>
            </div>
            <Button
              variant="none"
              onClick={onClose}
              className="p-2 hover:bg-token-surface-hover rounded-full transition-colors shadow-none"
            >
              <CloseIcon className="w-5 h-5 text-token-text-tertiary" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <LoadingSpinner />
                <p className="mt-4 text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em]">
                  Consultando registros...
                </p>
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="py-20 text-center">
                <InformationCircleIcon className="w-12 h-12 text-token-text-tertiary/40 mx-auto mb-4" />
                <p className="text-sm text-token-text-secondary font-medium">
                  No hay registros de auditoría para este marcaje.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {logs.map((log, index) => (
                  <div key={log.id} className="relative flex gap-4">
                    {/* Timeline Connector */}
                    {index !== logs.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-[-32px] w-px bg-token-border-subtle" />
                    )}

                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-token-accent-brand/10 border border-token-accent-brand/20 flex items-center justify-center">
                        <ActivityIcon className="w-5 h-5 text-token-accent-brand" />
                      </div>
                    </div>

                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-token-text-primary uppercase">
                            {getActionLabel(log.action)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-token-surface-technical text-token-text-secondary border border-token-border-subtle">
                            {log.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-token-text-tertiary font-mono">
                          {formatLogTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mb-3 text-[10px] text-token-text-secondary">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span className="font-bold uppercase tracking-tight">
                            {log.actorUsername}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldIcon className="w-3 h-3 text-amber-500" />
                          <span className="font-bold uppercase tracking-tight">{log.severity}</span>
                        </div>
                      </div>

                      {/* Diff View */}
                      {log.details?.oldValue && log.details?.newValue && (
                        <div className="mt-3">
                          {typeof log.details?.correctionRequestId === "string" && (
                            <div className="mb-2 p-2 rounded bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
                              <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                                Aplicado desde solicitud: {String(log.details.correctionRequestId)}
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                              <span className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest block mb-1">
                                Anterior
                              </span>
                              <pre className="text-[10px] text-red-800 dark:text-red-300 font-mono whitespace-pre-wrap">
                                {JSON.stringify(log.details.oldValue, null, 2)}
                              </pre>
                            </div>
                            <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                              <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                                Nuevo
                              </span>
                              <pre className="text-[10px] text-emerald-800 dark:text-emerald-300 font-mono whitespace-pre-wrap">
                                {JSON.stringify(log.details.newValue, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Simple Detail View */}
                      {(!log.details?.oldValue || !log.details?.newValue) && log.details && (
                        <div className="mt-2 p-3 rounded bg-token-surface-stripe border border-token-border-subtle">
                          <pre className="text-[10px] text-token-text-secondary font-mono whitespace-pre-wrap">
                            {typeof log.details === "string"
                              ? log.details
                              : JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-token-surface-stripe border-t border-token-border-subtle flex justify-end">
            <Button
              variant="primary"
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest"
            >
              Cerrar
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RecordHistoryModal;
