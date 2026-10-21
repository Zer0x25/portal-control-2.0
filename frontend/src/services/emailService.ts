import { EmailNotificationRules, SmtpConfig, MultiSmtpConfig } from "../types";
import { apiClient } from "./apiClient";

const extractErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Error desconocido";

export const emailService = {
  verifyStatus: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const multiConfig = await emailService.getConfig();
      const config = multiConfig?.profiles[multiConfig.activeProfileIndex];
      if (!config || !config.host) {
        return {
          success: false,
          message: "Servicio de correo no configurado. Por favor, configure el servidor SMTP.",
        };
      }

      return (await apiClient.post("/api/email/verify" as never, {
        body: config as never,
      })) as { success: boolean; message: string };
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },

  verifyConnection: async (config: SmtpConfig): Promise<{ success: boolean; message: string }> => {
    try {
      return (await apiClient.post("/api/email/verify" as never, {
        body: config as never,
      })) as { success: boolean; message: string };
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },

  getConfig: async (): Promise<MultiSmtpConfig | null> => {
    const result = await apiClient.request<MultiSmtpConfig>("/api/email/config", {
      mode: "result",
    });
    if (result.ok) {
      return result.data;
    }
    return null;
  },

  saveConfig: async (config: MultiSmtpConfig): Promise<{ success: boolean; message: string }> => {
    try {
      return (await apiClient.post("/api/email/config" as never, {
        body: config as never,
      })) as { success: boolean; message: string };
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },

  getRules: async (): Promise<EmailNotificationRules> => {
    try {
      return (await apiClient.get("/api/email/rules" as never)) as EmailNotificationRules;
    } catch (error) {
      console.error("Error fetching notification rules:", error);
      return {
        autoCloseShift: { enabled: false, recipient: "" },
        latenessOver15: { enabled: false, recipient: "" },
        latenessOver60: { enabled: false, recipient: "" },
      };
    }
  },

  saveRules: async (
    rules: EmailNotificationRules,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return (await apiClient.post("/api/email/rules" as never, {
        body: rules as never,
      })) as { success: boolean; message: string };
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },

  sendTestEmail: async (
    to: string,
    subject: string,
    message: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return (await apiClient.post("/api/email/send-test" as never, {
        body: { to, subject, message } as never,
      })) as { success: boolean; message: string };
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },
};
