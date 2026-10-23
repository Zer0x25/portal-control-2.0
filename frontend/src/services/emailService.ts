import { EmailNotificationRules, SmtpConfig, MultiSmtpConfig } from "../types";
import { request as apiRequest, errorMessageOr } from "./apiClient";
import { logger } from "../utils/logger";

interface EmailOperationResult {
  success: boolean;
  message: string;
}

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

      return await apiRequest<EmailOperationResult>({
        method: "POST",
        url: "/api/email/verify",
        body: config,
      });
    } catch (error: unknown) {
      return {
        success: false,
        message: errorMessageOr(error, "Error al verificar conexión SMTP"),
      };
    }
  },

  verifyConnection: async (config: SmtpConfig): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest<EmailOperationResult>({
        method: "POST",
        url: "/api/email/verify",
        body: config,
      });
    } catch (error: unknown) {
      return {
        success: false,
        message: errorMessageOr(error, "Error al verificar conexión SMTP"),
      };
    }
  },

  getConfig: async (): Promise<MultiSmtpConfig | null> => {
    try {
      // Sin configuracion el backend responde 404: es un caso de negocio
      // (la UI muestra "sin configurar"), no un error.
      const result = await apiRequest<MultiSmtpConfig>({
        method: "GET",
        url: "/api/email/config",
        errorMode: "result",
      });

      if (!result.ok) return null;
      return result.data ?? null;
    } catch (error) {
      logger.error("Error fetching SMTP config:", error);
      return null;
    }
  },

  saveConfig: async (config: MultiSmtpConfig): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest<EmailOperationResult>({
        method: "POST",
        url: "/api/email/config",
        body: config,
      });
    } catch (error: unknown) {
      return {
        success: false,
        message: errorMessageOr(error, "Error al guardar configuración SMTP"),
      };
    }
  },

  getRules: async (): Promise<EmailNotificationRules> => {
    try {
      return await apiRequest<EmailNotificationRules>({
        method: "GET",
        url: "/api/email/rules",
      });
    } catch (error) {
      logger.error("Error fetching notification rules:", error);
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
      return await apiRequest<EmailOperationResult>({
        method: "POST",
        url: "/api/email/rules",
        body: rules,
      });
    } catch (error: unknown) {
      return {
        success: false,
        message: errorMessageOr(error, "Error al guardar reglas de notificación"),
      };
    }
  },

  sendTestEmail: async (
    to: string,
    subject: string,
    message: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest<EmailOperationResult>({
        method: "POST",
        url: "/api/email/send-test",
        body: { to, subject, message },
      });
    } catch (error: unknown) {
      return {
        success: false,
        message: errorMessageOr(error, "Error al enviar correo de prueba"),
      };
    }
  },
};
