import { request as apiRequest } from "./apiClient";
import type { components } from "../types/api-schema";

export type ScheduledReport = components["schemas"]["ScheduledReport"];
export type ScheduledReportInput = components["schemas"]["ScheduledReportInput"];
export type ScheduledReportUpdate = components["schemas"]["ScheduledReportUpdate"];
export type ScheduledReportType = ScheduledReport["reportType"];
export type ScheduledReportFrequency = ScheduledReport["frequency"];
export type ScheduledReportFilters = NonNullable<ScheduledReportInput["filters"]>;

export const scheduledReportService = {
  getAll: (): Promise<ScheduledReport[]> =>
    apiRequest<ScheduledReport[]>({
      method: "GET",
      url: "/api/scheduled-reports",
    }),

  create: (payload: ScheduledReportInput): Promise<void> =>
    apiRequest<void>({
      method: "POST",
      url: "/api/scheduled-reports",
      body: payload,
    }),

  update: (id: string, payload: ScheduledReportUpdate): Promise<void> =>
    apiRequest<void>({
      method: "PUT",
      url: `/api/scheduled-reports/${id}`,
      body: payload,
    }),

  toggle: (id: string): Promise<components["schemas"]["ApiResponse"]> =>
    apiRequest<components["schemas"]["ApiResponse"]>({
      method: "PATCH",
      url: `/api/scheduled-reports/${id}/toggle`,
    }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>({
      method: "DELETE",
      url: `/api/scheduled-reports/${id}`,
    }),
};
