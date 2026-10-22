/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for LeaveManager.
*/

import React from "react";
import { Employee, LeaveRecord } from "../../../types";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Container from "../../../components/ui/Container";
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
import EmptyState from "../../../components/ui/EmptyState";
import LeaveListDesktop from "../components/LeaveListDesktop";
import LeaveListMobile from "../components/LeaveListMobile";
import { formatBusinessDate } from "../../../utils/dateUtils";
import type { LeaveFormValues } from "../../../schemas/forms";
import { Z } from "../../../constants/zScale";

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
  /**
   * Estado del formulario de ausencia (spec 036 T8): lo lleva la capa de
   * formulario, no un `useState` por campo.
   */
  formValues: LeaveFormValues;
  getError: (field: string) => string | undefined;
  setValue: <K extends keyof LeaveFormValues & string>(name: K, value: LeaveFormValues[K]) => void;
  isStartDatePickerOpen: boolean;
  isEndDatePickerOpen: boolean;
  searchTerm: string;
  isDropdownOpen: boolean;
  searchContainerRef: React.RefObject<HTMLDivElement | null>;
  filteredEmployeesForSearch: Employee[];
  isSubmitting: boolean;
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  setFilterType: React.Dispatch<React.SetStateAction<string>>;
  setFilterEmployeeName: React.Dispatch<React.SetStateAction<string>>;
  setIsFormVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setLeaveToDelete: React.Dispatch<React.SetStateAction<ProcessedLeave | null>>;
  setIsStartDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEndDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resetForm: () => void;
  handleEditClick: (leave: LeaveRecord) => void;
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
  formValues,
  getError,
  setValue,
  isStartDatePickerOpen,
  isEndDatePickerOpen,
  searchTerm,
  isDropdownOpen,
  searchContainerRef,
  filteredEmployeesForSearch,
  isSubmitting,
  formProps,
  setShowArchived,
  setFilterType,
  setFilterEmployeeName,
  setIsFormVisible,
  setLeaveToDelete,
  setIsStartDatePickerOpen,
  setIsEndDatePickerOpen,
  setIsDropdownOpen,
  resetForm,
  handleEditClick,
  handleSearchChange,
  handleSelectEmployee,
  handleClearFilter,
  handleConfirmDeleteLeave,
}) => {
  return (
    <Container
      id="leave-manager-section"
      variant="wide"
      noPadding
      data-ui-protected
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="typo-ui-title text-token-text-primary">Gestión de Ausencias</h2>
          <p className="text-xs text-token-text-secondary mt-1">
            Control industrial de vacaciones y licencias.
          </p>
        </div>
        {!isFormVisible && (
          <div className="animate-in fade-in zoom-in-90">
            <Button
              onClick={() => setIsFormVisible(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Registrar Ausencia
            </Button>
          </div>
        )}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ${isFormVisible ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"}`}
      >
        <div className="overflow-hidden">
          <div className="bg-token-surface-card rounded-lg border border-token-border-technical p-6 shadow-sm">
            <form {...formProps} className="space-y-8">
              <h3 className="typo-ui-title text-token-text-primary flex items-center gap-2">
                <div className="w-1.5 h-5 bg-token-accent-brand rounded-full"></div>
                {editingLeave ? "Actualizar Ausencia" : "Nueva Solicitud"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div ref={searchContainerRef} className="relative">
                    <label
                      htmlFor="leave-employee-search"
                      className="block text-xs font-bold uppercase tracking-widest text-token-text-secondary mb-2 pl-1"
                    >
                      Colaborador
                    </label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-token-text-tertiary group-focus-within:text-token-accent-brand transition-colors" />
                      <input
                        id="leave-employee-search"
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Nombre..."
                        className="w-full pl-12 pr-4 py-3 bg-token-surface-card border border-token-border-technical rounded-xl focus:ring-2 focus:ring-token-border-focus outline-none transition-all text-token-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        autoComplete="off"
                        required
                        disabled={!!editingLeave}
                        aria-invalid={getError("employeeId") ? "true" : undefined}
                        aria-describedby={
                          getError("employeeId") ? "leave-employee-error" : undefined
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                      />
                    </div>
                    {isDropdownOpen && searchTerm && (
                      <ul
                        className={`absolute ${Z.overlay} w-full bg-token-surface-card border border-token-border-technical rounded-xl mt-2 max-h-60 overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-top-2`}
                      >
                        {filteredEmployeesForSearch.length > 0 ? (
                          filteredEmployeesForSearch.map((employee: Employee) => (
                            <li
                              key={employee.id}
                              onClick={() => handleSelectEmployee(employee)}
                              className="px-5 py-3 cursor-pointer text-token-text-primary hover:bg-token-surface-hover hover:text-token-accent-brand transition-colors font-medium border-b border-token-border-subtle last:border-0 text-sm"
                            >
                              {employee.name}
                            </li>
                          ))
                        ) : (
                          <li className="px-5 py-3 text-token-text-secondary italic text-sm">
                            Sin resultados
                          </li>
                        )}
                      </ul>
                    )}
                    {getError("employeeId") && (
                      <p
                        id="leave-employee-error"
                        className="mt-2 pl-1 text-xs font-semibold text-token-status-error"
                      >
                        {getError("employeeId")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="leave-type"
                      className="block text-xs font-bold uppercase tracking-widest text-token-text-secondary mb-2 pl-1"
                    >
                      Tipo
                    </label>
                    <select
                      id="leave-type"
                      value={formValues.type}
                      onChange={(e) => setValue("type", e.target.value)}
                      disabled={!!editingLeave}
                      aria-invalid={getError("type") ? "true" : undefined}
                      aria-describedby={getError("type") ? "leave-type-error" : undefined}
                      className="w-full px-4 py-3 bg-token-surface-card border border-token-border-technical rounded-xl focus:ring-2 focus:ring-token-border-focus outline-none transition-all text-token-text-primary appearance-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option
                        value=""
                        disabled
                        className="bg-token-surface-card text-token-text-tertiary"
                      >
                        Seleccione una opción
                      </option>
                      {LEAVE_TYPES.map((t) => (
                        <option
                          key={t}
                          value={t}
                          className="bg-token-surface-card text-token-text-primary"
                        >
                          {t}
                        </option>
                      ))}
                    </select>
                    {getError("type") && (
                      <p
                        id="leave-type-error"
                        className="mt-2 pl-1 text-xs font-semibold text-token-status-error"
                      >
                        {getError("type")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="leave-start-date"
                      className="block text-xs font-bold uppercase tracking-widest text-token-text-secondary mb-2 pl-1"
                    >
                      Inicio
                    </label>
                    <button
                      id="leave-start-date"
                      type="button"
                      onClick={() => setIsStartDatePickerOpen(true)}
                      disabled={!!editingLeave}
                      aria-invalid={getError("startDate") ? "true" : undefined}
                      aria-describedby={
                        getError("startDate") ? "leave-start-date-error" : undefined
                      }
                      className="w-full px-4 py-3 bg-token-surface-card border border-token-border-technical rounded-xl focus:ring-2 focus:ring-token-border-focus outline-none transition-all text-token-text-primary text-left flex justify-between items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>
                        {formValues.startDate
                          ? formatBusinessDate(formValues.startDate)
                          : "Seleccionar"}
                      </span>
                      <ChevronRightIcon className="w-4 h-4 text-token-accent-brand rotate-90 opacity-60" />
                    </button>
                    <DatePickerDialog
                      isOpen={isStartDatePickerOpen}
                      onClose={() => setIsStartDatePickerOpen(false)}
                      onSelect={(date) => setValue("startDate", date)}
                      initialDate={formValues.startDate}
                    />
                    {getError("startDate") && (
                      <p
                        id="leave-start-date-error"
                        className="mt-2 text-xs font-semibold text-token-status-error"
                      >
                        {getError("startDate")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="leave-end-date"
                      className="block text-xs font-bold uppercase tracking-widest text-token-text-secondary mb-2 pl-1"
                    >
                      Fin
                    </label>
                    <button
                      id="leave-end-date"
                      type="button"
                      onClick={() => setIsEndDatePickerOpen(true)}
                      aria-invalid={getError("endDate") ? "true" : undefined}
                      aria-describedby={getError("endDate") ? "leave-end-date-error" : undefined}
                      className="w-full px-4 py-3 bg-token-surface-card border border-token-border-technical rounded-xl focus:ring-2 focus:ring-token-border-focus outline-none transition-all text-token-text-primary text-left flex justify-between items-center text-sm cursor-pointer"
                    >
                      <span>
                        {formValues.endDate
                          ? formatBusinessDate(formValues.endDate)
                          : "Seleccionar"}
                      </span>
                      <ChevronRightIcon className="w-4 h-4 text-token-accent-brand rotate-90 opacity-60" />
                    </button>
                    <DatePickerDialog
                      isOpen={isEndDatePickerOpen}
                      onClose={() => setIsEndDatePickerOpen(false)}
                      onSelect={(date) => setValue("endDate", date)}
                      initialDate={formValues.endDate}
                    />
                    {getError("endDate") && (
                      <p
                        id="leave-end-date-error"
                        className="mt-2 text-xs font-semibold text-token-status-error"
                      >
                        {getError("endDate")}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label
                      htmlFor="leave-notes"
                      className="block text-xs font-bold uppercase tracking-widest text-token-text-secondary mb-2 pl-1"
                    >
                      Notas
                    </label>
                    <div className="relative group">
                      <DocumentTextIcon className="absolute left-4 top-4 w-5 h-5 text-token-text-tertiary group-focus-within:text-token-accent-brand transition-colors" />
                      <textarea
                        id="leave-notes"
                        value={formValues.notes ?? ""}
                        onChange={(e) => setValue("notes", e.target.value)}
                        aria-invalid={getError("notes") ? "true" : undefined}
                        aria-describedby={getError("notes") ? "leave-notes-error" : undefined}
                        className="w-full pl-12 pr-4 py-3 bg-token-surface-card border border-token-border-technical rounded-xl focus:ring-2 focus:ring-token-border-focus outline-none transition-all text-token-text-primary min-h-[80px] text-sm"
                        placeholder="Observaciones..."
                      />
                    </div>
                    {getError("notes") && (
                      <p
                        id="leave-notes-error"
                        className="mt-2 pl-1 text-xs font-semibold text-token-status-error"
                      >
                        {getError("notes")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 flex items-center gap-2 rounded-xl"
                >
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
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 group w-full">
          <EyeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-token-text-tertiary group-focus-within:text-token-accent-brand transition-colors" />
          <Input
            type="text"
            value={filterEmployeeName}
            onChange={(e) => {
              setFilterEmployeeName(e.target.value);
            }}
            placeholder="Buscar por colaborador..."
            className="pl-12! py-3! bg-token-surface-card! border-token-border-subtle! rounded-xl! w-full"
          />
          {filterEmployeeName && (
            <button
              onClick={handleClearFilter}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-token-text-secondary hover:text-token-text-primary transition-colors cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <FunnelIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-token-text-tertiary" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-token-surface-card border border-token-border-subtle rounded-xl focus:ring-2 focus:ring-token-border-focus outline-none transition-all text-token-text-primary appearance-none text-sm font-medium"
          >
            <option value="">Tipo: Todos</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 px-6 h-[50px] bg-token-surface-card border border-token-border-subtle rounded-xl whitespace-nowrap w-full md:w-auto">
          <CalendarDaysIcon className="w-4 h-4 text-token-text-tertiary" />
          <label className="flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={() => setShowArchived((prev) => !prev)}
              className="hidden"
            />
            <div
              className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${showArchived ? "bg-token-accent-brand" : "bg-token-surface-technical"}`}
            >
              <div
                className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${showArchived ? "translate-x-5" : ""}`}
              ></div>
            </div>
            <span className="ml-3 text-sm font-bold text-token-text-secondary uppercase tracking-tighter">
              Ver Archivados
            </span>
          </label>
        </div>
      </div>

      <div className="min-h-[400px]">
        {processedLeaves.length === 0 && !isLoading ? (
          <EmptyState
            title="Sin ausencias registradas"
            description="Usa los filtros o registra una nueva para ver resultados."
            icon={<span className="text-2xl">🏖️</span>}
            className="my-12"
          />
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
    </Container>
  );
};
