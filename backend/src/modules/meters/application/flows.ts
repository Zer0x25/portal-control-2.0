import type { MeterDependencies, MeterListParams } from "./contracts";
export function createMeterFlows<Reading>(deps: MeterDependencies<Reading>) {
  return {
    list: async (params: MeterListParams) => {
      const result = await deps.list(params);
      return {
        success: true,
        data: result.items,
        ...(result.isPaginated
          ? {
              pagination: { total: result.total, page: result.page, totalPages: result.totalPages },
            }
          : {}),
      };
    },
    create: async (value: unknown) => ({
      success: true,
      data: await deps.create(deps.parse(value)),
    }),
  };
}
export type MeterFlows = ReturnType<typeof createMeterFlows>;
