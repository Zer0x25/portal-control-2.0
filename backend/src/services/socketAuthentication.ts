import crypto from "node:crypto";
import prisma from "./db";
import { verifyAccessToken, type AuthUser } from "../modules/auth";

/** Verify all connected sessions in batch queries, never one lookup per socket. */
export async function authorizeSocketTokens(tokens: string[]): Promise<Set<string>> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  const betterAuthEnabled = process.env.BETTER_AUTH_ENABLED === "true";
  const candidates = new Map<string, { user: AuthUser; hash: string }>();
  const baCandidates = new Map<string, string>();
  for (const token of new Set(tokens)) {
    try {
      candidates.set(token, {
        user: verifyAccessToken(token, secret),
        hash: crypto.createHash("sha256").update(token).digest("hex"),
      });
    } catch {
      if (betterAuthEnabled) baCandidates.set(token, token);
    }
  }
  const stateful = [...candidates.values()].filter(({ user }) => user.role !== "Kiosk_Employee");
  const now = new Date();
  const sessions = stateful.length
    ? await prisma.activeSession.findMany({
        where: { tokenHash: { in: stateful.map(({ hash }) => hash) }, expiresAt: { gt: now } },
        select: { tokenHash: true, userId: true },
      })
    : [];
  const users = sessions.length
    ? await prisma.user.findMany({
        where: { id: { in: sessions.map(({ userId }) => userId) } },
        select: { id: true, role: true },
      })
    : [];
  const byHash = new Map(sessions.map((session) => [session.tokenHash, session.userId]));
  const byUser = new Map(users.map((user) => [user.id, user.role]));
  const valid = new Set<string>();
  for (const [token, { user, hash }] of candidates) {
    if (
      user.role === "Kiosk_Employee" ||
      (byHash.get(hash) === user.id && byUser.get(user.id) === user.role)
    )
      valid.add(token);
  }
  // Better-auth sessions (token opaco, tabla sessions): batch en 2 queries.
  if (baCandidates.size) {
    const baSessions = await prisma.session.findMany({
      where: { token: { in: [...baCandidates.keys()] }, expiresAt: { gt: now } },
      select: { token: true, userId: true },
    });
    const baUsers = baSessions.length
      ? await prisma.user.findMany({
          where: { id: { in: baSessions.map((s) => s.userId) } },
          select: { id: true, role: true },
        })
      : [];
    const baByUser = new Map(baUsers.map((u) => [u.id, u.role]));
    const baValidUsers = new Set(baUsers.map((u) => u.id));
    for (const s of baSessions) {
      if (baValidUsers.has(s.userId) && baByUser.has(s.userId)) {
        valid.add(s.token);
      }
    }
  }
  return valid;
}
