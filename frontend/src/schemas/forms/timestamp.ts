import { z } from "zod";

import { businessDate, clockTime, optionalNullableText, requiredTextMin } from "./common";

/**
 * Borrador de hora del modal de ajuste de marcaje (`EditTimestampModal`).
 *
 * **No es un payload**: el formulario solo guarda la hora que escribe el
 * usuario, y `useTimestampEditor` la convierte en el registro completo que
 * manda `updateRecordMutation`. Por eso la entrada se registra con
 * `openApi: null` en el mapa de contratos.
 *
 * La regla que antes era un `/^\d{2}:\d{2}$/` dentro de `handleSave` (con un
 * toast generico) vive aqui: `clockTime` exige `HH:mm` obligatorio (AC2). Un
 * `<input type="time">` solo puede venir vacio, asi que en la practica el
 * caso que se senala es el vacio.
 */
export const editTimestampFormSchema = z.object({
  time: clockTime("La hora"),
});

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
 *
 * **Ningun formulario consume este schema**: el payload lo construye
 * `useTimestampEditor` a partir del registro existente y la hora del borrador
 * (`editTimestampFormSchema`). Se registra en el mapa con `forms: []` porque
 * documenta el contrato del `mutateAsync`, no el de una pantalla.
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

/** Tipo de la entrada del borrador de hora del modal de ajuste. */
export type EditTimestampFormValues = z.input<typeof editTimestampFormSchema>;
