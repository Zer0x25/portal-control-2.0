export { createShiftReportFlows, type ShiftReportFlows } from "./application/flows";
export type {
  ShiftReportQuery,
  ShiftReportInput,
  ShiftReportFlowDependencies,
  LogEntry,
  SupplierEntry,
} from "./application/contracts";
export { shiftReportsPlugin, type ShiftReportsHttpService } from "./http/routes";

export { normalizeShiftReportEntries } from "./application/normalizeEntries";
