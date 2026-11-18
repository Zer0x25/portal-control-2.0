import prisma from "./db";

/** Limited, record-scoped data for attendance indicators, without general audit access. */
export async function getRecordIndicators(ids: string[]) {
  const records = await prisma.timeRecord.findMany({
    where: { id: { in: ids }, isDeleted: false },
    select: { id: true },
  });
  const allowedIds = records.map((record) => record.id);
  if (allowedIds.length === 0) return { edits: [], pending: [] };
  const [logs, pending] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: { in: ["TIME_RECORD_EDITED", "Time Record Edited"] },
        OR: allowedIds.map((id) => ({ details: { path: ["recordId"], equals: id } })),
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      select: { id: true, timestamp: true, actorUsername: true, action: true, details: true },
    }),
    prisma.correctionRequest.findMany({
      where: { timeRecordId: { in: allowedIds }, status: "pending", isDeleted: false },
      select: { id: true, timeRecordId: true, status: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);
  const fields = ["entrada", "inicioColacion", "finColacion", "salida"] as const;
  const seen = new Set<string>();
  const edits = [];
  for (const log of logs) {
    if (!log.details || typeof log.details !== "object" || Array.isArray(log.details)) continue;
    const details = log.details as Record<string, unknown>;
    if (typeof details.recordId !== "string" || !allowedIds.includes(details.recordId)) continue;
    const before =
      details.oldValue && typeof details.oldValue === "object"
        ? (details.oldValue as Record<string, unknown>)
        : {};
    const after =
      details.newValue && typeof details.newValue === "object"
        ? (details.newValue as Record<string, unknown>)
        : {};
    for (const field of fields) {
      const legacy = details.fieldEdited === field;
      if (!legacy && (!(field in before) || !(field in after) || before[field] === after[field]))
        continue;
      const key = `${details.recordId}\0${field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edits.push({
        id: `${log.id}:${field}`,
        action: log.action,
        timestamp: log.timestamp.toISOString(),
        actorUsername: log.actorUsername ?? "SYSTEM",
        details: {
          recordId: details.recordId,
          fieldEdited: field,
          oldValue: legacy ? details.oldValue : before[field],
        },
      });
    }
  }
  const pendingByRecord = new Map(pending.map((request) => [request.timeRecordId, request]));
  return { edits, pending: [...pendingByRecord.values()] };
}
