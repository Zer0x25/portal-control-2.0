import type { Prisma } from "../../../generated/prisma/client";
import type { HolidayFilter, HolidayRecord, HolidayRepository } from "../application/contracts";

interface HolidayDataAccess {
  findMany(args: Prisma.HolidayFindManyArgs): Promise<HolidayRecord[]>;
  count(args: Prisma.HolidayCountArgs): Promise<number>;
}

function toWhere(filter: HolidayFilter): Prisma.HolidayWhereInput {
  const where: Prisma.HolidayWhereInput = {};
  if (filter.updatedSince) where.updatedAt = { gte: filter.updatedSince };
  if (filter.dateFrom) where.date = { gte: filter.dateFrom };
  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: "insensitive" } },
      { type: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  return where;
}

/** Composition supplies the existing extended client; this adapter owns no pool. */
export function createPrismaHolidayRepository(access: HolidayDataAccess): HolidayRepository {
  return {
    list({ offset, limit, ...filter }) {
      const args: Prisma.HolidayFindManyArgs = {
        where: toWhere(filter),
        orderBy: { date: "desc" },
      };
      if (offset !== undefined) args.skip = offset;
      if (limit !== undefined) args.take = limit;
      return access.findMany(args);
    },
    count: (filter) => access.count({ where: toWhere(filter) }),
    countYear: (year) => access.count({ where: { date: { startsWith: `${year}-` } } }),
  };
}
