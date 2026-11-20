import type { Prisma } from "../../../generated/prisma/client";
import type { HolidayRecord } from "../application/contracts";
import type { HolidayCommandRepository } from "../application/commands";
import { ConflictError, NotFoundError } from "../../../utils/AppError";
import { toCaughtError } from "../../../utils/caughtError";

interface HolidayWriteAccess {
  create(args: Prisma.HolidayCreateArgs): Promise<HolidayRecord>;
  update(args: Prisma.HolidayUpdateArgs): Promise<HolidayRecord>;
  upsert(args: Prisma.HolidayUpsertArgs): Promise<HolidayRecord>;
  findUnique(args: Prisma.HolidayFindUniqueArgs): Promise<{ date: string; name: string } | null>;
  delete(args: Prisma.HolidayDeleteArgs): Promise<unknown>;
}

const DUPLICATE_DATE_MESSAGE = "Ya existe un feriado registrado en esa fecha.";

export function createPrismaHolidayCommands(access: HolidayWriteAccess): HolidayCommandRepository {
  return {
    create: async ({ id, date, name, type, isRenounceable }) => {
      try {
        return await access.create({ data: { id, date, name, type, isRenounceable } });
      } catch (error) {
        if (toCaughtError(error).code === "P2002") {
          throw new ConflictError(DUPLICATE_DATE_MESSAGE);
        }
        throw error;
      }
    },
    updateById: async (id, { date, name, type, isRenounceable }) => {
      try {
        return await access.update({
          where: { id },
          data: { date, name, type, isRenounceable },
        });
      } catch (error) {
        const code = toCaughtError(error).code;
        if (code === "P2025") {
          throw new NotFoundError("Feriado no encontrado");
        }
        if (code === "P2002") {
          throw new ConflictError(DUPLICATE_DATE_MESSAGE);
        }
        throw error;
      }
    },
    upsertByDate: ({ id, date, name, type, isRenounceable }) =>
      access.upsert({
        where: { date },
        update: { name, type, isRenounceable },
        create: { id, date, name, type, isRenounceable },
      }),
    findSummary: (id) => access.findUnique({ where: { id }, select: { date: true, name: true } }),
    delete: (id) => access.delete({ where: { id } }),
  };
}
