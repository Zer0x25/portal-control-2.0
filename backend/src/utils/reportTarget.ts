export function hasReportTarget(type: string, filters: unknown): boolean {
  if (type !== "shift_report") return true;
  return (
    !!filters &&
    typeof filters === "object" &&
    "shiftReportId" in filters &&
    typeof filters.shiftReportId === "string" &&
    filters.shiftReportId.trim().length > 0
  );
}
