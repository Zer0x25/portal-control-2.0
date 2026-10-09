import React from "react";
import { Employee, LeaveRecord } from "../../../types";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  PlusCircleIcon,
  EditIcon,
  FunnelIcon,
  UserIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  EyeIcon,
} from "../../../components/ui/icons/index";
import DatePickerDialog from "../../../components/ui/DatePickerDialog";
import { LEAVE_TYPES } from "../../../utils/mappings";
import ResponsiveView from "../../../components/ui/ResponsiveView";
import { motion, AnimatePresence } from "framer-motion";
import LeaveListDesktop from "../components/LeaveListDesktop";
import LeaveListMobile from "../components/LeaveListMobile";
import { formatBusinessDate } from "../../../utils/dateUtils";

type ProcessedLeave = LeaveRecord & { employeeName: string };

export interface LeaveManagerViewProps {
  showArchived: boolean;
  filterType: string;
  filterEmployeeName: string;
  fetchNextPage: () => unknown;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  processedLeaves: ProcessedLeave[];
  isFormVisible: boolean;
  editingLeave: LeaveRecord | null;
  leaveToDelete: ProcessedLeave | null;
  type: LeaveRecord["type"] | "";
  startDate: string;
  endDate: string;
  isStartDatePickerOpen: boolean;
  isEndDatePickerOpen: boolean;
  notes: string;
  searchTerm: string;
  isDropdownOpen: boolean;
  searchContainerRef: React.RefObject<HTMLDivElement | null>;
  filteredEmployeesForSearch: Employee[];
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  setFilterType: React.Dispatch<React.SetStateAction<string>>;
  setFilterEmployeeName: React.Dispatch<React.SetStateAction<string>>;
  setIsFormVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setLeaveToDelete: React.Dispatch<React.SetStateAction<ProcessedLeave | null>>;
  setType: React.Dispatch<React.SetStateAction<LeaveRecord["type"] | "">>;
  setStartDate: React.Dispatch<React.SetStateAction<string>>;
  setEndDate: React.Dispatch<React.SetStateAction<string>>;
  setIsStartDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEndDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resetForm: () => void;
  handleEditClick: (leave: LeaveRecord) => void;
  handleSave: (e: React.FormEvent) => Promise<void>;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectEmployee: (employee: Employee) => void;
  handleClearFilter: () => void;
  handleConfirmDeleteLeave: () => Promise<void>;
}

export const LeaveManagerView: React.FC<LeaveManagerViewProps> = ({
  showArchived,
  filterType,
  filterEmployeeName,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  error,
  refetch,
  processedLeaves,
  isFormVisible,
  editingLeave,
  leaveToDelete,
  type,
  startDate,
  endDate,
  isStartDatePickerOpen,
  isEndDatePickerOpen,
  notes,
  searchTerm,
  isDropdownOpen,
  searchContainerRef,
  filteredEmployeesForSearch,
  setShowArchived,
  setFilterType,
  setFilterEmployeeName,
  setIsFormVisible,
  setLeaveToDelete,
  setType,
  setStartDate,
  setEndDate,
  setIsStartDatePickerOpen,
  setIsEndDatePickerOpen,
  setNotes,
  setIsDropdownOpen,
  resetForm,
  handleEditClick,
  handleSave,
  handleSearchChange,
  handleSelectEmployee,
  handleClearFilter,
  handleConfirmDeleteLeave,
}) => {
  return (
    <div id="leave-manager-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="typo-ui-title text-token-text-primary">Gestión de Ausencias</h2>
          <p className="text-xs text-token-text-secondary mt-1">
            Control industrial de vacaciones y licencias.
          </p>
        </div>
        {!isFormVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              onClick={() => setIsFormVisible(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Registrar Ausencia
            </Button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isFormVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-token-surface-card rounded-lg border border-token-border-technical p-6 shadow-sm"
          >
            <form onSubmit={handleSave} className="space-y-8">
              <h3 className="typo-ui-title text-token-text-primary flex items-center gap-2">
                <div className="w-1.5 h-5 bg-token-accent-brand rounded-full"></div>
                {editingLeave ? "Actualizar Ausencia" : "Nueva Solicitud"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div ref={searchContainerRef} className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
                      Colaborador
                    </label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sap-blue transition-colors" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Nombre..."
                        className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        autoComplete="off"
                        required
                        disabled={!!editingLeave}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {isDropdownOpen && searchTerm && (
                        <motion.ul
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mt-2 max-h-60 overflow-y-auto shadow-2xl"
                        >
                          {filteredEmployeesForSearch.length > 0 ? (
                            filteredEmployeesForSearch.map((employee: Employee) => (
                              <li
                                key={employee.id}
                                onClick={() => handleSelectEmployee(employee)}
                                className="px-5 py-3 cursor-pointer text-gray-900 dark:text-gray-200 hover:bg-sap-blue/10 hover:text-sap-blue dark:hover:bg-sap-light-blue/10 dark:hover:text-sap-light-blue transition-colors font-medium border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm"
                              >
                                {employee.name}
                              </li>
                            ))
                          ) : (
                            <li className="px-5 py-3 text-gray-500 italic text-sm">
                              Sin resultados
                            </li>
                          )}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
                      Tipo
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as LeaveRecord["type"])}
                      disabled={!!editingLeave}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 appearance-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled className="dark:bg-gray-900 dark:text-gray-400">
                        Seleccione una opción
                      </option>
                      {LEAVE_TYPES.map((t) => (
                        <option key={t} value={t} className="dark:bg-gray-950 dark:text-gray-100">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
                      Inicio
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsStartDatePickerOpen(true)}
                      disabled={!!editingLeave}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 text-left flex justify-between items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{startDate ? formatBusinessDate(startDate) : "Seleccionar"}</span>
                      <ChevronRightIcon className="w-4 h-4 text-sap-blue rotate-90 opacity-40" />
                    </button>
                    <DatePickerDialog
                      isOpen={isStartDatePickerOpen}
                      onClose={() => setIsStartDatePickerOpen(false)}
                      onSelect={(date) => setStartDate(date)}
                      initialDate={startDate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
                      Fin
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEndDatePickerOpen(true)}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 text-left flex justify-between items-center text-sm"
                    >
                      <span>{endDate ? formatBusinessDate(endDate) : "Seleccionar"}</span>
                      <ChevronRightIcon className="w-4 h-4 text-sap-blue rotate-90 opacity-40" />
                    </button>
                    <DatePickerDialog
                      isOpen={isEndDatePickerOpen}
                      onClose={() => setIsEndDatePickerOpen(false)}
                      onSelect={(date) => setEndDate(date)}
                      initialDate={endDate}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
                      Notas
                    </label>
                    <div className="relative group">
                      <DocumentTextIcon className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-sap-blue transition-colors" />
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 min-h-[80px] text-sm"
                        placeholder="Observaciones..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button type="submit" className="px-8 flex items-center gap-2 rounded-xl">
                  {editingLeave ? (
                    <EditIcon className="w-5 h-5" />
                  ) : (
                    <PlusCircleIcon className="w-5 h-5" />
                  )}
                  {editingLeave ? "Actualizar" : "Registrar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsFormVisible(false);
                    resetForm();
                  }}
                  className="px-8 rounded-xl"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 group w-full">
          <EyeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sap-blue transition-colors" />
          <Input
            type="text"
            value={filterEmployeeName}
            onChange={(e) => {
              setFilterEmployeeName(e.target.value);
            }}
            placeholder="Buscar por colaborador..."
            className="pl-12! py-3! bg-white/30! dark:bg-gray-800/20! border-white/20! dark:border-gray-700/50! rounded-2xl! w-full"
          />
          {filterEmployeeName && (
            <button
              onClick={handleClearFilter}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <FunnelIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/30 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 appearance-none text-sm font-medium"
          >
            <option value="">Tipo: Todos</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 px-6 h-[50px] bg-white/30 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/50 rounded-2xl whitespace-nowrap w-full md:w-auto">
          <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
          <label className="flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={() => setShowArchived((prev) => !prev)}
              className="hidden"
            />
            <div
              className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${showArchived ? "bg-sap-blue" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <div
                className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${showArchived ? "translate-x-5" : ""}`}
              ></div>
            </div>
            <span className="ml-3 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
              Ver Archivados
            </span>
          </label>
        </div>
      </div>

      <div className="min-h-[400px]">
        {processedLeaves.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 opacity-50 grayscale">
              🏖️
            </div>
            <p className="text-xl font-bold">Sin ausencias registradas.</p>
            <p className="text-sm">Usa los filtros o registra una nueva para ver resultados.</p>
          </div>
        ) : (
          <ResponsiveView
            mobile={
              <LeaveListMobile
                leaves={processedLeaves}
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                refetch={refetch}
                onEdit={handleEditClick}
                onDelete={setLeaveToDelete}
              />
            }
            desktop={
              <LeaveListDesktop
                leaves={processedLeaves}
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                refetch={refetch}
                onEdit={handleEditClick}
                onDelete={setLeaveToDelete}
              />
            }
          />
        )}
      </div>

      <AnimatePresence>
        {leaveToDelete && (
          <ConfirmationModal
            isOpen
            onClose={() => setLeaveToDelete(null)}
            onConfirm={handleConfirmDeleteLeave}
            title="Finalizar Registro"
            message={`¿Está seguro de finalizar la ausencia de ${leaveToDelete.employeeName}? Se fijará la fecha de término al día de ayer para archivar el registro inmediatamente.`}
            confirmVariant="primary"
            confirmText="Finalizar"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
