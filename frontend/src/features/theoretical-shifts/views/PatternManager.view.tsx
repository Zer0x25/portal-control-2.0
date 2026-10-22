/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for PatternManager.
*/

import React from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Container from "../../../components/ui/Container";
import PatternForm, { type ShiftPatternFormState } from "../components/PatternForm";
import { PlusCircleIcon, EyeIcon } from "../../../components/ui/icons/index";
import ResponsiveView from "../../../components/ui/ResponsiveView";
import EmptyState from "../../../components/ui/EmptyState";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import PatternListDesktop from "../components/PatternListDesktop";
import PatternListMobile from "../components/PatternListMobile";
import type { TheoreticalShiftPattern } from "../../../types";
import { Z } from "../../../constants/zScale";

export interface PatternManagerViewProps {
  searchTerm: string;
  fetchNextPage: () => unknown;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  refetch: () => unknown;
  patternForm: ShiftPatternFormState;
  isFormVisible: boolean;
  patternToDelete: string | null;
  globalMaxWeeklyHours: number;
  affectedEmployeesCount: number;
  processedPatterns: TheoreticalShiftPattern[];
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setPatternToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  handleOpenNewForm: () => void;
  handleCancelForm: () => void;
  handleConfirmDelete: () => Promise<void>;
  handleEditPattern: (pattern: TheoreticalShiftPattern) => void;
  handleCopyPattern: (pattern: TheoreticalShiftPattern) => void;
}

export const PatternManagerView: React.FC<PatternManagerViewProps> = ({
  searchTerm,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  refetch,
  patternForm,
  isFormVisible,
  patternToDelete,
  globalMaxWeeklyHours,
  affectedEmployeesCount,
  processedPatterns,
  setSearchTerm,
  setPatternToDelete,
  handleOpenNewForm,
  handleCancelForm,
  handleConfirmDelete,
  handleEditPattern,
  handleCopyPattern,
}) => {
  return (
    <Container
      id="pattern-manager-section"
      variant="wide"
      noPadding
      data-ui-protected
      className="space-y-6 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="typo-ui-title text-token-text-primary">Patrones de Turno</h2>
          <p className="text-xs text-token-text-secondary mt-1">
            Define los ciclos horarios base para los empleados.
          </p>
        </div>
        {!isFormVisible && (
          <div className="animate-in fade-in zoom-in-90">
            <Button
              onClick={handleOpenNewForm}
              variant="primary"
              className="flex items-center gap-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              Nuevo Patrón
            </Button>
          </div>
        )}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ${isFormVisible ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"}`}
      >
        <div className="overflow-hidden">
          <div className="bg-token-surface-card rounded-lg border border-token-border-technical p-6 shadow-sm">
            <PatternForm onCancel={handleCancelForm} patternForm={patternForm} />
          </div>
        </div>
      </div>

      <div className="relative flex-1 group w-full">
        <EyeIcon
          className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-token-text-tertiary group-focus-within:text-token-accent-brand transition-colors ${Z.sticky}`}
        />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar patrones por nombre..."
          className="pl-12! w-full"
        />
      </div>

      <div className="flex-1 min-h-[400px]">
        {processedPatterns.length === 0 ? (
          <EmptyState
            title="Sin patrones configurados"
            description="Crea un patrón para empezar a asignar turnos a tus empleados."
            icon={<span className="text-2xl">🎨</span>}
            className="my-12"
          />
        ) : (
          <ResponsiveView
            mobile={
              <PatternListMobile
                patterns={processedPatterns}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                globalMaxWeeklyHours={globalMaxWeeklyHours}
                onEdit={handleEditPattern}
                onDelete={(id) => setPatternToDelete(id)}
              />
            }
            desktop={
              <PatternListDesktop
                patterns={processedPatterns}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                globalMaxWeeklyHours={globalMaxWeeklyHours}
                isLoading={isLoading}
                refetch={refetch}
                onEdit={handleEditPattern}
                onCopy={handleCopyPattern}
                onDelete={(id) => setPatternToDelete(id)}
              />
            }
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={!!patternToDelete}
        onClose={() => setPatternToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Patrón de Turno?"
        message={
          <div className="space-y-4">
            <p>¿Estás seguro de que deseas eliminar permanentemente este patrón?</p>
            {affectedEmployeesCount > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <p className="text-amber-800 dark:text-amber-300 font-bold mb-1">
                  ⚠️ Atención: Patrón en uso
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Este patrón está asignado actualmente a{" "}
                  <strong>{affectedEmployeesCount} empleado(s)</strong>. Se recomienda verificar las
                  asignaciones antes de proceder.
                </p>
                <p className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tighter">
                  La eliminación desasignará automáticamente a todos los empleados asociados.
                </p>
              </div>
            )}
            <p className="text-xs text-token-text-secondary italic">
              Esta acción no se puede deshacer.
            </p>
          </div>
        }
        confirmText="Eliminar permanentemente"
        confirmVariant="danger"
      />
    </Container>
  );
};
