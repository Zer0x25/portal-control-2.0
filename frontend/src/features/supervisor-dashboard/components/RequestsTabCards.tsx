import { FC } from "react";
import Button from "../../../components/ui/Button";
import { CorrectionRequest } from "../../../types/index";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { TIME_RECORD_FIELD_LABELS } from "../../../utils/mappings";
import {
  AttachmentIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
} from "../../../components/ui/icons/index";

export const PendingRequestCard: FC<{
  req: CorrectionRequest;
  employeeName?: string;
  onApprove: (id: string) => void;
  onReject: (req: CorrectionRequest) => void;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
  isProcessing?: boolean;
}> = ({ req, employeeName, onApprove, onReject, onViewAttachment, isProcessing = false }) => {
  return (
    <div className="p-6 rounded-sm bg-token-surface-card border border-token-border-technical shadow-sm group hover:border-token-accent-brand transition duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-sm bg-token-accent-brand border border-token-accent-brand shadow-lg shadow-token-accent-brand/20 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-token-text-primary uppercase tracking-tight">
              {employeeName || "Operario Técnico"}
            </p>
            <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1">
              Modificación:{" "}
              <span className="text-token-accent-brand">
                {TIME_RECORD_FIELD_LABELS[req.recordField]}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[10px] font-bold uppercase tracking-widest">
          <ClockIcon className="w-3.5 h-3.5" />
          Pendiente de auditoría
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div className="p-3.5 rounded-sm bg-token-surface-stripe border border-token-border-subtle group-hover:border-token-border-technical transition-colors">
          <p className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider mb-1.5 opacity-70">
            Valor Original
          </p>
          <p className="text-[11px] font-bold text-token-text-tertiary line-through opacity-50 tabular-nums">
            {formatDisplayDateTime(req.originalValue)}
          </p>
        </div>
        <div className="p-3.5 rounded-sm bg-token-accent-brand/3 border border-token-accent-brand/20 relative overflow-hidden group-hover:border-token-accent-brand/40 transition-colors">
          <div className="absolute top-0 right-0 w-8 h-8 bg-token-accent-brand/5 rounded-bl-full" />
          <p className="text-[10px] font-semibold text-token-accent-brand uppercase tracking-wider mb-1.5">
            Valor Solicitado
          </p>
          <p className="text-[11px] font-bold text-token-accent-brand tabular-nums">
            {formatDisplayDateTime(req.requestedValue)}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-token-border-subtle flex flex-col gap-4">
        <p className="text-[11px] font-bold text-token-text-secondary leading-relaxed italic px-4 py-3 bg-token-surface-stripe border-l-2 border-token-accent-brand rounded-sm">
          "{req.reason}"
        </p>
        {req.attachment && (
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-2 text-[10px] font-black text-token-accent-brand hover:text-indigo-700 uppercase tracking-widest transition-colors w-fit"
          >
            <AttachmentIcon className="w-3.5 h-3.5" /> VER EVIDENCIA ADJUNTA
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <Button
          variant="secondary"
          className="flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest rounded-sm bg-token-surface-card hover:bg-rose-500 hover:text-white border-token-border-technical hover:border-rose-600 transition-all duration-300"
          onClick={() => onReject(req)}
          disabled={isProcessing}
        >
          Denegar Solicitud
        </Button>
        <Button
          variant="primary"
          className="flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest rounded-sm bg-token-accent-brand hover:brightness-110 shadow-lg shadow-token-accent-brand/20 border-none text-white transition-all duration-300"
          onClick={() => onApprove(req.id)}
          loading={isProcessing}
          disabled={isProcessing}
        >
          Validar en Sistema
        </Button>
      </div>
    </div>
  );
};

export const ApprovedRequestCard: FC<{
  req: CorrectionRequest;
  employeeName?: string;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
}> = ({ req, employeeName, onViewAttachment }) => {
  return (
    <div className="h-full p-4 rounded-sm bg-token-surface-card border border-token-border-technical border-l-4 border-l-emerald-500 shadow-sm transition group flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[12px] font-bold text-token-text-primary uppercase tracking-tight">
            {employeeName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">
              Solicitud validada
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="px-2 py-0.5 rounded-sm bg-emerald-500/10 text-xxs font-bold text-emerald-700 uppercase tracking-wider border border-emerald-500/20">
            Auditor: {req.resolvedBy}
          </div>
          <p className="text-xxs font-semibold text-token-text-tertiary uppercase tracking-wider">
            {req.resolvedAt ? formatDisplayDateTime(new Date(req.resolvedAt).toISOString()) : "-"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 py-1.5 px-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10 w-fit my-2">
        <span className="text-[11px] font-semibold text-token-text-tertiary line-through opacity-50">
          {formatDisplayDateTime(req.originalValue)}
        </span>
        <span className="text-emerald-600 font-bold">→</span>
        <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
          {formatDisplayDateTime(req.requestedValue)}
        </span>
      </div>

      {req.attachment && (
        <div className="mt-auto pt-2 border-t border-token-border-subtle flex justify-end">
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-1 text-xxs font-black text-token-accent-brand hover:text-indigo-700 uppercase tracking-widest transition-colors"
          >
            <AttachmentIcon className="w-3 h-3" /> VER EVIDENCIA
          </button>
        </div>
      )}
    </div>
  );
};

export const RejectedRequestCard: FC<{
  req: CorrectionRequest;
  employeeName?: string;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
}> = ({ req, employeeName, onViewAttachment }) => {
  return (
    <div className="h-full p-4 rounded-sm bg-token-surface-card border border-token-border-technical border-l-4 border-l-rose-500 shadow-sm transition group flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[12px] font-bold text-token-text-primary uppercase tracking-tight">
            {employeeName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <XCircleIcon className="w-3 h-3 text-rose-500" />
            <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-widest">
              Solicitud rechazada
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="px-2 py-0.5 rounded-sm bg-rose-500/10 text-xxs font-bold text-rose-700 uppercase tracking-wider border border-rose-500/20">
            Auditor: {req.resolvedBy}
          </div>
          <p className="text-xxs font-semibold text-token-text-tertiary uppercase tracking-wider">
            {req.resolvedAt ? formatDisplayDateTime(new Date(req.resolvedAt).toISOString()) : "-"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 py-2 px-3 bg-rose-500/5 rounded-sm border border-rose-500/10 w-full my-2">
        <p className="text-[11px] text-rose-700 font-bold italic line-clamp-2 leading-tight">
          "{req.rejectionReason}"
        </p>
      </div>

      {req.attachment && (
        <div className="mt-auto pt-2 border-t border-token-border-subtle flex justify-end">
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-token-accent-brand hover:text-indigo-700 uppercase tracking-wider transition-colors"
          >
            <AttachmentIcon className="w-3.5 h-3.5" /> Ver evidencia
          </button>
        </div>
      )}
    </div>
  );
};
