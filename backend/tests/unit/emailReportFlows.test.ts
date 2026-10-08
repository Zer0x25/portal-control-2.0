import { expect, it, vi } from "vitest";
import {
  ScheduledReportInputSchema,
  ScheduledReportUpdateSchema,
} from "../../src/models/schemas/report.schemas";
import { createEmailReportFlows } from "../../src/modules/emailReports";
function fixture() {
  const report = { id: "r" };
  const deps = {
    email: {
      verify: vi.fn(async () => ({ success: false, message: "offline" })),
      parseProfile: vi.fn((v) => v),
      parseConfig: vi.fn((v) => v),
      saveConfig: vi.fn(),
      config: vi.fn(),
      rules: vi.fn(),
      parseRules: vi.fn((v) => v),
      parseSend: vi.fn((v) => v),
      saveRules: vi.fn(),
      send: vi.fn(),
    },
    reports: {
      parseCreate: vi.fn((value) => ScheduledReportInputSchema.parse(value)),
      parseUpdate: vi.fn((value) => ScheduledReportUpdateSchema.parse(value)),
      list: vi.fn(),
      get: vi.fn(async () => report),
      create: vi.fn(async () => report),
      update: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    },
  };
  return { deps, flows: createEmailReportFlows(deps), report };
}
it("retains provider failure outcomes and parses config before persistence", async () => {
  const { deps, flows } = fixture();
  expect(await flows.verify({ host: "smtp" })).toEqual({ success: false, message: "offline" });
  expect(deps.email.parseProfile).toHaveBeenCalledWith({ host: "smtp" });
  expect(await flows.saveConfig({ profiles: [] })).toEqual({
    success: true,
    message: "Configuración guardada correctamente.",
  });
  expect(deps.email.saveConfig).toHaveBeenCalledWith({ profiles: [] });
});
it("requires all legacy create fields before effects and uses persisted actor or System", async () => {
  const { deps, flows, report } = fixture();
  expect(() => flows.create({ name: "x" }, "admin")).toThrow();
  expect(deps.reports.create).not.toHaveBeenCalled();
  const data = {
    name: "x",
    reportType: "attendance_summary",
    frequency: "daily",
    cronExpression: "0 8 * * *",
    recipients: ["a@example.com"],
  };
  expect(await flows.create(data, "admin")).toBe(report);
  expect(deps.reports.create).toHaveBeenLastCalledWith({ ...data, isActive: true }, "admin");
  await flows.create(data);
  expect(deps.reports.create).toHaveBeenLastCalledWith({ ...data, isActive: true }, "System");
});
it("returns 404 for absent reports and preserves infrastructure error identity", async () => {
  const { deps, flows } = fixture();
  deps.reports.get.mockResolvedValueOnce(null);
  await expect(flows.get("missing")).rejects.toMatchObject({
    statusCode: 404,
    message: "Reporte no encontrado",
  });
  const error = new Error("storage failed");
  deps.reports.update.mockRejectedValueOnce(error);
  await expect(flows.update("r", {})).rejects.toBe(error);
});
it("forwards rules, send fields and report operations without extra envelopes", async () => {
  const { deps, flows } = fixture();
  await flows.send({ to: "a@example.com", subject: "s", message: "m" });
  expect(deps.email.send).toHaveBeenCalledWith("a@example.com", "s", "m");
  expect(await flows.saveRules({ autoCloseShift: { enabled: true, recipient: "a" } })).toEqual({
    success: true,
    message: "Reglas guardadas correctamente.",
  });
  await flows.list();
  await flows.config();
  await flows.rules();
  await flows.remove("r");
  await flows.toggle("r");
  expect(deps.reports.remove).toHaveBeenCalledWith("r");
  expect(deps.reports.toggle).toHaveBeenCalledWith("r");
});
