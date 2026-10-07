import nodemailer from "nodemailer";
import prisma from "./db";
import { encrypt, decrypt, isEncrypted } from "../utils/cryptoUtils";
import { toCaughtError } from "../utils/caughtError";

import type { SmtpConfig, MultiSmtpConfig, EmailNotificationRules } from "../modules/emailReports";
export type {
  SmtpConfig,
  MultiSmtpConfig,
  EmailNotificationRules,
  EmailRule,
} from "../modules/emailReports";
const SMTP_CONFIG_KEY = "SMTP_CONFIG";
const NOTIFICATION_RULES_KEY = "EMAIL_NOTIFICATION_RULES";
const SMTP_REJECT_UNAUTHORIZED = process.env.SMTP_ALLOW_INSECURE_TLS === "true" ? false : true;

const DEFAULT_MULTI_CONFIG: MultiSmtpConfig = {
  profiles: [
    {
      host: "",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      fromEmail: "",
      fromName: "Portal Control Interno",
    },
    {
      host: "",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      fromEmail: "",
      fromName: "Portal Control Interno",
    },
    {
      host: "",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      fromEmail: "",
      fromName: "Portal Control Interno",
    },
  ],
  activeProfileIndex: 0,
};

export class EmailService {
  async getMultiSmtpConfig(masked: boolean = false): Promise<MultiSmtpConfig> {
    const configRecord = await prisma.systemConfig.findUnique({
      where: { key: SMTP_CONFIG_KEY },
    });

    let config: MultiSmtpConfig = DEFAULT_MULTI_CONFIG;

    if (configRecord) {
      try {
        const parsed = JSON.parse(configRecord.value);

        // Migration: If it's the old single config format, wrap it in the new multi format
        if (parsed.host !== undefined) {
          config = {
            ...DEFAULT_MULTI_CONFIG,
            profiles: [parsed, DEFAULT_MULTI_CONFIG.profiles[1], DEFAULT_MULTI_CONFIG.profiles[2]],
          };
        } else {
          config = parsed;
        }
      } catch {
        config = DEFAULT_MULTI_CONFIG;
      }
    }

    if (masked) {
      config.profiles = config.profiles.map((p) => ({
        ...p,
        pass: p.pass ? "********" : "",
      }));
    }

    return config;
  }

  async getSmtpConfig(): Promise<SmtpConfig | null> {
    const multiConfig = await this.getMultiSmtpConfig();
    const activeProfile = { ...multiConfig.profiles[multiConfig.activeProfileIndex] };

    if (!activeProfile.host) return null;

    // Decrypt password if it is encrypted
    if (activeProfile.pass && isEncrypted(activeProfile.pass)) {
      activeProfile.pass = decrypt(activeProfile.pass);
    }

    return activeProfile;
  }

  async saveMultiSmtpConfig(config: MultiSmtpConfig): Promise<void> {
    // Before saving, ensure all passwords are encrypted
    const currentStored = await this.getMultiSmtpConfig(false); // Get current config with actual (encrypted) passwords

    const securedProfiles = config.profiles.map((newProfile, idx) => {
      const oldProfile = currentStored.profiles[idx];
      let securedPass = newProfile.pass;

      // If the frontend sends masked password, keep the one we already have in DB
      if (securedPass === "********") {
        securedPass = oldProfile.pass;
      } else if (securedPass && !isEncrypted(securedPass)) {
        // If it's a new plain password, encrypt it
        securedPass = encrypt(securedPass);
      }

      return { ...newProfile, pass: securedPass };
    });

    const securedConfig = { ...config, profiles: securedProfiles };

    await prisma.systemConfig.upsert({
      where: { key: SMTP_CONFIG_KEY },
      update: { value: JSON.stringify(securedConfig) },
      create: { key: SMTP_CONFIG_KEY, value: JSON.stringify(securedConfig) },
    });
  }

  async saveSmtpConfig(config: SmtpConfig): Promise<void> {
    // Compatibility method: saves as the active profile in a multi-profile structure
    const multiConfig = await this.getMultiSmtpConfig(false); // Get current config with actual (encrypted) passwords
    multiConfig.profiles[multiConfig.activeProfileIndex] = config;
    await this.saveMultiSmtpConfig(multiConfig);
  }

  async getNotificationRules(): Promise<EmailNotificationRules> {
    const rules = await prisma.systemConfig.findUnique({
      where: { key: NOTIFICATION_RULES_KEY },
    });
    if (!rules) {
      return {
        autoCloseShift: { enabled: false, recipient: "" },
        latenessOver15: { enabled: false, recipient: "" },
        latenessOver60: { enabled: false, recipient: "" },
      };
    }
    return JSON.parse(rules.value);
  }

  async saveNotificationRules(rules: EmailNotificationRules): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key: NOTIFICATION_RULES_KEY },
      update: { value: JSON.stringify(rules) },
      create: { key: NOTIFICATION_RULES_KEY, value: JSON.stringify(rules) },
    });
  }

  async verifyConnection(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
    try {
      let passToUse = config.pass;

      // If validating from UI, it might be masked. If so, fetch actual pass from DB
      if (passToUse === "********") {
        const stored = await this.getSmtpConfig(); // This will return decrypted pass
        passToUse = stored?.pass || "";
      } else if (passToUse && isEncrypted(passToUse)) {
        // If it's an encrypted pass from elsewhere, decrypt it
        passToUse = decrypt(passToUse);
      }

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: passToUse,
        },
        tls: {
          rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED,
        },
      });

      await transporter.verify();
      return { success: true, message: "Conexión SMTP exitosa." };
    } catch (error: unknown) {
      console.error("SMTP Connection Verify Error:", error);
      const caught = toCaughtError(error);
      return { success: false, message: `Error de conexión: ${caught.message}` };
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.getSmtpConfig();
    if (!config) {
      return { success: false, message: "Servidor SMTP no configurado." };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED,
        },
      });

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject,
        text: message,
        html: message.replace(/\n/g, "<br>"),
      });

      return { success: true, message: "Correo enviado correctamente." };
    } catch (error: unknown) {
      console.error("Send Email Error:", error);
      const caught = toCaughtError(error);
      return { success: false, message: `Error al enviar correo: ${caught.message}` };
    }
  }

  async sendEmailWithAttachment(
    to: string | string[],
    subject: string,
    htmlMessage: string,
    attachmentBuffer: Buffer,
    attachmentFilename: string,
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.getSmtpConfig();
    if (!config) {
      return { success: false, message: "Servidor SMTP no configurado." };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED,
        },
      });

      const recipients = Array.isArray(to) ? to.join(", ") : to;

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: recipients,
        subject,
        html: htmlMessage,
        attachments: [
          {
            filename: attachmentFilename,
            content: attachmentBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      return { success: true, message: "Correo con adjunto enviado correctamente." };
    } catch (error: unknown) {
      console.error("Send Email with Attachment Error:", error);
      const caught = toCaughtError(error);
      return { success: false, message: `Error al enviar correo: ${caught.message}` };
    }
  }

  // Specialized notifications
  async notifyAutoClose(folio: string, startTime: string, endTime: string, responsible: string) {
    const rules = await this.getNotificationRules();
    if (!rules.autoCloseShift.enabled || !rules.autoCloseShift.recipient) return;

    const subject = `[ALERTA] Cierre Automático de Turno (Libro) - Folio ${folio}`;
    const message = `Se ha realizado un cierre automático de un reporte en el Libro de Novedades.
        
Folio: ${folio}
Inicio: ${startTime}
Fin: ${endTime}
Socio de Turno Responsable: ${responsible}

Este correo ha sido generado automáticamente por el sistema Portal de Control.`;

    await this.sendEmail(rules.autoCloseShift.recipient, subject, message);
  }

  async notifyTimeRecordAutoClose(employeeName: string, entrada: string, elapsedHours: number) {
    const rules = await this.getNotificationRules();
    if (!rules.autoCloseShift.enabled || !rules.autoCloseShift.recipient) return;

    const subject = `[ALERTA] Cierre Automático de Jornada - ${employeeName}`;
    const message = `Se ha cerrado automáticamente una jornada laboral que excedió las 14 horas de duración.
        
Empleado: ${employeeName}
Hora de Entrada: ${entrada}
Horas transcurridas: ${elapsedHours} hrs

Este correo ha sido generado automáticamente por el sistema Portal de Control.`;

    await this.sendEmail(rules.autoCloseShift.recipient, subject, message);
  }

  async notifyTardiness(
    employeeName: string,
    scheduledStartTime: string,
    actualEntrada: string,
    delayMinutes: number,
  ) {
    const rules = await this.getNotificationRules();

    // Decide which rule to use based on delay
    let ruleToUse = null;
    if (delayMinutes >= 60 && rules.latenessOver60.enabled) {
      ruleToUse = rules.latenessOver60;
    } else if (delayMinutes >= 15 && rules.latenessOver15.enabled) {
      ruleToUse = rules.latenessOver15;
    }

    if (!ruleToUse || !ruleToUse.recipient) return;

    const subject = `[ALERTA] Atraso de Personal - ${employeeName} (+${delayMinutes} min)`;
    const message = `Se ha detectado un atraso en el ingreso del personal.
        
Empleado: ${employeeName}
Horario Programado: ${scheduledStartTime}
Hora de Entrada: ${actualEntrada}
Atraso acumulado: ${delayMinutes} minutos

Este correo ha sido generado automáticamente por el sistema Portal de Control.`;

    await this.sendEmail(ruleToUse.recipient, subject, message);
  }
}
