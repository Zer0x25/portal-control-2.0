import { z } from "zod";

import { businessDate, optionalNullableText, requiredTextMin } from "./common";

/**
 * Spec 036 T5 (AC2): edicion de un marcaje (`useTimestampEditor.ts`,
 * `EditTimestampModal`).
 *
 * Contrato: `TimeRecordWrite`
 * (`backend/src/models/schemas/time-correction.schemas.ts`).
 *
 * `employeeId` exige 1+ caracteres en el backend: el schema lo refleja con
 * `requiredTextMin` (la cadena vacia se normaliza a `undefined` y el backend
 * responde "ID de empleado es requerido").
 */
export const timeRecordWriteFormSchema = z.object({
  employeeId: requiredTextMin("El empleado", 1),
  date: businessDate("La fecha"),
  entrada: optionalNullableText(),
  inicioColacion: optionalNullableText(),
  finColacion: optionalNullableText(),
  salida: optionalNullableText(),
  status: z.string().optional(),
  source: z.string().optional(),
  justification: optionalNullableText(),
});

/** Tipo de la entrada del formulario de edicion de marcaje. */
export type TimeRecordWriteFormValues = z.input<typeof timeRecordWriteFormSchema>;
