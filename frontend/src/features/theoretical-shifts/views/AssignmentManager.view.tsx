import React from "react";
import { AssignedShift } from "../../../types";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { PlusCircleIcon, EyeIcon, CalendarDaysIcon, UserIcon } from "../../../components/ui/icons";
import DatePickerDialog from "../../../components/ui/DatePickerDialog";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import { motion, AnimatePresence } from "framer-motion";
import AssignmentListDesktop from "../components/AssignmentListDesktop";
import AssignmentListMobile from "../components/AssignmentListMobile";
import type { Employee, TheoreticalShiftPattern } from "../../../types";

type ProcessedAssignment = AssignedShift & {
  assignmentWeeklyHours: number;
  employeeName: string;
  shiftPatternName: string;
};

interface ShiftAssignmentFormState {
  editingAssignment: AssignedShift | null;
  setEditingAssignment: React.Dispatch<React.SetStateAction<AssignedShift | null>>;
  selectedEmployeeId: string;
  setSelectedEmployeeId: React.Dispatch<React.SetStateAction<string>>;
  selectedPatternId: string;
  setSelectedPatternId: React.Dispatch<React.SetStateAction<string>>;
  assignmentStartDate: string;
  setAssignmentStartDate: React.Dispatch<React.SetStateAction<string>>;
  assignmentEndDate: string;
  setAssignmentEndDate: React.Dispatch<React.SetStateAction<string>>;
  handleSaveAssignment: () => Promise<boolean>;
  clearForm: () => void;
  isConflictModalOpen: boolean;
  setIsConflictModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  proceedWithSave: () => Promise<boolean>;
  resolutionMode: "OVERLAP" | "SMART_TERMINATE";
  conflictingAssignment: AssignedShift | null;
}

export interface AssignmentManagerViewProps {
  shiftPatterns: TheoreticalShiftPattern[];
  assignmentForm: ShiftAssignmentFormState;
  searchTerm: string;
  showArchived: boolean;
  fetchNextPage: () => unknown;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  flatAssignments: AssignedShift[];
  filteredAssignments: ProcessedAssignment[];
  isMobile: boolean;
  isFormVisible: boolean;
  conflictingAssignmentIds: Set<string>;
  isStartDatePickerOpen: boolean;
  isEndDatePickerOpen: boolean;
  employeeSearchTerm: string;
  isEmployeeDropdownOpen: boolean;
  employeeSearchRef: React.RefObject<HTMLDivElement | null>;
  filteredEmployeesForSearch: Employee[];
  isDeleteModalOpen: boolean;
  assignmentToDelete: string | null;
  terminationMode: "DELETE" | "TERMINATE";
  todayStr: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStartDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEndDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEmployeeSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setIsEmployeeDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenNewForm: () => void;
  handleCancelForm: () => void;
  handleSaveForm: () => Promise<void>;
  handleEditAssignment: (assignment: AssignedShift) => void;
  handleDeleteClick: (id: string) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
  handleConfirmConflict: () => Promise<void>;
  addBusinessDaysChile: (date: string, days: number) => string;
  formatBusinessDate: (date: string, options?: Intl.DateTimeFormatOptions) => string;
}

export const AssignmentManagerView: React.FC<AssignmentManagerViewProps> = ({
  shiftPatterns,
  assignmentForm,
  searchTerm,
  showArchived,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  error,
  refetch,
  flatAssignments,
  filteredAssignments,
  isMobile,
  isFormVisible,
  conflictingAssignmentIds,
  isStartDatePickerOpen,
  isEndDatePickerOpen,
  employeeSearchTerm,
  isEmployeeDropdownOpen,
  employeeSearchRef,
  filteredEmployeesForSearch,
  isDeleteModalOpen,
  assignmentToDelete,
  terminationMode,
  todayStr,
  setSearchTerm,
  setShowArchived,
  setIsStartDatePickerOpen,
  setIsEndDatePickerOpen,
  setEmployeeSearchTerm,
  setIsEmployeeDropdownOpen,
  handleOpenNewForm,
  handleCancelForm,
  handleSaveForm,
  handleEditAssignment,
  handleDeleteClick,
  handleConfirmDelete,
  handleCancelDelete,
  handleConfirmConflict,
  addBusinessDaysChile,
  formatBusinessDate,
}) => {
  return (
    <div id="assignment-manager-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Asignaciones de Turnos
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredAssignments.length} asignaciones cargadas (Infinite Scroll)
          </p>
        </div>
        <AnimatePresence>
          {!isFormVisible && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                onClick={handleOpenNewForm}
                variant="primary"
                className="shadow-lg flex items-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Asignar Turno
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isFormVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 shadow-xl mb-6">
              <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className="w-2 h-6 bg-sap-blue dark:bg-sap-light-blue rounded-full"></div>
                {assignmentForm.editingAssignment ? "Modificar Asignación" : "Nueva Asignación"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div ref={employeeSearchRef} className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 pl-1">
                      Empleado
                    </label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sap-blue transition-colors" />
                      <input
                        type="text"
                        value={employeeSearchTerm}
                        onChange={(e) => {
                          setEmployeeSearchTerm(e.target.value);
                          assignmentForm.setSelectedEmployeeId("");
                          setIsEmployeeDropdownOpen(true);
                        }}
                        onFocus={() => setIsEmployeeDropdownOpen(true)}
                        placeholder="Buscar colaborador..."
                        className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all placeholder:text-gray-400/60"
                      />
                      <AnimatePresence>
                        {isEmployeeDropdownOpen && filteredEmployeesForSearch.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-60 left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden backdrop-blur-sm"
                          >
                            {filteredEmployeesForSearch.map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => {
                                  assignmentForm.setSelectedEmployeeId(e.id);
                                  setEmployeeSearchTerm(e.name);
                                  setIsEmployeeDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-sap-blue/5 dark:hover:bg-sap-blue/20 transition-colors flex items-center justify-between group/item"
                              >
                                <span className="font-medium text-gray-700 dark:text-gray-200 group-hover/item:text-sap-blue transition-colors">
                                  {e.name}
                                </span>
                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500">
                                  {e.rut}
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                      Patrón
                    </label>
                    <select
                      value={assignmentForm.selectedPatternId}
                      onChange={(e) => assignmentForm.setSelectedPatternId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100"
                    >
                      <option value="">-- Seleccionar --</option>
                      {shiftPatterns.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                      Inicio
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsStartDatePickerOpen(true)}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border text-left dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100"
                    >
                      {assignmentForm.assignmentStartDate || "Seleccionar"}
                    </button>
                    <DatePickerDialog
                      isOpen={isStartDatePickerOpen}
                      onClose={() => setIsStartDatePickerOpen(false)}
                      onSelect={assignmentForm.setAssignmentStartDate}
                      initialDate={assignmentForm.assignmentStartDate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                      Fin
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEndDatePickerOpen(true)}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border text-left dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-100"
                    >
                      {assignmentForm.assignmentEndDate || "Indefinido"}
                    </button>
                    <DatePickerDialog
                      isOpen={isEndDatePickerOpen}
                      onClose={() => setIsEndDatePickerOpen(false)}
                      onSelect={assignmentForm.setAssignmentEndDate}
                      initialDate={assignmentForm.assignmentEndDate}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveForm}>Confirmar</Button>
                <Button variant="secondary" onClick={handleCancelForm}>
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 group w-full">
          <EyeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sap-blue transition-colors" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por empleado o patrón..."
            className="pl-12! py-3! bg-white/30! dark:bg-gray-800/20! border-white/20! dark:border-gray-700/50! rounded-2xl! w-full"
          />
        </div>

        <div className="flex items-center gap-3 px-6 h-[50px] bg-white/30 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/50 rounded-2xl whitespace-nowrap w-full md:w-auto">
          <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
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
            <span className="ml-3 text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
              Ver Archivados
            </span>
          </label>
        </div>
      </div>

      <div className="w-full">
        {isMobile ? (
          <AssignmentListMobile
            assignments={filteredAssignments}
            isLoading={isLoading}
            isError={isError}
            error={error}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            refetch={refetch}
            onEdit={handleEditAssignment}
            onDelete={handleDeleteClick}
            conflictingIds={conflictingAssignmentIds}
          />
        ) : (
          <AssignmentListDesktop
            assignments={filteredAssignments}
            isLoading={isLoading}
            isError={isError}
            error={error}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            refetch={refetch}
            onEdit={handleEditAssignment}
            onDelete={handleDeleteClick}
            conflictingIds={conflictingAssignmentIds}
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={assignmentForm.isConflictModalOpen}
        onClose={() => assignmentForm.setIsConflictModalOpen(false)}
        onConfirm={handleConfirmConflict}
        title={
          assignmentForm.resolutionMode === "SMART_TERMINATE"
            ? "Resolución de Conflicto"
            : "Conflicto detectado"
        }
        message={
          assignmentForm.resolutionMode === "SMART_TERMINATE"
            ? (() => {
                return (
                  <div className="text-left space-y-4">
                    <p>
                      El empleado tiene una asignación indefinida vigente que entra en conflicto.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs">
                      <p className="font-bold text-blue-800 dark:text-blue-300 mb-1">
                        Acción Propuesta:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                        <li>
                          Cerrar asignación actual:{" "}
                          <strong>
                            {formatBusinessDate(
                              addBusinessDaysChile(assignmentForm.assignmentStartDate, -1),
                              { weekday: "long", year: "numeric", month: "long", day: "numeric" },
                            )}
                          </strong>
                        </li>
                        <li>
                          Iniciar nueva asignación:{" "}
                          <strong>
                            {formatBusinessDate(assignmentForm.assignmentStartDate, {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </strong>
                        </li>
                      </ul>
                    </div>
                    <p>¿Desea proceder con esta actualización automática?</p>
                  </div>
                );
              })()
            : "Existe superposición de turnos. ¿Continuar?"
        }
        confirmVariant={assignmentForm.resolutionMode === "SMART_TERMINATE" ? "primary" : "danger"}
        confirmText={
          assignmentForm.resolutionMode === "SMART_TERMINATE" ? "Actualizar y Crear" : "Confirmar"
        }
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={terminationMode === "DELETE" ? "Eliminar Asignación" : "Terminar Asignación"}
        message={
          terminationMode === "DELETE" ? (
            (() => {
              const assignment = flatAssignments.find(
                (a: AssignedShift) => a.id === assignmentToDelete,
              );
              const isPastOrOngoing = assignment ? assignment.startDate <= todayStr : false;

              return isPastOrOngoing
                ? "¿Desea eliminar permanentemente esta asignación reciente (menos de 24h) para corregir un error de ingreso?"
                : "¿Estás seguro de que deseas eliminar esta asignación futura? Esta acción borrará el registro permanentemente.";
            })()
          ) : (
            <>
              Esta asignación está en curso o es pasada.
              <br />
              <br />
              Se finalizará con fecha de <strong>AYER</strong> para liberar el turno a partir de
              hoy.
              <br />
              No se eliminará el historial.
            </>
          )
        }
        confirmVariant={terminationMode === "DELETE" ? "danger" : "primary"}
        confirmText={terminationMode === "DELETE" ? "Eliminar" : "Finalizar"}
        confirmDelay={5}
      />
    </div>
  );
};
