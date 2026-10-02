import React from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import PatternForm from "../components/PatternForm";
import { PlusCircleIcon, EyeIcon } from "../../../components/ui/icons/index";
import ResponsiveView from "../../../components/ui/ResponsiveView";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import PatternListDesktop from "../components/PatternListDesktop";
import PatternListMobile from "../components/PatternListMobile";
import type { TheoreticalShiftPattern, DayInCycleSchedule } from "../../../types";

interface ShiftPatternFormState {
  editingPattern: TheoreticalShiftPattern | null;
  setEditingPattern: React.Dispatch<React.SetStateAction<TheoreticalShiftPattern | null>>;
  patternName: string;
  setPatternName: React.Dispatch<React.SetStateAction<string>>;
  patternCycleLength: number;
  setPatternCycleLength: (value: number) => void;
  startDayOfWeek: number;
  setStartDayOfWeek: React.Dispatch<React.SetStateAction<number>>;
  patternDailySchedules: DayInCycleSchedule[];
  handleDailyScheduleChange: (
    index: number,
    field: keyof DayInCycleSchedule,
    value: string | boolean | number,
  ) => void;
  patternColor: string;
  setPatternColor: React.Dispatch<React.SetStateAction<string>>;
  patternMaxHoursInput: number;
  setPatternMaxHoursInput: React.Dispatch<React.SetStateAction<number>>;
  patternWorksOnHolidays: boolean;
  setPatternWorksOnHolidays: React.Dispatch<React.SetStateAction<boolean>>;
  copiedDailySchedule: Omit<DayInCycleSchedule, "dayIndex" | "hours"> | null;
  handleCopyDailySchedule: (dayIndex: number) => void;
  handlePasteDailySchedule: (targetDayIndex: number) => void;
  startCopyOfPattern: (patternToCopy: TheoreticalShiftPattern) => void;
  handleSavePattern: () => Promise<boolean>;
  clearForm: () => void;
  calculatedPatternWeeklyHours: number;
  globalMaxWeeklyHours: number;
}

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
  handleSaveForm: () => Promise<boolean>;
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
  handleSaveForm,
  handleConfirmDelete,
  handleEditPattern,
  handleCopyPattern,
}) => {
  return (
    <div id="pattern-manager-section" className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Patrones de Turno</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define los ciclos horarios base para los empleados.
          </p>
        </div>
        <AnimatePresence>
          {!isFormVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                onClick={handleOpenNewForm}
                variant="primary"
                className="shadow-lg shadow-sap-blue/20 flex items-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Nuevo Patrón
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {isFormVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 overflow-hidden shadow-xl"
          >
            <PatternForm
              onCancel={handleCancelForm}
              onSave={handleSaveForm}
              patternForm={patternForm}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 group w-full">
        <EyeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sap-blue transition-colors" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar patrones por nombre..."
          className="!pl-12 !py-3 !bg-white/30 dark:!bg-gray-800/20 !border-white/20 dark:!border-gray-700/50 !rounded-2xl w-full"
        />
      </div>

      <div className="flex-1 min-h-[400px]">
        {processedPatterns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 opacity-50 grayscale">
              🎨
            </div>
            <p className="text-xl font-bold">Sin patrones configurados.</p>
            <p className="text-sm">Crea un patrón para empezar a asignar turnos a tus empleados.</p>
          </div>
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
            <p className="text-xs text-gray-500 italic">Esta acción no se puede deshacer.</p>
          </div>
        }
        confirmText="Eliminar permanentemente"
        confirmVariant="danger"
      />
    </div>
  );
};
