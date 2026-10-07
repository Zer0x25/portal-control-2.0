import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sessions: vi.fn(), users: vi.fn() }));
vi.mock("../../src/services/db", () => ({
  default: { activeSession: { findMany: mocks.sessions }, user: { findMany: mocks.users } },
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
});
it("uses two batch queries for the complete token collection, deduplicating sessions", async () => {
  const tokens = Array.from({ length: 15 }, (_, i) => sign(`user-${i}`));
  mocks.sessions.mockResolvedValue(
    tokens.map((token, i) => ({ tokenHash: hash(token), userId: `user-${i}` })),
  );
  mocks.users.mockResolvedValue(tokens.map((_, i) => ({ id: `user-${i}`, role: "Supervisor" })));
  expect(await authorizeSocketTokens([...tokens, tokens[0]!])).toEqual(new Set(tokens));
  expect(mocks.sessions).toHaveBeenCalledTimes(1);
  expect(mocks.users).toHaveBeenCalledTimes(1);
  expect(mocks.sessions.mock.calls[0]![0].where.tokenHash.in).toHaveLength(15);
  expect(mocks.sessions.mock.calls[0]![0].where.expiresAt.gt).toBeInstanceOf(Date);
});
it("denies expired/invalid/revoked tokens, removed users and role changes", async () => {
  const valid = sign("valid"),
    revoked = sign("revoked"),
    removed = sign("removed"),
    changed = sign("changed");
  mocks.sessions.mockResolvedValue(
    [valid, removed, changed].map((token, i) => ({
      tokenHash: hash(token),
      userId: ["valid", "removed", "changed"][i],
    })),
  );
  mocks.users.mockResolvedValue([
    { id: "valid", role: "Supervisor" },
    { id: "changed", role: "Usuario" },
  ]);
  expect(
    await authorizeSocketTokens([
      valid,
      revoked,
      removed,
      changed,
      sign("expired", "Supervisor", -1),
      "bad",
    ]),
  ).toEqual(new Set([valid]));
});
it("retains signed kiosk sessionless semantics while rejecting expired kiosk JWT", async () => {
  const kiosk = sign("employee", "Kiosk_Employee");
  expect(await authorizeSocketTokens([kiosk, sign("expired", "Kiosk_Employee", -1)])).toEqual(
    new Set([kiosk]),
  );
  expect(mocks.sessions).not.toHaveBeenCalled();
  expect(mocks.users).not.toHaveBeenCalled();
});
it("fails closed on database failure instead of treating it as an active session", async () => {
  mocks.sessions.mockRejectedValue(new Error("db unavailable"));
  await expect(authorizeSocketTokens([sign("user")])).rejects.toThrow("db unavailable");
});
