import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { clockTime, optionalText, requiredText, requiredTextMin } from "./common";

/**
 * Spec 036 T5 (AC2): nota rapida (`QuickNotes.tsx`).
 *
 * Contrato: `QuickNote` (`backend/src/models/schemas/note.schemas.ts`).
 * `authorUsername` lo pone el servidor a partir de la sesion: el formulario
 * no lo escribe, asi que no forma parte del payload.
 */
export const quickNoteFormSchema = z.object({
  content: requiredTextMin("El contenido", 1),
  color: optionalText(),
  reminderEnabled: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

/**
 * Patrón de la patente vehicular con el formato de la pantalla (`AA-BB-11`).
 *
 * Acepta tambien los **prefijos** que produce la mascara mientras el
 * usuario escribe (`A`, `AB`, `AB-C`): la regla es "no puede seguir siendo
 * una patente incompleta al enviar", no "tiene que tener seis caracteres".
 */
export const LICENSE_PLATE_PATTERN = /^[A-Z0-9]{1,2}(?:-[A-Z0-9]{1,2}){0,2}$/;

/**
 * Proveedor / acceso vehicular de la libreta de turnos
 * (`AddSupplierModal.tsx`).
 *
 * **Sin contraparte en el backend**: el registro del proveedor es un dato
 * **local** del navegador (forma parte del turno en curso, que es lo que se
 * sincroniza). No hay schema OpenAPI que verificar, asi que este schema solo
 * fija las reglas de UI.
 *
 * Spec 036 T10: los campos son los que el modal muestra de verdad (patente,
 * conductor, pasajeros, empresa, motivo y hora); antes el schema describia
 * otro formulario (nombre, RUT, telefono...), que no existe en la pantalla.
 */
export const localSupplierFormSchema = z.object({
  licensePlate: requiredText("La patente").regex(
    LICENSE_PLATE_PATTERN,
    ERROR_MESSAGES.invalidLicensePlate(),
  ),
  driverName: requiredText("El conductor"),
  paxCount: z
    .number({ error: ERROR_MESSAGES.required("El número de pasajeros") })
    .int(ERROR_MESSAGES.invalidPaxCount())
    .min(0, ERROR_MESSAGES.invalidPaxCount()),
  company: requiredText("La empresa"),
  reason: requiredText("El motivo del ingreso"),
  time: clockTime("La hora del ingreso"),
});

/**
 * Novedad de la libreta de turnos (`AddNoveltyModal.tsx`).
 *
 * **Sin contraparte en el backend**: la novedad se guarda en el estado local
 * del navegador (forma parte del turno en curso).
 *
 * Spec 036 T10: los campos son los que el modal muestra de verdad (la
 * anotacion y su hora); antes el schema describia otro formulario (tipo,
 * hora de inicio, hora de termino y justificacion), que no existe en la
 * pantalla.
 */
export const localNoveltyFormSchema = z.object({
  annotation: requiredText("La anotación"),
  time: clockTime("La hora del evento"),
});

/** Tipo de la entrada del formulario de nota rapida. */
export type QuickNoteFormValues = z.input<typeof quickNoteFormSchema>;

/** Tipo de la entrada del formulario de proveedor (acceso vehicular). */
export type LocalSupplierFormValues = z.input<typeof localSupplierFormSchema>;

/** Tipo de la entrada del formulario de novedad. */
export type LocalNoveltyFormValues = z.input<typeof localNoveltyFormSchema>;
