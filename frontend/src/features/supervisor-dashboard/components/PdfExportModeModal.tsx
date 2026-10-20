import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import { TableCellsIcon, DocumentArrowDownIcon } from "../../../components/ui/icons";

interface PdfExportModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportSummary: () => Promise<void> | void;
  onExportCompiled: () => Promise<void> | void;
}

/**
 * Modal de selección de formato de exportación PDF del tab de reportes.
 * Extraído de ReportsTab (spec 031 T3) y migrado al estándar de
 * CinematicModal: role/aria-modal, labelledby, Escape y focus trap.
 */
const PdfExportModeModal: React.FC<PdfExportModeModalProps> = ({
  isOpen,
  onClose,
  onExportSummary,
  onExportCompiled,
}) => (
  <CinematicModal
    isOpen={isOpen}
    onClose={onClose}
    title="Arquitectura Documental"
    maxWidth="max-w-xl"
  >
    <div className="text-center">
      <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest opacity-70">
        SELECCIONE EL FORMATO DE COMPILACIÓN
      </p>
    </div>

    <div className="mt-8 space-y-6">
      <button
        onClick={async () => {
          await onExportSummary();
        }}
        className="flex w-full items-center rounded-sm border border-token-border-subtle bg-token-surface-stripe p-6 text-left transition duration-300 group hover:border-sap-blue hover:shadow-xl"
      >
        <div className="bg-sap-blue/10 mr-4 rounded-sm p-4 text-sap-blue transition-colors group-hover:bg-sap-blue group-hover:text-white">
          <TableCellsIcon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-black uppercase tracking-tight text-token-text-primary">
            Resumen Analítico
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-sap-blue">
            MATRIZ TÉCNICA COMPARATIVA DE EQUIPO
          </div>
        </div>
      </button>

      <button
        onClick={async () => {
          await onExportCompiled();
        }}
        className="flex w-full items-center rounded-sm border border-token-border-subtle bg-token-surface-stripe p-6 text-left transition duration-300 group hover:border-emerald-500 hover:shadow-xl"
      >
        <div className="bg-emerald-500/10 mr-4 rounded-sm p-4 text-emerald-500 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
          <DocumentArrowDownIcon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-black uppercase tracking-tight text-token-text-primary">
            Expedientes Totales
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
            FICHAS TÉCNICAS INDIVIDUALES COMPILADAS
          </div>
        </div>
      </button>
    </div>

    <button
      onClick={onClose}
      className="mt-8 w-full py-3 text-[10px] font-black uppercase tracking-widest text-token-text-tertiary transition-colors hover:text-token-status-error"
    >
      [ CANCELAR OPERACIÓN ]
    </button>
  </CinematicModal>
);

export default PdfExportModeModal;
