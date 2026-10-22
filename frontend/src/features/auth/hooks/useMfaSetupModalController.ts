import { useCallback, useEffect, useState } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useToasts } from "../../../hooks/useToasts";
import { buildMfaSetupFormSchema, type MfaSetupFormValues } from "../../../schemas/forms/auth";
import { authService } from "../../../services/authService";

/**
 * Spec 036 T11 (AC1, AC2, AC3): formulario del **alta de MFA**
 * (`MFASetupModal.tsx`).
 *
 * Antes el modal guardaba el codigo TOTP en un `useState`, lo filtraba a
 * digitos en el `onChange` y, si no tenia 6, **volvia atras sin decir nada**
 * (`if (token.length !== 6) return;`): el usuario pulsaba "Habilitar MFA" y
 * no pasaba nada. Ahora:
 *
 * - el codigo vive en `useAppForm` (spec 036 AC1);
 * - la regla vive en el schema (`buildMfaSetupFormSchema`: exactamente 6
 *   digitos numericos) (spec 036 AC2);
 * - el error sale junto al campo (spec 036 AC3).
 *
 * El flujo de tres pasos (bienvenida -> QR -> verificacion) y el QR son
 * estado de **pantalla**, y viven aqui (en el hook de dominio), no en la
 * vista (spec 033 AC1).
 *
 * El payload no cambia (T13): se sigue enviando solo `{ token }`.
 */

/** Pasos del asistente de alta de MFA. */
export type MfaSetupStep = "initial" | "scanning" | "verifying";

/** Opciones del hook del formulario de alta de MFA. */
export interface UseMfaSetupModalControllerOptions {
  /** El modal esta abierto. */
  readonly isOpen: boolean;
  /** El alta se verifico correctamente. */
  readonly onSuccess: () => void;
  /** Cierra el modal. */
  readonly onClose: () => void;
}

/** Controlador del formulario de alta de MFA (spec 036 T11). */
export const useMfaSetupModalController = ({
  isOpen,
  onSuccess,
  onClose,
}: UseMfaSetupModalControllerOptions) => {
  const { addToast } = useToasts();

  const [step, setStep] = useState<MfaSetupStep>("initial");
  /** QR y secreto que devuelve el backend al iniciar la configuracion. */
  const [mfaData, setMfaData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const form = useAppForm<MfaSetupFormValues, string>({
    schema: buildMfaSetupFormSchema(),
    defaultValues: { token: "" },
    /** El payload sigue siendo **solo el token**. */
    serialize: (values) => values.token,
    onSubmit: async (token) => {
      try {
        await authService.verifyMFASetup(token);
        addToast("MFA configurado y habilitado correctamente", "success");
        onSuccess();
        onClose();
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : "Código de verificación incorrecto",
          "error",
        );
      }
    },
  });

  const { reset, setValue } = form;

  /** Al cerrar el modal el asistente vuelve al paso inicial. */
  useEffect(() => {
    if (isOpen) return;
    setStep("initial");
    setMfaData(null);
    reset({ token: "" });
  }, [isOpen, reset]);

  /** Pide al backend el QR y el secreto para escanear. */
  const handleStartSetup = useCallback(async () => {
    setIsStarting(true);
    try {
      const data = await authService.setupMFA();
      setMfaData(data);
      setStep("scanning");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Error al iniciar configuración", "error");
    } finally {
      setIsStarting(false);
    }
  }, [addToast]);

  /** Escribe el codigo TOTP: solo digitos, como maximo 6. */
  const handleTokenChange = useCallback(
    (raw: string) => {
      setValue("token", raw.replace(/\D/g, "").slice(0, 6));
    },
    [setValue],
  );

  return {
    values: form.values,
    getError: form.getError,
    handleTokenChange,
    handleStartSetup,
    step,
    mfaData,
    goToScanning: () => setStep("scanning"),
    goToVerifying: () => setStep("verifying"),
    isStarting,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
