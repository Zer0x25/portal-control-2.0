import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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

interface CorrectionRequestModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  record: DailyTimeRecord;
  field: TimeRecordField;
  requestedValue: string;
  reason: string;
  attachment: File | null;
  attachmentLabel: string;
  isSubmitting: boolean;
  originalValue: string;
  onSetRequestedValue: (value: string) => void;
  onSetReason: (value: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
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
  reason,
  attachment,
  attachmentLabel,
  isSubmitting,
  originalValue,
  onSetRequestedValue,
  onSetReason,
  onFileChange,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/20 shadow-4xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 pb-4 flex justify-between items-start">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sap-blue/10 flex items-center justify-center text-sap-blue">
                <EditIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                  Solicitud de Corrección
                </h3>
                <p className="text-[10px] font-black text-sap-blue uppercase tracking-[0.3em] mt-1">
                  Rectificación de Marcaje
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <CloseIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-8 pt-4 space-y-6">
            <div className="p-5 rounded-2xl bg-sap-blue/5 border border-sap-blue/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-sap-blue uppercase tracking-widest">
                  Campo a corregir
                </span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Valor actual
                </span>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase">
                  {FIELD_LABELS[field]}
                </p>
                <p className="text-xs font-black font-mono text-gray-500">
                  {formatDisplayDateTime(originalValue).split(" ")[1] || "--:--"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Nuevo Valor Solicitado"
                type="datetime-local"
                value={requestedValue}
                onChange={(e) => onSetRequestedValue(e.target.value)}
                required
                className="rounded-2xl border-gray-100 dark:border-white/10 focus:ring-sap-blue"
              />

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">
                  Motivo de la Solicitud
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => onSetReason(e.target.value)}
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm font-medium focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-white"
                  placeholder="Explique brevemente por qué requiere este cambio..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">
                  Justificativo Adjunto
                </label>
                <label className="relative flex flex-col items-center justify-center h-32 w-full p-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl hover:bg-sap-blue/5 hover:border-sap-blue/30 transition-all cursor-pointer group">
                  <input
                    type="file"
                    className="sr-only"
                    onChange={onFileChange}
                    accept="image/*,.pdf"
                  />
                  <DocumentArrowUpIcon className="w-8 h-8 text-gray-400 group-hover:text-sap-blue transition-colors mb-2" />
                  <span className="text-xs font-black text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 uppercase tracking-tighter">
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
                className="flex-1 rounded-2xl h-14 uppercase font-black text-[10px] tracking-widest"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="flex-[2] rounded-2xl h-14 uppercase font-black text-[10px] tracking-widest shadow-xl shadow-blue-500/20"
              >
                {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default CorrectionRequestModalView;
