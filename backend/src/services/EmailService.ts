import nodemailer from "nodemailer";
import prisma from "./db";
import { safeJsonParse } from "../utils/configUtils";
import { encrypt, decrypt, isEncrypted } from "../utils/cryptoUtils";
import { mergeSmtpSecrets } from "../modules/configs";
import { ConfigService } from "./ConfigService";
import { requestContext } from "../utils/context";
import { logger } from "../utils/logger";
import { MultiSmtpConfigSchema } from "../models/schemas/smtpProfile.schemas";
import { EmailRulesSchema } from "../models/schemas/email.schemas";
import { ValidationError } from "../utils/AppError";

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

    const config = this.normalizeMultiConfig(
      configRecord ? safeJsonParse(configRecord.value) : null,
    );
    if (masked) {
      config.profiles = config.profiles.map((profile) => ({
        ...profile,
        pass: profile.pass ? "********" : "",
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

  private normalizeMultiConfig(value: unknown): MultiSmtpConfig {
    const defaults = () => ({
      ...DEFAULT_MULTI_CONFIG,
      profiles: DEFAULT_MULTI_CONFIG.profiles.map((profile) => ({ ...profile })),
    });
    const candidate =
      value && typeof value === "object" && "host" in value
        ? { ...defaults(), profiles: [value, ...defaults().profiles.slice(1)] }
        : value;
    const parsed = MultiSmtpConfigSchema.safeParse(candidate);
    return parsed.success ? parsed.data : defaults();
  }

  async saveMultiSmtpConfig(config: MultiSmtpConfig): Promise<void> {
    const parsed = MultiSmtpConfigSchema.parse(config);
    await ConfigService.replace(
      SMTP_CONFIG_KEY,
      parsed,
      requestContext.getStore()?.username || "SYSTEM",
      (_value, previous) => {
        const current = this.normalizeMultiConfig(previous);
        return {
          ...parsed,
          profiles: parsed.profiles.map((profile, index) => {
            let pass = profile.pass;
            if (pass === "********") {
              const merged = mergeSmtpSecrets(profile, current.profiles[index]);
              if (
                !merged ||
                typeof merged !== "object" ||
                !("pass" in merged) ||
                typeof merged.pass !== "string"
              )
                throw new ValidationError("Configuración SMTP inválida");
              pass = merged.pass;
            }
            if (pass && !isEncrypted(pass)) {
              pass = encrypt(pass);
            }
            return { ...profile, pass };
          }),
        };
      },
    );
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
    const parsed = EmailRulesSchema.safeParse(safeJsonParse(rules.value));
    return parsed.success
      ? parsed.data
      : {
          autoCloseShift: { enabled: false, recipient: "" },
          latenessOver15: { enabled: false, recipient: "" },
          latenessOver60: { enabled: false, recipient: "" },
        };
  }

  async saveNotificationRules(rules: EmailNotificationRules): Promise<void> {
    await ConfigService.set(
      NOTIFICATION_RULES_KEY,
      EmailRulesSchema.parse(rules),
      requestContext.getStore()?.username || "SYSTEM",
    );
  }

  async verifyConnection(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
    try {
      let passToUse = config.pass;

      // If validating from UI, it might be masked. If so, fetch actual pass from DB
      if (passToUse === "********") {
        const stored = (await this.getMultiSmtpConfig(false)).profiles.find(
          (profile) =>
            profile.host === config.host &&
            profile.user === config.user &&
            profile.port === config.port &&
            profile.secure === config.secure &&
            !!profile.pass,
        );
        if (!stored)
          return {
            success: false,
            message: "Ingresa una contraseña nueva al cambiar servidor o usuario SMTP",
          };
        passToUse = isEncrypted(stored.pass) ? decrypt(stored.pass) : stored.pass;
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
    } catch {
      logger.warn("SMTP connection verification failed");
      return { success: false, message: "No se pudo verificar la conexión SMTP" };
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
    } catch {
      logger.warn("Email delivery failed");
      return { success: false, message: "No se pudo enviar el correo" };
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
            contentType:
              attachmentBuffer.subarray(0, 5).toString("ascii") === "%PDF-"
                ? "application/pdf"
                : "text/plain; charset=utf-8",
          },
        ],
      });

      return { success: true, message: "Correo con adjunto enviado correctamente." };
    } catch {
      logger.warn("Email attachment delivery failed");
      return { success: false, message: "No se pudo enviar el correo" };
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
