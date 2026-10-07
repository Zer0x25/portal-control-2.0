import { NotFoundError, ValidationError } from "../../../utils/AppError";
import type {
  EmailReportDependencies,
  EmailNotificationRules,
  ScheduledReportData,
} from "./contracts";
export function createEmailReportFlows<Report>(deps: EmailReportDependencies<Report>) {
  return {
    verify: (value: unknown) => deps.email.verify(deps.email.parseProfile(value)),
    saveConfig: async (value: unknown) => {
      await deps.email.saveConfig(deps.email.parseConfig(value));
      return { success: true, message: "Configuración guardada correctamente." };
    },
    config: () => deps.email.config(),
    rules: () => deps.email.rules(),
    saveRules: async (value: EmailNotificationRules) => {
      await deps.email.saveRules(value);
      return { success: true, message: "Reglas guardadas correctamente." };
    },
    send: (value: { to: string; subject: string; message: string }) =>
      deps.email.send(value.to, value.subject, value.message),
    list: () => deps.reports.list(),
    get: async (id: string) => {
      const report = await deps.reports.get(id);
      if (!report) throw new NotFoundError("Reporte no encontrado");
      return report;
    },
    create: async (data: ScheduledReportData, actor?: string) => {
      const { name, reportType, frequency, cronExpression, recipients } = data;
      if (
        !name ||
        !reportType ||
        !frequency ||
        !cronExpression ||
        !recipients ||
        recipients.length === 0
      )
        throw new ValidationError("Faltan campos requeridos");
      return deps.reports.create(data, actor || "System");
    },
    update: (id: string, data: Partial<ScheduledReportData>) => deps.reports.update(id, data),
    remove: (id: string) => deps.reports.remove(id),
    toggle: (id: string) => deps.reports.toggle(id),
  };
}
export type EmailReportFlows = ReturnType<typeof createEmailReportFlows>;
