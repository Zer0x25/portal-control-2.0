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
  const kiosk = [...candidates.values()].filter(({ user }) => user.role === "Kiosk_Employee");
  const now = new Date();
  const [sessions, kioskEmployees] = await Promise.all([
    stateful.length
      ? prisma.activeSession.findMany({
          where: { tokenHash: { in: stateful.map(({ hash }) => hash) }, expiresAt: { gt: now } },
          select: { tokenHash: true, userId: true },
        })
      : Promise.resolve([]),
    kiosk.length
      ? prisma.employee.findMany({
          where: {
            id: { in: [...new Set(kiosk.map(({ user }) => user.employeeId || user.id))] },
            status: "Activo",
          },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);
  const users = sessions.length
    ? await prisma.user.findMany({
        where: { id: { in: sessions.map(({ userId }) => userId) } },
        select: { id: true, role: true, isForcePasswordChange: true },
      })
    : [];
  const byHash = new Map(sessions.map((session) => [session.tokenHash, session.userId]));
  const byUser = new Map(users.map((user) => [user.id, user]));
  const activeEmployees = new Set(kioskEmployees.map((emp) => emp.id));
  const valid = new Set<string>();
  for (const [token, { user, hash }] of candidates) {
    if (user.role === "Kiosk_Employee") {
      if (activeEmployees.has(user.employeeId || user.id)) {
        valid.add(token);
      }
      continue;
    }
    const dbUser = byUser.get(user.id);
    if (
      byHash.get(hash) === user.id &&
      dbUser &&
      dbUser.role === user.role &&
      dbUser.role !== "Archivado" &&
      !dbUser.isForcePasswordChange
    ) {
      valid.add(token);
    }
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
          select: { id: true, role: true, isForcePasswordChange: true },
        })
      : [];
    const baByUser = new Map(baUsers.map((u) => [u.id, u]));
    for (const s of baSessions) {
      const dbUser = baByUser.get(s.userId);
      if (dbUser && dbUser.role !== "Archivado" && !dbUser.isForcePasswordChange) {
        valid.add(s.token);
      }
    }
  }
  return valid;
}
