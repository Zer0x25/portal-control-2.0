import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../../src/services/db";
import { timeRecordIntegrityService } from "../../src/services/timeRecordIntegrityService";
import { mfaService } from "../../src/services/mfaService";
import { ulid } from "ulid";
import { requestContext } from "../../src/utils/context";

describe("System Security and Audit Integration", () => {
  let testEmployeeId = ulid();

  beforeAll(async () => {
    // 1. Cleanup to avoid conflicts
    await prisma.employee.deleteMany({
      where: { OR: [{ id: testEmployeeId }, { rut: "66666666-6" }] },
    });

    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Security Audit Tester",
        rut: "66666666-6",
        position: "Security Auditor",
        area: "Security",
        workdayType: "Normal",
        status: "Activo",
      },
    });
  });

  afterAll(async () => {
    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    // Filter by actorUsername which is safer than complex JSON paths that depend on PostgreSQL type configuration
    await prisma.auditLog.deleteMany({
      where: { actorUsername: "audit_tester" },
    });
    await prisma.employee.deleteMany({ where: { id: testEmployeeId } });
  });

  describe("Prisma Audit Extension", () => {
    it("should automatically log a create operation in AuditLog", async () => {
      const holidayId = ulid();
      const holidayDate = `2026-10-${Math.floor(Math.random() * 28) + 1}`; // Random date to avoid conflicts

      // 1. Ensure cleanup from potential previous failed runs
      await prisma.holiday.deleteMany({ where: { date: holidayDate } });

      // 2. We need to set up the request context to have a username
      await requestContext.run({ username: "audit_tester" }, async () => {
        await prisma.holiday.create({
          data: {
            id: holidayId,
            date: holidayDate,
            name: "Fiestas Patrias Test",
            type: "Nacional",
          },
        });
      });

      // Fire and forget, so we wait enough for the catch-less background task
      await new Promise((resolve) => setTimeout(resolve, 800));

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "HOLIDAY_CREATE",
          actorUsername: "audit_tester",
        },
        orderBy: { timestamp: "desc" },
      });

      expect(audit).toBeDefined();
      expect(audit?.category).toBe("CONFIG");

      // Cleanup holiday early
      await prisma.holiday.delete({ where: { id: holidayId } });
    });
  });

  describe("Time Record Integrity Chain", () => {
    it("should detect a missing hash in the chain", async () => {
      // Create a record without using the service seal (bypass via raw or direct prisma if allowed,
      // but prisma is extended, so we use skipTrigger context)
      await requestContext.run({ skipTrigger: true }, async () => {
        await prisma.timeRecord.create({
          data: {
            employeeId: testEmployeeId,
            employeeName: "Security Audit Tester",
            date: "2026-06-01",
            entrada: new Date().toISOString(),
            status: "Laborando",
            integrityHash: null, // Explicitly no hash
          },
        });
      });

      const result = await timeRecordIntegrityService.verifyChain(prisma, {
        employeeId: testEmployeeId,
      });
      expect(result.brokenCount).toBe(1);
      expect(result.broken[0].reason).toBe("MISSING_HASH");
    });

    it("should detect a PREV_HASH_MISMATCH if the chain is broken", async () => {
      await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });

      // 1. Create Record 1 with valid hash
      const r1 = await prisma.timeRecord.create({
        data: {
          employeeId: testEmployeeId,
          employeeName: "Security Audit Tester",
          date: "2026-06-01",
          entrada: "2026-06-01T08:00:00Z",
          updatedAt: new Date("2026-06-01T10:00:00Z"),
          status: "Laborando",
        },
      });
      await timeRecordIntegrityService.sealRecord(prisma, r1.id);

      // 2. Create Record 2 with valid hash (points to Record 1)
      const r2 = await prisma.timeRecord.create({
        data: {
          employeeId: testEmployeeId,
          employeeName: "Security Audit Tester",
          date: "2026-06-02",
          entrada: "2026-06-02T08:00:00Z",
          updatedAt: new Date("2026-06-02T10:00:00Z"),
          status: "Laborando",
        },
      });
      await timeRecordIntegrityService.sealRecord(prisma, r2.id);

      // 3. Manually alter Record 1's hash (simulating tampering).
      // updatedAt se pinea explicito: @updatedAt lo bumpearia a now(),
      // reordenando la cadena (r1 pasaria despues de r2) y el test dejaria
      // de probar adulteracion de hash para probar reorden temporal.
      await requestContext.run({ skipTrigger: true }, async () => {
        await prisma.timeRecord.update({
          where: { id: r1.id },
          data: {
            integrityHash: "tampered-hash",
            updatedAt: new Date("2026-06-01T10:00:00Z"),
          },
        });
      });

      // 4. Verify Chain
      const verify = await timeRecordIntegrityService.verifyChain(prisma, {
        employeeId: testEmployeeId,
      });

      // Record 1 should be HASH_MISMATCH
      // Record 2 should be PREV_HASH_MISMATCH
      expect(verify.brokenCount).toBeGreaterThanOrEqual(2);
      const reasons = verify.broken.map((b) => b.reason);
      expect(reasons).toContain("HASH_MISMATCH");
      expect(reasons).toContain("PREV_HASH_MISMATCH");
    });
  });

  describe("MFA Utilities", () => {
    it("should generate a valid secret and verify a dummy token (negative test)", () => {
      const secret = mfaService.generateSecret("test_user");
      expect(secret.base32).toBeDefined();
      expect(decodeURIComponent(secret.otpauthUrl || "")).toContain(
        "otpauth://totp/PORTAL:test_user",
      );

      const isValid = mfaService.verifyToken(secret.base32, "000000");
      expect(isValid).toBe(false);
    });
  });
});
