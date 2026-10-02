import React from "react";
import { CloseIcon, DocumentArrowDownIcon } from "./icons/index";

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment:
    | {
        filename: string;
        mimeType: string;
        data: string; // base64
      }
    | null
    | undefined;
}

const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  isOpen,
  onClose,
  attachment,
}) => {
  if (!isOpen || !attachment) {
    return null;
  }

  const isImage = attachment.mimeType.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-token-text-primary/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attachment-modal-title"
    >
      <div
        className="bg-token-surface-card border border-token-border-technical rounded-sm shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-token-border-technical bg-token-surface-stripe shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-sap-blue rounded-full" />
            <h3
              id="attachment-modal-title"
              className="text-[13px] font-bold text-token-text-primary uppercase tracking-widest truncate max-w-md"
            >
              Vista: {attachment.filename}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={attachment.data}
              download={attachment.filename}
              className="inline-flex items-center px-4 py-2 bg-sap-blue hover:brightness-110 text-white text-[11px] font-bold uppercase tracking-widest rounded-sm shadow-md transition-all active:scale-95"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Descargar
            </a>
            <button
              onClick={onClose}
              className="p-2 text-token-text-tertiary hover:text-sap-blue hover:bg-sap-blue/10 rounded-sm transition-all"
              aria-label="Cerrar modal"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-auto p-6 bg-token-surface-card">
          {isImage ? (
            <img
              src={attachment.data}
              alt={attachment.filename}
              className="max-w-full h-auto mx-auto shadow-sm border border-token-border-subtle"
            />
          ) : isPdf ? (
            <iframe
              src={attachment.data}
              className="w-full h-full border-token-border-subtle border"
              title={attachment.filename}
            />
          ) : (
            <div className="text-center py-20 bg-token-surface-stripe rounded-sm border border-token-border-technical m-4">
              <p className="text-token-text-primary font-bold text-sm mb-2">
                Tipo de archivo '{attachment.mimeType}' no compatible
              </p>
              <p className="text-token-text-tertiary text-[12px]">
                Por favor, utilice el botón de descarga para visualizar el documento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentViewerModal;
