import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { LockService } from "../../src/services/lockService";
import { prisma } from "../../src/services/db";

describe("LockService Integration Tests", () => {
  const testKey = "test-lock-key";
  const instanceA = "instance-a";
  const instanceB = "instance-b";

  beforeEach(async () => {
    // Clean up before each test
    await prisma.systemLock.deleteMany({
      where: { key: testKey },
    });
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.systemLock.deleteMany({
      where: { key: testKey },
    });
  });

  describe("acquire", () => {
    it("should acquire a lock if it does not exist", async () => {
      const acquired = await LockService.acquire(testKey, 10000, instanceA);
      expect(acquired).toBe(true);

      const lock = await prisma.systemLock.findUnique({ where: { key: testKey } });
      expect(lock).toBeDefined();
      expect(lock?.ownerInstanceId).toBe(instanceA);
    });

    it("should not acquire a lock if it is already held by another instance", async () => {
      await LockService.acquire(testKey, 10000, instanceA);
      const acquired = await LockService.acquire(testKey, 10000, instanceB);
      expect(acquired).toBe(false);
    });

    it("should acquire a lock if the existing one is expired", async () => {
      // Create an expired lock manually
      await prisma.systemLock.create({
        data: {
          key: testKey,
          ownerInstanceId: instanceA,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const acquired = await LockService.acquire(testKey, 10000, instanceB);
      expect(acquired).toBe(true);

      const lock = await prisma.systemLock.findUnique({ where: { key: testKey } });
      expect(lock?.ownerInstanceId).toBe(instanceB);
    });

    it("should be atomic under concurrent requests", async () => {
      // Simulate 10 simultaneous requests
      const requests = Array.from({ length: 10 }).map((_, i) =>
        LockService.acquire(testKey, 10000, `instance-${i}`),
      );

      const results = await Promise.all(requests);
      const successfulAcquisitions = results.filter((r) => r === true).length;

      expect(successfulAcquisitions).toBe(1);
    });
  });

  describe("release", () => {
    it("should release a lock held by the instance", async () => {
      await LockService.acquire(testKey, 10000, instanceA);
      await LockService.release(testKey, instanceA);

      const lock = await prisma.systemLock.findUnique({ where: { key: testKey } });
      expect(lock).toBeNull();
    });

    it("should not release a lock held by another instance", async () => {
      await LockService.acquire(testKey, 10000, instanceA);
      await LockService.release(testKey, instanceB);

      const lock = await prisma.systemLock.findUnique({ where: { key: testKey } });
      expect(lock).toBeDefined();
      expect(lock?.ownerInstanceId).toBe(instanceA);
    });
  });

  describe("withLock", () => {
    it("should execute the function and release the lock", async () => {
      let executed = false;
      const response = await LockService.withLock(testKey, 10000, instanceA, async () => {
        executed = true;
        return "success";
      });

      expect(response.ran).toBe(true);
      if (response.ran) {
        expect(response.result).toBe("success");
      }
      expect(executed).toBe(true);

      const lock = await prisma.systemLock.findUnique({ where: { key: testKey } });
      expect(lock).toBeNull();
    });

    it("should return LOCKED if the lock cannot be acquired", async () => {
      await LockService.acquire(testKey, 10000, instanceB);

      const response = await LockService.withLock(testKey, 10000, instanceA, async () => {
        return "should not run";
      });

      expect(response.ran).toBe(false);
      if (!response.ran) {
        expect(response.reason).toBe("LOCKED");
      }
    });

    it("should release the lock even if the function throws", async () => {
      try {
        await LockService.withLock(testKey, 10000, instanceA, async () => {
          throw new Error("fail");
        });
      } catch (e) {
        // expected
      }

      const lock = await prisma.systemLock.findUnique({ where: { key: testKey } });
      expect(lock).toBeNull();
    });
  });
});
