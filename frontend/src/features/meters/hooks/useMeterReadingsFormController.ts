import { useEffect } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useMeterReadings } from "../../../hooks/useMeterReadings";
import {
  buildMeterReadingsSchema,
  type MeterReadingInput,
  type MeterReadingsValues,
  type MeterReadingMeter,
} from "../../../schemas/forms/meter";
import type { MeterConfig } from "../../../types/dashboard";

/**
 * Spec 036 T9b (AC1, AC2, AC3): formulario de **lecturas de medidores** (el
 * de la pagina y el del modal).
 *
 * Antes cada uno de los dos componentes tenia su propio estado (`formValues` /
 * `readingValues`), sus propias validaciones (las reglas de cada tipo de
 * medidor, escritas dos veces con el mismo texto) y sus avisos por `toast`.
 * Ahora:
 *
 * - el estado de los campos vive en `useAppForm` (spec 036 AC1): un valor por
 *   medidor, con la **clave dinamica** del id del medidor;
 * - las reglas viven en el schema (`buildMeterReadingsSchema`, que reutiliza
 *   `validateMeterValue`) y salen como error **del medidor** que las incumple
 *   (spec 036 AC2, AC3);
 * - el envio esta protegido contra el doble envio por la propia capa
 *   (spec 036 AC4).
 *
 * El payload no cambia: la lista de `{meterConfigId, value}` que espera el
 * hook `useMeterReadings` (spec 036 T13).
 */

/** Opciones del hook del formulario de lecturas. */
export interface UseMeterReadingsFormControllerOptions {
  /**
   * El formulario esta activo (el modal abierto).
   *
   * Al activarse se reinicia con una entrada por medidor: al abrir el modal
   * no puede quedar la lectura anterior.
   */
  readonly isActive?: boolean;
  /** Callback cuando las lecturas se guardaron. */
  readonly onSaved?: () => void;
}

/** Configuracion del medidor que necesita la validacion. */
const toReadingMeter = (config: MeterConfig): MeterReadingMeter => ({
  id: config.id,
  name: config.name,
  type: config.type,
  maxCapacity: config.maxCapacity,
});

/** Controlador del formulario de lecturas de medidores (spec 036 T9b). */
export const useMeterReadingsFormController = ({
  isActive = true,
  onSaved,
}: UseMeterReadingsFormControllerOptions = {}) => {
  const { readings, isLoadingReadings, addReading, meterConfigs } = useMeterReadings();

  /** Configuracion de cada medidor, por id. */
  const metersById = Object.fromEntries(
    meterConfigs.map((config) => [config.id, toReadingMeter(config)]),
  ) as Record<string, MeterReadingMeter>;

  /**
   * Ultima lectura de cada medidor.
   *
   * Los medidores de consumo no pueden bajar: para eso hace falta el valor
   * anterior (el mas reciente).
   */
  const lastReadingById = (() => {
    const map: Record<string, number> = {};
    for (const reading of readings) {
      if (map[reading.meterConfigId] === undefined) {
        map[reading.meterConfigId] = reading.normalizedValue;
      }
    }
    return map;
  })();

  /** Schema con las reglas que dependen de cada medidor. */
  const schema = buildMeterReadingsSchema({ metersById, lastReadingById });

  /**
   * Identidad estable del conjunto de medidores.
   *
   * La referencia del array de configs cambia en cada render mientras la
   * consulta carga (`data ?? []`): usarla como dependencia de un efecto
   * reiniciaria el formulario sin parar.
   */
  const meterIdsKey = JSON.stringify(meterConfigs.map((config) => config.id));

  /** Una entrada por medidor (el valor empieza vacio). */
  const initialValues = (() => {
    const next: MeterReadingsValues = {};
    const meterIds = JSON.parse(meterIdsKey) as string[];
    for (const meterId of meterIds) {
      next[meterId] = "";
    }
    return next;
    // La identidad estable del conjunto de medidores es la lista de ids: la
    // referencia del array cambia en cada render mientras la consulta carga
    // (`data ?? []`), y un `useMemo` sobre ella provocaria un bucle de
    // reinicios.
  })();

  const form = useAppForm<MeterReadingsValues, MeterReadingInput[]>({
    schema,
    defaultValues: initialValues,
    /**
     * El payload es la lista de lecturas con valor (los medidores sin valor
     * no se envian): es identico al de antes de la migracion (spec 036 T13).
     */
    serialize: (values) =>
      Object.entries(values)
        .filter(
          (entry): entry is [string, string] => entry[1] !== undefined && entry[1].trim() !== "",
        )
        .map(([meterConfigId, value]) => ({ meterConfigId, value: value.trim() })),
    onSubmit: async (payload) => {
      // Sin lecturas no se envia nada (igual que antes de la migracion).
      if (payload.length === 0) return;
      const success = await addReading(payload);
      if (success) {
        clearForm();
        onSaved?.();
      }
    },
  });

  const { setValue, values, reset, getError } = form;

  /** Reinicia el formulario (tras guardar o al abrir el modal). */
  const clearForm = () => {
    reset(initialValues);
  };

  /**
   * Al abrir el modal el formulario se reinicia con una entrada por medidor:
   * no puede quedar la lectura anterior.
   */
  useEffect(() => {
    if (!isActive) return;
    reset(initialValues);
  }, [isActive, initialValues, reset]);

  return {
    values,
    getError,
    setValue,
    meterConfigs,
    readings,
    lastReadingById,
    isLoadingReadings,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
