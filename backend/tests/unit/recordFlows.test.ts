import { describe, expect, it, vi } from "vitest";
import { createRecordFlows } from "../../src/modules/records";
const user = { id: "u", username: "actor", role: "Usuario", employeeId: "actual" };
function fixture() {
  const service = {
    isLocked: vi.fn(async (_date: string) => false),
    lastPunch: vi.fn(async () => null),
    linkedEmployee: vi.fn(async () => ({ employeeId: "actual" })),
    punch: vi.fn(async () => ({ action: "ENTRADA" })),
    list: vi.fn(async () => ({ data: [] })),
    save: vi.fn(async () => ({ id: "r", employeeId: "e", date: "2026-10-06" })),
    enrich: vi.fn(async (row) => row),
    bulk: vi.fn(async (rows) => rows.length),
    delete: vi.fn(async () => {}),
    autoClose: vi.fn(async () => 0),
    verify: vi.fn(async () => ({ checkedCount: 1, brokenCount: 0, broken: [] })),
    resolve: vi.fn(async () => ({ id: "r" })),
    export: vi.fn(async () => []),
  };
  const deps = {
    service,
    now: () => new Date("2026-10-06T12:00:00Z"),
    businessDate: () => "2026-10-06",
    withoutTriggers: async (run) => run(),
    audit: vi.fn(async () => {}),
    emit: vi.fn(),
  };
  return { ...deps, flows: createRecordFlows(deps) };
}
describe("Record application TDD", () => {
  it("overrides forged punch employee with persisted association", async () => {
    const f = fixture();
    expect(await f.flows.punch({ employeeId: "forged" }, user)).toEqual({
      success: true,
      action: "ENTRADA",
    });
    expect(f.service.punch).toHaveBeenCalledWith(
      user,
      "actual",
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });
  it("checks every distinct date including a locked record after index 50 before bulk writes", async () => {
    const f = fixture();
    f.service.isLocked.mockImplementation(async (date) => date === "2026-11-01");
    const rows = [
      ...Array.from({ length: 50 }, () => ({
        employeeId: "e",
        employeeName: "E",
        date: "2026-10-06",
      })),
      { employeeId: "e", employeeName: "E", date: "2026-11-01" },
    ];
    await expect(f.flows.bulk(rows, "actor")).rejects.toThrow("El lote contiene periodos cerrados");
    expect(f.service.isLocked).toHaveBeenCalledTimes(2);
    expect(f.service.bulk).not.toHaveBeenCalled();
    expect(f.emit).not.toHaveBeenCalled();
  });
  it("maps ON_LEAVE punch failure to a clear Spanish message", async () => {
    const f = fixture();
    f.service.punch.mockRejectedValueOnce(new Error("ON_LEAVE"));
    await expect(
      f.flows.punch({ employeeId: "e" }, { ...user, role: "Supervisor" }),
    ).rejects.toThrow("licencia");
  });
  it("rejects single save with a future business date", async () => {
    const f = fixture();
    await expect(
      f.flows.save({ employeeId: "e", employeeName: "E", date: "2026-10-07" }, "actor"),
    ).rejects.toThrow("futura");
    expect(f.service.save).not.toHaveBeenCalled();
    await f.flows.save({ employeeId: "e", employeeName: "E", date: "2026-10-06" }, "actor");
    expect(f.service.save).toHaveBeenCalledTimes(1);
  });
  it("rejects bulk containing a future business date", async () => {
    const f = fixture();
    const rows = [
      { employeeId: "e", employeeName: "E", date: "2026-10-06" },
      { employeeId: "e", employeeName: "E", date: "2026-10-07" },
    ];
    await expect(f.flows.bulk(rows, "actor")).rejects.toThrow("futura");
    expect(f.service.bulk).not.toHaveBeenCalled();
  });
  it("maps FUTURE_DATE resolve failure to a future-date message", async () => {
    const f = fixture();
    f.service.resolve.mockRejectedValueOnce(new Error("FUTURE_DATE"));
    await expect(f.flows.resolve("MISSING-e-2026-10-07", "ABSENCE_MARK", "actor")).rejects.toThrow(
      "futura",
    );
    expect(f.emit).not.toHaveBeenCalled();
  });
  it("maps known punch failure and preserves forced-punch cooldown before service", async () => {
    const f = fixture();
    f.service.punch.mockRejectedValueOnce(new Error("EMPLOYEE_NOT_FOUND"));
    await expect(
      f.flows.punch({ employeeId: "e" }, { ...user, role: "Supervisor" }),
    ).rejects.toThrow("Empleado no encontrado");
    f.service.lastPunch.mockResolvedValueOnce({ updatedAt: new Date("2026-10-06T11:59:59Z") });
    await expect(
      f.flows.punch({ employeeId: "e", forcedType: "salida" }, { ...user, role: "Supervisor" }),
    ).rejects.toThrow("Espere unos segundos");
    expect(f.service.punch).toHaveBeenCalledTimes(1);
  });
  it("scopes export before audit and preserves JSON fallback for unknown format", async () => {
    const f = fixture();
    const result = await f.flows.prepareExport(
      { startDate: "2026-10-01", endDate: "2026-10-06", employeeId: "forged", format: "other" },
      user,
    );
    expect(result).toMatchObject({ format: "other", filters: { employeeId: "actual" } });
    await f.flows.exportJson(result.filters);
    expect(f.service.export).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "actual" }),
    );
  });
});
