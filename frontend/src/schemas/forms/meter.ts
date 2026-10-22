import { z } from "zod";

import { ERROR_MESSAGES } from "../../utils/errorMessages";
import { optionalNullableText, optionalText, requiredText } from "./common";

/**
 * Spec 036 T5 (AC2): lectura de medidor (`SingleMeterInputModal.tsx`).
 *
 * Contrato: `MeterReading` (`backend/src/models/schemas/meter.schemas.ts`).
 * `meterConfigId` y `authorUsername` los exige el backend; el segundo lo
 * deduce el servidor de la sesion, asi que el formulario no lo escribe.
 */
export const meterReadingFormSchema = z.object({
  meterConfigId: requiredText("El medidor"),
  value: z
    .number({ error: ERROR_MESSAGES.required("La lectura") })
    .finite(ERROR_MESSAGES.invalidNumber()),
  timestamp: optionalText(),
  isRecharge: z.boolean().optional(),
  notes: optionalNullableText(),
});

/**
 * Configuracion de un medidor (`MeterForm.tsx`).
 *
 * **Sin contraparte en el backend**: los medidores se configuran en el
 * servidor (panel de mantenimiento) y el frontend solo muestra el formulario
 * de alta local. Las reglas son de UI.
 */
export const localMeterConfigFormSchema = z.object({
  name: requiredText("El nombre"),
  unit: requiredText("La unidad"),
  location: optionalText(),
  notes: optionalText(),
});

/** Tipo de la entrada del formulario de lectura de medidor. */
export type MeterReadingFormValues = z.input<typeof meterReadingFormSchema>;
