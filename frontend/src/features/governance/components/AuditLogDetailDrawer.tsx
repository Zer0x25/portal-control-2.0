import React from "react";
import {
  XMarkIcon,
  ClockIcon,
  UserIcon,
  ServerIcon,
  ActivityIcon,
  ShieldIcon,
} from "../../../components/ui/icons/index";
import { AuditLog } from "../../../types/index";
import { formatLogTimestamp } from "../../../utils/formatters";
import IconBox from "../../../components/ui/IconBox";

interface AuditLogDetailDrawerProps {
  log: AuditLog | null;
  onClose: () => void;
}

interface DiffValue {
  oldValue?: unknown;
  newValue?: unknown;
}

const isDiffValue = (value: unknown): value is DiffValue => {
  return (
    typeof value === "object" && value !== null && ("oldValue" in value || "newValue" in value)
  );
};

const DiffViewer: React.FC<{ details: Record<string, unknown> }> = ({ details }) => {
  if (!details || typeof details !== "object") return null;

  const entries = Object.entries(details).filter(
    ([key]) => key !== "resource" && key !== "recordId",
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary px-1">
        Atributos Cambiados
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {entries.map(([key, value]) => {
          // Check if it's a diff structure
          const isDiff = isDiffValue(value);

          return (
            <div
              key={key}
              className="bg-token-surface-stripe border border-token-border-technical rounded-sm p-3 relative overflow-hidden group/diff"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono font-bold text-token-text-secondary uppercase">
                  {key}
                </span>
                {isDiff && (
                  <span className="text-[9px] font-bold bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-xs border border-blue-500/20">
                    MODIFICADO
                  </span>
                )}
              </div>

              {isDiff ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 opacity-60">
                    <div className="w-4 h-4 rounded-xs bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-red-600 font-bold">-</span>
                    </div>
                    <pre className="text-[11px] font-mono text-token-text-tertiary whitespace-pre-wrap break-all">
                      {JSON.stringify(value.oldValue, null, 2)}
                    </pre>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-xs bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-green-600 font-bold">+</span>
                    </div>
                    <pre className="text-[11px] font-mono text-token-text-primary whitespace-pre-wrap break-all font-bold">
                      {JSON.stringify(value.newValue, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <pre className="text-[11px] font-mono text-token-text-primary whitespace-pre-wrap break-all">
                  {JSON.stringify(value, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AuditLogDetailDrawer: React.FC<AuditLogDetailDrawerProps> = ({ log, onClose }) => {
  return (
    log && (
      <>
        {/* Overlay */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-90 animate-in fade-in"
        />

        {/* Drawer */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de evento de auditoría"
          className="fixed top-0 right-0 h-full w-full max-w-lg bg-token-surface-card shadow-2xl z-100 border-l border-token-border-technical flex flex-col animate-in fade-in slide-in-from-right [animation-duration:200ms]"
        >
          {/* Header */}
          <div className="p-6 border-b border-token-border-technical flex items-center justify-between bg-token-surface-header">
            <div className="flex items-center gap-4">
              <IconBox
                icon={<ShieldIcon />}
                variant={log.severity === "CRITICAL" ? "danger" : "neutral"}
                size="md"
                className="rounded-sm shadow-sm"
              />
              <div>
                <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight">
                  Detalle de Evento
                </h3>
                <p className="text-[10px] font-bold text-token-text-tertiary font-mono uppercase tracking-widest">
                  ID: {log.id.split("-")[0]}...
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-token-surface-active rounded-full transition-colors text-token-text-tertiary"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Summary Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-token-surface-stripe border border-token-border-technical p-3 rounded-sm space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
                    <UserIcon className="w-3 h-3" />
                    Actor
                  </div>
                  <p className="text-xs font-bold text-token-text-primary truncate">
                    {log.actorUsername}
                  </p>
                </div>
                <div className="bg-token-surface-stripe border border-token-border-technical p-3 rounded-sm space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
                    <ClockIcon className="w-3 h-3" />
                    Fecha/Hora
                  </div>
                  <p className="text-xs font-bold text-token-text-primary">
                    {formatLogTimestamp(log.timestamp)}
                  </p>
                </div>
                <div className="bg-token-surface-stripe border border-token-border-technical p-3 rounded-sm space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
                    <ServerIcon className="w-3 h-3" />
                    Categoría
                  </div>
                  <p className="text-xs font-bold text-token-text-primary uppercase">
                    {log.category || "N/A"}
                  </p>
                </div>
                <div className="bg-token-surface-stripe border border-token-border-technical p-3 rounded-sm space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider">
                    <ShieldIcon className="w-3 h-3" />
                    IP Origen
                  </div>
                  <p className="text-xs font-bold text-token-text-primary">
                    {log.ipAddress || "Interna/Worker"}
                  </p>
                </div>
              </div>

              <div className="bg-token-surface-stripe border border-token-border-technical p-4 rounded-sm">
                <div className="flex items-center gap-2 text-[10px] font-bold text-token-text-tertiary uppercase tracking-wider mb-2">
                  <ActivityIcon className="w-3 h-3" />
                  Acción Realizada
                </div>
                <p className="text-sm font-bold text-token-text-primary leading-tight">
                  {log.action}
                </p>
              </div>
            </div>

            {/* Details / Diff Section */}
            {log.details ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DiffViewer details={log.details} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 opacity-30 grayscale saturate-0">
                <ActivityIcon className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-center">
                  Sin datos adicionales registrados
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-token-border-technical bg-token-surface-stripe flex justify-end">
            <span className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-[0.2em] opacity-40">
              Seguridad Enterprise &bull; Trazabilidad v3.5
            </span>
          </div>
        </div>
      </>
    )
  );
};

export default AuditLogDetailDrawer;
