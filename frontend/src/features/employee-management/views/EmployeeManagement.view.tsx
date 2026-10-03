import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "../../../components/ui/Button";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import ShiftHistoryModal from "../../../components/ui/ShiftHistoryModal";
import CinematicModal from "../../../components/ui/CinematicModal";
import {
  ExportIcon,
  ArchiveBoxIcon,
  UserPlusIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
} from "../../../components/ui/icons/index";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeListCard from "../components/EmployeeListCard";
import ImportModal from "../../../components/ui/ImportModal";
import PageHeader from "../../../components/ui/PageHeader";
import Card from "../../../components/ui/Card";
import PremiumSearchInput from "../../../components/ui/PremiumSearchInput";
import type { Employee } from "../../../types";

type EditableEmployeeData = Partial<
  Pick<Employee, "name" | "rut" | "position" | "area" | "workdayType" | "email" | "pin">
> & {
  createUserAccount?: boolean;
};

type EmployeeManagementViewMode = "active" | "archived";
type ExportFormat = "csv" | "excel" | "pdf";

interface ImportFieldSchema {
  prop: string;
  type: StringConstructor;
  required?: boolean;
}

export interface EmployeeManagementViewProps {
  isEmbedded?: boolean;
  areaList: string[];
  workdayTypeList: string[];
  isLoadingEmployees: boolean;
  isLoadingConfig: boolean;
  isFormVisible: boolean;
  editingEmployee: Employee | null;
  employeeToArchive: Employee | null;
  employeeData: EditableEmployeeData;
  nextId: string;
  searchTermTable: string;
  view: EmployeeManagementViewMode;
  isExportMenuOpen: boolean;
  exportMenuRef: React.RefObject<HTMLDivElement | null>;
  historyModalEmployee: Employee | null;
  isImportModalOpen: boolean;
  isMobile: boolean;
  hasOpenRecord: boolean;
  processedEmployees: Employee[];
  hasNextPage: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  setScrollRoot: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>;
  importSchema: Record<string, ImportFieldSchema>;
  canArchive: boolean;
  canEdit: boolean;
  setSearchTermTable: React.Dispatch<React.SetStateAction<string>>;
  handleViewChange: (newView: EmployeeManagementViewMode) => Promise<void>;
  handleOpenNewForm: () => void;
  handleReactivate: (employeeId: string) => Promise<void>;
  setIsExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleEdit: (employee: Employee) => void;
  handleCancel: () => void;
  handleSave: () => Promise<boolean>;
  requestSort: (_key: keyof Employee) => void;
  handleExport: (format: ExportFormat) => void;
  setIsImportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleImportEmployees: (data: Partial<Employee>[]) => Promise<boolean>;
  setEmployeeData: React.Dispatch<React.SetStateAction<EditableEmployeeData>>;
  setEmployeeToArchive: React.Dispatch<React.SetStateAction<Employee | null>>;
  handleConfirmArchive: () => Promise<void>;
  setHistoryModalEmployee: React.Dispatch<React.SetStateAction<Employee | null>>;
  handleSelectEmployeeToArchive: (employee: Employee) => Promise<void>;
}

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Employee Management.
*/
export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = (props) => {
  const {
    isEmbedded,
    areaList,
    workdayTypeList,
    isLoadingEmployees,
    isLoadingConfig,
    isFormVisible,
    editingEmployee,
    employeeToArchive,
    employeeData,
    nextId,
    searchTermTable,
    view,
    isExportMenuOpen,
    exportMenuRef,
    historyModalEmployee,
    isImportModalOpen,
    isMobile,
    hasOpenRecord,
    processedEmployees,
    hasNextPage,
    sentinelRef,
    setScrollRoot,
    importSchema,
    canArchive,
    canEdit,
    setSearchTermTable,
    handleViewChange,
    handleOpenNewForm,
    handleReactivate,
    setIsExportMenuOpen,
    handleEdit,
    handleCancel,
    handleSave,
    requestSort,
    handleExport,
    setIsImportModalOpen,
    handleImportEmployees,
    setEmployeeData,
    setEmployeeToArchive,
    handleConfirmArchive,
    setHistoryModalEmployee,
    handleSelectEmployeeToArchive,
  } = props;

  const archiveModalContent = employeeToArchive && (
    <div className="space-y-4">
      {hasOpenRecord && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm animate-pulse">
          <p className="text-sm text-red-800 dark:text-red-200 font-bold flex items-center gap-2 uppercase tracking-tight">
            <ArrowPathIcon className="w-5 h-5 animate-spin-slow" />
            ¡Atención: Turno Abierto Detectado!
          </p>
          <p className="text-[11px] text-red-700 dark:text-red-300 mt-2 font-semibold">
            Este empleado tiene una marca de entrada sin salida. El archivado procederá, pero el
            registro quedará inconsistente si no se cierra manualmente.
          </p>
        </div>
      )}

      <div className="p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-sm">
        <p className="text-[11px] text-orange-800 dark:text-orange-200 font-bold flex items-center gap-2 uppercase tracking-widest">
          <ArchiveBoxIcon className="w-5 h-5" />
          Protocolo de Desvinculación
        </p>
        <ul className="text-[11px] text-orange-700 dark:text-orange-300 mt-2 space-y-1 font-semibold uppercase tracking-tight list-disc ml-4">
          <li>Eliminación permanente del usuario de acceso.</li>
          <li>Cierre de turnos activos al día de hoy.</li>
          <li>Eliminación de todas las planificaciones futuras.</li>
        </ul>
      </div>

      <p className="text-sm text-token-text-secondary">
        ¿Confirmar el proceso de archivado para:{" "}
        <span className="font-bold text-token-text-primary uppercase">
          {employeeToArchive.name}
        </span>
        ?
      </p>
    </div>
  );

  if (isLoadingEmployees || isLoadingConfig) {
    return (
      <div className="py-20 text-center text-token-text-primary" data-ui-protected>
        Cargando base de datos de personal...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-ui-protected>
      {!isEmbedded && (
        <PageHeader
          eyebrow="Personal"
          eyebrowIcon={<UserPlusIcon className="w-3.5 h-3.5" />}
          icon={<UserPlusIcon className="w-4 h-4" />}
          title="Gestión de Empleados"
          subtitle={`${view === "active" ? "Base de datos activa" : "Archivos de desvinculación"} - ${processedEmployees.length} expedientes`}
          actions={
            <Button
              onClick={handleOpenNewForm}
              className="hidden md:flex h-12 px-6 bg-(--sidebar-text-active) hover:bg-(--sidebar-text-active)/90 text-white font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-(--sidebar-text-active)/20 rounded-sm"
            >
              <UserPlusIcon className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Nuevo Registro</span>
            </Button>
          }
        />
      )}

      <Card variant="premium" noPadding className="border-token-border-technical overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 mb-6 bg-token-surface-stripe border border-token-border-technical rounded-sm">
            <div className="flex-1 max-w-2xl">
              <PremiumSearchInput
                value={searchTermTable}
                onChange={setSearchTermTable}
                placeholder="Buscar por nombre, RUT o cargo..."
                shortcut="/"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex p-1 bg-token-surface-card border border-token-border-technical rounded-sm shadow-sm">
                <button
                  onClick={() => handleViewChange("active")}
                  className={`px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    view === "active"
                      ? "bg-(--sidebar-text-active) text-white shadow-sm"
                      : "text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-active"
                  }`}
                >
                  Activos
                </button>
                <button
                  onClick={() => handleViewChange("archived")}
                  className={`px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    view === "archived"
                      ? "bg-(--sidebar-text-active) text-white shadow-sm"
                      : "text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-active"
                  }`}
                >
                  Archivados
                </button>
              </div>

              <div className="relative" ref={exportMenuRef}>
                <Button
                  variant="secondary"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="h-10 px-4 bg-token-surface-card border-token-border-technical hover:bg-token-surface-hover shadow-sm rounded-sm"
                >
                  <ExportIcon className="w-5 h-5 md:mr-2 text-(--sidebar-text-active)" />
                  <span className="hidden md:inline text-[11px] font-bold uppercase tracking-widest">
                    Utilitarios
                  </span>
                </Button>
                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-token-surface-card rounded-sm shadow-2xl border border-token-border-technical z-50 p-1"
                    >
                      <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-token-text-tertiary border-b border-token-border-subtle mb-1">
                        Acciones Masivas
                      </div>
                      <button
                        onClick={() => {
                          setIsExportMenuOpen(false);
                          setIsImportModalOpen(true);
                        }}
                        className="flex w-full items-center text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-(--sidebar-text-active) hover:bg-(--sidebar-text-active) hover:text-white rounded-sm transition-colors"
                      >
                        <DocumentArrowUpIcon className="w-4 h-4 mr-3" /> Importar Excel
                      </button>
                      <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-token-text-tertiary border-y border-token-border-subtle my-1">
                        Exportar Lista
                      </div>
                      <button
                        onClick={() => handleExport("csv")}
                        className="flex items-center w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-token-text-primary hover:bg-token-surface-active rounded-sm transition-colors"
                      >
                        Formato CSV
                      </button>
                      <button
                        onClick={() => handleExport("excel")}
                        className="flex items-center w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-token-text-primary hover:bg-token-surface-active rounded-sm transition-colors"
                      >
                        Formato Excel
                      </button>
                      <button
                        onClick={() => handleExport("pdf")}
                        className="flex items-center w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-token-text-primary hover:bg-token-surface-active rounded-sm transition-colors"
                      >
                        IMPRIMIR PDF
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div
            ref={setScrollRoot}
            className="h-[450px] overflow-y-scroll border border-token-border-technical rounded-sm shadow-inner bg-token-surface-stripe w-full relative z-10 custom-scrollbar"
          >
            <EmployeeListCard
              paginatedEmployees={processedEmployees}
              sortConfig={null}
              requestSort={requestSort}
              onEdit={handleEdit}
              onArchive={handleSelectEmployeeToArchive}
              onReactivate={handleReactivate}
              currentPage={1}
              totalPages={1}
              onPageChange={() => {}}
              view={view}
              isMobile={isMobile}
              canEdit={canEdit}
              canArchive={canArchive}
              hidePagination={true}
            />

            <div className="w-full py-12 flex flex-col items-center justify-center text-token-text-tertiary bg-token-surface-stripe border-t border-token-border-subtle">
              <div ref={sentinelRef} className="h-4 w-full" />
              {isLoadingEmployees ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-(--sidebar-text-active) border-t-transparent animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--sidebar-text-active)">
                    Sincronizando expedientes...
                  </span>
                </div>
              ) : hasNextPage ? (
                <div className="h-20" />
              ) : processedEmployees.length > 0 ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-24 h-0.5 bg-token-border-technical rounded-full opacity-20" />
                  <span className="text-[9px] uppercase font-bold tracking-[0.3em] opacity-40">
                    Fin del Catálogo de Personal
                  </span>
                </div>
              ) : (
                <div className="py-24 text-center max-w-sm mx-auto">
                  <div className="w-20 h-20 bg-token-surface-card rounded-sm border border-token-border-technical flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/5">
                    <ArchiveBoxIcon className="w-10 h-10 text-token-text-tertiary opacity-30" />
                  </div>
                  <h4 className="text-sm font-bold text-token-text-primary uppercase tracking-tight mb-2">
                    Sin Registros
                  </h4>
                  <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-widest leading-relaxed">
                    No se encontraron expedientes coincidentes con los criterios de búsqueda.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <CinematicModal
        isOpen={isFormVisible}
        onClose={handleCancel}
        title={
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-(--sidebar-text-active)/10 rounded-sm">
              <ArchiveBoxIcon className="w-6 h-6 text-(--sidebar-text-active)" />
            </div>
            <span className="font-bold uppercase tracking-tight">
              {editingEmployee ? "Actualización de Expediente" : "Alta de Nuevo Personal"}
            </span>
          </div>
        }
        maxWidth="max-w-4xl"
      >
        <EmployeeForm
          onSave={handleSave}
          onCancel={handleCancel}
          employeeData={employeeData}
          setEmployeeData={setEmployeeData}
          isEditing={!!editingEmployee}
          nextEmployeeId={nextId}
          existingEmployees={processedEmployees}
          employeeIdToEdit={editingEmployee?.id}
          areaList={areaList}
          workdayTypeList={workdayTypeList}
          hasLinkedUser={false}
        />
      </CinematicModal>

      <ConfirmationModal
        isOpen={!!employeeToArchive}
        onClose={() => setEmployeeToArchive(null)}
        onConfirm={() => {
          handleConfirmArchive();
          setEmployeeToArchive(null);
        }}
        title="Confirmar Archivo de Personal"
        message={archiveModalContent}
        confirmText="Sí, Archivar"
        cancelText="Cancelar"
        confirmVariant="danger"
      />

      {historyModalEmployee && (
        <ShiftHistoryModal
          employeeId={historyModalEmployee.id}
          employeeName={historyModalEmployee.name}
          isOpen={true}
          onClose={() => setHistoryModalEmployee(null)}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button
          onClick={handleOpenNewForm}
          className="w-14 h-14 rounded-full bg-(--sidebar-text-active) text-white shadow-2xl flex items-center justify-center p-0 border-none active:scale-95 transition-transform"
          title="Nuevo Registro"
        >
          <UserPlusIcon className="w-8 h-8" />
        </Button>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportEmployees}
        title="Importar Personal"
        schema={importSchema}
      />
    </div>
  );
};
