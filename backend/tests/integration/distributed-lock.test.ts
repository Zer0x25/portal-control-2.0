import { describe, expect, it, beforeEach } from "vitest";
import { LockService } from "../../src/services/lockService";
import { prisma } from "../../src/services/db";

describe("Distributed Lock Service Integration", () => {
  const TEST_KEY = "test:job:lock";
  const INSTANCE_A = "instance-a";
  const INSTANCE_B = "instance-b";

  beforeEach(async () => {
    // Limpiar locks de prueba previos
    await prisma.systemLock.deleteMany({
      where: { key: TEST_KEY },
    });
  });

  it("should acquire and release a lock successfully", async () => {
    const acquired = await LockService.acquire(TEST_KEY, 5000, INSTANCE_A);
    expect(acquired).toBe(true);

    const lock = await prisma.systemLock.findUnique({ where: { key: TEST_KEY } });
    expect(lock).toBeDefined();
    expect(lock?.ownerInstanceId).toBe(INSTANCE_A);

    await LockService.release(TEST_KEY, INSTANCE_A);
    const lockAfter = await prisma.systemLock.findUnique({ where: { key: TEST_KEY } });
    expect(lockAfter).toBeNull();
  });

  it("should deny acquisition if lock is already held by another instance", async () => {
    await LockService.acquire(TEST_KEY, 5000, INSTANCE_A);

    // Segunda instancia intenta adquirir
    const acquiredB = await LockService.acquire(TEST_KEY, 5000, INSTANCE_B);
    expect(acquiredB).toBe(false);
  });

  it("should allow acquisition if existing lock is expired", async () => {
    // Crear un lock que ya expiró manualmente
    const past = new Date(Date.now() - 10000);
    await prisma.systemLock.create({
      data: {
        key: TEST_KEY,
        ownerInstanceId: INSTANCE_A,
        expiresAt: past,
      },
    });

    // Nueva instancia debería poder tomarlo
    const acquiredB = await LockService.acquire(TEST_KEY, 5000, INSTANCE_B);
    expect(acquiredB).toBe(true);

    const lock = await prisma.systemLock.findUnique({ where: { key: TEST_KEY } });
    expect(lock?.ownerInstanceId).toBe(INSTANCE_B);
  });

  it("should correctly handle withLock wrapper", async () => {
    let executed = false;

    const result = await LockService.withLock(TEST_KEY, 5000, INSTANCE_A, async () => {
      executed = true;
      return "SUCCESS";
    });

    expect(result.ran).toBe(true);
    if (result.ran) {
      expect(result.result).toBe("SUCCESS");
    }
    expect(executed).toBe(true);

    // Verificar que el lock se liberó
    const lock = await prisma.systemLock.findUnique({ where: { key: TEST_KEY } });
    expect(lock).toBeNull();
  });

  it("should prevent concurrent execution within withLock", async () => {
    // Simular que instancia A tiene el lock
    await LockService.acquire(TEST_KEY, 5000, INSTANCE_A);

    const resultB = await LockService.withLock(TEST_KEY, 5000, INSTANCE_B, async () => {
      return "SHOULD_NOT_RUN";
    });

    expect(resultB.ran).toBe(false);
    if (resultB.ran === false) {
      expect(resultB.reason).toBe("LOCKED");
    }
  });
});
