import type { GetHolidays, HolidayDependencies, HolidayFilter, HolidayQuery } from "./contracts";

export function createGetHolidays(deps: HolidayDependencies): GetHolidays {
  return async (options = {}) => {
    const { since, page, pageSize, search, showArchived } = options;
    const filter: HolidayFilter = {};
    if (since) {
      const updatedSince = new Date(Number(since));
      if (!isNaN(updatedSince.getTime())) filter.updatedSince = updatedSince;
    }
    if (search?.trim()) filter.search = search.trim();
    if (!showArchived && !since) filter.dateFrom = deps.clock.businessDate();

    const paginated = page !== undefined && pageSize !== undefined;
    const query: HolidayQuery = { ...filter };
    if (page !== undefined && pageSize !== undefined) {
      query.offset = (page - 1) * pageSize;
      query.limit = pageSize;
    }
    let rows = await deps.repository.list(query);
    if (!since) {
      if (deps.autosyncEnabled()) {
        const year = deps.clock.year();
        if ((await deps.repository.countYear(year)) === 0) {
          deps.onAutosync?.(deps.clock.year());
          await deps.sync(deps.clock.year());
          rows = await deps.repository.list(query);
        }
      } else {
        deps.onAutosyncDisabled?.();
      }
    }
    const data = rows.map((row) => ({
      ...row,
      lastModified: row.updatedAt.getTime(),
      syncStatus: "synced" as const,
      isDeleted: false as const,
    }));
    if (!paginated) return data;
    const total = await deps.repository.count(filter);
    return {
      data,
      meta: {
        total,
        page: page || 1,
        pageSize: pageSize || data.length,
        totalPages: pageSize ? Math.ceil(total / pageSize) : 1,
      },
    };
  };
}
