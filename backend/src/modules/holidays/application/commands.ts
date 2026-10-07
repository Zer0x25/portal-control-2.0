import type { HolidayRecord } from "./contracts";

export interface HolidayInput {
  id?: string;
  date: string;
  name: string;
  type?: string | null;
}

export interface HolidayCommandRepository {
  upsert(
    data: Required<Pick<HolidayInput, "id" | "date" | "name">> & { type: string },
  ): Promise<HolidayRecord>;
  findSummary(id: string): Promise<{ date: string; name: string } | null>;
  delete(id: string): Promise<unknown>;
}

export interface HolidayCommandDependencies {
  repository: HolidayCommandRepository;
  provider: {
    list(year: number): Promise<{ date: string; title: string; inalienable: boolean }[]>;
  };
  id(): string;
  year(): number;
  audit(entry: {
    actorUsername: string;
    action: string;
    category: "OPERATIONS";
    severity?: "WARNING";
    details: Record<string, unknown>;
  }): Promise<void>;
  emit(payload: unknown): void;
}

export function createHolidayCommands(deps: HolidayCommandDependencies) {
  const write = (data: HolidayInput) =>
    deps.repository.upsert({
      id: data.id || deps.id(),
      date: data.date,
      name: data.name,
      type: data.type || "Nacional",
    });
  const audit = (
    actorUsername: string,
    action: string,
    details: Record<string, unknown>,
    severity?: "WARNING",
  ) =>
    deps.audit({
      actorUsername,
      action,
      category: "OPERATIONS",
      ...(severity && { severity }),
      details,
    });
  return {
    async upsert(data: HolidayInput, actor: string) {
      const holiday = await write(data);
      await audit(actor, "HOLIDAY_UPSERT", { date: holiday.date, name: holiday.name });
      deps.emit(holiday);
      return holiday;
    },
    async bulk(data: HolidayInput[], actor: string) {
      const results = await Promise.all(data.map(write));
      await audit(actor, "HOLIDAY_BULK_UPSERT", { count: results.length });
      deps.emit({ type: "bulk", count: results.length });
      return results.length;
    },
    async delete(id: string, actor: string) {
      const holiday = await deps.repository.findSummary(id);
      await deps.repository.delete(id);
      await audit(
        actor,
        "HOLIDAY_DELETE",
        { id, date: holiday?.date, name: holiday?.name },
        "WARNING",
      );
      deps.emit({ id, isDeleted: true });
    },
    async sync(year?: number, actor = "SYSTEM") {
      const targetYear = year || deps.year();
      const data = await deps.provider.list(targetYear);
      // Each write uses the extended client's direct audit transaction. Keep pool pressure bounded.
      for (const item of data) {
        await write({
          date: item.date,
          name: item.title,
          type: item.inalienable ? "Nacional" : "Regional",
        });
      }
      await audit(actor, "HOLIDAY_SYNC", { count: data.length, year: targetYear });
      deps.emit({ type: "sync", count: data.length });
      return { success: true, total: data.length, year: targetYear };
    },
  };
}
