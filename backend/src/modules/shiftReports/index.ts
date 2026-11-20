import { formatInTimeZone } from "date-fns-tz";
import { normalizeShiftReportEntries as normalizeEntriesPure } from "./application/normalizeEntries";

export { createShiftReportFlows, type ShiftReportFlows } from "./application/flows";
export type {
  ShiftReportQuery,
  ShiftReportInput,
  ShiftReportFlowDependencies,
  LogEntry,
  SupplierEntry,
} from "./application/contracts";
export { shiftReportsPlugin, type ShiftReportsHttpService } from "./http/routes";

export function normalizeShiftReportEntries(
  logEntriesRaw: string,
  supplierEntriesRaw: string,
  fallbackTs: number,
) {
  return normalizeEntriesPure(logEntriesRaw, supplierEntriesRaw, fallbackTs, (timestamp) =>
    formatInTimeZone(new Date(timestamp), "America/Santiago", "HH:mm"),
  );
}
