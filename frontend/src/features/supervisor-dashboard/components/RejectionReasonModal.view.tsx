import React from "react";
import Button from "../../../components/ui/Button";
import { CloseIcon } from "../../../components/ui/icons/index";
import { Z } from "../../../constants/zScale";
import type { RejectionReasonFormValues } from "../../../schemas/forms/correction";

/**
 * Spec 036 T10: `RejectionReasonModal` es **presentacion pura**.
 *
 * Antes el componente guardaba el motivo en un `useState` y, si venia vacio,
 * el `onConfirm` no se llamaba: el usuario pulsaba "Confirmar Rechazo" y no
 * pasaba nada. Ahora los valores, los errores y los handlers entran por props
 * (los lleva el hook de dominio).
 */
export interface RejectionReasonModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Valores actuales del formulario. */
  values: RejectionReasonFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe el motivo del rechazo. */
  handleReasonChange: (value: string) => void;
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
}

const RejectionReasonModalView: React.FC<RejectionReasonModalViewProps> = ({
  isOpen,
  onClose,
  values,
  getError,
  handleReasonChange,
  isSubmitting,
  formProps,
}) => {
  const reasonError = getError("rejectionReason");
  const reasonErrorId = `${formProps.id}-rejectionReason-error`;
  const reasonId = `${formProps.id}-rejectionReason`;

  return (
    isOpen && (
      <div className={`fixed inset-0 ${Z.overlay} flex items-center justify-center p-4`}>
        {/* Overlay sobrio y elegante (Sólido, sin Glassmorphism) */}
        <div
          className="absolute inset-0 bg-token-text-primary/40 backdrop-blur-[2px] animate-in fade-in"
          onClick={onClose}
        />

        <div
          className="relative bg-token-surface-card rounded-sm shadow-2xl w-full max-w-lg overflow-hidden border border-token-border-technical animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rejection-modal-title"
        >
          {/* Header: Industrial Style */}
          <div className="flex justify-between items-center px-6 py-5 border-b border-token-border-technical bg-token-surface-stripe">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                Acción Requerida
              </span>
              <h3
                id="rejection-modal-title"
                className="text-lg font-bold text-token-text-primary uppercase tracking-tight"
              >
                Motivo de Rechazo
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-sm text-token-text-tertiary hover:text-sap-blue hover:bg-sap-blue/10 transition-all disabled:opacity-30"
              aria-label="Cerrar modal"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <form {...formProps}>
            <div className="p-6 space-y-4">
              <label
                htmlFor={reasonId}
                className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider block"
              >
                Justificación Técnica / Observaciones
              </label>
              <textarea
                id={reasonId}
                rows={4}
                value={values.rejectionReason}
                onChange={(e) => handleReasonChange(e.target.value)}
                disabled={isSubmitting}
                aria-invalid={reasonError ? "true" : undefined}
                aria-describedby={reasonError ? reasonErrorId : undefined}
                className={`block w-full px-4 py-3 border ${reasonError ? "border-token-status-error" : "border-token-border-technical"} rounded-sm shadow-sm bg-token-surface-stripe text-token-text-primary focus:ring-1 focus:ring-sap-blue focus:border-sap-blue text-[13px] disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all placeholder:text-token-text-tertiary placeholder:opacity-50`}
                placeholder="Detalle el motivo del rechazo para el registro de auditoría..."
                required
              />
              {reasonError && (
                <p
                  id={reasonErrorId}
                  className="text-[10px] font-black uppercase tracking-widest text-token-status-error animate-pulse"
                >
                  {reasonError}
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-token-surface-stripe flex justify-end gap-3 border-t border-token-border-technical">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={isSubmitting}
                className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest shadow-md shadow-rose-500/10"
              >
                Confirmar Rechazo
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  );
};

export default RejectionReasonModalView;
