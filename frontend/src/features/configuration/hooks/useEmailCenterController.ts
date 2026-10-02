import { useCallback, useEffect, useState } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { emailService } from "../../../services/emailService";
import { EmailNotificationRules } from "../../../types";
import { useEmailRecipientsListQuery } from "../../../hooks/queries/useConfigQuery";

export const useEmailCenterController = () => {
  const { addToast } = useToasts();
  const { data: emailRecipientsList = [], isLoading: isEmailListLoading } =
    useEmailRecipientsListQuery();

  const [status, setStatus] = useState<{
    loading: boolean;
    success: boolean;
    message: string;
  }>({ loading: true, success: false, message: "Verificando..." });
  const [manualEmail, setManualEmail] = useState({
    to: "",
    subject: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [rules, setRules] = useState<EmailNotificationRules>({
    autoCloseShift: { enabled: false, recipient: "" },
    latenessOver15: { enabled: false, recipient: "" },
    latenessOver60: { enabled: false, recipient: "" },
  });
  const [isLoadingRules, setIsLoadingRules] = useState(true);

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

  const handleManualSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    const { to, subject, message } = manualEmail;
    if (!to || !subject || !message) {
      addToast("Todos los campos son requeridos.", "warning");
      setIsSending(false);
      return;
    }

    const result = await emailService.sendTestEmail(to, subject, message);
    if (result.success) {
      addToast(result.message, "success");
      setManualEmail({ to: "", subject: "", message: "" });
    } else {
      addToast(result.message, "error");
    }
    setIsSending(false);
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
    manualEmail,
    isSending,
    isConfigModalOpen,
    rules,
    isLoadingRules,
    setManualEmail,
    setIsConfigModalOpen,
    checkStatus,
    handleRuleChange,
    handleManualSend,
    handleSaveRules,
    handleCloseConfigModal,
  };
};
