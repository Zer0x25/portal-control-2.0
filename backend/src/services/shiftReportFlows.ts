import { createShiftReportFlows } from "../modules/shiftReports";
import { ShiftReportService } from "./ShiftReportService";
export const shiftReportFlows = createShiftReportFlows({
  service: {
    list: (query) => ShiftReportService.list(query),
    save: (input, actor) => ShiftReportService.createOrUpdate(input, actor),
  },
});
