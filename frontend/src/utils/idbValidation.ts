import { z } from "zod";
import { STORES } from "./indexedDB";
import {
  EmployeeSchema,
  UserSchema,
  AppSettingSchema,
  DailyTimeRecordSchema,
  ShiftReportSchema,
  AuditLogSchema,
  TheoreticalShiftPatternSchema,
  AssignedShiftSchema,
  QuickNoteSchema,
  MeterReadingItemSchema,
  LeaveRecordSchema,
  HolidaySchema,
  CorrectionRequestSchema,
  KpiCacheItemSchema,
  CalendarCacheItemSchema,
} from "../types/schemas";
import { logger } from "./logger";

// Map stores to their Zod validation schemas. Lives in its own chunk,
// loaded via dynamic import() only on cache writes — never in boot preload.
const schemaMap: Record<string, z.ZodSchema<unknown>> = {
  [STORES.EMPLOYEES]: EmployeeSchema,
  [STORES.USERS]: UserSchema,
  [STORES.APP_SETTINGS]: AppSettingSchema,
  [STORES.DAILY_TIME_RECORDS]: DailyTimeRecordSchema,
  [STORES.SHIFT_REPORTS]: ShiftReportSchema,
  [STORES.AUDIT_LOGS]: AuditLogSchema,
  [STORES.THEORETICAL_SHIFT_PATTERNS]: TheoreticalShiftPatternSchema,
  [STORES.ASSIGNED_SHIFTS]: AssignedShiftSchema,
  [STORES.QUICK_NOTES]: QuickNoteSchema,
  [STORES.METER_READINGS]: MeterReadingItemSchema,
  [STORES.LEAVES]: LeaveRecordSchema,
  [STORES.HOLIDAYS]: HolidaySchema,
  [STORES.CORRECTION_REQUESTS]: CorrectionRequestSchema,
  [STORES.KPI_CACHE]: KpiCacheItemSchema,
  [STORES.CALENDAR_CACHE]: CalendarCacheItemSchema,
};

export const hasIdbSchema = (storeName: string): boolean => Boolean(schemaMap[storeName]);

/** Strict single-item validation (idbPut): throws on invalid shape. */
export const validateIdbItem = (storeName: string, item: unknown): void => {
  const schema = schemaMap[storeName];
  if (!schema) return;
  try {
    schema.parse(item);
  } catch (e) {
    if (e instanceof z.ZodError) {
      logger.error(`Validation failed for store '${storeName}':`, e.issues);
      throw new Error(`Invalid data structure for '${storeName}'.`, { cause: e });
    }
    throw e;
  }
};

/**
 * Bulk validation (idbPutBulk): drops invalid rows instead of aborting
 * the whole sync, preserving the previous inline behavior verbatim.
 */
export const filterValidIdbItems = <T>(storeName: string, items: T[]): T[] => {
  const schema = schemaMap[storeName];
  if (!schema) return items;
  const validItems: T[] = [];
  let validationErrors = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      schema.parse(items[i]);
      validItems.push(items[i]);
    } catch (e) {
      validationErrors++;
      if (validationErrors <= 5) {
        // Log only the first 5 errors to avoid spamming the console
        if (e instanceof z.ZodError) {
          logger.warn(
            `[IDB Sync] Dropping invalid record in '${storeName}' at index ${i}:`,
            JSON.stringify(e.issues, null, 2),
          );
        } else {
          logger.warn(`[IDB Sync] Dropping invalid record in '${storeName}' at index ${i}:`, e);
        }
      }
    }
  }

  if (validationErrors > 0) {
    logger.warn(
      `[IDB Sync] Dropped ${validationErrors} invalid records in '${storeName}'. Syncing remaining ${validItems.length} valid items...`,
    );
  }

  return validItems;
};
