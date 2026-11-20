import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import {
  CLOCK_TIME_PATTERN,
  clockTime,
  optionalText,
  requiredText,
  requiredTextMin,
} from "./common";

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
 * Spec 036 T10: conserva los campos del formulario de ingreso, junto con el
 * tipo de entrada y el modo de llegada; la patente se exige solo al ingresar
 * en vehículo.
 */
export const localSupplierFormSchema = z
  .object({
    entryType: z.enum(["visit", "provider"]),
    arrivalMode: z.enum(["pedestrian", "vehicle"]),
    licensePlate: z.string().trim(),
    driverName: z
      .string({ error: ERROR_MESSAGES.required("El conductor") })
      .trim()
      .min(1, ERROR_MESSAGES.required("El conductor")),
    paxCount: z
      .number({ error: ERROR_MESSAGES.required("El número de pasajeros") })
      .int(ERROR_MESSAGES.invalidPaxCount())
      .min(0, ERROR_MESSAGES.invalidPaxCount()),
    company: z
      .string({ error: ERROR_MESSAGES.required("La empresa") })
      .trim()
      .min(1, ERROR_MESSAGES.required("La empresa")),
    reason: z
      .string({ error: ERROR_MESSAGES.required("El motivo del ingreso") })
      .trim()
      .min(1, ERROR_MESSAGES.required("El motivo del ingreso")),
    time: z
      .string({ error: ERROR_MESSAGES.required("La hora del ingreso") })
      .trim()
      .min(1, ERROR_MESSAGES.required("La hora del ingreso"))
      .regex(CLOCK_TIME_PATTERN, ERROR_MESSAGES.invalidTime()),
  })
  .superRefine((values, context) => {
    if (values.arrivalMode !== "vehicle") return;
    if (!values.licensePlate) {
      context.addIssue({
        code: "custom",
        path: ["licensePlate"],
        message: ERROR_MESSAGES.required("La patente"),
      });
      return;
    }
    if (!LICENSE_PLATE_PATTERN.test(values.licensePlate)) {
      context.addIssue({
        code: "custom",
        path: ["licensePlate"],
        message: ERROR_MESSAGES.invalidLicensePlate(),
      });
    }
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
