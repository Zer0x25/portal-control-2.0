import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, createMock, auditLogMock, socketEmitMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  auditLogMock: vi.fn(),
  socketEmitMock: vi.fn(),
}));

vi.mock("../../src/services/db", () => ({
  default: {
    user: {
      findFirst: findFirstMock,
      create: createMock,
    },
  },
}));

vi.mock("../../src/services/auditService", () => ({
  auditService: {
    log: auditLogMock,
  },
}));

vi.mock("../../src/services/socketService", () => ({
  SocketService: {
    emit: socketEmitMock,
  },
}));

import { UserService } from "../../src/services/UserService";

describe("UserService.ensureEmployeeUser", () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
  });

  it("creates a linked user with default password when employee has none", async () => {
    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    createMock.mockImplementation(async ({ data }) => ({
      id: "user-1",
      username: data.username,
      passwordHash: data.passwordHash,
      role: data.role,
      employeeId: data.employeeId,
      isForcePasswordChange: data.isForcePasswordChange,
    }));

    const result = await service.ensureEmployeeUser(
      {
        employeeId: "EMP-1001",
        fullName: "Ana Perez",
      },
      "admin",
    );

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: "aperez",
          employeeId: "EMP-1001",
          isForcePasswordChange: true,
        }),
      }),
    );
    expect(bcrypt.compareSync("123456", result.passwordHash)).toBe(true);
    expect(result.employeeId).toBe("EMP-1001");
    expect(result.mustChangePassword).toBe(true);
    expect(auditLogMock).toHaveBeenCalled();
    expect(socketEmitMock).toHaveBeenCalledWith(
      "user:updated",
      expect.objectContaining({ username: "aperez" }),
    );
  });

  it("returns existing linked user without creating duplicates", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "user-1",
      username: "aperez",
      role: "Usuario",
      employeeId: "EMP-1001",
      isForcePasswordChange: false,
    });

    const result = await service.ensureEmployeeUser(
      {
        employeeId: "EMP-1001",
        fullName: "Ana Perez",
      },
      "admin",
    );

    expect(createMock).not.toHaveBeenCalled();
    expect(result.employeeId).toBe("EMP-1001");
    expect(result.username).toBe("aperez");
  });
});
