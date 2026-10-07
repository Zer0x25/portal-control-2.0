import { z, type ZodType } from "zod";
import { createEmailReportFlows } from "../modules/emailReports";
import { EmailService } from "./EmailService";
import { ScheduledReportService } from "./ScheduledReportService";
import { SmtpProfileSchema, MultiSmtpConfigSchema } from "../models/schemas/smtpProfile.schemas";
import { ValidationError } from "../utils/AppError";
const email = new EmailService();
function parse<T>(schema: ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new ValidationError("Datos de configuración inválidos", error.issues);
    throw error;
  }
}
export const emailReportFlows = createEmailReportFlows({
  email: {
    parseProfile: (value) => parse(SmtpProfileSchema, value),
    parseConfig: (value) => parse(MultiSmtpConfigSchema, value),
    verify: (value) => email.verifyConnection(value),
    saveConfig: (value) => email.saveMultiSmtpConfig(value),
    config: () => email.getMultiSmtpConfig(true),
    rules: () => email.getNotificationRules(),
    saveRules: (value) => email.saveNotificationRules(value),
    send: (to, subject, message) => email.sendEmail(to, subject, message),
  },
  reports: {
    list: () => ScheduledReportService.list(),
    get: (id) => ScheduledReportService.getById(id),
    create: (data, actor) => ScheduledReportService.create(data, actor),
    update: (id, data) => ScheduledReportService.update(id, data),
    remove: (id) => ScheduledReportService.delete(id),
    toggle: (id) => ScheduledReportService.toggleStatus(id),
  },
});
