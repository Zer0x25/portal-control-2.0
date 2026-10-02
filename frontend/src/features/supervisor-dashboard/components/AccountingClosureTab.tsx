import React from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronRightIcon,
  KeyIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from "../../../components/ui/icons/index";
import { AnimatePresence, motion } from "framer-motion";
import DatePickerDialog from "../../../components/ui/DatePickerDialog";
import { formatBusinessDate } from "../../../utils/dateUtils";
import { useAccountingClosureTabController } from "../hooks/useAccountingClosureTabController";

/**
 * 🔐 AccountingClosureTab: Protocolo de Blindaje Contable
 * Refactorizado bajo el estándar Industrial-Elegant "DIV clean"
 */
const AccountingClosureTab: React.FC = () => {
  const {
    accountingLockDate,
    closureHistory,
    endDate,
    handleConfirmClosure,
    handleNavigateToCorrections,
    handleValidation,
    historyError,
    isConfirmModalOpen,
    isEndDatePickerOpen,
    isHistoryLoading,
    isHistoryModalOpen,
    isLoading,
    openHistoryModal,
    parseDetailsObject,
    setEndDate,
    setIsConfirmModalOpen,
    setIsEndDatePickerOpen,
    setIsHistoryModalOpen,
    resetValidation,
    startDate,
    validationResult,
  } = useAccountingClosureTabController();

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative min-h-[500px] pt-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cabecera Técnica */}
        <div className="lg:col-span-12">
          <Card
            variant="premium"
            className="group p-6 border-token-border-technical relative overflow-hidden bg-token-surface-card rounded-sm shadow-sm"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600 opacity-60 shrink-0" />
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-sm bg-sap-blue/5 flex items-center justify-center text-sap-blue shrink-0 shadow-inner border border-sap-blue/10">
                <KeyIcon className="w-7 h-7" />
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="text-[11px] font-semibold text-sap-blue uppercase tracking-wider mb-2">
                  Protocolo de Seguridad Operativa
                </h3>
                <h1 className="text-2xl font-bold text-token-text-primary uppercase tracking-tight">
                  {accountingLockDate
                    ? `Período Blindado: ${formatBusinessDate(accountingLockDate, { day: "2-digit", month: "long", year: "numeric" })}`
                    : "Sistema de Control sin Inicializar"}
                </h1>
                <div className="flex items-center gap-3 bg-token-surface-stripe px-3.5 py-2 rounded-sm border border-token-border-technical w-fit group-hover:border-sap-blue/30 transition-colors mx-auto md:mx-0 mt-3 shadow-sm">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                  <p className="text-[11px] font-bold text-token-text-secondary uppercase tracking-wider">
                    {accountingLockDate
                      ? "Estado de Integridad: LEDGER_SAFE (Cierre Histórico)"
                      : "Estado Crítico: Se requiere inicialización de integridad"}
                  </p>
                </div>
                <div className="mt-3">
                  <Button
                    onClick={openHistoryModal}
                    variant="secondary"
                    className="text-[11px] font-bold uppercase tracking-wider"
                  >
                    Ver Historial de Cierres
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Configuración del Nuevo Cierre */}
        <div className="lg:col-span-12">
          <Card className="p-6 bg-token-surface-card border-token-border-technical rounded-sm shadow-sm space-y-8">
            <h4 className="text-[11px] font-bold text-token-text-primary uppercase tracking-wider flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 bg-sap-blue rounded-full shadow-sm" />
              Configuración de Punto de Sellado
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider ml-1 block">
                  Línea Base Actual (LOCKED)
                </label>
                <button
                  disabled
                  className="w-full px-5 py-4 bg-token-surface-stripe border border-token-border-technical rounded-sm text-left flex justify-between items-center opacity-60 cursor-not-allowed shadow-inner"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[16px] font-bold text-token-text-primary tabular-nums">
                      {startDate ? startDate : "---"}
                    </span>
                    <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-wide">
                      Inicio de Segmento Operativo
                    </span>
                  </div>
                  <ClockIcon className="w-5 h-5 text-token-text-tertiary opacity-40" />
                </button>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-semibold text-sap-blue uppercase tracking-wider ml-1 block">
                  Nuevo Límite de Cierre (CUT-OFF)
                </label>
                <button
                  onClick={() => setIsEndDatePickerOpen(true)}
                  disabled={!startDate}
                  className="w-full px-5 py-4 bg-token-surface-card border border-token-border-technical rounded-sm hover:border-sap-blue focus:ring-1 focus:ring-sap-blue transition-all group flex justify-between items-center shadow-sm active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[16px] font-bold text-token-text-primary tabular-nums group-hover:text-sap-blue transition-colors">
                      {endDate ? endDate : "DEFINIR"}
                    </span>
                    <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-wide">
                      Frontera de Inalterabilidad
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-sm bg-sap-blue/10 flex items-center justify-center border border-sap-blue/20 group-hover:bg-sap-blue group-hover:text-white transition-all shadow-sm">
                    <ChevronRightIcon className="w-4 h-4 rotate-90" />
                  </div>
                </button>
                <DatePickerDialog
                  isOpen={isEndDatePickerOpen}
                  onClose={() => setIsEndDatePickerOpen(false)}
                  onSelect={(date) => {
                    setEndDate(date);
                    resetValidation();
                  }}
                  initialDate={endDate}
                />
              </div>
            </div>

            <Button
              onClick={handleValidation}
              disabled={isLoading || !startDate || !endDate}
              className={`
                w-full py-4 rounded-sm text-[11px] font-bold uppercase tracking-widest transition-all relative overflow-hidden shadow-md active:scale-[0.98]
                ${isLoading ? "bg-token-surface-active cursor-wait" : "bg-sap-blue hover:brightness-110 text-white border-none truncate px-6"}
              `}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3 animate-pulse">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-white/70" />
                  Ejecutando escaneo de integridad estructural...
                </div>
              ) : (
                "Validar Consistencia de Datos"
              )}
            </Button>

            {startDate && endDate && (
              <div className="text-[10px] font-semibold uppercase tracking-wider text-token-text-tertiary bg-token-surface-stripe border border-token-border-technical rounded-sm px-3 py-2">
                Validación incremental activa: {startDate} a {endDate}
              </div>
            )}

            {/* Resultados de Validación Industrial */}
            <AnimatePresence mode="wait">
              {validationResult.status !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pt-6"
                >
                  {validationResult.status === "success" ? (
                    <div className="p-8 bg-emerald-600/5 border border-emerald-600/20 rounded-sm text-center relative overflow-hidden group/success shadow-inner">
                      <div className="absolute -top-10 -right-10 opacity-[0.05] group-hover:opacity-[0.10] transition-opacity rotate-12">
                        <ShieldCheckIcon className="w-40 h-40" />
                      </div>
                      <div className="flex flex-col items-center gap-6 relative z-10">
                        <div className="w-16 h-16 rounded-sm bg-emerald-600 text-white flex items-center justify-center shadow-lg border border-emerald-500/20">
                          <ShieldCheckIcon className="w-9 h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-2xl font-bold text-emerald-700 uppercase tracking-tight">
                            Integridad Confirmada
                          </p>
                          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
                            Auditado: Zero Anomalías Detectadas • Protocolo Seguro Activo
                          </p>
                        </div>
                        <div className="max-w-md mx-auto p-4 bg-white dark:bg-black/20 rounded-sm border border-emerald-600/10 text-[13px] text-token-text-secondary leading-relaxed shadow-sm">
                          Todos los registros dentro del segmento temporal cumplen con los
                          parámetros de coherencia maestra. El periodo es apto para sellado digital
                          inalterable.
                        </div>
                        <Button
                          onClick={() => setIsConfirmModalOpen(true)}
                          className="py-4 px-12 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-widest rounded-sm shadow-md transition-all active:scale-95 border-none"
                        >
                          Ejecutar Sello de Seguridad
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-rose-600/5 border border-rose-600/20 rounded-sm space-y-8 relative overflow-hidden shadow-inner">
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-12 h-12 rounded-sm bg-rose-600 text-white flex items-center justify-center shadow-lg border border-rose-500/20">
                          <ExclamationTriangleIcon className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-rose-700 uppercase tracking-tight leading-none">
                            Bloqueo de Seguridad
                          </p>
                          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider mt-2.5">
                            Detección de incongruencias críticas en el período
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                        {validationResult.openShifts.length > 0 && (
                          <div className="p-5 bg-token-surface-card border border-token-border-technical border-t-4 border-t-amber-500 rounded-sm flex flex-col justify-between gap-5 shadow-sm">
                            <div>
                              <p className="text-[20px] font-bold text-token-text-primary tabular-nums leading-none">
                                {validationResult.openShifts.length}
                              </p>
                              <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1.5 leading-tight">
                                Jornadas Abiertas
                              </p>
                            </div>
                            <Button
                              onClick={() => handleNavigateToCorrections("openShifts")}
                              className="w-full py-2.5 bg-token-surface-stripe border border-token-border-technical text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 hover:text-white transition-all rounded-sm shadow-sm"
                            >
                              Sincronizar
                            </Button>
                          </div>
                        )}
                        {validationResult.anomalies.length > 0 && (
                          <div className="p-5 bg-token-surface-card border border-token-border-technical border-t-4 border-t-rose-600 rounded-sm flex flex-col justify-between gap-5 shadow-sm">
                            <div>
                              <p className="text-[20px] font-bold text-token-text-primary tabular-nums leading-none">
                                {validationResult.anomalies.length}
                              </p>
                              <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1.5 leading-tight">
                                Anomalías Directas
                              </p>
                            </div>
                            <Button
                              onClick={() => handleNavigateToCorrections("anomalies")}
                              className="w-full py-2.5 bg-token-surface-stripe border border-token-border-technical text-[10px] font-bold uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all rounded-sm shadow-sm"
                            >
                              Intervenir
                            </Button>
                          </div>
                        )}
                        {validationResult.pendingRequests.length > 0 && (
                          <div className="p-5 bg-token-surface-card border border-token-border-technical border-t-4 border-t-sap-blue rounded-sm flex flex-col justify-between gap-5 shadow-sm">
                            <div>
                              <p className="text-[20px] font-bold text-token-text-primary tabular-nums leading-none">
                                {validationResult.pendingRequests.length}
                              </p>
                              <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1.5 leading-tight">
                                Ediciones Pendientes
                              </p>
                            </div>
                            <Button
                              onClick={() => handleNavigateToCorrections("requests")}
                              className="w-full py-2.5 bg-token-surface-stripe border border-token-border-technical text-[10px] font-bold uppercase tracking-wider hover:bg-sap-blue hover:text-white transition-all rounded-sm shadow-sm"
                            >
                              Liquidar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmClosure}
        title="CIERRE DEFINITIVO DE PERIODO"
        confirmText="CONFIRMAR SELLO DIGITAL"
        confirmVariant="danger"
        message={
          <div className="space-y-12 py-8">
            <div className="flex flex-col items-center text-center gap-8">
              <div className="w-28 h-28 rounded-sm bg-rose-600 flex items-center justify-center text-white shadow-2xl shadow-rose-600/40 border border-white/10">
                <ExclamationTriangleIcon className="w-16 h-16" />
              </div>
              <div className="space-y-2.5">
                <h5 className="text-4xl font-bold text-token-text-primary uppercase tracking-tighter">
                  ¿SELLAR REGISTRO?
                </h5>
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-[0.4em]">
                  OPERACIÓN NO REVERSIBLE • LEDGER_UPDATE_LOCK
                </p>
              </div>
            </div>

            <div className="p-10 bg-rose-600/5 border border-rose-600/20 rounded-sm relative overflow-hidden shadow-inner">
              <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
                <ShieldCheckIcon className="w-20 h-20" />
              </div>
              <div className="relative z-10 space-y-8">
                <p className="text-[15px] font-bold text-token-text-primary leading-relaxed text-center">
                  SE SELLARA EL PERIODO HASTA EL <br />
                  <span className="text-2xl font-bold text-rose-600 uppercase tracking-tight block mt-3">
                    {formatBusinessDate(endDate, {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </p>
                <div className="h-[1px] w-full bg-rose-600/10" />
                <p className="text-[11px] font-semibold text-token-text-tertiary leading-relaxed text-center uppercase tracking-wider">
                  ESTA OPERACIÓN BLINDARÁ LOS REGISTROS HISTÓRICOS. <br />
                  SE DESACTIVARÁ CUALQUIER PERMISO DE ESCRITURA PARA ESTE RANGO TEMPORAL EN LA DB
                  MAESTRA.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 justify-center text-[10px] font-bold text-token-text-tertiary uppercase tracking-[0.2em] bg-token-surface-stripe py-4 border border-token-border-technical rounded-sm shadow-sm">
              <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              SISTEMA EN ESPERA DE FIRMA ELECTRÓNICA
            </div>
          </div>
        }
      />

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-sm border border-token-border-technical bg-token-surface-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-token-border-technical px-5 py-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-token-text-primary">
                  Historial de Cierres Contables
                </h3>
                <p className="text-xs text-token-text-tertiary">
                  Incluye cierres manuales y automáticos.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="max-h-[60vh] overflow-auto p-5">
              {isHistoryLoading && (
                <p className="text-sm text-token-text-tertiary">Cargando historial...</p>
              )}
              {!isHistoryLoading && historyError && (
                <p className="text-sm text-rose-600">{historyError}</p>
              )}
              {!isHistoryLoading && !historyError && closureHistory.length === 0 && (
                <p className="text-sm text-token-text-tertiary">
                  No hay eventos de cierre registrados.
                </p>
              )}
              {!isHistoryLoading && !historyError && closureHistory.length > 0 && (
                <div className="space-y-2">
                  {closureHistory.map((log) => {
                    const details = parseDetailsObject(log.details);
                    const isManual = log.action === "CONFIG_SET";
                    const previousValue = details.previousValue;
                    const newValue = details.newValue;
                    return (
                      <div
                        key={log.id}
                        className="rounded-sm border border-token-border-technical bg-token-surface-stripe p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold uppercase tracking-wide text-token-text-primary">
                            {isManual ? "Manual" : "Automático"}
                          </span>
                          <span className="text-token-text-tertiary">•</span>
                          <span className="font-mono text-token-text-secondary">
                            {new Date(log.timestamp).toLocaleString("es-CL")}
                          </span>
                          <span className="text-token-text-tertiary">•</span>
                          <span className="text-token-text-secondary">
                            Actor: {log.actorUsername || "SYSTEM"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-token-text-primary">
                          {isManual
                            ? `Cambio de cierre contable: ${String(previousValue ?? "null")} -> ${String(newValue ?? "null")}`
                            : (details.message as string) || "Cierre contable automático aplicado."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingClosureTab;
