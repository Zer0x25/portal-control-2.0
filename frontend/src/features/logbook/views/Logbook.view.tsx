/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Logbook page.
*/

import React from "react";
import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/ui/Button";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  PlusCircleIcon,
  CloseIcon,
  BookOpenIcon,
  HomeIcon,
  CalendarDaysIcon,
} from "../../../components/ui/icons/index";
import { formatDisplayDateTime } from "../../../utils/formatters";
import ShiftReportModal from "../../../components/ui/ShiftReportModal";
import ClosedReportsModal from "../../../components/ui/ClosedReportsModal";
import LogEntriesCard from "../components/LogEntriesCard";
import SupplierEntriesCard from "../components/SupplierEntriesCard";
import Container from "../../../components/ui/Container";
import type { ShiftReport } from "../../../types";

export interface LogbookViewProps {
  isLoadingReports: boolean;
  activeShift: ShiftReport | undefined;
  isMobile: boolean;
  isStartingShift: boolean;
  showShiftHistoryModal: boolean;
  showLogEntryModal: boolean;
  showSupplierEntryModal: boolean;
  showFabMenu: boolean;
  selectedReport: ShiftReport | null;
  showLogoutCountdownModal: boolean;
  countdown: number;
  showCloseShiftConfirmation: boolean;
  canCurrentUserCloseActiveShift: boolean;
  setShowShiftHistoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLogEntryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSupplierEntryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFabMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCloseShiftConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  getResponsibleDisplayName: (username: string) => string;
  executeCloseShift: () => Promise<void>;
  handleStartShift: () => Promise<void>;
  handleUpdateShift: (updatedShift: ShiftReport) => Promise<void>;
  handleOpenReportDetails: (report: ShiftReport) => void;
  handleCloseReportDetails: () => void;
  handleNavigateDashboard: () => void;
  onDownloadPDF: (report: ShiftReport) => Promise<void>;
  onExportExcel: (report: ShiftReport) => Promise<void>;
}

export const LogbookView: React.FC<LogbookViewProps> = ({
  isLoadingReports,
  activeShift,
  isMobile,
  isStartingShift,
  showShiftHistoryModal,
  showLogEntryModal,
  showSupplierEntryModal,
  showFabMenu,
  selectedReport,
  showLogoutCountdownModal,
  countdown,
  showCloseShiftConfirmation,
  canCurrentUserCloseActiveShift,
  setShowShiftHistoryModal,
  setShowLogEntryModal,
  setShowSupplierEntryModal,
  setShowFabMenu,
  setShowCloseShiftConfirmation,
  getResponsibleDisplayName,
  executeCloseShift,
  handleStartShift,
  handleUpdateShift,
  handleOpenReportDetails,
  handleCloseReportDetails,
  handleNavigateDashboard,
  onDownloadPDF,
  onExportExcel,
}) => {
  if (isLoadingReports) {
    return (
      <div className="py-20 text-center text-token-text-primary">
        Cargando Libro de Novedades...
      </div>
    );
  }

  return (
    <Container variant="wide" noPadding data-ui-protected className="space-y-6 pb-20 sm:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in">
        <PageHeader
          eyebrow="Operaciones"
          eyebrowIcon={<BookOpenIcon className="h-3.5 w-3.5" />}
          icon={<BookOpenIcon className="h-4 w-4" />}
          title="Libro de Novedades"
          subtitle="Gestión centralizada de eventos y proveedores del turno"
        />
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <Button
            onClick={() => setShowShiftHistoryModal(true)}
            variant="secondary"
            size="sm"
            className="py-2.5 px-6 text-[11px] font-bold uppercase tracking-widest bg-token-surface-card border-token-border-technical rounded-sm shadow-sm"
          >
            Historial de Turnos
          </Button>
          {isMobile && (
            <Button
              onClick={handleNavigateDashboard}
              variant="primary"
              size="sm"
              className="shadow-sm flex items-center gap-1.5 px-3"
            >
              <HomeIcon className="w-4 h-4" />
              Volver
            </Button>
          )}
        </div>
      </div>

      {activeShift ? (
        <>
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-token-surface-card p-6 rounded-sm border border-token-border-technical shadow-sm relative overflow-hidden group animate-in fade-in">
            <div className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
              <h1 className="text-3xl font-bold text-token-text-primary tracking-tight">
                {activeShift.shiftName}
              </h1>
              <div className="flex items-center gap-2.5 mt-3">
                <div className="w-1.5 h-1.5 rounded-full bg-(--sidebar-text-active) animate-pulse" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-(--sidebar-text-active)">
                  Turno en Curso · Folio #{activeShift.folio}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-3 text-token-text-tertiary">
                <CalendarDaysIcon className="w-4 h-4 opacity-50" />
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {formatDisplayDateTime(activeShift.startTime)}
                </span>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-token-surface-stripe p-5 rounded-sm border border-token-border-technical shadow-inner">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider">
                  Responsable Operativo
                </span>
                <span className="text-[13px] font-bold text-token-text-primary uppercase">
                  {getResponsibleDisplayName(activeShift.responsibleUser)}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-auto transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  <Button
                    onClick={() => setShowCloseShiftConfirmation(true)}
                    variant="danger"
                    size="sm"
                    disabled={!canCurrentUserCloseActiveShift}
                    className="w-full sm:w-auto px-10 h-11 bg-(--status-error) hover:bg-(--status-error)/90 text-white font-bold text-[11px] uppercase tracking-widest rounded-sm flex items-center justify-center gap-2.5 shadow-md shadow-(--status-error)/10"
                  >
                    <CloseIcon className="w-4 h-4" />
                    Cerrar Guardía
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="animate-in fade-in [animation-delay:100ms]">
              <LogEntriesCard
                activeShift={activeShift}
                onUpdateShift={handleUpdateShift}
                showLogEntryModal={showLogEntryModal}
                setShowLogEntryModal={setShowLogEntryModal}
              />
            </div>
            <div className="animate-in fade-in [animation-delay:200ms]">
              <SupplierEntriesCard
                activeShift={activeShift}
                onUpdateShift={handleUpdateShift}
                showSupplierEntryModal={showSupplierEntryModal}
                setShowSupplierEntryModal={setShowSupplierEntryModal}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="py-20 px-6 text-center bg-token-surface-card rounded-sm border border-token-border-technical shadow-sm">
          <div className="w-16 h-16 bg-token-surface-stripe rounded-full flex items-center justify-center mx-auto mb-6 border border-token-border-technical">
            <BookOpenIcon className="w-7 h-7 text-token-text-tertiary" />
          </div>
          <h3 className="text-lg font-bold text-token-text-primary mb-2 tracking-tight uppercase">
            Sin Operación Activa
          </h3>
          <p className="text-[12px] text-token-text-tertiary mb-8 max-w-xs mx-auto leading-relaxed">
            No se ha identificado un turno habilitado. Por favor, inicie la guardia para registrar
            eventos operativos.
          </p>
          <div className="w-fit mx-auto transition-transform active:scale-95">
            <Button
              onClick={handleStartShift}
              size="lg"
              disabled={isStartingShift}
              className="bg-(--sidebar-text-active) text-white shadow-lg shadow-(--sidebar-text-active)/20 px-10 py-4 rounded-sm font-bold uppercase text-[11px] tracking-widest"
            >
              {isStartingShift ? "Habilitando..." : "Iniciar Registro de Guardia"}
            </Button>
          </div>
        </div>
      )}

      <ClosedReportsModal
        isOpen={showShiftHistoryModal}
        onClose={() => setShowShiftHistoryModal(false)}
        onDownloadPDF={onDownloadPDF}
        onExportExcel={onExportExcel}
        onPreview={handleOpenReportDetails}
      />

      {showLogoutCountdownModal && (
        <div
          className="fixed inset-0 z-101 flex items-center justify-center bg-token-text-primary/40 backdrop-blur-[2px] p-4"
          aria-modal="true"
        >
          <div className="p-10 rounded-sm shadow-2xl bg-token-surface-card border border-token-border-technical text-center max-w-sm w-full">
            <h3 className="text-lg font-bold uppercase tracking-tight text-token-text-primary">
              Operación Finalizada
            </h3>
            <p className="my-4 text-[11px] font-semibold uppercase tracking-wider text-token-text-tertiary">
              Cierre de sesión automático en...
            </p>
            <div className="text-6xl font-black font-mono tracking-tighter text-(--sidebar-text-active) tabular-nums">
              {countdown}
            </div>
          </div>
        </div>
      )}
      {showCloseShiftConfirmation && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setShowCloseShiftConfirmation(false)}
          onConfirm={executeCloseShift}
          title="Confirmar Cierre de Turno"
          message="Â¿EstÃ¡ seguro de que desea cerrar el turno actual? Esta acciÃ³n no se puede deshacer."
          confirmText="SÃ­, Cerrar Turno"
          confirmVariant="danger"
        />
      )}
      {/* Floating Action Button for Mobile */}
      {isMobile && activeShift && (
        <div className="fixed bottom-6 right-6 z-60 flex flex-col items-end gap-3">
          {showFabMenu && (
            <div className="flex flex-col items-end gap-3 mb-2">
              {/* Option: Add Supplier */}
              <div className="flex items-center gap-3 drop-shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 [animation-delay:50ms]">
                <span className="bg-token-surface-card px-3 py-1.5 rounded-sm text-[11px] font-bold text-token-text-secondary border border-token-border-technical uppercase tracking-wider">
                  Proveedor
                </span>
                <button
                  onClick={() => {
                    setShowSupplierEntryModal(true);
                    setShowFabMenu(false);
                  }}
                  className="w-12 h-12 rounded-sm bg-(--status-success) text-white flex items-center justify-center shadow-lg shadow-(--status-success)/20 border border-(--status-success)/20 transition-transform active:scale-90"
                >
                  <PlusCircleIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Option: Add Novelty */}
              <div className="flex items-center gap-3 drop-shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 [animation-delay:100ms]">
                <span className="bg-token-surface-card px-3 py-1.5 rounded-sm text-[11px] font-bold text-token-text-secondary border border-token-border-technical uppercase tracking-wider">
                  Novedad
                </span>
                <button
                  onClick={() => {
                    setShowLogEntryModal(true);
                    setShowFabMenu(false);
                  }}
                  className="w-12 h-12 rounded-sm bg-(--sidebar-text-active) text-white flex items-center justify-center shadow-lg shadow-(--sidebar-text-active)/20 border border-(--sidebar-text-active)/20 transition-transform active:scale-90"
                >
                  <PlusCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {/* Main FAB Toggle */}
          <button
            onClick={() => setShowFabMenu(!showFabMenu)}
            aria-expanded={showFabMenu}
            aria-label={showFabMenu ? "Cerrar acciones" : "Abrir acciones"}
            className={`
              w-14 h-14 rounded-sm flex items-center justify-center shadow-2xl transition duration-300 border active:scale-90
              ${showFabMenu ? "bg-token-text-primary border-token-border-technical text-white rotate-45" : "bg-(--sidebar-text-active) border-(--sidebar-text-active)/20 text-white"}
            `}
          >
            <PlusCircleIcon className="w-7 h-7" />
          </button>
        </div>
      )}

      <ShiftReportModal
        isOpen={selectedReport !== null}
        onClose={handleCloseReportDetails}
        report={selectedReport}
        onNavigatePrev={() => {}}
        onNavigateNext={() => {}}
        canNavigatePrev={false}
        canNavigateNext={false}
      />
    </Container>
  );
};
