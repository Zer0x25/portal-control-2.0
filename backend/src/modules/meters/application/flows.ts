import { AuthError } from "../../../utils/AppError";
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
    create: async (value: unknown, actorUsername: string) => {
      if (!actorUsername?.trim()) throw new AuthError();
      const readings = deps.parse(value);
      return { success: true, data: await deps.create(readings, actorUsername) };
    },
  };
}
export type MeterFlows = ReturnType<typeof createMeterFlows>;
