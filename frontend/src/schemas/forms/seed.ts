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
