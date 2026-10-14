import { createShiftReportFlows } from "../modules/shiftReports";
import { ShiftReportService } from "./ShiftReportService";
export const shiftReportFlows = createShiftReportFlows({
  service: {
    list: (query) => ShiftReportService.list(query),
    save: (input, actor) => ShiftReportService.createOrUpdate(input, actor),
    update: (id, input, actor) => ShiftReportService.update(id, input, actor),
    delete: (id, actor) => ShiftReportService.delete(id, actor),
  },
});
