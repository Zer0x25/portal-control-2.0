import prisma from "./db";
import { ulid } from "ulid";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { toBusinessDateChile } from "../utils/timeUtils";
import {
  createGetHolidays,
  createHolidayCommands,
  createPrismaHolidayCommands,
  createBoostrProvider,
  createPrismaHolidayRepository,
  type HolidayOptions,
} from "../modules/holidays";
import { logger } from "../utils/logger";

/** Payload fields `upsertHoliday` reads. */
export interface HolidayUpsertData {
  id?: string;
  date: string;
  name: string;
  type?: string | null;
}

/** Row shape of a bulk import; same fields as an upsert payload. */
export interface BulkHolidayInput {
  id?: string;
  date: string;
  name: string;
  type?: string | null;
}

export class HolidayService {
  /**
   * Obtiene los feriados del sistema, permitiendo filtrado delta.
   */
  async getHolidays(options: HolidayOptions = {}) {
    return createGetHolidays({
      repository: createPrismaHolidayRepository({
        findMany: (args) => prisma.holiday.findMany(args),
        count: (args) => prisma.holiday.count(args),
      }),
      clock: { businessDate: () => toBusinessDateChile(), year: () => new Date().getFullYear() },
      autosyncEnabled: () => process.env.DISABLE_HOLIDAY_AUTOSYNC !== "true",
      sync: (year) => this.syncExternalHolidays(year),
      onAutosync: (year) => logger.warn(`[HolidayService] Auto-syncing holidays for ${year}...`),
      onAutosyncDisabled: () =>
        logger.warn("[HolidayService] Auto-sync skipped (DISABLE_HOLIDAY_AUTOSYNC=true)."),
    })(options);
  }

  private commands() {
    return createHolidayCommands({
      repository: createPrismaHolidayCommands({
        upsert: (args) => prisma.holiday.upsert(args),
        findUnique: (args) => prisma.holiday.findUnique(args),
        delete: (args) => prisma.holiday.delete(args),
      }),
      provider: createBoostrProvider(
        (input, init) => (init === undefined ? fetch(input) : fetch(input, init)),
        logger,
      ),
      id: () => ulid(),
      year: () => new Date().getFullYear(),
      audit: (entry) => auditService.log(entry),
      emit: (payload) => SocketService.emit("holiday:updated", payload),
    });
  }

  syncExternalHolidays(year?: number, actorUsername = "SYSTEM") {
    return this.commands().sync(year, actorUsername);
  }
  upsertHoliday(data: HolidayUpsertData, actorUsername: string) {
    return this.commands().upsert(data, actorUsername);
  }
  deleteHoliday(id: string, actorUsername: string) {
    return this.commands().delete(id, actorUsername);
  }
  bulkUpsertHolidays(holidays: BulkHolidayInput[], actorUsername: string) {
    return this.commands().bulk(holidays, actorUsername);
  }
}

export const holidayService = new HolidayService();
