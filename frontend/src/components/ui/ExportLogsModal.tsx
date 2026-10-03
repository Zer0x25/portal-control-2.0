import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToasts } from "../../hooks/useToasts";
import { authService } from "../../services/authService";
import { API_BASE_URL } from "../../services/apiBase";
import Button from "./Button";
import { CloseIcon, DocumentTextIcon, CodeBracketSquareIcon } from "./icons/index";
import GlassDatePicker from "./GlassDatePicker";
import { compareBusinessDate, toBusinessDateChile } from "../../utils/dateUtils";
import { useBusinessNow } from "../../hooks/useBusinessNow";

interface ExportLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportLogsModal: React.FC<ExportLogsModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useToasts();
  const businessNow = useBusinessNow({ tickMs: null });
  const today = toBusinessDateChile(businessNow);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "xml") => {
    if (!startDate || !endDate) {
      addToast("Por favor, seleccione un rango de fechas completo.", "warning");
      return;
    }

    // Create dates using local time components to avoid UTC shifts
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    if (start > end) {
      addToast("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
      return;
    }

    if (compareBusinessDate(endDate, today) === 1) {
      addToast("La fecha de fin no puede ser una fecha futura.", "error");
      return;
    }

    setIsExporting(true);
    addToast(`Iniciando exportación a ${format.toUpperCase()}...`, "info");

    try {
      const token = authService.getToken();
      const query = new URLSearchParams();
      query.set("startDate", startDate);
      query.set("endDate", endDate);
      query.set("format", format);
      query.set("token", token || "");

      const downloadUrl = `${API_BASE_URL}/audit-logs/export?${query.toString()}`;

      // Iniciamos la descarga directa
      window.location.href = downloadUrl;

      addToast(`Descarga de ${format.toUpperCase()} iniciada.`, "success");
      onClose();
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      addToast("Ocurrió un error durante la exportación.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg overflow-visible rounded-[2.5rem] border border-white/20 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-gray-900/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sap-blue/60">
                  Seguridad de Datos
                </p>
                <h3 className="text-2xl font-black bg-linear-to-r from-gray-900 to-gray-500 bg-clip-text text-transparent dark:from-white dark:to-gray-400 uppercase tracking-tight">
                  Exportar Auditoría
                </h3>
              </div>
              <button
                onClick={onClose}
                className="group flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 transition-all hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <CloseIcon className="h-5 w-5 opacity-40 group-hover:opacity-100" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-8">
              <div className="rounded-3xl bg-blue-500/5 p-6 border border-blue-500/10">
                <p className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400">
                  Defina el periodo temporal para la extracción de registros. El archivo generado
                  incluirá todos los metadatos técnicos y de seguridad.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GlassDatePicker
                  label="Fecha de Inicio"
                  value={startDate}
                  onChange={setStartDate}
                  className="rounded-2xl"
                />
                <GlassDatePicker
                  label="Fecha de Término"
                  value={endDate}
                  onChange={setEndDate}
                  className="rounded-2xl"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={() => handleExport("csv")}
                  disabled={isExporting}
                  variant="secondary"
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-white/10 shadow-xl"
                >
                  <DocumentTextIcon className="w-5 h-5 mr-3 opacity-60" />
                  {isExporting ? "Procesando..." : "Exportar CSV"}
                </Button>
                <Button
                  onClick={() => handleExport("xml")}
                  disabled={isExporting}
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sap-blue/20"
                >
                  <CodeBracketSquareIcon className="w-5 h-5 mr-3 opacity-60" />
                  {isExporting ? "Procesando..." : "Exportar XML"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExportLogsModal;
