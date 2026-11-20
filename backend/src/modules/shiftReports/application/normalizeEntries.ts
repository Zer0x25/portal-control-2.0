import type { LogEntry, SupplierEntry } from "./contracts";

function toNumberTimestamp(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsedDate = new Date(value).getTime();
    if (Number.isFinite(parsedDate)) return parsedDate;
  }
  return fallback;
}

function toTimeString(
  value: unknown,
  timestamp: number,
  formatTime: (timestamp: number) => string,
): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return formatTime(timestamp);
}

function normalizeLogEntry(
  entry: unknown,
  idx: number,
  fallbackTs: number,
  formatTime: (timestamp: number) => string,
): LogEntry {
  const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
  const timestamp = toNumberTimestamp(e.timestamp, fallbackTs + idx);
  const annotationRaw = e.annotation ?? e.detail ?? e.notes ?? e.message;
  const annotation =
    typeof annotationRaw === "string" && annotationRaw.trim().length > 0
      ? annotationRaw.trim()
      : "Novedad sin detalle";

  return {
    id:
      typeof e.id === "string" && e.id.trim().length > 0 ? e.id : `legacy-log-${timestamp}-${idx}`,
    time: toTimeString(e.time, timestamp, formatTime),
    annotation,
    timestamp,
    ...(typeof e.recordId === "string" && e.recordId ? { recordId: e.recordId } : {}),
  };
}

function normalizeSupplierEntry(
  entry: unknown,
  idx: number,
  fallbackTs: number,
  formatTime: (timestamp: number) => string,
): SupplierEntry {
  const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
  const timestamp = toNumberTimestamp(e.timestamp, fallbackTs + idx);

  return {
    id:
      typeof e.id === "string" && e.id.trim().length > 0
        ? e.id
        : `legacy-supplier-${timestamp}-${idx}`,
    ...(e.entryType === "visit" || e.entryType === "provider" ? { entryType: e.entryType } : {}),
    ...(e.arrivalMode === "pedestrian" || e.arrivalMode === "vehicle"
      ? { arrivalMode: e.arrivalMode }
      : {}),
    time: toTimeString(e.time, timestamp, formatTime),
    licensePlate:
      typeof e.licensePlate === "string" && e.licensePlate.trim().length > 0
        ? e.licensePlate.trim()
        : e.arrivalMode === "pedestrian"
          ? ""
          : "N/A",
    driverName:
      typeof e.driverName === "string" && e.driverName.trim().length > 0
        ? e.driverName.trim()
        : "N/A",
    paxCount: typeof e.paxCount === "number" && Number.isFinite(e.paxCount) ? e.paxCount : 0,
    company:
      typeof e.company === "string" && e.company.trim().length > 0 ? e.company.trim() : "N/A",
    reason: typeof e.reason === "string" && e.reason.trim().length > 0 ? e.reason.trim() : "N/A",
    timestamp,
  };
}

export function normalizeShiftReportEntries(
  logEntriesRaw: string,
  supplierEntriesRaw: string,
  fallbackTs: number,
  formatTime: (timestamp: number) => string = (timestamp) =>
    new Date(timestamp).toISOString().slice(11, 16),
) {
  let parsedLogEntries: unknown[] = [];
  let parsedSupplierEntries: unknown[] = [];

  try {
    parsedLogEntries = JSON.parse(logEntriesRaw || "[]");
    if (!Array.isArray(parsedLogEntries)) parsedLogEntries = [];
  } catch {
    parsedLogEntries = [];
  }

  try {
    parsedSupplierEntries = JSON.parse(supplierEntriesRaw || "[]");
    if (!Array.isArray(parsedSupplierEntries)) parsedSupplierEntries = [];
  } catch {
    parsedSupplierEntries = [];
  }

  const logEntries = parsedLogEntries
    .map((entry, idx) => normalizeLogEntry(entry, idx, fallbackTs, formatTime))
    .sort((a, b) => a.timestamp - b.timestamp);

  const supplierEntries = parsedSupplierEntries
    .map((entry, idx) => normalizeSupplierEntry(entry, idx, fallbackTs, formatTime))
    .sort((a, b) => a.timestamp - b.timestamp);

  return { logEntries, supplierEntries };
}
