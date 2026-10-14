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
  it("forwards update payload and actor to service.update", async () => {
    const updateMock = vi.fn(async () => ({ id: "r", status: "closed" }));
    const flows = createShiftReportFlows({
      service: {
        list: vi.fn(),
        save: vi.fn(),
        update: updateMock,
      },
    });
    const patch = { status: "closed" as const };
    expect(await flows.update("r", patch, "admin-user")).toEqual({ id: "r", status: "closed" });
    expect(updateMock).toHaveBeenCalledWith("r", patch, "admin-user");
  });
  it("throws 501 NOT_IMPLEMENTED when service.update is missing", async () => {
    const f = fixture();
    await expect(f.flows.update("r", { status: "closed" })).rejects.toMatchObject({
      statusCode: 501,
      code: "NOT_IMPLEMENTED",
      message: "Operación de actualización no soportada",
    });
  });
  it("forwards delete id and actor to service.delete", async () => {
    const deleteMock = vi.fn(async () => {});
    const flows = createShiftReportFlows({
      service: {
        list: vi.fn(),
        save: vi.fn(),
        delete: deleteMock,
      },
    });
    await flows.delete("r", "admin-user");
    expect(deleteMock).toHaveBeenCalledWith("r", "admin-user");
  });
  it("throws 501 NOT_IMPLEMENTED when service.delete is missing", async () => {
    const f = fixture();
    await expect(f.flows.delete("r")).rejects.toMatchObject({
      statusCode: 501,
      code: "NOT_IMPLEMENTED",
      message: "Operación de eliminación no soportada",
    });
  });
});
