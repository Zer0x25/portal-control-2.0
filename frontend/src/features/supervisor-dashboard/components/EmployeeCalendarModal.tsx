import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Employee } from "../../../types/index";
import { useCalendarData } from "../../../hooks/useCalendarData";
import ShiftCalendarView from "../../../components/ui/ShiftCalendarView";
import Button from "../../../components/ui/Button";
import { CloseIcon, UserIcon, ShieldCheckIcon } from "../../../components/ui/icons/index";

interface EmployeeCalendarModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 📅 EmployeeCalendarModal: Visor de Expediente Operativo
 * Refactorizado bajo el estándar Industrial-Elegant "DIV clean"
 */
const EmployeeCalendarModal: React.FC<EmployeeCalendarModalProps> = ({
  employee,
  isOpen,
  onClose,
}) => {
  const displayDate = useMemo(() => new Date(), []);
  const filteredEmployees = useMemo(() => [employee], [employee.id]);

  const { scheduleMap, isLoadingCalendar } = useCalendarData({
    viewMode: "month",
    displayDate,
    filteredEmployees,
    selectedEmployeeId: employee.id,
  });

  const headerDisplay = displayDate.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-token-text-primary/60 backdrop-blur-[3px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-[98vw] max-w-[1300px] h-[90vh] bg-token-surface-card rounded-sm shadow-2xl border border-token-border-technical overflow-hidden flex flex-col"
          >
            {/* Technical Accent Area */}
            <div className="absolute top-0 left-0 w-2 h-full bg-sap-blue opacity-40 shrink-0" />

            {/* Cinematic Header */}
            <div className="p-10 pb-6 flex items-center justify-between border-b border-token-border-subtle bg-token-surface-stripe ml-2">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-sm bg-sap-blue border border-sap-blue shadow-lg shadow-sap-blue/20 flex items-center justify-center text-white shrink-0">
                  <UserIcon className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-token-text-primary uppercase tracking-tight leading-none">
                    EXPEDIENTE: {employee.name}
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 text-[9px] font-black bg-token-surface-active text-token-text-primary border border-token-border-subtle rounded-sm uppercase tracking-widest">
                      {employee.position}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-sap-blue animate-pulse" />
                    <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.4em]">
                      PLANIFICACIÓN MAESTRA MTRX
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-3 text-token-text-tertiary hover:text-white hover:bg-rose-600 rounded-sm transition-all"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Technical Sub-Header */}
            <div className="px-12 py-5 flex items-center justify-between bg-token-surface-card border-b border-token-border-subtle ml-2">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[9px] font-black text-sap-blue uppercase tracking-[0.2em] block mb-1">
                    PERIODO TÉCNICO ANALIZADO
                  </span>
                  <h3 className="text-xl font-black text-token-text-primary uppercase tracking-tight">
                    {headerDisplay}
                  </h3>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="px-6 py-2.5 rounded-sm border border-sap-blue/20 bg-sap-blue/[0.03] text-[9px] font-black text-sap-blue uppercase tracking-[0.3em] flex items-center gap-3">
                  <ShieldCheckIcon className="w-4 h-4" />
                  SISTEMA SINCRONIZADO
                </div>
              </div>
            </div>

            {/* Premium Calendar Container */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-token-surface-stripe ml-2">
              {isLoadingCalendar ? (
                <div className="h-full flex flex-col items-center justify-center gap-8">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-sap-blue/10 border-t-sap-blue rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-sap-blue rounded-full animate-ping" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-sap-blue uppercase tracking-[0.6em] animate-pulse">
                    COMPILANDO MATRIZ DE TURNOS...
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="min-w-[800px] h-full"
                >
                  <ShiftCalendarView
                    viewMode="month"
                    currentDisplayDate={displayDate}
                    selectedEmployeeId={employee.id}
                    scheduleMap={scheduleMap}
                    onDayClick={() => {}}
                    cellHeight="h-32 sm:h-36"
                  />
                </motion.div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-8 px-12 bg-token-surface-stripe border-t border-token-border-subtle flex justify-between items-center ml-2">
              <div className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.4em] opacity-40">
                PORTAL OPS V3.0 // CIERRE DE AUDITORÍA INDIVIDUAL
              </div>
              <Button
                onClick={onClose}
                className="px-12 py-4 bg-sap-blue text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-sm hover:brightness-110 shadow-xl shadow-sap-blue/20 transition-all active:scale-95 border-none"
              >
                FINALIZAR REVISIÓN
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default EmployeeCalendarModal;
