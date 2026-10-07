import { expect, it } from "vitest";
import { projectRealtimeEvent } from "../../src/modules/realtime";
const user = (role: string, employeeId?: string) => ({
  id: role,
  username: role,
  role,
  employeeId,
});
it("never forwards sensitive business/config payloads, even to an administrator", () => {
  const secret = {
    id: "other",
    passwordHash: "hash",
    mfaSecret: "mfa",
    value: { password: "smtp" },
    content: "private",
  };
  for (const event of [
    "user:updated",
    "config:updated",
    "quickNote:created",
    "timeRecord:updated",
  ]) {
    const result = projectRealtimeEvent(event, secret, user("Administrador"));
    expect(result).toBeDefined();
    expect(JSON.stringify(result)).not.toMatch(/hash|mfa|smtp|private|other/);
  }
});
it("restricts audit, users, leaves and seeder to their HTTP roles", () => {
  expect(projectRealtimeEvent("auditLog:created", {}, user("Fiscalizador"))).toBeDefined();
  for (const role of ["Usuario", "Kiosk_Employee", "Supervisor", "Reloj_Control"]) {
    expect(projectRealtimeEvent("auditLog:created", {}, user(role))).toBeUndefined();
    expect(projectRealtimeEvent("user:updated", {}, user(role))).toBeUndefined();
    expect(
      projectRealtimeEvent("seeder:phase2_failed", { error: "secret" }, user(role)),
    ).toBeUndefined();
  }
  expect(projectRealtimeEvent("leave:updated", {}, user("Usuario"))).toBeUndefined();
  expect(
    projectRealtimeEvent(
      "seeder:phase2_failed",
      { jobId: "job", error: "password" },
      user("Administrador"),
    ),
  ).toEqual({ payload: { jobId: "job" } });
});
it("allows linked worker invalidation only for the same employee", () => {
  for (const role of ["Usuario", "Kiosk_Employee"]) {
    expect(
      projectRealtimeEvent("timeRecord:updated", { employeeId: "own" }, user(role, "own")),
    ).toEqual({ payload: { changed: true } });
    expect(
      projectRealtimeEvent("timeRecord:updated", { employeeId: "other" }, user(role, "own")),
    ).toBeUndefined();
    expect(
      projectRealtimeEvent("timeRecord:deleted", { id: "record" }, user(role, "own")),
    ).toBeUndefined();
    expect(
      projectRealtimeEvent("timeRecord:updated", { employeeId: "own" }, user(role)),
    ).toBeUndefined();
  }
});
it("denies unknown events and roles; private notification requires matching target", () => {
  expect(projectRealtimeEvent("unknown", {}, user("Administrador"))).toBeUndefined();
  expect(projectRealtimeEvent("holiday:updated", {}, user("unknown"))).toBeUndefined();
  const payload = {
    title: "Title",
    message: "Message",
    type: "info",
    metadata: { secret: "hidden" },
  };
  expect(projectRealtimeEvent("user_notification", payload, user("Usuario"))).toBeUndefined();
  expect(
    projectRealtimeEvent("user_notification", payload, user("Usuario"), "other"),
  ).toBeUndefined();
  expect(projectRealtimeEvent("user_notification", payload, user("Usuario"), "Usuario")).toEqual({
    payload: { title: "Title", message: "Message", type: "info" },
  });
});
it("projects lifecycle status without operational messages or seeder errors", () => {
  expect(
    projectRealtimeEvent(
      "system:maintenance",
      { active: true, operation: "restore", message: "secret", path: "/private" },
      user("Usuario"),
    ),
  ).toEqual({ payload: { active: true, operation: "restore" } });
  expect(
    projectRealtimeEvent(
      "auth:force_logout",
      { reason: "secret", restartRecommended: true, token: "secret" },
      user("Usuario"),
    ),
  ).toEqual({ payload: { reason: "SESSION_INVALIDATED", restartRecommended: true } });
  expect(
    projectRealtimeEvent("quickNote:created", { content: "secret" }, user("Reloj_Control")),
  ).toEqual({ payload: { changed: true, created: true } });
});
