import { useState } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useToasts } from "../../../hooks/useToasts";
import {
  seedingOptionsFormSchema,
  type SeedingOptions,
  type SeedingOptionsFormValues,
} from "../../../schemas/forms/seed";

/**
 * Spec 036 T10b (AC1, AC2, AC3): formulario de **opciones de la simulacion de
 * datos** (`SeedingOptionsModal.tsx`).
 *
 * Antes el modal guardaba los siete numeros en un `useState` y, si alguno era
 * invalido, avisaba con un `toast` que no decia que campo era el culpable.
 * Ahora:
 *
 * - el estado vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`seedingOptionsFormSchema`: los rangos de
 *   la pantalla y el minimo de un empleado y un dia) (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * Los presets (Quick Seed y el incremental) son un **reinicio** del
 * formulario: no son un caso especial del envio.
 *
 * El payload no cambia: los mismos siete numeros (spec 036 T13).
 */

/** Valores con los que arranca el formulario. */
const DEFAULT_OPTIONS: SeedingOptionsFormValues = {
  employees: 200,
  days: 2200,
  basePatternsCount: 3,
  leaveRatio: 5,
  correctionRequestRatio: 2,
  shiftReportsPerDay: 6,
  quickNotesCount: 5,
};

/** Preset "Quick Seed": carga ligera para validacion manual. */
const QUICK_SEED_PRESET: SeedingOptionsFormValues = {
  employees: 15,
  days: 3,
  basePatternsCount: 2,
  leaveRatio: 4,
  correctionRequestRatio: 1,
  shiftReportsPerDay: 0,
  quickNotesCount: 20,
};

/** Presets incrementales: cada nivel sube la carga. */
const INCREMENTAL_PRESETS: readonly SeedingOptionsFormValues[] = [
  {
    employees: 15,
    days: 3,
    basePatternsCount: 2,
    leaveRatio: 4,
    correctionRequestRatio: 1,
    shiftReportsPerDay: 0,
    quickNotesCount: 20,
  },
  {
    employees: 30,
    days: 7,
    basePatternsCount: 3,
    leaveRatio: 4,
    correctionRequestRatio: 1,
    shiftReportsPerDay: 1,
    quickNotesCount: 40,
  },
  {
    employees: 60,
    days: 15,
    basePatternsCount: 4,
    leaveRatio: 5,
    correctionRequestRatio: 2,
    shiftReportsPerDay: 2,
    quickNotesCount: 80,
  },
  {
    employees: 120,
    days: 30,
    basePatternsCount: 5,
    leaveRatio: 6,
    correctionRequestRatio: 2,
    shiftReportsPerDay: 3,
    quickNotesCount: 140,
  },
];

/** Campos numericos del formulario (todos los que muestra la pantalla). */
export type SeedingNumberField = keyof SeedingOptionsFormValues;

/** Opciones del hook del formulario de simulacion. */
export interface UseSeedingOptionsControllerOptions {
  /** Cierra el modal. */
  onClose: () => void;
  /** Confirma las opciones (recibe los valores ya validados). */
  onConfirm: (options: SeedingOptions) => void;
}

/** Controlador del formulario de simulacion (spec 036 T10b). */
export const useSeedingOptionsController = ({
  onClose,
  onConfirm,
}: UseSeedingOptionsControllerOptions) => {
  const { addToast } = useToasts();
  /** Nivel del preset incremental aplicado (0 = ninguno). */
  const [incrementalLevel, setIncrementalLevel] = useState(0);

  const form = useAppForm<SeedingOptionsFormValues>({
    schema: seedingOptionsFormSchema,
    defaultValues: DEFAULT_OPTIONS,
    onSubmit: async (values) => {
      onConfirm(values);
      onClose();
    },
  });

  const { reset, setValue } = form;

  /** Aplica el preset "Quick Seed". */
  const applyQuickSeedPreset = () => {
    reset(QUICK_SEED_PRESET);
    addToast("Preset Quick Seed aplicado.", "success");
  };

  /** Aplica el siguiente nivel del preset incremental. */
  const applyIncrementalPreset = () => {
    const nextLevel = Math.min(incrementalLevel + 1, INCREMENTAL_PRESETS.length);
    const preset = INCREMENTAL_PRESETS[nextLevel - 1];
    if (!preset) return;
    reset(preset);
    setIncrementalLevel(nextLevel);
    addToast(
      `Preset incremental aplicado (nivel ${nextLevel}/${INCREMENTAL_PRESETS.length}).`,
      "success",
    );
  };

  /** Escribe un campo numerico (el texto vacio es 0, como antes). */
  const handleNumberChange = (field: SeedingNumberField, value: string) => {
    setValue(field, value === "" ? 0 : Number.parseInt(value, 10));
  };

  return {
    values: form.values,
    getError: form.getError,
    handleNumberChange,
    applyQuickSeedPreset,
    applyIncrementalPreset,
    incrementalLevel,
    maxIncrementalLevel: INCREMENTAL_PRESETS.length,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
