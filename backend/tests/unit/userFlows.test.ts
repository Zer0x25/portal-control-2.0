import { describe, expect, it, vi } from "vitest";
import { createUserFlows, type UserProjection } from "../../src/modules/users";
const row: UserProjection = {
  id: "u",
  username: "ana",
  role: "Supervisor_Elevado",
  employeeId: null,
  isForcePasswordChange: true,
  mfaEnabled: false,
  lastLogin: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
function fixture() {
  const repository = {
    list: vi.fn(async () => ({ users: [row], total: 1 })),
    create: vi.fn(async () => row),
    update: vi.fn(async () => row),
    findUsername: vi.fn(async () => ({ username: "ana" })),
    delete: vi.fn(async () => {}),
  };
  const audit = vi.fn(async () => {});
  const emit = vi.fn();
  const hash = vi.fn((password: string) => `hashed:${password}`);
  return {
    repository,
    audit,
    emit,
    hash,
    flows: createUserFlows({ repository, audit, emit, hash, id: () => "new-id" }),
  };
}
describe("Spec 012 shared users flows", () => {
  it("normalizes creation and emits only the public result after audit", async () => {
    const f = fixture();
    const result = await f.flows.createUser(
      { username: "ANA", role: "Supervisor Elevado", password: "secret" },
      "admin",
    );
    expect(f.repository.create).toHaveBeenCalledWith({
      id: "new-id",
      username: "ana",
      role: "Supervisor_Elevado",
      passwordHash: "hashed:secret",
      employeeId: undefined,
      isForcePasswordChange: true,
    });
    expect(f.emit).toHaveBeenCalledWith(result);
    expect(result).not.toHaveProperty("passwordHash");
    expect(f.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_CREATE", actorUsername: "admin" }),
    );
  });
  it("password change clears forced flag unless explicitly overridden", async () => {
    const f = fixture();
    await f.flows.updateUser("u", { password: "changed", employeeId: "" }, "admin");
    expect(f.repository.update).toHaveBeenLastCalledWith("u", {
      passwordHash: "hashed:changed",
      isForcePasswordChange: false,
      employeeId: "",
    });
    await f.flows.updateUser(
      "u",
      { password: "changed", mustChangePassword: false, isForcePasswordChange: true },
      "admin",
    );
    expect(f.repository.update).toHaveBeenLastCalledWith("u", {
      passwordHash: "hashed:changed",
      isForcePasswordChange: true,
    });
  });
  it("failed persistence does not audit or emit success", async () => {
    const f = fixture();
    f.repository.delete.mockRejectedValue(new Error("missing"));
    await expect(f.flows.deleteUser("u", "admin")).rejects.toThrow("missing");
    expect(f.audit).not.toHaveBeenCalled();
    expect(f.emit).not.toHaveBeenCalled();
  });
  it("deletion emits the legacy tombstone", async () => {
    const f = fixture();
    await f.flows.deleteUser("u", "admin");
    expect(f.emit).toHaveBeenCalledWith({ id: "u", isDeleted: true });
    expect(f.audit).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "WARNING", details: { id: "u", username: "ana" } }),
    );
  });
  it("list projects public users and retains sync metadata", async () => {
    const f = fixture();
    const result = await f.flows.getAllUsers({ page: 2, pageSize: 10, search: "ana" });
    expect(f.repository.list).toHaveBeenCalledWith({ page: 2, pageSize: 10, search: "ana" });
    expect(result).toMatchObject({
      total: 1,
      isPaginated: true,
      users: [
        { role: "Supervisor Elevado", syncStatus: "synced", lastModified: 0, isDeleted: false },
      ],
    });
    expect(result.users[0]).not.toHaveProperty("isForcePasswordChange");
  });
  it("audit failure preserves the legacy persist-before-audit ordering without emitting", async () => {
    const f = fixture();
    f.audit.mockRejectedValue(new Error("audit failed"));
    await expect(
      f.flows.createUser({ username: "ana", role: "Usuario", password: "secret" }, "admin"),
    ).rejects.toThrow("audit failed");
    expect(f.repository.create).toHaveBeenCalledTimes(1);
    expect(f.emit).not.toHaveBeenCalled();
  });
});
