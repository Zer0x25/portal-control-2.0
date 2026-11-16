import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
  audit: vi.fn(),
  emit: vi.fn(),
  emitForceLogoutToUser: vi.fn(),
  sessionDeleteMany: vi.fn(),
}));
vi.mock("../../src/services/db", () => {
  const tx = {
    $queryRaw: vi.fn(async () => []),
    user: mocks,
    activeSession: { deleteMany: mocks.sessionDeleteMany },
  };
  return {
    default: { user: mocks, activeSession: { deleteMany: mocks.sessionDeleteMany } },
    withDirectTransaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };
});
vi.mock("../../src/services/auditService", () => ({ auditService: { log: mocks.audit } }));
vi.mock("../../src/services/socketService", () => ({
  SocketService: { emit: mocks.emit, emitForceLogoutToUser: mocks.emitForceLogoutToUser },
}));
import { UserService } from "../../src/services/UserService";
const row = {
  id: "user-public",
  username: "alice",
  role: "Supervisor_Elevado",
  employeeId: "emp",
  createdAt: new Date("2026-10-01T12:00:00Z"),
  updatedAt: new Date("2026-10-02T12:00:00Z"),
  lastLogin: null,
  isForcePasswordChange: true,
  mfaEnabled: true,
  passwordHash: "private-hash",
  mfaSecret: "private-mfa-secret",
  mfaFailedAttempts: 4,
  mfaFailureWindowStartedAt: new Date(),
  mfaBlockedUntil: new Date(),
  futureCredential: "future-private",
};
function assertPublic(value: unknown) {
  expect(value).toMatchObject({
    id: row.id,
    username: row.username,
    role: "Supervisor_Elevado",
    employeeId: "emp",
    mustChangePassword: true,
    mfaEnabled: true,
  });
  for (const key of [
    "passwordHash",
    "mfaSecret",
    "mfaFailedAttempts",
    "mfaFailureWindowStartedAt",
    "mfaBlockedUntil",
    "isForcePasswordChange",
    "futureCredential",
  ])
    expect(value).not.toHaveProperty(key);
  expect(JSON.stringify(value)).not.toContain("private-");
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([row]);
  mocks.count.mockResolvedValue(1);
  mocks.findUnique.mockResolvedValue(row);
  mocks.create.mockResolvedValue(row);
  mocks.update.mockResolvedValue(row);
  mocks.sessionDeleteMany.mockResolvedValue({ count: 1 });
  mocks.audit.mockResolvedValue(undefined);
});
describe("Public user DTO allowlist at all service/socket boundaries", () => {
  it.each([false, true])(
    "list paginated=%s excludes present and future private columns",
    async (paginated) => {
      const result = await new UserService().getAllUsers(
        paginated ? { page: 1, pageSize: 10 } : {},
      );
      expect(result.users).toHaveLength(1);
      assertPublic(result.users[0]);
      expect(result.users[0]).toMatchObject({
        syncStatus: "synced",
        isDeleted: false,
        lastModified: row.updatedAt.getTime(),
      });
      expect(result.isPaginated).toBe(paginated);
    },
  );
  it.each(["create", "update"])("%s returns and emits only public data", async (operation) => {
    const service = new UserService();
    const result =
      operation === "create"
        ? await service.createUser(
            {
              username: "alice",
              password: "supplied-password",
              role: "Supervisor_Elevado",
              employeeId: "emp",
            },
            "admin",
          )
        : await service.updateUser(row.id, { password: "supplied-password" }, "admin");
    assertPublic(result);
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    assertPublic(mocks.emit.mock.calls[0][1]);
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("supplied-password");
  });
  it("ensure existing employee user returns a safe DTO without mutating or emitting", async () => {
    mocks.findFirst.mockResolvedValueOnce(row);
    assertPublic(
      await new UserService().ensureEmployeeUser(
        { employeeId: "emp", fullName: "Alice Example" },
        "admin",
      ),
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });
  it("ensure new employee user returns and emits safe DTO", async () => {
    mocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    assertPublic(
      await new UserService().ensureEmployeeUser(
        { employeeId: "emp", fullName: "Alice Example" },
        "admin",
      ),
    );
    assertPublic(mocks.emit.mock.calls[0][1]);
  });
  it("delete emits only its public tombstone", async () => {
    mocks.findUnique.mockResolvedValue({ username: "alice" });
    mocks.delete.mockResolvedValue(row);
    await new UserService().deleteUser(row.id, "admin");
    expect(mocks.emit).toHaveBeenCalledWith("user:updated", { id: row.id, isDeleted: true });
  });
});
