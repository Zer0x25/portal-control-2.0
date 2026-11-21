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
    <div
      data-list-group="request-queue"
      className="p-6 rounded-sm bg-token-surface-card border border-token-border-technical shadow-sm group hover:border-token-accent-brand transition duration-300"
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-sm bg-token-accent-brand border border-token-accent-brand shadow-lg shadow-token-accent-brand/20 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="typo-list-primary text-token-text-primary uppercase tracking-tight">
              {employeeName || "Operario Técnico"}
            </p>
            <p className="typo-list-secondary text-token-text-tertiary uppercase mt-1">
              Modificación:{" "}
              <span className="text-token-accent-brand">
                {TIME_RECORD_FIELD_LABELS[req.recordField]}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-token-status-warning/10 border border-token-status-warning/30 text-token-status-warning-text text-[10px] font-bold uppercase tracking-widest">
          <ClockIcon className="w-3.5 h-3.5" />
          Pendiente de auditoría
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div className="p-3.5 rounded-sm bg-token-surface-stripe border border-token-border-subtle group-hover:border-token-border-technical transition-colors">
          <p className="typo-list-secondary text-token-text-tertiary uppercase mb-1.5 opacity-70">
            Valor Original
          </p>
          <p className="typo-list-value text-token-text-tertiary line-through opacity-60">
            {formatDisplayDateTime(req.originalValue)}
          </p>
        </div>
        <div className="p-3.5 rounded-sm bg-token-accent-brand/3 border border-token-accent-brand/20 relative overflow-hidden group-hover:border-token-accent-brand/40 transition-colors">
          <div className="absolute top-0 right-0 w-8 h-8 bg-token-accent-brand/5 rounded-bl-full" />
          <p className="typo-list-secondary text-token-accent-brand uppercase mb-1.5">
            Valor Solicitado
          </p>
          <p className="typo-list-value text-token-accent-brand">
            {formatDisplayDateTime(req.requestedValue)}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-token-border-subtle flex flex-col gap-4">
        <p className="typo-list-note text-token-text-secondary px-4 py-3 bg-token-surface-stripe border-l-2 border-token-accent-brand rounded-sm">
          "{req.reason}"
        </p>
        {req.attachment && (
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-2 text-[10px] font-black text-token-accent-brand hover:opacity-80 uppercase tracking-widest transition-colors w-fit"
          >
            <AttachmentIcon className="w-3.5 h-3.5" /> VER EVIDENCIA ADJUNTA
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <Button
          variant="secondary"
          className="flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest rounded-sm bg-token-surface-card hover:bg-token-status-error hover:text-token-text-onAccent border-token-border-technical hover:border-token-status-error transition-all duration-300"
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
    <div
      data-list-group="request-queue"
      className="h-full p-4 rounded-sm bg-token-surface-card border border-token-border-technical border-l-4 border-l-token-status-success shadow-sm transition group flex flex-col justify-between"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="typo-list-primary text-token-text-primary uppercase tracking-tight">
            {employeeName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircleIcon className="w-3 h-3 text-token-status-success" />
            <p className="typo-list-secondary text-token-status-success-text uppercase">
              Solicitud validada
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="px-2 py-0.5 rounded-sm bg-token-status-success/10 text-xxs font-bold text-token-status-success-text uppercase tracking-wider border border-token-status-success/20">
            Auditor: {req.resolvedBy}
          </div>
          <p className="text-xxs font-semibold text-token-text-tertiary uppercase tracking-wider">
            {req.resolvedAt ? formatDisplayDateTime(new Date(req.resolvedAt).toISOString()) : "-"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 py-1.5 px-3 bg-token-status-success/5 rounded-sm border border-token-status-success/15 w-fit my-2">
        <span className="typo-list-value text-token-text-tertiary line-through opacity-60">
          {formatDisplayDateTime(req.originalValue)}
        </span>
        <span className="text-token-status-success-text font-bold">→</span>
        <span className="typo-list-value text-token-status-success-text">
          {formatDisplayDateTime(req.requestedValue)}
        </span>
      </div>

      {req.attachment && (
        <div className="mt-auto pt-2 border-t border-token-border-subtle flex justify-end">
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-1 text-xxs font-black text-token-accent-brand hover:opacity-80 uppercase tracking-widest transition-colors"
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
    <div
      data-list-group="request-queue"
      className="h-full p-4 rounded-sm bg-token-surface-card border border-token-border-technical border-l-4 border-l-token-status-error shadow-sm transition group flex flex-col justify-between"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="typo-list-primary text-token-text-primary uppercase tracking-tight">
            {employeeName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <XCircleIcon className="w-3 h-3 text-token-status-error" />
            <p className="typo-list-secondary text-token-status-error-text uppercase">
              Solicitud rechazada
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="px-2 py-0.5 rounded-sm bg-token-status-error/10 text-xxs font-bold text-token-status-error-text uppercase tracking-wider border border-token-status-error/20">
            Auditor: {req.resolvedBy}
          </div>
          <p className="text-xxs font-semibold text-token-text-tertiary uppercase tracking-wider">
            {req.resolvedAt ? formatDisplayDateTime(new Date(req.resolvedAt).toISOString()) : "-"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 py-2 px-3 bg-token-status-error/5 rounded-sm border border-token-status-error/15 w-full my-2">
        <p className="typo-list-note text-token-status-error-text line-clamp-2">
          "{req.rejectionReason}"
        </p>
      </div>

      {req.attachment && (
        <div className="mt-auto pt-2 border-t border-token-border-subtle flex justify-end">
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-token-accent-brand hover:opacity-80 uppercase tracking-wider transition-colors"
          >
            <AttachmentIcon className="w-3.5 h-3.5" /> Ver evidencia
          </button>
        </div>
      )}
    </div>
  );
};
