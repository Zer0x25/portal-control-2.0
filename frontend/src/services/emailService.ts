import { authService } from "./authService";
import { EmailNotificationRules, SmtpConfig, MultiSmtpConfig } from "../types";
import { API_BASE_URL } from "./apiBase";

const API_URL = API_BASE_URL;
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

      const response = await fetch(`${API_URL}/email/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as Record<string, string>),
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error("Error al verificar conexión SMTP");
      return await response.json();
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },

  verifyConnection: async (config: SmtpConfig): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_URL}/email/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as Record<string, string>),
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error("Error al verificar conexión SMTP");
      return await response.json();
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },

  getConfig: async (): Promise<MultiSmtpConfig | null> => {
    try {
      const response = await fetch(`${API_URL}/email/config`, {
        headers: authService.getAuthHeader() as Record<string, string>,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Error fetching SMTP config:", error);
      return null;
    }
  },

  saveConfig: async (config: MultiSmtpConfig): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_URL}/email/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as Record<string, string>),
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const detail = await response.json();
        throw new Error(
          typeof detail.message === "string"
            ? detail.message
            : "Error al guardar configuración SMTP",
        );
      }
      return await response.json();
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },

  getRules: async (): Promise<EmailNotificationRules> => {
    try {
      const response = await fetch(`${API_URL}/email/rules`, {
        headers: authService.getAuthHeader() as Record<string, string>,
      });
      if (!response.ok) throw new Error("Error al cargar reglas de notificación");
      return await response.json();
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
      const response = await fetch(`${API_URL}/email/rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as Record<string, string>),
        },
        body: JSON.stringify(rules),
      });
      if (!response.ok) throw new Error("Error al guardar reglas de notificación");
      return await response.json();
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
      const response = await fetch(`${API_URL}/email/send-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as Record<string, string>),
        },
        body: JSON.stringify({ to, subject, message }),
      });
      if (!response.ok) throw new Error("Error al enviar correo de prueba");
      return await response.json();
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error) };
    }
  },
};
