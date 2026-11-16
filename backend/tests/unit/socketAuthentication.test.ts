import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sessions: vi.fn(), users: vi.fn(), employees: vi.fn() }));
vi.mock("../../src/services/db", () => ({
  default: {
    activeSession: { findMany: mocks.sessions },
    user: { findMany: mocks.users },
    employee: { findMany: mocks.employees },
  },
}));
import { authorizeSocketTokens } from "../../src/services/socketAuthentication";
const secret = "spec025-socket-test-only";
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const sign = (id: string, role = "Supervisor", expiresIn = 300) =>
  jwt.sign({ id, username: id, role }, secret, { expiresIn });
beforeEach(() => {
  vi.stubEnv("JWT_SECRET", secret);
  mocks.sessions.mockReset().mockResolvedValue([]);
  mocks.users.mockReset().mockResolvedValue([]);
  mocks.employees.mockReset().mockResolvedValue([]);
});
it("uses two batch queries for the complete token collection, deduplicating sessions", async () => {
  const tokens = Array.from({ length: 15 }, (_, i) => sign(`user-${i}`));
  mocks.sessions.mockResolvedValue(
    tokens.map((token, i) => ({ tokenHash: hash(token), userId: `user-${i}` })),
  );
  mocks.users.mockResolvedValue(
    tokens.map((_, i) => ({
      id: `user-${i}`,
      role: "Supervisor",
      isForcePasswordChange: false,
    })),
  );
  expect(await authorizeSocketTokens([...tokens, tokens[0]!])).toEqual(new Set(tokens));
  expect(mocks.sessions).toHaveBeenCalledTimes(1);
  expect(mocks.users).toHaveBeenCalledTimes(1);
  expect(mocks.employees).not.toHaveBeenCalled();
  expect(mocks.sessions.mock.calls[0]![0].where.tokenHash.in).toHaveLength(15);
  expect(mocks.sessions.mock.calls[0]![0].where.expiresAt.gt).toBeInstanceOf(Date);
});
it("denies expired/invalid/revoked tokens, removed users, archived, force-change and role changes", async () => {
  const valid = sign("valid"),
    revoked = sign("revoked"),
    removed = sign("removed"),
    changed = sign("changed"),
    archived = sign("archived"),
    forceChange = sign("forceChange");
  mocks.sessions.mockResolvedValue(
    [valid, removed, changed, archived, forceChange].map((token, i) => ({
      tokenHash: hash(token),
      userId: ["valid", "removed", "changed", "archived", "forceChange"][i],
    })),
  );
  mocks.users.mockResolvedValue([
    { id: "valid", role: "Supervisor", isForcePasswordChange: false },
    { id: "changed", role: "Usuario", isForcePasswordChange: false },
    { id: "archived", role: "Archivado", isForcePasswordChange: false },
    { id: "forceChange", role: "Supervisor", isForcePasswordChange: true },
  ]);
  expect(
    await authorizeSocketTokens([
      valid,
      revoked,
      removed,
      changed,
      archived,
      forceChange,
      sign("expired", "Supervisor", -1),
      "bad",
    ]),
  ).toEqual(new Set([valid]));
});
it("retains signed kiosk sessionless semantics while rejecting archived or expired kiosk JWT", async () => {
  const activeKiosk = jwt.sign(
    { id: "emp-active", username: "emp-active", role: "Kiosk_Employee", employeeId: "emp-active" },
    secret,
    { expiresIn: 300 },
  );
  const archivedKiosk = jwt.sign(
    {
      id: "emp-archived",
      username: "emp-archived",
      role: "Kiosk_Employee",
      employeeId: "emp-archived",
    },
    secret,
    { expiresIn: 300 },
  );
  mocks.employees.mockResolvedValue([{ id: "emp-active", status: "Activo" }]);
  expect(
    await authorizeSocketTokens([
      activeKiosk,
      archivedKiosk,
      sign("expired", "Kiosk_Employee", -1),
    ]),
  ).toEqual(new Set([activeKiosk]));
  expect(mocks.sessions).not.toHaveBeenCalled();
  expect(mocks.users).not.toHaveBeenCalled();
  expect(mocks.employees).toHaveBeenCalledTimes(1);
});
it("fails closed on database failure instead of treating it as an active session", async () => {
  mocks.sessions.mockRejectedValue(new Error("db unavailable"));
  await expect(authorizeSocketTokens([sign("user")])).rejects.toThrow("db unavailable");
});
