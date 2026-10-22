import { useCallback, useEffect, useState } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { emailService } from "../../../services/emailService";
import { EmailNotificationRules } from "../../../types";
import { useEmailRecipientsListQuery } from "../../../hooks/queries/useConfigQuery";
import { useAppForm } from "../../../hooks/useAppForm";
import { sendTestEmailFormSchema } from "../../../schemas/forms/smtp";

/**
 * Spec 036 T10b (AC1, AC2, AC3): el formulario de **correo de prueba** del
 * centro de correo.
 *
 * Antes el borrador vivia en un `useState` y, si faltaba algun campo, se
 * avisaba con un `toast` ("Todos los campos son requeridos.") que no decia
 * cual era. Ahora:
 *
 * - el estado vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`sendTestEmailFormSchema`: el destinatario
 *   es un correo valido y el asunto y el mensaje son obligatorios) (AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central (AC3).
 *
 * El payload no cambia: `{to, subject, message}` (spec 036 T13).
 */
export const useEmailCenterController = () => {
  const { addToast } = useToasts();
  const { data: emailRecipientsList = [], isLoading: isEmailListLoading } =
    useEmailRecipientsListQuery();

  const [status, setStatus] = useState<{
    loading: boolean;
    success: boolean;
    message: string;
  }>({ loading: true, success: false, message: "Verificando..." });
  const [isSending, setIsSending] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [rules, setRules] = useState<EmailNotificationRules>({
    autoCloseShift: { enabled: false, recipient: "" },
    latenessOver15: { enabled: false, recipient: "" },
    latenessOver60: { enabled: false, recipient: "" },
  });
  const [isLoadingRules, setIsLoadingRules] = useState(true);

  /** Formulario del correo de prueba. */
  const manualEmailForm = useAppForm({
    schema: sendTestEmailFormSchema,
    defaultValues: { to: "", subject: "", message: "" },
    onSubmit: async (values) => {
      setIsSending(true);
      const result = await emailService.sendTestEmail(values.to, values.subject, values.message);
      if (result.success) {
        addToast(result.message, "success");
        manualEmailForm.reset({ to: "", subject: "", message: "" });
      } else {
        addToast(result.message, "error");
      }
      setIsSending(false);
    },
  });

  const { setValue } = manualEmailForm;

  /** Escribe un campo del correo de prueba. */
  const handleManualEmailChange = useCallback(
    (field: "to" | "subject" | "message", value: string) => {
      setValue(field, value);
    },
    [setValue],
  );

  const checkStatus = useCallback(async () => {
    setStatus({ loading: true, success: false, message: "Verificando..." });
    const result = await emailService.verifyStatus();
    setStatus({
      loading: false,
      success: result.success,
      message: result.message,
    });
  }, []);

  const loadRules = useCallback(async () => {
    setIsLoadingRules(true);
    const storedRules = await emailService.getRules();
    setRules(storedRules);
    setIsLoadingRules(false);
  }, []);

  useEffect(() => {
    checkStatus();
    loadRules();
  }, [checkStatus, loadRules]);

  const handleRuleChange = (
    ruleKey: keyof EmailNotificationRules,
    field: "enabled" | "recipient",
    value: boolean | string,
  ) => {
    setRules((prevRules) => {
      const newRules = { ...prevRules };
      const updatedRule = { ...newRules[ruleKey], [field]: value };
      if (
        field === "enabled" &&
        value === true &&
        !updatedRule.recipient &&
        emailRecipientsList.length > 0
      ) {
        updatedRule.recipient = emailRecipientsList[0];
      }
      newRules[ruleKey] = updatedRule;
      return newRules;
    });
  };

  const handleSaveRules = async () => {
    const result = await emailService.saveRules(rules);
    if (result.success) {
      addToast("Configuración de reglas guardada.", "success");
    } else {
      addToast(result.message, "error");
    }
  };

  const handleCloseConfigModal = () => {
    setIsConfigModalOpen(false);
    checkStatus();
  };

  return {
    emailRecipientsList,
    isEmailListLoading,
    status,
    manualEmail: manualEmailForm.values,
    getManualEmailError: manualEmailForm.getError,
    handleManualEmailChange,
    isSending,
    isConfigModalOpen,
    rules,
    isLoadingRules,
    setIsConfigModalOpen,
    checkStatus,
    handleRuleChange,
    handleManualSend: manualEmailForm.submit,
    manualEmailFormProps: manualEmailForm.formProps,
    handleSaveRules,
    handleCloseConfigModal,
  };
};
