import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";

/**
 * Spec 036 T5 (AC2): helpers compartidos por los schemas de formulario.
 *
 * Cada helper existe para que el schema del frontend sea una **copia
 * exacta** del schema del backend, sin reescribir las reglas a mano en 14
 * ficheros. El test de paridad (`src/tests/contracts/form-schema-parity.test.ts`)
 * compara el JSON Schema que Zod genera con el artefacto OpenAPI del backend
 * (`backend/docs/swagger.json`): si un helper se desvía, el test falla.
 */

/**
 * Patrón de fecha de negocio (`YYYY-MM-DD`).
 *
 * Copia literal de `isoDateSchema` del backend
 * (`backend/src/models/schemas/common.ts`).
 */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Roles de usuario (copia de `userRoleEnum` del backend). */
export const USER_ROLES = [
  "Usuario",
  "Reloj_Control",
  "Supervisor",
  "Administrador",
  "Supervisor_Elevado",
  "Fiscalizador",
] as const;

/** Estados de empleado (copia de `employeeStatusEnum` del backend). */
export const EMPLOYEE_STATUSES = ["Activo", "Archivado"] as const;

/**
 * Texto obligatorio.
 *
 * El mensaje del error sale del mapa central (`ERROR_MESSAGES`), no de Zod en
 * ingles: el parametro `error` de Zod v4 sustituye el mensaje por defecto de
 * los checks que no lo traen (y por eso los `.min()` llevan el suyo propio).
 */
export const requiredText = (label: string): z.ZodString =>
  z.string({ error: ERROR_MESSAGES.required(label) }).trim();

/** Texto obligatorio con longitud mínima (espejo de `z.string().min(n)`). */
export const requiredTextMin = (label: string, min: number): z.ZodString =>
  requiredText(label).min(min, ERROR_MESSAGES.minLength(label, min));

/**
 * Texto opcional.
 *
 * Si el usuario no lo escribe, el valor llega `undefined` y **no viaja en el
 * payload**: es exactamente lo que hace `z.string().optional()` en el backend.
 */
export const optionalText = (): z.ZodOptional<z.ZodString> => z.string().trim().optional();

/** Texto opcional que el backend admite como `null`. */
export const optionalNullableText = (): z.ZodOptional<z.ZodNullable<z.ZodString>> =>
  z.string().trim().nullable().optional();

/** Fecha de negocio (`YYYY-MM-DD`), obligatoria. */
export const businessDate = (label: string): z.ZodString =>
  requiredText(label).regex(ISO_DATE_PATTERN, ERROR_MESSAGES.invalidDate());

/**
 * Patrón de hora de reloj (`HH:mm`), 24 horas.
 *
 * Es el formato que produce `formatTime` (la hora de Chile) y el que
 * escriben los selectores de hora de la pantalla.
 */
export const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Hora de reloj (`HH:mm`), obligatoria. */
export const clockTime = (label: string): z.ZodString =>
  requiredText(label).regex(CLOCK_TIME_PATTERN, ERROR_MESSAGES.invalidTime());

/** Fecha de negocio (`YYYY-MM-DD`), opcional. */
export const optionalBusinessDate = (): z.ZodOptional<z.ZodString> =>
  z.string().trim().regex(ISO_DATE_PATTERN, ERROR_MESSAGES.invalidDate()).optional();

/**
 * Correo electronico obligatorio (mismo `format: email` que el backend).
 *
 * El tipo de retorno es **concreto** (`z.ZodString`) y no `z.ZodType<string,
 * unknown>`: con el tipo laxo, `z.input<typeof schema>` degrada a `unknown` y
 * el formulario deja de poder tipar el valor del campo.
 */
export const emailField = (label: string): z.ZodString =>
  z
    .string({ error: ERROR_MESSAGES.required(label) })
    .trim()
    .email(ERROR_MESSAGES.invalidEmail());

/** Correo electronico opcional (mismo `format: email` que el backend). */
export const optionalEmailField = (): z.ZodOptional<z.ZodString> =>
  z.string().trim().email(ERROR_MESSAGES.invalidEmail()).optional();
