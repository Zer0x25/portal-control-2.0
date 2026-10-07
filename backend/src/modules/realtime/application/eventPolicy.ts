export interface RealtimeRecipient {
  id: string;
  role: string;
  employeeId?: string | null;
}
type Payload = Record<string, string | number | boolean>;
export interface RealtimeDelivery {
  payload: Payload;
}
const roles = new Set([
  "Administrador",
  "Supervisor_Elevado",
  "Supervisor",
  "Reloj_Control",
  "Fiscalizador",
  "Usuario",
  "Kiosk_Employee",
]);
const supervisors = new Set(["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"]);
const auditViewers = new Set(["Administrador", "Supervisor_Elevado", "Fiscalizador"]);
const scoped = new Set([
  "timeRecord:created",
  "timeRecord:updated",
  "timeRecord:deleted",
  "timeRecord:batch_created",
  "assignedShift:updated",
  "correctionRequest:created",
  "correctionRequest:updated",
  "correctionRequest:deleted",
]);
const staff = new Set([...supervisors, "Fiscalizador"]);
const supervisorEvents = new Set([
  "quickNote:created",
  "quickNote:updated",
  "quickNote:deleted",
  "shiftReport:created",
  "shiftReport:updated",
  "shiftReport:deleted",
  "leave:updated",
  "meter:updated",
]);
const seederEvents = new Set([
  "seeder:phase2_started",
  "seeder:phase2_paused",
  "seeder:phase2_resumed",
  "seeder:phase2_stopped",
  "seeder:phase2_progress",
  "seeder:phase2_completed",
  "seeder:phase2_failed",
]);
export const REALTIME_EVENTS = [
  ...scoped,
  ...supervisorEvents,
  ...seederEvents,
  "employee:updated",
  "auditLog:created",
  "user:updated",
  "holiday:updated",
  "shiftPattern:updated",
  "config:updated",
  "system:maintenance",
  "auth:force_logout",
  "system_notification",
  "user_notification",
];
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function object(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}
/** Payloads are explicit projections; unknown events/roles fail closed. */
export function projectRealtimeEvent(
  event: string,
  data: unknown,
  recipient: RealtimeRecipient,
  targetUserId?: string,
): RealtimeDelivery | undefined {
  if (!roles.has(recipient.role) || (targetUserId !== undefined && targetUserId !== recipient.id))
    return;
  const value = object(data);
  if (event === "auth:force_logout")
    return {
      payload: {
        reason: value.reason === "DATABASE_RESTORE" ? "DATABASE_RESTORE" : "SESSION_INVALIDATED",
        restartRecommended: value.restartRecommended === true,
      },
    };
  if (event === "system:maintenance") {
    const payload: Payload = { active: value.active === true };
    if (
      typeof value.operation === "string" &&
      ["backup", "restore", "reset"].includes(value.operation)
    )
      payload.operation = value.operation;
    return { payload };
  }
  if (event === "user_notification") {
    if (!targetUserId || typeof value.title !== "string" || typeof value.message !== "string")
      return;
    return {
      payload: {
        title: value.title,
        message: value.message,
        type:
          typeof value.type === "string" &&
          ["info", "success", "warning", "error"].includes(value.type)
            ? value.type
            : "info",
      },
    };
  }
  if (event === "system_notification") {
    if (recipient.role !== "Administrador") return;
    return {
      payload: {
        title: "Notificación del sistema",
        message: "Hay una actualización del sistema.",
        type: "info",
      },
    };
  }
  if (seederEvents.has(event)) {
    if (recipient.role !== "Administrador") return;
    const payload: Payload = {};
    if (typeof value.jobId === "string") payload.jobId = value.jobId;
    if (event === "seeder:phase2_progress") {
      for (const key of ["dayCompleted", "totalDays"]) {
        const count = value[key];
        if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0)
          payload[key] = count;
      }
    }
    return { payload };
  }
  let allowed = false;
  if (scoped.has(event))
    allowed =
      staff.has(recipient.role) ||
      (!!recipient.employeeId && value.employeeId === recipient.employeeId);
  else if (event === "employee:updated")
    allowed =
      staff.has(recipient.role) || (!!recipient.employeeId && value.id === recipient.employeeId);
  else if (supervisorEvents.has(event)) allowed = supervisors.has(recipient.role);
  else if (event === "auditLog:created") allowed = auditViewers.has(recipient.role);
  else if (event === "user:updated") allowed = recipient.role === "Administrador";
  else if (["holiday:updated", "shiftPattern:updated", "config:updated"].includes(event))
    allowed = true;
  if (!allowed) return;
  return {
    payload: event === "quickNote:created" ? { changed: true, created: true } : { changed: true },
  };
}
