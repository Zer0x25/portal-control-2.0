import { describe, expect, it, vi } from "vitest";
import { createLeaveFlows } from "../../src/modules/leaves";
import { createCorrectionFlows } from "../../src/modules/corrections";
const user = { id: "u", username: "actor", role: "Usuario", employeeId: "e" };
const leaveInput = {
  employeeId: "e",
  type: "Vacaciones",
  startDate: "2026-10-06",
  endDate: "2026-10-07",
};
function leaves() {
  const service = {
    list: vi.fn(async () => ({ items: [], total: 3, page: 2, pageSize: 50, totalPages: 1 })),
    upsert: vi.fn(async () => ({ id: "l" })),
    delete: vi.fn(async () => {}),
  };
  return { service, flows: createLeaveFlows({ service }) };
}
function corrections() {
  const service = {
    list: vi.fn(async () => ({ requests: [], total: 0 })),
    create: vi.fn(async () => ({ id: "c" })),
    updateStatus: vi.fn(async () => ({ id: "c" })),
    stats: vi.fn(async () => ({ pending: 0 })),
    history: vi.fn(async () => []),
  };
  return { service, flows: createCorrectionFlows({ service }) };
}
describe("Spec 016 application TDD", () => {
  it("preserves leave numeric defaults and response envelope", async () => {
    const f = leaves();
    expect(await f.flows.list({ page: "2", pageSize: "0", showArchived: "true" }, user)).toEqual({
      success: true,
      data: [],
      meta: { total: 3, page: 2, pageSize: 50, totalPages: 1 },
    });
    expect(f.service.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 50, showArchived: true }),
      { role: "Usuario", employeeId: "e" },
    );
  });
  it("translates leave create/delete business failures without swallowing unexpected failures", async () => {
    const f = leaves();
    f.service.upsert.mockRejectedValueOnce(new Error("IMMUTABLE_FIELDS_CHANGED"));
    await expect(f.flows.upsert(leaveInput)).rejects.toMatchObject({ statusCode: 400 });
    f.service.delete.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(f.flows.delete("missing")).rejects.toMatchObject({ statusCode: 404 });
    const failure = new Error("storage unavailable");
    f.service.upsert.mockRejectedValueOnce(failure);
    await expect(f.flows.upsert(leaveInput)).rejects.toBe(failure);
  });
  it("keeps ownership denial as the existing message-only 403 outcome", async () => {
    const f = corrections();
    f.service.create.mockRejectedValueOnce({ message: "FORBIDDEN_OWNERSHIP" });
    expect(await f.flows.create({ employeeId: "foreign" }, user)).toEqual({
      status: 403,
      body: { message: "Acceso denegado: Solo puede crear solicitudes para su propio registro." },
    });
    await expect(f.flows.create({}, undefined)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("uses persisted actor while preserving supplied resolvedBy and history envelope", async () => {
    const f = corrections();
    await f.flows.updateStatus("c", { status: "approved", resolvedBy: "display-name" }, user);
    expect(f.service.updateStatus).toHaveBeenCalledWith("c", {
      status: "approved",
      resolvedBy: "display-name",
      rejectionReason: undefined,
      actorUsername: "actor",
      actorRole: "Usuario",
    });
    expect(await f.flows.history("c", user)).toEqual({ data: [] });
    f.service.history.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(f.flows.history("missing", user)).rejects.toMatchObject({ statusCode: 404 });
  });
});
