/**
 * Normalize legacy ShiftReport payloads persisted as JSON strings.
 *
 * Usage:
 *   npx tsx scripts/normalize_shift_reports.ts          # dry-run
 *   npx tsx scripts/normalize_shift_reports.ts --apply  # persist changes
 */
import prisma from "../src/services/db";

type AnyRecord = Record<string, unknown>;

const hasApplyFlag = process.argv.includes("--apply");

const toNumberTimestamp = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsedDate = new Date(value).getTime();
    if (Number.isFinite(parsedDate)) return parsedDate;
  }
  return fallback;
};

const toTime = (value: unknown, timestamp: number): string => {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const normalizeLogEntry = (
  entry: unknown,
  index: number,
  fallbackTs: number,
): {
  id: string;
  time: string;
  annotation: string;
  timestamp: number;
} => {
  const e = (entry && typeof entry === "object" ? entry : {}) as AnyRecord;
  const timestamp = toNumberTimestamp(e.timestamp, fallbackTs + index);
  const annotationRaw = e.annotation ?? e.detail ?? e.notes ?? e.message;
  const annotation =
    typeof annotationRaw === "string" && annotationRaw.trim().length > 0
      ? annotationRaw.trim()
      : "Novedad sin detalle";

  return {
    id:
      typeof e.id === "string" && e.id.trim().length > 0
        ? e.id
        : `legacy-log-${timestamp}-${index}`,
    time: toTime(e.time, timestamp),
    annotation,
    timestamp,
  };
};

const normalizeSupplierEntry = (
  entry: unknown,
  index: number,
  fallbackTs: number,
): {
  id: string;
  time: string;
  licensePlate: string;
  driverName: string;
  paxCount: number;
  company: string;
  reason: string;
  timestamp: number;
} => {
  const e = (entry && typeof entry === "object" ? entry : {}) as AnyRecord;
  const timestamp = toNumberTimestamp(e.timestamp, fallbackTs + index);

  return {
    id:
      typeof e.id === "string" && e.id.trim().length > 0
        ? e.id
        : `legacy-supplier-${timestamp}-${index}`,
    time: toTime(e.time, timestamp),
    licensePlate:
      typeof e.licensePlate === "string" && e.licensePlate.trim().length > 0
        ? e.licensePlate.trim()
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
};

async function main() {
  const reports = await prisma.shiftReport.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      folio: true,
      updatedAt: true,
      logEntries: true,
      supplierEntries: true,
    },
  });

  let changed = 0;
  let untouched = 0;

  for (const report of reports) {
    let parsedLogEntries: unknown[] = [];
    let parsedSupplierEntries: unknown[] = [];

    try {
      parsedLogEntries = JSON.parse(report.logEntries || "[]");
      if (!Array.isArray(parsedLogEntries)) parsedLogEntries = [];
    } catch {
      parsedLogEntries = [];
    }

    try {
      parsedSupplierEntries = JSON.parse(report.supplierEntries || "[]");
      if (!Array.isArray(parsedSupplierEntries)) parsedSupplierEntries = [];
    } catch {
      parsedSupplierEntries = [];
    }

    const baseTs = report.updatedAt.getTime();

    const normalizedLogEntries = parsedLogEntries
      .map((entry, idx) => normalizeLogEntry(entry, idx, baseTs))
      .sort((a, b) => a.timestamp - b.timestamp);

    const normalizedSupplierEntries = parsedSupplierEntries
      .map((entry, idx) => normalizeSupplierEntry(entry, idx, baseTs))
      .sort((a, b) => a.timestamp - b.timestamp);

    const nextLogEntries = JSON.stringify(normalizedLogEntries);
    const nextSupplierEntries = JSON.stringify(normalizedSupplierEntries);

    if (nextLogEntries === report.logEntries && nextSupplierEntries === report.supplierEntries) {
      untouched++;
      continue;
    }

    changed++;
    if (hasApplyFlag) {
      await prisma.shiftReport.update({
        where: { id: report.id },
        data: {
          logEntries: nextLogEntries,
          supplierEntries: nextSupplierEntries,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: hasApplyFlag ? "apply" : "dry-run",
        total: reports.length,
        changed,
        untouched,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[normalize_shift_reports] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
