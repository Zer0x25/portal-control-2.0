import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { optionalText, requiredText } from "./common";

/**
 * Spec 036 T5 (AC2): solicitud de correccion de un marcaje
 * (`CorrectionRequestModal`).
 *
 * Contrato: `CorrectionRequest`
 * (`backend/src/models/schemas/time-correction.schemas.ts`).
 *
 * `requestedValue` es una fecha-hora ISO **con offset** (`z.iso.datetime`).
 * El backend anade una regla que el OpenAPI no puede expresar: la correccion
 * no puede estar en el futuro. Esa regla esta en el fixture dorado
 * `cases/correction.cases.json`.
 */
export const correctionRequestFormSchema = z.object({
  employeeId: requiredText("El empleado"),
  timeRecordId: requiredText("El marcaje"),
  recordField: z.enum(["entrada", "inicioColacion", "finColacion", "salida"]),
  currentValue: optionalText(),
  requestedValue: requiredText("El valor solicitado"),
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
