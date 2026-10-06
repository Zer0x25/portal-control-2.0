import type { Prisma } from "../../../generated/prisma/client";
import type { HolidayRecord } from "../application/contracts";
import type { HolidayCommandRepository } from "../application/commands";
interface HolidayWriteAccess {
  upsert(args: Prisma.HolidayUpsertArgs): Promise<HolidayRecord>;
  findUnique(args: Prisma.HolidayFindUniqueArgs): Promise<{ date: string; name: string } | null>;
  delete(args: Prisma.HolidayDeleteArgs): Promise<unknown>;
}
export function createPrismaHolidayCommands(access: HolidayWriteAccess): HolidayCommandRepository {
  return {
    upsert: ({ id, date, name, type }) =>
      access.upsert({ where: { date }, update: { name, type }, create: { id, date, name, type } }),
    findSummary: (id) => access.findUnique({ where: { id }, select: { date: true, name: true } }),
    delete: (id) => access.delete({ where: { id } }),
  };
}
