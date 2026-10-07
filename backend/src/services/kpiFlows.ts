import { createKpiFlows } from "../modules/kpis";
import { kpiService } from "./kpiService";
import {
  businessDateToUtcDate,
  compareBusinessDateCL,
  fromInclusiveRange,
} from "../utils/timePolicy";
export const kpiFlows = createKpiFlows({
  service: {
    summary: (input) => kpiService.getKpiSummary(input),
    detailed: (input) => kpiService.getDetailedReport(input),
    overview: () => kpiService.getDashboardOverview(),
    daily: () => kpiService.getDailyPlanningSummary(),
  },
  dates: {
    exclusive: (startDate, endDate) => fromInclusiveRange({ startDate, endDate }).endDateExclusive,
    compare: compareBusinessDateCL,
    duration: (start, end) =>
      businessDateToUtcDate(end).getTime() - businessDateToUtcDate(start).getTime(),
  },
});
