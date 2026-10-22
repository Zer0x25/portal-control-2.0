import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { optionalText, requiredText } from "./common";

/**
 * Patrón de fecha-hora de pantalla (`YYYY-MM-DDTHH:mm`), el que escribe el
 * `<input type="datetime-local">` en hora de Chile.
 */
export const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Spec 036 T5 (AC2): formularios de solicitud y resolucion de correcciones.
 *
 * Contratos: `CorrectionRequest` y `UpdateCorrectionStatus`
 * (`backend/src/models/schemas/time-correction.schemas.ts`).
 *
 * `requestedValue` es en el backend una fecha-hora ISO **con offset**
 * (`z.iso.datetime`) y no puede estar en el futuro: esa ultima regla vive en
 * un `superRefine` que el OpenAPI no expresa, y el controller la vuelve a
 * comprobar en el momento de montar el payload (hora de Chile -> ISO).
 */

/**
 * Copia del contrato `CorrectionRequest`
 * (`backend/src/models/schemas/time-correction.schemas.ts`).
 *
 * El formulario de solicitud solo escribe dos campos (`correctionRequestForm`):
 * el empleado, el marcaje, el campo y el valor actual los aporta la pantalla
 * que lo abre, y el adjunto es un `File` que se convierte a base64 al enviar.
 */
export const correctionRequestBaseSchema = z.object({
  employeeId: requiredText("El empleado"),
  timeRecordId: requiredText("El marcaje"),
  recordField: z.enum(["entrada", "inicioColacion", "finColacion", "salida"]),
  currentValue: optionalText(),
  requestedValue: requiredText("El valor solicitado"),
  reason: requiredText("El motivo"),
});

/**
 * Solicitud de correccion (`CorrectionRequestModal.tsx`).
 *
 * Contrato: `CorrectionRequest` -> `requestedValue` + `reason`.
 *
 * El modal escribe **estos dos** campos: el empleado, el marcaje, el campo y
 * el valor actual los aporta la pantalla que lo abre. `requestedValue` se
 * captura en `YYYY-MM-DDTHH:mm` (hora de Chile) y el controller lo convierte
 * a ISO-8601 con offset antes de enviarlo (divergencia declarada en el mapa,
 * con `transformedFields`).
 */
export const correctionRequestFormSchema = z.object({
  requestedValue: requiredText("El valor solicitado").regex(
    DATETIME_LOCAL_PATTERN,
    ERROR_MESSAGES.invalidDateTimeLocal(),
  ),
  reason: requiredText("El motivo"),
});

/**
 * Resolucion de una solicitud de correccion (`RejectionReasonModal.tsx`).
 *
 * Contrato: `UpdateCorrectionStatus`
 * (`backend/src/models/schemas/time-correction.schemas.ts`).
 *
 * El backend exige `rejectionReason` cuando el estado es `rejected`: es una
 * regla condicional (`superRefine`) que el OpenAPI no expresa, asi que aqui
 * se declara con un `superRefine` espejo.
 */
export const correctionStatusFormSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    rejectionReason: optionalText(),
    resolvedBy: requiredText("El supervisor"),
  })
  .superRefine((values, ctx) => {
    if (values.status === "rejected" && !values.rejectionReason?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: ERROR_MESSAGES.required("El motivo del rechazo"),
        path: ["rejectionReason"],
      });
    }
  });

/**
 * Motivo de rechazo (`RejectionReasonModal.tsx`).
 *
 * Contrato: `UpdateCorrectionStatus` -> `rejectionReason`
 * (`backend/src/models/schemas/time-correction.schemas.ts`).
 *
 * El modal solo escribe **este** campo: el estado (`rejected`) y el
 * supervisor que resuelve los pone la pantalla. El backend lo exige cuando el
 * estado es `rejected` (regla condicional que el OpenAPI no expresa), asi que
 * aqui es siempre obligatorio.
 */
export const rejectionReasonFormSchema = z.object({
  rejectionReason: requiredText("El motivo del rechazo"),
});

/** Tipo de la entrada del formulario de solicitud de correccion. */
export type CorrectionRequestFormValues = z.input<typeof correctionRequestFormSchema>;

/** Tipo de la entrada del formulario de resolucion de correccion. */
export type CorrectionStatusFormValues = z.input<typeof correctionStatusFormSchema>;

/** Tipo de la entrada del formulario de motivo de rechazo. */
export type RejectionReasonFormValues = z.input<typeof rejectionReasonFormSchema>;
