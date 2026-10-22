import { z } from "zod";

import { optionalText, requiredText, requiredTextMin } from "./common";

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
 * Proveedor de la libreta de turnos (`AddSupplierModal.tsx`).
 *
 * **Sin contraparte en el backend**: el proveedor es un dato **local** del
 * navegador (sirve para nombrar las entregas de un turno). No hay schema
 * OpenAPI que verificar, asi que este schema solo fija las reglas de UI.
 */
export const localSupplierFormSchema = z.object({
  name: requiredTextMin("El nombre", 2),
  rut: requiredText("El RUT"),
  phone: optionalText(),
  email: optionalText(),
  notes: optionalText(),
});

/**
 * Novedad de la libreta de turnos (`AddNoveltyModal.tsx`).
 *
 * **Sin contraparte en el backend**: la novedad se guarda en el estado local
 * del navegador (justifica las horas extra de un turno).
 */
export const localNoveltyFormSchema = z.object({
  type: requiredText("El tipo de novedad"),
  startTime: requiredText("La hora de inicio"),
  endTime: requiredText("La hora de término"),
  justification: requiredText("La justificación"),
});

/** Tipo de la entrada del formulario de nota rapida. */
export type QuickNoteFormValues = z.input<typeof quickNoteFormSchema>;
