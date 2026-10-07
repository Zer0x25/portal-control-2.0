import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllowedOrigins, isOriginAllowed } from "../../src/utils/corsPolicy";

const { userUpdateMock, auditLogMock, socketEmitMock } = vi.hoisted(() => ({
  userUpdateMock: vi.fn(),
  auditLogMock: vi.fn(),
  socketEmitMock: vi.fn(),
}));

vi.mock("../../src/services/db", () => ({
  default: { user: { update: userUpdateMock } },
}));

vi.mock("../../src/services/auditService", () => ({
  auditService: { log: auditLogMock, logError: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("../../src/services/socketService", () => ({
  SocketService: { emit: socketEmitMock },
}));

// cryptoUtils hace fail-fast sin JWT_SECRET a nivel de módulo. Este archivo
// no ejerce cifrado: el stub evita el throw en importación. Los tests que
// sí necesitan secreto real (login con JWT) viven en tests/integration,
// donde el secreto se fija por entorno.
vi.mock("../../src/utils/cryptoUtils", () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  isEncrypted: vi.fn().mockReturnValue(false),
}));

import { UserService } from "../../src/services/UserService";

const ALLOWED = "https://portal.tu-dominio.com";
const EVIL = "https://evil.example";

describe("corsPolicy (spec 002 H-01)", () => {
  it("parses ALLOWED_ORIGINS as a trimmed comma-separated list", () => {
    process.env.ALLOWED_ORIGINS = ` ${ALLOWED} , https://otro.example `;
    expect(getAllowedOrigins()).toEqual([ALLOWED, "https://otro.example"]);
    delete process.env.ALLOWED_ORIGINS;
    expect(getAllowedOrigins()).toEqual([]);
  });

  it("allows listed origins, denies unlisted, lets origin-less through", () => {
    expect(isOriginAllowed(ALLOWED, [ALLOWED])).toBe(true);
    expect(isOriginAllowed(EVIL, [ALLOWED])).toBe(false);
    expect(isOriginAllowed(undefined, [ALLOWED])).toBe(true);
    expect(isOriginAllowed(EVIL, [])).toBe(false);
    expect(isOriginAllowed(EVIL, ["*"])).toBe(true);
  });
});

describe("UserService.updateUser force flag (spec 002 H-06)", () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
    userUpdateMock.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      username: "juan.perez",
      role: "Usuario",
      employeeId: null,
      isForcePasswordChange: data.isForcePasswordChange ?? true,
      mfaEnabled: false,
      lastLogin: null,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      updatedAt: new Date("2026-10-01T00:00:00Z"),
    }));
  });

  it("clears the force flag when the user sets their own password", async () => {
    const result = await service.updateUser("u-1", { password: "nueva-clave-1" }, "admin");

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isForcePasswordChange: false }),
      }),
    );
    expect(result.mustChangePassword).toBe(false);
  });

  it("keeps an explicitly requested force flag", async () => {
    const result = await service.updateUser(
      "u-1",
      { password: "nueva-clave-1", mustChangePassword: true },
      "admin",
    );

    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isForcePasswordChange: true }),
      }),
    );
    expect(result.mustChangePassword).toBe(true);
  });
});
