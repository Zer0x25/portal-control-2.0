import { useCallback, useEffect, useMemo } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useMeterReadings } from "../../../hooks/useMeterReadings";
import {
  buildSingleMeterReadingSchema,
  type MeterReadingInput,
  type SingleMeterReadingValues,
} from "../../../schemas/forms/meter";
import type { MeterConfig } from "../../../types/dashboard";

/**
 * Spec 036 T9b (AC1, AC2, AC3): formulario de **lectura de un medidor**
 * (`SingleMeterInputModal.tsx`).
 *
 * Antes el componente guardaba el valor en un `useState` y repetia (copiadas
 * de `MeterForm.tsx`) las reglas de cada tipo de medidor con un `toast` por
 * cada una. Ahora las reglas viven en el schema
 * (`buildSingleMeterReadingSchema`, que reutiliza `validateMeterValue`) y
 * salen como error del campo, con el mensaje en el mapa central.
 *
 * El payload no cambia: `{meterConfigId, value}` con el texto que escribe el
 * usuario (spec 036 T13).
 */

/** Opciones del hook del formulario de lectura simple. */
export interface UseSingleMeterReadingControllerOptions {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** Medidor al que se le carga la lectura (`null` si no hay ninguno). */
  readonly meterConfig: MeterConfig | null;
  /** Callback cuando la lectura se guardo. */
  readonly onSaved?: () => void;
}

/** Controlador del formulario de lectura de un medidor (spec 036 T9b). */
export const useSingleMeterReadingController = ({
  isOpen,
  meterConfig,
  onSaved,
}: UseSingleMeterReadingControllerOptions) => {
  const { readings, addReading } = useMeterReadings();

  /** Ultima lectura del medidor (los de consumo no pueden bajar). */
  const lastReadingValue = useMemo(() => {
    if (!meterConfig) return undefined;
    return readings.find((reading) => reading.meterConfigId === meterConfig.id)?.normalizedValue;
  }, [readings, meterConfig]);

  /** Schema con las reglas que dependen del medidor. */
  const schema = useMemo(
    () =>
      buildSingleMeterReadingSchema({
        meter: {
          id: meterConfig?.id ?? "",
          name: meterConfig?.name ?? "",
          type: meterConfig?.type ?? "INSTANT",
          maxCapacity: meterConfig?.maxCapacity,
        },
        lastReadingValue,
      }),
    [meterConfig, lastReadingValue],
  );

  const form = useAppForm<SingleMeterReadingValues, MeterReadingInput>({
    schema,
    defaultValues: { value: "" },
    /**
     * El payload es el par medidor + texto: el hook `useMeterReadings` lo
     * convierte a numero (spec 036 T13).
     */
    serialize: (values) => ({
      meterConfigId: meterConfig?.id ?? "",
      value: values.value.trim(),
    }),
    onSubmit: async (payload) => {
      const success = await addReading([payload]);
      if (success) {
        onSaved?.();
      }
    },
  });

  const { setValue, values, reset, getError } = form;

  /** Al abrir el modal el valor empieza vacio. */
  useEffect(() => {
    if (!isOpen) return;
    reset({ value: "" });
  }, [isOpen, reset]);

  const handleValueChange = useCallback(
    (value: string) => {
      setValue("value", value);
    },
    [setValue],
  );

  return {
    values,
    getError,
    handleValueChange,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
