import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { optionalText } from "./common";

/**
 * Spec 036 T5 (AC2): opciones de siembra de datos (`SeedingOptionsModal.tsx`).
 *
 * Contrato: `SeedOptions` (`backend/src/models/schemas/core.schemas.ts`).
 * Todos los campos son opcionales: el backend aplica sus propios valores por
 * defecto cuando no llegan.
 */
export const seedOptionsFormSchema = z.object({
  clearExisting: z.boolean().optional(),
  adminPassword: optionalText(),
  employees: z.number().int().min(0).optional(),
  days: z.number().int().min(0).optional(),
  basePatternsCount: z.number().int().min(1).optional(),
  leaveRatio: z.number().min(0).max(100).optional(),
  correctionRequestRatio: z.number().min(0).max(100).optional(),
  shiftReportsPerDay: z.number().int().min(0).max(6).optional(),
  quickNotesCount: z.number().int().min(0).optional(),
  seedEmployees: z.boolean().optional(),
  seedShifts: z.boolean().optional(),
  seedRecords: z.boolean().optional(),
  monthsToSeed: z.number().int().min(1).max(12).optional(),
});

/**
 * Spec 036 T10b (AC2): opciones de la simulacion de datos
 * (`SeedingOptionsModal.tsx`).
 *
 * Contrato: `SeedOptions` (`backend/src/models/schemas/core.schemas.ts`).
 *
 * El formulario es un **subconjunto** del contrato (los siete numeros que
 * muestra la pantalla) y es **mas estricto** que el backend en dos puntos,
 * declarados en el mapa de contratos:
 *
 * - siempre envia los siete valores (el backend los admite opcionales y
 *   aplica sus propios valores por defecto);
 * - exige al menos un empleado y un dia (el backend admite 0).
 *
 * Los maximos (`employees`, `days`, `basePatternsCount`, `quickNotesCount`)
 * son los limites de la pantalla: el backend no los acota.
 */
export const seedingOptionsFormSchema = z
  .object({
    employees: z
      .number({ error: ERROR_MESSAGES.required("El numero de empleados") })
      .int(ERROR_MESSAGES.invalidNumber())
      .min(0, ERROR_MESSAGES.minValue("El numero de empleados", 0))
      .max(3000, ERROR_MESSAGES.maxValue("El numero de empleados", 3000)),
    days: z
      .number({ error: ERROR_MESSAGES.required("Los dias de historial") })
      .int(ERROR_MESSAGES.invalidNumber())
      .min(0, ERROR_MESSAGES.minValue("Los dias de historial", 0))
      .max(7300, ERROR_MESSAGES.maxValue("Los dias de historial", 7300)),
    basePatternsCount: z
      .number({ error: ERROR_MESSAGES.required("Los patrones base") })
      .int(ERROR_MESSAGES.invalidNumber())
      .min(1, ERROR_MESSAGES.minValue("Los patrones base", 1))
      .max(12, ERROR_MESSAGES.maxValue("Los patrones base", 12)),
    leaveRatio: z
      .number({ error: ERROR_MESSAGES.required("El porcentaje de ausentismo") })
      .min(0, ERROR_MESSAGES.minValue("El porcentaje de ausentismo", 0))
      .max(100, ERROR_MESSAGES.maxValue("El porcentaje de ausentismo", 100)),
    correctionRequestRatio: z
      .number({ error: ERROR_MESSAGES.required("El porcentaje de correcciones") })
      .min(0, ERROR_MESSAGES.minValue("El porcentaje de correcciones", 0))
      .max(100, ERROR_MESSAGES.maxValue("El porcentaje de correcciones", 100)),
    shiftReportsPerDay: z
      .number({ error: ERROR_MESSAGES.required("Los reportes de turno por dia") })
      .int(ERROR_MESSAGES.invalidNumber())
      .min(0, ERROR_MESSAGES.minValue("Los reportes de turno por dia", 0))
      .max(6, ERROR_MESSAGES.maxValue("Los reportes de turno por dia", 6)),
    quickNotesCount: z
      .number({ error: ERROR_MESSAGES.required("El numero de notas rapidas") })
      .int(ERROR_MESSAGES.invalidNumber())
      .min(0, ERROR_MESSAGES.minValue("El numero de notas rapidas", 0))
      .max(2000, ERROR_MESSAGES.maxValue("El numero de notas rapidas", 2000)),
  })
  .superRefine((values, ctx) => {
    // El backend admite 0 empleados o 0 dias: la pantalla no (una simulacion
    // sin datos no simula nada).
    if (values.employees < 1) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.minValue("El numero de empleados", 1),
        path: ["employees"],
      });
    }
    if (values.days < 1) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.minValue("Los dias de historial", 1),
        path: ["days"],
      });
    }
  });

/**
 * Inicio de la segunda fase de siembra (`SeedingProgressModal.tsx`).
 *
 * Contrato: `SeedPhase2Start` (`backend/src/models/schemas/core.schemas.ts`).
 */
export const seedPhase2FormSchema = z.object({
  days: z
    .number({ error: ERROR_MESSAGES.required("Los dias") })
    .int(ERROR_MESSAGES.invalidNumber())
    .min(1, ERROR_MESSAGES.minLength("Los dias", 1))
    .max(3650, ERROR_MESSAGES.maxLength("Los dias", 3650))
    .optional(),
  leaveRatio: z.number().min(0).max(100).optional(),
  correctionRequestRatio: z.number().min(0).max(100).optional(),
  batchSize: z
    .number()
    .int()
    .min(50, ERROR_MESSAGES.minLength("El tamano de lote", 50))
    .max(2000, ERROR_MESSAGES.maxLength("El tamano de lote", 2000))
    .optional(),
});

/** Tipo de la entrada del formulario de opciones de siembra. */
export type SeedOptionsFormValues = z.input<typeof seedOptionsFormSchema>;

/** Tipo de la entrada del formulario de la simulacion de datos. */
export type SeedingOptionsFormValues = z.input<typeof seedingOptionsFormSchema>;

/**
 * Opciones de la simulacion que viajan al backend.
 *
 * Las consume el `seedingService` (que las envia a `/api/maintenance/seed/*`)
 * y el modal de progreso de la segunda fase: viven en la capa de schemas
 * para que ni el servicio ni el modal dependan de un componente.
 */
export type SeedingOptions = SeedingOptionsFormValues;
