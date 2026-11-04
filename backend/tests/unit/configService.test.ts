import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma, { withDirectTransaction } from "../../src/services/db";
import { ConfigService } from "../../src/services/ConfigService";
import { closureValidationService } from "../../src/services/closureValidationService";
import { SocketService } from "../../src/services/socketService";
import { ClosureBlockedError } from "../../src/utils/AppError";
import * as timeUtils from "../../src/utils/timeUtils";

vi.mock("../../src/services/db", () => {
  const mockPrisma = {
    systemConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $executeRaw: vi.fn(),
  };

  return {
    default: mockPrisma,
    prismaDirect: mockPrisma,
    withDirectTransaction: vi.fn(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return cb(mockPrisma);
    }),
  };
});

vi.mock("../../src/services/closureValidationService", () => ({
  closureValidationService: {
    validateManualClosure: vi.fn(),
  },
}));

vi.mock("../../src/services/socketService", () => ({
  SocketService: {
    emit: vi.fn(),
    emitToAll: vi.fn(),
  },
}));

describe("ConfigService unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getServerTime", () => {
    it("returns valid server time metadata for Santiago timezone", () => {
      const serverTime = ConfigService.getServerTime();

      expect(serverTime).toHaveProperty("iso");
      expect(serverTime).toHaveProperty("timestamp");
      expect(serverTime.timezone).toBe("America/Santiago");
      expect(serverTime.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(serverTime.iso).getTime()).toBe(serverTime.timestamp);
    });
  });

  describe("get", () => {
    it("throws FORBIDDEN if a non-elevated user attempts to access protected keys", async () => {
      await expect(ConfigService.get("SMTP_CONFIG", "Operador")).rejects.toThrow("FORBIDDEN");
      await expect(ConfigService.get("EMAIL_NOTIFICATION_RULES", "Usuario")).rejects.toThrow(
        "FORBIDDEN",
      );
      await expect(ConfigService.get("SMTP_CONFIG", undefined)).rejects.toThrow("FORBIDDEN");
    });

    it("allows elevated users (Administrador or Supervisor_Elevado) to access protected keys", async () => {
      const smtpPayload = { host: "smtp.mail.com", port: 587 };
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({
        id: "1",
        key: "SMTP_CONFIG",
        value: JSON.stringify(smtpPayload),
        description: null,
        updatedAt: new Date(),
        updatedBy: "admin",
      });

      const result = await ConfigService.get("SMTP_CONFIG", "Administrador");
      expect(result).toEqual(smtpPayload);
      expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: "SMTP_CONFIG" },
      });

      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({
        id: "2",
        key: "EMAIL_NOTIFICATION_RULES",
        value: JSON.stringify({ enabled: true }),
        description: null,
        updatedAt: new Date(),
        updatedBy: "supervisor",
      });

      const resultSupervisor = await ConfigService.get(
        "EMAIL_NOTIFICATION_RULES",
        "Supervisor_Elevado",
      );
      expect(resultSupervisor).toEqual({ enabled: true });
    });

    it("retrieves and parses normal configuration values for any user", async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({
        id: "3",
        key: "site_title",
        value: JSON.stringify("Portal Control"),
        description: null,
        updatedAt: new Date(),
        updatedBy: "admin",
      });

      const result = await ConfigService.get("site_title", "Operador");
      expect(result).toBe("Portal Control");
    });

    it("returns null if a non-existing regular key is queried", async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null);

      const result = await ConfigService.get("unknown_key");
      expect(result).toBeNull();
    });

    it("provides dynamic fallback for accounting_lock_date when not configured in DB", async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null);

      // Mock date to March 2026
      const mockDate = new Date(2026, 2, 15); // March 15, 2026
      vi.spyOn(timeUtils, "getChileNow").mockReturnValue(mockDate);

      const result = await ConfigService.get("accounting_lock_date");
      // For March (month 2 in 0-indexed), targetMonth should be 2 (February)
      expect(result).toBe(timeUtils.getMonthEndBusinessDateChile(2026, 2));

      // Test roll-over when now is January (month 0 in 0-indexed)
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null);
      const mockJan = new Date(2026, 0, 10); // January 10, 2026
      vi.spyOn(timeUtils, "getChileNow").mockReturnValue(mockJan);

      const resultJan = await ConfigService.get("accounting_lock_date");
      // targetMonth = 12, targetYear = 2025
      expect(resultJan).toBe(timeUtils.getMonthEndBusinessDateChile(2025, 12));
    });
  });

  describe("list", () => {
    it("returns configs filtering out protected keys for standard roles", async () => {
      vi.mocked(prisma.systemConfig.findMany).mockResolvedValueOnce([
        { key: "site_title", value: JSON.stringify("Portal Control") },
        { key: "SMTP_CONFIG", value: JSON.stringify({ secret: "pass" }) },
        { key: "EMAIL_NOTIFICATION_RULES", value: JSON.stringify({ alert: true }) },
        { key: "max_upload_size", value: "1048576" },
      ]);

      const list = await ConfigService.list("Operador");
      expect(list).toEqual([
        { key: "site_title", value: "Portal Control" },
        { key: "max_upload_size", value: 1048576 },
      ]);
    });

    it("returns all configs including protected keys for elevated roles", async () => {
      vi.mocked(prisma.systemConfig.findMany).mockResolvedValueOnce([
        { key: "site_title", value: JSON.stringify("Portal Control") },
        { key: "SMTP_CONFIG", value: JSON.stringify({ host: "smtp.example.com" }) },
      ]);

      const listAdmin = await ConfigService.list("Administrador");
      expect(listAdmin).toEqual([
        { key: "site_title", value: "Portal Control" },
        { key: "SMTP_CONFIG", value: { host: "smtp.example.com" } },
      ]);
    });
  });

  describe("set and replace", () => {
    it("throws CANNOT_LOCK_FUTURE_DATES if accounting_lock_date is in the future", async () => {
      vi.spyOn(timeUtils, "toBusinessDateChile").mockReturnValue("2026-05-01");

      await expect(
        ConfigService.set("accounting_lock_date", "2026-05-02", "admin"),
      ).rejects.toThrow("CANNOT_LOCK_FUTURE_DATES");
    });

    it("throws ClosureBlockedError if closure validation fails for accounting_lock_date", async () => {
      vi.spyOn(timeUtils, "toBusinessDateChile").mockReturnValue("2026-05-10");
      vi.mocked(closureValidationService.validateManualClosure).mockResolvedValueOnce({
        allowed: false,
        details: {
          anomalies: [
            {
              id: "anom-1",
              employeeName: "Juan",
              date: "2026-05-05",
              status: "PENDING",
            },
          ],
          pendingCorrections: [],
        },
      });

      await expect(
        ConfigService.set("accounting_lock_date", "2026-05-05", "admin"),
      ).rejects.toBeInstanceOf(ClosureBlockedError);
    });

    it("successfully creates or updates a configuration value and emits audit & socket events", async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({
        id: "conf-1",
        key: "system_announcement",
        value: JSON.stringify("Old text"),
        description: null,
        updatedAt: new Date(),
        updatedBy: "admin",
      });

      vi.mocked(prisma.systemConfig.upsert).mockResolvedValueOnce({
        id: "conf-1",
        key: "system_announcement",
        value: JSON.stringify("New text"),
        description: null,
        updatedAt: new Date(),
        updatedBy: "admin",
      });

      const mockAuditLog = {
        id: "audit-1",
        timestamp: new Date(),
        actorUsername: "admin",
        action: "CONFIG_SET",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "SUCCESS",
        details: {},
        metadata: {},
      };
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce(mockAuditLog);

      const result = await ConfigService.set("system_announcement", "New text", "admin");

      expect(result).toBe("New text");
      expect(withDirectTransaction).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: "system_announcement" },
        update: { value: JSON.stringify("New text") },
        create: { key: "system_announcement", value: JSON.stringify("New text") },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUsername: "admin",
          action: "CONFIG_SET",
          category: "OPERATIONS",
          severity: "WARNING",
          outcome: "SUCCESS",
        }),
      });
      expect(SocketService.emitToAll).toHaveBeenCalledWith("auditLog:created", mockAuditLog);
      expect(SocketService.emit).toHaveBeenCalledWith("config:updated", {
        key: "system_announcement",
        value: "New text",
      });
    });

    it("merges SMTP secrets when setting SMTP_CONFIG with masked placeholder", async () => {
      const oldSmtp = { host: "smtp.example.com", pass: "super-secret" };
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({
        id: "conf-2",
        key: "SMTP_CONFIG",
        value: JSON.stringify(oldSmtp),
        description: null,
        updatedAt: new Date(),
        updatedBy: "admin",
      });

      vi.mocked(prisma.systemConfig.upsert).mockImplementationOnce(
        async ({ update }: { update: { value: string } }) => ({
          id: "conf-2",
          key: "SMTP_CONFIG",
          value: update.value,
          description: null,
          updatedAt: new Date(),
          updatedBy: "admin",
        }),
      );

      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({
        id: "audit-2",
        timestamp: new Date(),
        actorUsername: "admin",
        action: "CONFIG_SET",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "SUCCESS",
        details: {},
        metadata: {},
      });

      // When frontend retains the saved password, it sends the masked placeholder "********"
      const newSmtp = { host: "smtp.example.com", pass: "********" };
      const res = await ConfigService.set("SMTP_CONFIG", newSmtp, "admin");

      expect(res).toEqual({
        host: "smtp.example.com",
        pass: "super-secret",
      });
    });

    it("handles null previousValue when setting a new config", async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.systemConfig.upsert).mockResolvedValueOnce({
        id: "conf-3",
        key: "brand_color",
        value: JSON.stringify("#ff0000"),
        description: null,
        updatedAt: new Date(),
        updatedBy: "SYSTEM",
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({
        id: "audit-3",
        timestamp: new Date(),
        actorUsername: "SYSTEM",
        action: "CONFIG_SET",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "SUCCESS",
        details: {},
        metadata: {},
      });

      const res = await ConfigService.replace("brand_color", "#ff0000");
      expect(res).toEqual({
        value: "#ff0000",
        previousValue: null,
      });
    });
  });
});
