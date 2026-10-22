import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import type { MeterType } from "../../types/dashboard";
import { optionalNullableText, optionalText, requiredText } from "./common";

/**
 * Spec 036 T5 (AC2): lectura de medidor (`SingleMeterInputModal.tsx`).
 *
 * Contrato: `MeterReading` (`backend/src/models/schemas/meter.schemas.ts`).
 * `meterConfigId` y `authorUsername` los exige el backend; el segundo lo
 * deduce el servidor de la sesion, asi que el formulario no lo escribe.
 */
export const meterReadingFormSchema = z.object({
  meterConfigId: requiredText("El medidor"),
  value: z
    .number({ error: ERROR_MESSAGES.required("La lectura") })
    .finite(ERROR_MESSAGES.invalidNumber()),
  timestamp: optionalText(),
  isRecharge: z.boolean().optional(),
  notes: optionalNullableText(),
});

/**
 * Configuracion de un medidor (`MeterForm.tsx`).
 *
 * **Sin contraparte en el backend**: los medidores se configuran en el
 * servidor (panel de mantenimiento) y el frontend solo muestra el formulario
 * de alta local. Las reglas son de UI.
 */
export const localMeterConfigFormSchema = z.object({
  name: requiredText("El nombre"),
  unit: requiredText("La unidad"),
  location: optionalText(),
  notes: optionalText(),
});

/** Tipo de la entrada del formulario de lectura de medidor. */
export type MeterReadingFormValues = z.input<typeof meterReadingFormSchema>;

/* -------------------------------------------------------------------------- */
/* El formulario de lectura (spec 036 T9b)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Configuracion del medidor que necesita la validacion de una lectura.
 *
 * Es un recorte de `MeterConfig`: la validacion solo mira el tipo, la
 * capacidad y el nombre.
 */
export interface MeterReadingMeter {
  readonly id: string;
  readonly name: string;
  readonly type: MeterType;
  readonly maxCapacity?: number;
}

/** Contexto de la validacion de **una** lectura. */
export interface MeterReadingValidationContext {
  /** Configuracion del medidor. */
  readonly meter: MeterReadingMeter;
  /** Ultima lectura del medidor (los medidores de consumo no pueden bajar). */
  readonly lastReadingValue?: number;
}

/**
 * Reglas de una lectura de medidor.
 *
 * Son **las mismas** para los tres formularios de medidores (la lectura
 * simple, el formulario de la pagina y el modal): antes cada uno tenia su
 * copia (con el mismo texto, escrito tres veces).
 *
 * El valor es el **texto** que escribe el usuario: un `+` delante significa
 * "recarga" (una adicion al acumulado, que si puede ser negativa).
 *
 * @returns el mensaje del error, o `undefined` si la lectura es valida.
 */
export const validateMeterValue = (
  value: string | undefined,
  context: MeterReadingValidationContext,
): string | undefined => {
  const raw = (value ?? "").trim();
  if (raw === "") return ERROR_MESSAGES.emptyMeterValue();

  const isRecharge = raw.startsWith("+");
  const numericValue = Number.parseFloat(raw.replace("+", ""));

  if (Number.isNaN(numericValue)) return ERROR_MESSAGES.invalidMeterValue();

  if (!isRecharge && numericValue < 0) return ERROR_MESSAGES.negativeMeterValue();

  const { meter } = context;

  if (meter.type === "PERCENT" && !isRecharge && numericValue > 100) {
    return ERROR_MESSAGES.meterPercentAboveHundred();
  }

  if (
    meter.type === "LEVEL" &&
    meter.maxCapacity &&
    !isRecharge &&
    numericValue > meter.maxCapacity
  ) {
    return ERROR_MESSAGES.meterValueAboveCapacity(numericValue, meter.maxCapacity);
  }

  if (meter.type === "CONSUMPTION" && !isRecharge && context.lastReadingValue !== undefined) {
    if (numericValue < context.lastReadingValue) {
      return ERROR_MESSAGES.meterValueBelowPrevious(numericValue, context.lastReadingValue);
    }
  }

  return undefined;
};

/**
 * Base del schema de lectura de **un** medidor (sin las reglas que dependen
 * del medidor concreto).
 *
 * El valor viaja como **texto** (lo que escribe el usuario) y el hook
 * `useMeterReadings` lo convierte a numero: es un campo **transformado** y
 * asi se declara en el mapa de contratos.
 */
export const singleMeterReadingBaseSchema = z.object({
  // El mensaje del tipo lo pone el mapa central: la capa normaliza la cadena
  // vacia a `undefined` antes de validar, asi que el error que ve el usuario
  // es el de "valor vacio" y no el de Zod en ingles.
  value: z.string({ error: ERROR_MESSAGES.emptyMeterValue() }).trim(),
});

/**
 * Schema de la lectura de **un** medidor.
 */
export const buildSingleMeterReadingSchema = (context: MeterReadingValidationContext) =>
  singleMeterReadingBaseSchema.superRefine((values, ctx) => {
    const message = validateMeterValue(values.value, context);
    if (!message) return;
    ctx.addIssue({ code: "custom", path: ["value"], message });
  });

/** Contexto de la validacion del formulario de **varios** medidores. */
export interface MeterReadingsValidationContext {
  /** Configuracion de cada medidor, por id. */
  readonly metersById: Readonly<Record<string, MeterReadingMeter>>;
  /** Ultima lectura de cada medidor, por id. */
  readonly lastReadingById?: Readonly<Record<string, number>>;
}

/**
 * Base del schema del formulario de **varios** medidores (una entrada por
 * medidor).
 *
 * Los valores vacios no son un error: se omiten del payload (el formulario
 * solo envia los medidores que el usuario completo).
 */
export const meterReadingsBaseSchema = z.record(z.string(), z.string().trim().optional());

/**
 * Schema del formulario de **varios** medidores (una lectura por medidor).
 */
export const buildMeterReadingsSchema = (context: MeterReadingsValidationContext) =>
  meterReadingsBaseSchema.superRefine((values, ctx) => {
    for (const [meterConfigId, value] of Object.entries(values)) {
      if (value === undefined || value.trim() === "") continue;
      const meter = context.metersById[meterConfigId];
      if (!meter) continue;

      const message = validateMeterValue(value, {
        meter,
        lastReadingValue: context.lastReadingById?.[meterConfigId],
      });
      if (!message) continue;

      ctx.addIssue({ code: "custom", path: [meterConfigId], message });
    }
  });

/** Estado del formulario de lectura de un medidor. */
export interface SingleMeterReadingValues {
  /** El texto que escribe el usuario. */
  value: string;
}

/** Estado del formulario de varios medidores (una entrada por medidor). */
export type MeterReadingsValues = Record<string, string | undefined>;

/** Payload del formulario de lectura: el par medidor + texto. */
export interface MeterReadingInput {
  /** Id del medidor configurado. */
  meterConfigId: string;
  /** El texto que escribe el usuario (lo convierte el hook). */
  value: string;
}
