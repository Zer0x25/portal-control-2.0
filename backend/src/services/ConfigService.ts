import prisma, { withDirectTransaction } from "./db";
import type { Prisma } from "../generated/prisma/client";
import { redactAuditFields } from "../modules/audit";
import { configAuditValue, mergeSmtpSecrets } from "../modules/configs";
import { closureValidationService } from "./closureValidationService";
import { SocketService } from "./socketService";
import { safeJsonParse } from "../utils/configUtils";
import { requestContext } from "../utils/context";
import { toBusinessDateChile, getChileNow, getMonthEndBusinessDateChile } from "../utils/timeUtils";
import { ClosureBlockedError } from "../utils/AppError";
import type { BlockingItems } from "./closureValidationService";

const BUSINESS_TIMEZONE = "America/Santiago";

export class ConfigService {
  private static readonly PROTECTED_KEYS = new Set(["SMTP_CONFIG", "EMAIL_NOTIFICATION_RULES"]);

  /**
   * Returns current server time information.
   */
  static getServerTime() {
    const now = new Date();
    return {
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timezone: BUSINESS_TIMEZONE,
      businessDate: toBusinessDateChile(now),
    };
  }

  /**
   * Retrieves a single configuration value, applying role-based protection.
   */
  static async get(key: string, role?: string) {
    const isElevated = role === "Administrador" || role === "Supervisor_Elevado";

    if (this.PROTECTED_KEYS.has(key) && !isElevated) {
      throw new Error("FORBIDDEN");
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      // Dynamic fallback for accounting_lock_date (Production resilience)
      if (key === "accounting_lock_date") {
        const now = getChileNow();
        let targetMonth = now.getMonth(); // Previous month (0-indexed, Jan is 0)
        let targetYear = now.getFullYear();
        if (targetMonth === 0) {
          targetMonth = 12;
          targetYear -= 1;
        }
        return getMonthEndBusinessDateChile(targetYear, targetMonth);
      }
      return null;
    }

    return safeJsonParse(config.value);
  }

  /**
   * Lists all configuration values, filtering those protected by role.
   */
  static async list(role?: string) {
    const isElevated = role === "Administrador" || role === "Supervisor_Elevado";

    const configs = await prisma.systemConfig.findMany({
      select: { key: true, value: true },
    });

    return configs
      .filter((c) => isElevated || !this.PROTECTED_KEYS.has(c.key))
      .map((c) => ({
        key: c.key,
        value: safeJsonParse(c.value),
      }));
  }

  /**
   * Updates or creates a configuration value.
   * Includes validation for accounting_lock_date and auditing.
   */
  static async set(key: string, value: unknown, actorUsername: string = "SYSTEM") {
    return (
      await this.replace(
        key,
        value,
        actorUsername,
        key === "SMTP_CONFIG" ? mergeSmtpSecrets : undefined,
      )
    ).value;
  }

  static async replace(
    key: string,
    value: unknown,
    actorUsername: string = "SYSTEM",
    prepare?: (value: unknown, previous: unknown) => unknown,
  ) {
    // 1. Domain Validation
    if (key === "accounting_lock_date" && value && value !== "null") {
      const today = toBusinessDateChile();
      if (String(value) > today) {
        throw new Error("CANNOT_LOCK_FUTURE_DATES");
      }
      const validation = await closureValidationService.validateManualClosure(String(value));
      if (!validation.allowed) {
        // `configController` matches on `message` and rebuilds the API error,
        // so the blocking items travel as structured payload on the throw.
        throw new ClosureBlockedError<BlockingItems>(validation.details);
      }
    }

    const result = await requestContext.run(
      { ...requestContext.getStore(), skipTrigger: true },
      () =>
        withDirectTransaction(async (tx) => {
          // Serialize first writes too: a row lock cannot lock a missing key.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(17018, hashtext(${key}))`;
          const oldConfig = await tx.systemConfig.findUnique({ where: { key } });
          const previousValue = oldConfig ? safeJsonParse(oldConfig.value) : null;
          const prepared = prepare ? prepare(value, previousValue) : value;
          const updated = await tx.systemConfig.upsert({
            where: { key },
            update: { value: JSON.stringify(prepared) },
            create: { key, value: JSON.stringify(prepared) },
          });
          const safe = redactAuditFields(
            "CONFIG_SET",
            {
              key,
              previousValue: configAuditValue(key, previousValue),
              newValue: configAuditValue(key, prepared),
            },
            undefined,
          );
          const audit = await tx.auditLog.create({
            data: {
              actorUsername,
              action: "CONFIG_SET",
              category: "OPERATIONS",
              severity: "WARNING",
              outcome: "SUCCESS",
              details: safe.details as Prisma.InputJsonValue,
              metadata: safe.metadata as Prisma.InputJsonValue,
            },
          });
          return { value: safeJsonParse(updated.value), previousValue, audit };
        }),
    );
    SocketService.emitToAll("auditLog:created", result.audit);
    SocketService.emit("config:updated", { key, value: result.value });
    return { value: result.value, previousValue: result.previousValue };
  }
}
