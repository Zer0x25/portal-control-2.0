import { describe, expect, it, vi } from "vitest";
import {
  createEmployeeFlows,
  type EmployeeFlowDependencies,
  type EmployeeRow,
} from "../../src/modules/employees";
const row: EmployeeRow = {
  id: "EMP-1001",
  name: "Ana Perez",
  rut: "12345678-9",
  email: "ana@example.test",
  position: "Operator",
  area: "Ops",
  workdayType: "Normal",
  status: "Activo",
  pin: "5678",
  pinFailedAttempts: 2,
  isPinBlocked: false,
  createdAt: new Date(0),
  updatedAt: new Date(1000),
};
function fixture() {
  const tx = { create: vi.fn(async () => row), ensureUser: vi.fn(async () => {}) };
  const deps: EmployeeFlowDependencies = {
    repository: {
      list: vi.fn(async () => ({ rawEmployees: [row], total: 1 })),
      resolveId: vi.fn(async () => row.id),
      find: vi.fn(async () => row),
      update: vi.fn(async () => ({ ...row, status: "Archivado" as const, pin: null })),
      bulk: vi.fn(async () => 2),
    },
    transaction: vi.fn(async (run) => run(tx)),
    withoutTriggers: async (run) => run(),
    ensureUser: vi.fn(async () => {}),
    syncStatus: vi.fn(async () => {}),
    audit: vi.fn(async () => {}),
    emit: vi.fn(),
  };
  return { deps, tx, flows: createEmployeeFlows(deps) };
}
describe("Employee application contracts", () => {
  it("limits kiosk projection and omits PIN in authenticated sync response", async () => {
    const f = fixture();
    expect(await f.flows.list({}, undefined)).toEqual([
      {
        id: row.id,
        name: row.name,
        rut: row.rut,
        status: row.status,
        area: row.area,
        isPinBlocked: false,
      },
    ]);
    const response = await f.flows.list(
      { page: "1", pageSize: "10" },
      { role: "Usuario", employeeId: row.id },
    );
    expect(response).toMatchObject({
      data: [{ id: row.id, syncStatus: "synced", lastModified: 1000 }],
      pagination: { total: 1, page: 1, totalPages: 1 },
    });
    expect(JSON.stringify(response)).not.toContain('"pin":');
  });
  it("uses transaction for employee and optional user then audits/emits without PIN", async () => {
    const f = fixture();
    const response = await f.flows.create({ ...row, createUserAccount: true }, "actor");
    expect(f.tx.ensureUser).toHaveBeenCalledWith(
      { employeeId: row.id, fullName: row.name },
      "actor",
    );
    expect(f.deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUsername: "actor", action: "EMPLEADO_CREADO" }),
    );
    expect(f.deps.emit).toHaveBeenCalledWith(response);
    expect(response).not.toHaveProperty("pin");
    expect(f.tx.ensureUser.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(f.deps.audit).mock.invocationCallOrder[0],
    );
  });
  it("does not audit or emit successful employee when linked-user creation fails", async () => {
    const f = fixture();
    f.tx.ensureUser.mockRejectedValueOnce(new Error("ensure failed"));
    await expect(f.flows.create({ ...row, createUserAccount: true }, "actor")).rejects.toThrow(
      "ensure failed",
    );
    expect(f.deps.audit).not.toHaveBeenCalled();
    expect(f.deps.emit).not.toHaveBeenCalled();
  });
  it("preserves archive/PIN audit ordering and skips ensuring archived user", async () => {
    const f = fixture();
    const result = await f.flows.update(
      row.id,
      { status: "Archivado", pin: null, createUserAccount: true },
      "actor",
    );
    expect(vi.mocked(f.deps.audit).mock.calls.map(([entry]) => entry.action)).toEqual([
      "EMPLEADO_ESTADO_CAMBIADO: Archivado",
      "EMPLEADO_PIN_ACTUALIZADO",
      "EMPLEADO_ACTUALIZADO",
    ]);
    expect(f.deps.ensureUser).not.toHaveBeenCalled();
    expect(f.deps.syncStatus).toHaveBeenCalledWith(
      row.id,
      "Activo",
      "Archivado",
      row.name,
      row.rut,
    );
    expect(result).not.toHaveProperty("pin");
  });
});

it("does not update/emit on missing employee and does not emit when status sync fails", async () => {
  const f = fixture();
  vi.mocked(f.deps.repository.find).mockResolvedValueOnce(null);
  await expect(f.flows.update("missing", { name: "Other" }, "actor")).rejects.toThrow(
    "Empleado no encontrado",
  );
  expect(f.deps.repository.update).not.toHaveBeenCalled();
  vi.mocked(f.deps.syncStatus).mockRejectedValueOnce(new Error("sync failed"));
  await expect(f.flows.update(row.id, { status: "Archivado" }, "actor")).rejects.toThrow(
    "sync failed",
  );
  expect(f.deps.emit).not.toHaveBeenCalled();
});
it("does not emit employee success when post-commit audit fails and keeps bulk event minimal", async () => {
  const f = fixture();
  vi.mocked(f.deps.audit).mockRejectedValueOnce(new Error("audit failed"));
  await expect(f.flows.create(row, "actor")).rejects.toThrow("audit failed");
  expect(f.tx.create).toHaveBeenCalled();
  expect(f.deps.emit).not.toHaveBeenCalled();
  expect(await f.flows.bulk([{ ...row }], "actor")).toEqual({ success: true, count: 2 });
  expect(f.deps.emit).toHaveBeenCalledWith({ count: 2 });
});
