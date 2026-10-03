import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";
import { logger } from "../utils/logger";

/**
 * Service to handle distributed locking using PostgreSQL.
 * Optimized for PgBouncer transaction pooling.
 */
export const LockService = {
  /**
   * Attempts to acquire a lock atomically.
   * If the lock exists but is expired, it will be deleted and a new one created.
   *
   * @param key Unique identifier for the lock
   * @param ttlMs Time to live in milliseconds
   * @param instanceId Identifier of the instance requesting the lock
   * @returns boolean true if acquired, false otherwise
   */
  async acquire(key: string, ttlMs: number, instanceId: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMs);

    try {
      const acquiredRows = await prisma.$queryRaw<Array<{ key: string; expires_at: Date }>>(
        Prisma.sql`
          INSERT INTO "system_locks" (
            "key",
            "owner_instance_id",
            "acquired_at",
            "expires_at",
            "updated_at"
          )
          VALUES (
            ${key},
            ${instanceId},
            NOW(),
            ${expiresAt},
            NOW()
          )
          ON CONFLICT ("key") DO UPDATE
          SET
            "owner_instance_id" = EXCLUDED."owner_instance_id",
            "acquired_at" = NOW(),
            "expires_at" = EXCLUDED."expires_at",
            "updated_at" = NOW()
          WHERE "system_locks"."expires_at" <= NOW()
          RETURNING "key", "expires_at"
        `,
      );

      if (acquiredRows.length > 0) {
        logger.logTask("LOCK_ACQUIRE", "LockService.acquire", `Lock acquired for key: ${key}`, {
          key,
          instanceId,
          ttlMs,
        });
        return true;
      }

      const existingLock = await prisma.systemLock.findUnique({
        where: { key },
      });

      logger.logTask("LOCK_DENY", "LockService.acquire", `Lock denied for key: ${key}`, {
        key,
        instanceId,
        expiresAt: existingLock?.expiresAt,
      });
      return false;
    } catch (error: unknown) {
      logger.error(`Unexpected error in LockService.acquire for key: ${key}`, error, {
        key,
        instanceId,
      });
      return false;
    }
  },

  /**
   * Releases a lock manually.
   *
   * @param key Unique identifier for the lock
   * @param instanceId Identifier of the instance that held the lock
   */
  async release(key: string, instanceId: string): Promise<void> {
    try {
      // Only delete if we are the owner
      const deleted = await prisma.systemLock.deleteMany({
        where: {
          key,
          ownerInstanceId: instanceId,
        },
      });

      if (deleted.count > 0) {
        logger.logTask("LOCK_RELEASE", "LockService.release", `Lock released for key: ${key}`, {
          key,
          instanceId,
        });
      }
    } catch (error) {
      logger.error(`Error releasing lock for key: ${key}`, error, { key, instanceId });
    }
  },

  /**
   * Executes a function protected by a distributed lock.
   */
  async withLock<T>(
    key: string,
    ttlMs: number,
    instanceId: string,
    fn: () => Promise<T>,
  ): Promise<{ ran: true; result: T } | { ran: false; reason: "LOCKED" }> {
    const start = Date.now();
    const acquired = await this.acquire(key, ttlMs, instanceId);

    if (!acquired) {
      return { ran: false, reason: "LOCKED" };
    }

    try {
      const result = await fn();
      return { ran: true, result };
    } finally {
      const durationMs = Date.now() - start;
      await this.release(key, instanceId);
      // Log duration in release or here? Suggesting here for better withLock context
      logger.info(`Lock lifecycle completed for key: ${key}`, {
        key,
        instanceId,
        durationMs,
      });
    }
  },
};
