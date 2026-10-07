import { NotFoundError } from "../../../utils/AppError";
import type { EmailReportDependencies } from "./contracts";
export function createEmailReportFlows<Report>(deps: EmailReportDependencies<Report>) {
  return {
    verify: (value: unknown) => deps.email.verify(deps.email.parseProfile(value)),
    saveConfig: async (value: unknown) => {
      await deps.email.saveConfig(deps.email.parseConfig(value));
      return { success: true, message: "Configuración guardada correctamente." };
    },
    config: () => deps.email.config(),
    rules: () => deps.email.rules(),
    saveRules: async (value: unknown) => {
      await deps.email.saveRules(deps.email.parseRules(value));
      return { success: true, message: "Reglas guardadas correctamente." };
    },
    send: (value: unknown) => {
      const parsed = deps.email.parseSend(value);
      return deps.email.send(parsed.to, parsed.subject, parsed.message);
    },
    list: () => deps.reports.list(),
    get: async (id: string) => {
      const report = await deps.reports.get(id);
      if (!report) throw new NotFoundError("Reporte no encontrado");
      return report;
    },
    create: (value: unknown, actor?: string) =>
      deps.reports.create(deps.reports.parseCreate(value), actor || "System"),
    update: (id: string, value: unknown) =>
      deps.reports.update(id, deps.reports.parseUpdate(value)),
    remove: (id: string) => deps.reports.remove(id),
    toggle: (id: string) => deps.reports.toggle(id),
  };
}
export type EmailReportFlows = ReturnType<typeof createEmailReportFlows>;
