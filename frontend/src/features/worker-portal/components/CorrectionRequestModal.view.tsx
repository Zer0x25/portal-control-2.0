import React from "react";
import { createPortal } from "react-dom";
import { DailyTimeRecord, TimeRecordField } from "../../../types";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import {
  CloseIcon,
  DocumentArrowUpIcon,
  EditIcon,
  CheckCircleIcon,
} from "../../../components/ui/icons/index";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { Z } from "../../../constants/zScale";

/**
 * Spec 036 T11: `CorrectionRequestModal` es **presentacion pura**.
 *
 * Los valores, los errores y el handler de envio entran por props (los lleva
 * el hook de dominio) y la maqueta es la misma.
 */
interface CorrectionRequestModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  record: DailyTimeRecord;
  field: TimeRecordField;
  requestedValue: string;
  /** Mensaje de error del campo (o `undefined`). */
  requestedValueError?: string;
  maxRequestedValue: string;
  reason: string;
  /** Mensaje de error del campo (o `undefined`). */
  reasonError?: string;
  attachment: File | null;
  attachmentLabel: string;
  isSubmitting: boolean;
  originalValue: string;
  onRequestedValueChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
}

const FIELD_LABELS: Record<TimeRecordField, string> = {
  entrada: "Inicio de Jornada",
  inicioColacion: "Inicio de Colación",
  finColacion: "Fin de Colación",
  salida: "Fin de Jornada",
};

const CorrectionRequestModalView: React.FC<CorrectionRequestModalViewProps> = ({
  isOpen,
  onClose,
  field,
  requestedValue,
  requestedValueError,
  maxRequestedValue,
  reason,
  reasonError,
  attachment,
  attachmentLabel,
  isSubmitting,
  originalValue,
  onRequestedValueChange,
  onReasonChange,
  onFileChange,
  formProps,
}) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className={`fixed inset-0 ${Z.modal} flex items-center justify-center p-4`}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg bg-token-surface-card backdrop-blur-md rounded-2xl border border-token-border-technical shadow-4xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-4 flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sap-blue/10 flex items-center justify-center text-sap-blue">
              <EditIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-token-text-primary uppercase italic tracking-tighter">
                Solicitud de Corrección
              </h3>
              <p className="text-[10px] font-black text-sap-blue uppercase tracking-[0.3em] mt-1">
                Rectificación de Marcaje
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 text-token-text-secondary hover:text-token-text-primary"
            aria-label="Cerrar modal"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        <form {...formProps} className="p-8 pt-4 space-y-6">
          <div className="p-5 rounded-2xl bg-sap-blue/5 border border-sap-blue/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-sap-blue uppercase tracking-widest">
                Campo a corregir
              </span>
              <span className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest">
                Valor actual
              </span>
            </div>
            <div className="flex justify-between items-end">
              <p className="text-sm font-black text-token-text-primary uppercase">
                {FIELD_LABELS[field]}
              </p>
              <p className="text-xs font-black font-mono text-token-text-secondary">
                {formatDisplayDateTime(originalValue).split(" ")[1] || "--:--"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Nuevo Valor Solicitado"
              type="datetime-local"
              value={requestedValue}
              max={maxRequestedValue}
              onChange={(e) => onRequestedValueChange(e.target.value)}
              error={requestedValueError}
              className="rounded-md border-token-border-technical focus:ring-sap-blue"
            />

            <div className="space-y-2">
              <label
                htmlFor="correction-reason"
                className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest pl-1"
              >
                Motivo de la Solicitud
              </label>
              <textarea
                id="correction-reason"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                rows={3}
                aria-invalid={reasonError ? "true" : undefined}
                aria-describedby={reasonError ? "correction-reason-error" : undefined}
                className={`w-full p-4 rounded-md bg-token-surface-stripe text-sm font-medium focus:ring-2 focus:ring-sap-blue outline-none transition-all text-token-text-primary border ${
                  reasonError ? "border-token-status-error" : "border-token-border-technical"
                }`}
                placeholder="Explique brevemente por qué requiere este cambio..."
              />
              {reasonError && (
                <p
                  id="correction-reason-error"
                  className="ml-1 text-[10px] font-black uppercase tracking-widest text-token-status-error"
                >
                  {reasonError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest pl-1">
                Justificativo Adjunto
              </label>
              <label className="relative flex flex-col items-center justify-center h-32 w-full p-4 border-2 border-dashed border-token-border-technical rounded-md hover:bg-sap-blue/5 hover:border-sap-blue/30 transition-all cursor-pointer group">
                <input
                  type="file"
                  className="sr-only"
                  onChange={onFileChange}
                  accept="image/*,.pdf"
                />
                <DocumentArrowUpIcon className="w-8 h-8 text-token-text-tertiary group-hover:text-sap-blue transition-colors mb-2" />
                <span className="text-xs font-black text-token-text-secondary group-hover:text-token-text-primary uppercase tracking-tighter">
                  {attachmentLabel}
                </span>
                {attachment && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-md h-12 uppercase font-black text-[10px] tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-2 rounded-md h-12 uppercase font-black text-[10px] tracking-widest shadow-xl shadow-blue-500/20"
            >
              {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CorrectionRequestModalView;
