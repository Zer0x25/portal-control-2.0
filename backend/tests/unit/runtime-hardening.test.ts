import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import multer from "multer";
import { getAllowedOrigins, isOriginAllowed } from "../../src/utils/corsPolicy";
import { HealthService } from "../../src/services/HealthService";
import { errorHandler } from "../../src/middleware/errorHandler";

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
import app from "../../src/app";

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

  it("reflects only allowlisted origins on the real app", async () => {
    process.env.ALLOWED_ORIGINS = ALLOWED;
    vi.spyOn(HealthService, "getDetailedHealth").mockResolvedValue({
      database: { status: "OK" },
    } as never);
    try {
      const denied = await request(app).get("/api/health").set("Origin", EVIL);
      expect(denied.headers["access-control-allow-origin"]).toBeUndefined();

      const allowed = await request(app).get("/api/health").set("Origin", ALLOWED);
      expect(allowed.headers["access-control-allow-origin"]).toBe(ALLOWED);
    } finally {
      delete process.env.ALLOWED_ORIGINS;
      vi.restoreAllMocks();
    }
  });
});

describe("body limits (spec 002 H-02)", () => {
  it("rejects >1mb JSON on regular routes with 413", async () => {
    const big = { data: "x".repeat(2 * 1024 * 1024) };
    const res = await request(app).post("/api/health").send(big);
    expect(res.status).toBe(413);
  });

  it("lets >1mb JSON through on bulk routes (fails later at auth, not parse)", async () => {
    const big = { records: ["x".repeat(2 * 1024 * 1024)] };
    const res = await request(app).post("/api/records/bulk").send(big);
    expect(res.status).toBe(401);
  });
});

describe("multer errors (spec 002 H-02)", () => {
  const mockRes = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    return res;
  };

  it("maps LIMIT_FILE_SIZE to 413", () => {
    const res = mockRes();
    errorHandler(
      new multer.MulterError("LIMIT_FILE_SIZE"),
      { path: "/api/import/preview", method: "POST" },
      res,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(413);
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
