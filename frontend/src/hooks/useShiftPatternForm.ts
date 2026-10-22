import { useCallback, useEffect, useMemo, useState } from "react";
import { TheoreticalShiftPattern } from "../types/index";
import { useShiftPatternsQuery } from "./queries/useShiftPatternsQuery";
import { useGlobalMaxWeeklyHoursQuery } from "./queries/useConfigQuery";
import { useShiftMutations } from "./useShiftMutations";
import { useToasts } from "./useToasts";
import { calculateHoursBetween } from "../utils/calculations";
import { useAppForm } from "./useAppForm";
import {
  buildShiftPatternSchema,
  type ShiftPatternDayValues,
  type ShiftPatternFormValues,
} from "../schemas/forms";

/**
 * Spec 036 T8 (AC1, AC2, AC3, AC4): formulario de **patron de turno**.
 *
 * Antes de la migracion este hook eran 450 lineas de maquina de formulario
 * escrita a mano: nueve `useState`, validaciones con `addToast` y un payload
 * montado a mano. Ahora:
 *
 * - el estado de los campos vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (las del backend en la T5, las que dependen
 *   del contexto en `buildShiftPatternSchema`) y salen como error de campo,
 *   con su mensaje en el mapa central (spec 036 AC2, AC3);
 * - el envio esta protegido contra el doble envio por la propia capa
 *   (spec 036 AC4).
 */

const PRESET_COLORS = [
  "#F44336",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#2196F3",
  "#03A9F4",
  "#00BCD4",
  "#009688",
  "#4CAF50",
  "#8BC34A",
  "#CDDC39",
  "#FFEB3B",
  "#FFC107",
  "#FF9800",
  "#FF5722",
  "#795548",
  "#9E9E9E",
  "#607D8B",
];

const createInitialDailySchedules = (cycleLength: number): ShiftPatternDayValues[] => {
  return Array.from({ length: cycleLength }, (_, i) => ({
    dayIndex: i,
    startTime: "",
    endTime: "",
    isOffDay: false,
    hasColacion: false,
    colacionMinutes: 0,
    hours: 0,
  }));
};

// `hours` is always derived: it is recomputed from startTime/endTime/colacionMinutes, so it is
// never persisted nor carried over from a copy.
// `dayIndex` is positional and therefore also dropped when copying onto another day.

/**
 * Payload de un dia del ciclo: identico al que se enviaba antes de la
 * migracion (spec 036 T13).
 *
 * La capa normaliza la cadena vacia a `undefined` **antes** de validar (para
 * que el schema sea una copia exacta del del backend), asi que aqui se
 * devuelve a `""`: el backend recibe exactamente los mismos campos.
 */
const toPayloadDay = (schedule: ShiftPatternDayValues): Omit<ShiftPatternDayValues, "hours"> => ({
  dayIndex: schedule.dayIndex,
  startTime: schedule.startTime ?? "",
  endTime: schedule.endTime ?? "",
  isOffDay: schedule.isOffDay,
  hasColacion: schedule.hasColacion ?? false,
  colacionMinutes: schedule.colacionMinutes ?? 0,
});

/** Opciones del hook del patron de turno. */
export interface UseShiftPatternFormOptions {
  /** Callback que se ejecuta cuando el patron se guardo correctamente. */
  readonly onSaved?: () => void;
}

export const useShiftPatternForm = (options?: UseShiftPatternFormOptions) => {
  const { data: shiftPatterns = [] } = useShiftPatternsQuery();
  const { createPattern, updatePattern } = useShiftMutations();
  const { data: globalMaxWeeklyHours = 44 } = useGlobalMaxWeeklyHoursQuery();

  const { addToast } = useToasts();

  const [editingPattern, setEditingPattern] = useState<TheoreticalShiftPattern | null>(null);
  const [copiedDailySchedule, setCopiedDailySchedule] = useState<Omit<
    ShiftPatternDayValues,
    "dayIndex" | "hours"
  > | null>(null);

  const getRandomColor = useCallback(() => {
    const usedColors = new Set(shiftPatterns.map((p) => p.color?.toUpperCase()).filter(Boolean));
    const availableColors = PRESET_COLORS.filter((c) => !usedColors.has(c.toUpperCase()));

    if (availableColors.length > 0) {
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    } else if (shiftPatterns.length > 0) {
      return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    } else {
      return PRESET_COLORS[0];
    }
  }, [shiftPatterns]);

  /**
   * Schema con las reglas que dependen del contexto (nombre unico, maximo
   * legal de horas y reglas de cada dia del ciclo).
   */
  const schema = useMemo(
    () =>
      buildShiftPatternSchema({
        existingPatterns: shiftPatterns,
        editingPatternId: editingPattern?.id,
        maxWeeklyHours: globalMaxWeeklyHours,
      }),
    [shiftPatterns, editingPattern?.id, globalMaxWeeklyHours],
  );

  const defaultValues = useMemo<ShiftPatternFormValues>(
    () => ({
      name: "",
      cycleLengthDays: 7,
      startDayOfWeek: 1,
      dailySchedules: createInitialDailySchedules(7),
      color: PRESET_COLORS[0],
      maxHoursPattern: globalMaxWeeklyHours,
      worksOnHolidays: false,
    }),
    // Los valores por defecto se capturan una vez (como hacia `useState`).
    [],
  );

  const form = useAppForm<ShiftPatternFormValues>({
    schema,
    defaultValues,
    /**
     * El payload viaja **sin** las horas calculadas (las deriva la pantalla),
     * y con las cadenas vacias tal como las recibia el backend: el payload es
     * identico al de antes de la migracion (spec 036 T13).
     */
    serialize: (values) => ({
      ...values,
      dailySchedules: values.dailySchedules.map(toPayloadDay),
    }),
    onSubmit: async (values) => {
      const patternPayload = {
        name: values.name,
        cycleLengthDays: values.cycleLengthDays,
        dailySchedules: values.dailySchedules.map(toPayloadDay),
        color: values.color,
        maxHoursPattern: values.maxHoursPattern,
        startDayOfWeek: values.startDayOfWeek,
        worksOnHolidays: values.worksOnHolidays,
      };

      if (editingPattern) {
        await updatePattern({
          ...patternPayload,
          id: editingPattern.id,
          lastModified: Date.now(),
          syncStatus: "synced",
          isDeleted: false,
        } as TheoreticalShiftPattern);
      } else {
        await createPattern({
          ...patternPayload,
          id: crypto.randomUUID(),
          lastModified: Date.now(),
          syncStatus: "synced",
          isDeleted: false,
        } as TheoreticalShiftPattern);
      }

      clearForm();
      options?.onSaved?.();
    },
  });

  const { setValue, values, reset } = form;

  const clearForm = useCallback(() => {
    setEditingPattern(null);
    reset({
      name: "",
      cycleLengthDays: 7,
      startDayOfWeek: 1,
      dailySchedules: createInitialDailySchedules(7),
      color: getRandomColor(),
      maxHoursPattern: globalMaxWeeklyHours,
      worksOnHolidays: false,
    });
  }, [reset, globalMaxWeeklyHours, getRandomColor]);

  /**
   * El largo del ciclo no puede pasar de 99 dias (regla de la pantalla, no
   * del backend): se recorta y se avisa, como antes de la migracion.
   */
  const setCycleLength = useCallback(
    (value: number) => {
      if (value > 99) {
        addToast("El ciclo no puede exceder los 99 días.", "warning");
        setValue("cycleLengthDays", 99);
        return;
      }
      setValue("cycleLengthDays", value);
    },
    [addToast, setValue],
  );

  /**
   * Al editar un patron, el formulario se rellena con sus valores.
   */
  useEffect(() => {
    if (!editingPattern) return;

    setValue("name", editingPattern.name);
    setValue("cycleLengthDays", editingPattern.cycleLengthDays);
    setValue("startDayOfWeek", editingPattern.startDayOfWeek || 1);
    setValue("color", editingPattern.color || PRESET_COLORS[0]);
    setValue("maxHoursPattern", editingPattern.maxHoursPattern || globalMaxWeeklyHours);
    setValue("worksOnHolidays", editingPattern.worksOnHolidays || false);
    setValue(
      "dailySchedules",
      editingPattern.dailySchedules.map((s) => ({
        dayIndex: s.dayIndex,
        startTime: s.startTime || "",
        endTime: s.endTime || "",
        isOffDay: s.isOffDay || false,
        hasColacion: s.hasColacion || false,
        colacionMinutes: s.colacionMinutes || 0,
        hours:
          s.isOffDay || false
            ? 0
            : calculateHoursBetween(
                s.startTime,
                s.endTime,
                s.hasColacion || false ? s.colacionMinutes || 0 : 0,
              ),
      })),
    );
  }, [editingPattern, globalMaxWeeklyHours, setValue]);

  /**
   * El largo del ciclo define cuantos dias tiene el patron: al cambiar, la
   * lista de jornadas se ajusta conservando las que ya existian.
   */
  useEffect(() => {
    const newLength = Math.max(1, values.cycleLengthDays);
    const current = form.values.dailySchedules;

    if (current.length === newLength && current.every((s, i) => s.dayIndex === i)) {
      return;
    }

    const next: ShiftPatternDayValues[] = [];
    for (let i = 0; i < newLength; i++) {
      const existingSchedule = current.find((s) => s.dayIndex === i);
      if (existingSchedule) {
        next.push({ ...existingSchedule, dayIndex: i });
      } else {
        next.push({
          dayIndex: i,
          startTime: "",
          endTime: "",
          isOffDay: false,
          hasColacion: false,
          colacionMinutes: 0,
          hours: 0,
        });
      }
    }

    setValue("dailySchedules", next);
  }, [values.cycleLengthDays, form.values.dailySchedules, setValue]);

  const handleDailyScheduleChange = useCallback(
    (index: number, field: keyof ShiftPatternDayValues, value: string | boolean | number) => {
      const next = form.values.dailySchedules.map((schedule, i) => {
        if (i !== index) return schedule;

        const updatedSchedule = { ...schedule, [field]: value };

        if (field === "hasColacion") {
          updatedSchedule.colacionMinutes = value === true ? 30 : 0;
        }

        if (field === "isOffDay" && value === true) {
          updatedSchedule.startTime = "";
          updatedSchedule.endTime = "";
          updatedSchedule.hasColacion = false;
          updatedSchedule.colacionMinutes = 0;
        }

        updatedSchedule.hours = updatedSchedule.isOffDay
          ? 0
          : calculateHoursBetween(
              updatedSchedule.startTime ?? undefined,
              updatedSchedule.endTime ?? undefined,
              updatedSchedule.hasColacion ? (updatedSchedule.colacionMinutes ?? 0) : 0,
            );
        return updatedSchedule;
      });

      setValue("dailySchedules", next);
    },
    [form.values.dailySchedules, setValue],
  );

  const handleCopyDailySchedule = useCallback(
    (dayIndex: number) => {
      const scheduleToCopy = form.values.dailySchedules.find((s) => s.dayIndex === dayIndex);
      if (scheduleToCopy) {
        setCopiedDailySchedule({
          startTime: scheduleToCopy.startTime,
          endTime: scheduleToCopy.endTime,
          isOffDay: scheduleToCopy.isOffDay,
          hasColacion: scheduleToCopy.hasColacion,
          colacionMinutes: scheduleToCopy.colacionMinutes,
        });
        addToast(`Horario del Día ${dayIndex + 1} copiado.`, "success");
      }
    },
    [addToast, form.values.dailySchedules],
  );

  const handlePasteDailySchedule = useCallback(
    (targetDayIndex: number) => {
      if (!copiedDailySchedule) {
        addToast("No hay horario copiado para pegar.", "info");
        return;
      }
      const next = form.values.dailySchedules.map((schedule, i) => {
        if (i !== targetDayIndex) return schedule;

        const newScheduleData = { ...schedule, ...copiedDailySchedule };
        if (newScheduleData.isOffDay) {
          newScheduleData.startTime = "";
          newScheduleData.endTime = "";
          newScheduleData.hasColacion = false;
          newScheduleData.colacionMinutes = 0;
        }
        newScheduleData.hours = newScheduleData.isOffDay
          ? 0
          : calculateHoursBetween(
              newScheduleData.startTime ?? undefined,
              newScheduleData.endTime ?? undefined,
              newScheduleData.hasColacion ? (newScheduleData.colacionMinutes ?? 0) : 0,
            );
        return newScheduleData;
      });
      setValue("dailySchedules", next);
      addToast(`Horario pegado en Día ${targetDayIndex + 1}.`, "success");
    },
    [addToast, copiedDailySchedule, form.values.dailySchedules, setValue],
  );

  const startCopyOfPattern = useCallback(
    (patternToCopy: TheoreticalShiftPattern) => {
      setEditingPattern(null); // Ensure we're in "create" mode, not "edit"
      setValue("name", `${patternToCopy.name} - copia`);
      setValue("cycleLengthDays", patternToCopy.cycleLengthDays);
      setValue("startDayOfWeek", patternToCopy.startDayOfWeek || 1);
      setValue("color", patternToCopy.color || PRESET_COLORS[0]);
      setValue("maxHoursPattern", patternToCopy.maxHoursPattern || globalMaxWeeklyHours);
      setValue("worksOnHolidays", patternToCopy.worksOnHolidays || false);

      setValue(
        "dailySchedules",
        patternToCopy.dailySchedules.map((s) => ({
          dayIndex: s.dayIndex,
          startTime: s.startTime || "",
          endTime: s.endTime || "",
          isOffDay: s.isOffDay || false,
          hasColacion: s.hasColacion || false,
          colacionMinutes: s.colacionMinutes || 0,
          hours:
            s.isOffDay || false
              ? 0
              : calculateHoursBetween(
                  s.startTime,
                  s.endTime,
                  s.hasColacion || false ? s.colacionMinutes || 0 : 0,
                ),
        })),
      );

      addToast(`Copiando patrón "${patternToCopy.name}". Modifique y guarde.`, "info");
    },
    [addToast, globalMaxWeeklyHours, setValue],
  );

  const calculatedPatternWeeklyHours = useMemo(() => {
    if (values.cycleLengthDays <= 0) return 0;
    let totalHoursInCycle = 0;
    values.dailySchedules.forEach((ds) => {
      if (!ds.isOffDay && ds.hours) {
        totalHoursInCycle += ds.hours;
      }
    });
    return parseFloat(((totalHoursInCycle / values.cycleLengthDays) * 7).toFixed(2));
  }, [values.cycleLengthDays, values.dailySchedules]);

  return {
    editingPattern,
    setEditingPattern,
    values,
    errors: form.errors,
    getError: form.getError,
    setValue,
    setCycleLength,
    handleDailyScheduleChange,
    copiedDailySchedule,
    handleCopyDailySchedule,
    handlePasteDailySchedule,
    startCopyOfPattern,
    clearForm,
    calculatedPatternWeeklyHours,
    globalMaxWeeklyHours,
    isSubmitting: form.isSubmitting,
    submit: form.submit,
    formProps: form.formProps,
  };
};
