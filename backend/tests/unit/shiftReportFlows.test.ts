import { describe, expect, it, vi } from "vitest";
import { createShiftReportFlows } from "../../src/modules/shiftReports";
const body = {
  id: "r",
  folio: "client-folio",
  shiftName: "Day",
  responsibleUser: "Operator",
  startTime: "2026-10-06T12:00:00Z",
  date: "2026-10-06",
  status: "open",
  logEntries: [],
  supplierEntries: [],
};
function fixture() {
  const service = {
    list: vi.fn(async () => ({ data: [] })),
    save: vi.fn(async () => ({ id: "r" })),
  };
  return { service, flows: createShiftReportFlows({ service }) };
}
describe("Spec 017 application TDD", () => {
  it("forwards legacy list query and save payload with authenticated actor", async () => {
    const f = fixture();
    const query = { since: "1", page: "2", status: "open" };
    expect(await f.flows.list(query)).toEqual({ data: [] });
    expect(f.service.list).toHaveBeenCalledWith(query);
    expect(await f.flows.save(body, "actor")).toEqual({ id: "r" });
    expect(f.service.save).toHaveBeenCalledWith(body, "actor");
  });
  it("translates structured open shift conflict to the existing 409 message", async () => {
    const f = fixture();
    f.service.save.mockRejectedValueOnce({
      message: "SHIFT_START_BLOCKED",
      conflictingShift: { responsibleUser: "Other", folio: "009" },
    });
    await expect(f.flows.save(body, "actor")).rejects.toMatchObject({
      statusCode: 409,
      message: "No se puede iniciar turno. El turno de Other (Folio: 009) ya está abierto.",
    });
  });
  it("preserves the 500 wrapper and fallback actor on unexpected storage failure", async () => {
    const f = fixture();
    f.service.save.mockRejectedValueOnce(new Error("storage failed"));
    await expect(f.flows.save(body)).rejects.toMatchObject({
      statusCode: 500,
      code: "SHIFT_REPORT_ERROR",
      message: "Error al guardar reporte de turno: storage failed",
    });
    expect(f.service.save).toHaveBeenCalledWith(body, "SYSTEM");
  });
});
