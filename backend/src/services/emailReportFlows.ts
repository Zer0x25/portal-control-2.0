import { z, type ZodType } from "zod";
import { createEmailReportFlows } from "../modules/emailReports";
import { EmailService } from "./EmailService";
import { ScheduledReportService } from "./ScheduledReportService";
import { SmtpVerifySchema, MultiSmtpConfigSchema } from "../models/schemas/smtpProfile.schemas";
import { EmailRulesSchema, SendTestEmailSchema } from "../models/schemas/email.schemas";
import {
  ScheduledReportInputSchema,
  ScheduledReportUpdateSchema,
} from "../models/schemas/report.schemas";
import { refreshScheduler } from "./schedulerService";
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
    parseProfile: (value) => parse(SmtpVerifySchema, value),
    parseConfig: (value) => parse(MultiSmtpConfigSchema, value),
    verify: (value) => email.verifyConnection(value),
    saveConfig: (value) => email.saveMultiSmtpConfig(value),
    config: () => email.getMultiSmtpConfig(true),
    rules: () => email.getNotificationRules(),
    parseRules: (value) => parse(EmailRulesSchema, value),
    parseSend: (value) => parse(SendTestEmailSchema, value),
    saveRules: (value) => email.saveNotificationRules(value),
    send: (to, subject, message) => email.sendEmail(to, subject, message),
  },
  reports: {
    parseCreate: (value) => parse(ScheduledReportInputSchema, value),
    parseUpdate: (value) => parse(ScheduledReportUpdateSchema, value),
    list: () => ScheduledReportService.list(),
    get: (id) => ScheduledReportService.getById(id),
    create: async (data, actor) => {
      const result = await ScheduledReportService.create(data, actor);
      await refreshScheduler();
      return result;
    },
    update: async (id, data) => {
      const result = await ScheduledReportService.update(id, data);
      await refreshScheduler();
      return result;
    },
    remove: async (id) => {
      const result = await ScheduledReportService.delete(id);
      await refreshScheduler();
      return result;
    },
    toggle: async (id) => {
      const result = await ScheduledReportService.toggleStatus(id);
      await refreshScheduler();
      return result;
    },
  },
});
