import crypto from "node:crypto";
import prisma from "./db";
import { createAuthenticate, verifyAccessToken } from "../modules/auth";

export const authenticateAccessToken = createAuthenticate({
  verify(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Error interno de configuración de seguridad");
    return verifyAccessToken(token, secret);
  },
  hash: (token) => crypto.createHash("sha256").update(token).digest("hex"),
  now: () => new Date(),
  sessions: {
    find: (tokenHash) => prisma.activeSession.findUnique({ where: { tokenHash } }),
    remove: (id) => prisma.activeSession.delete({ where: { id } }),
    touch: (id, lastActive) => prisma.activeSession.update({ where: { id }, data: { lastActive } }),
  },
  users: {
    find: (id) =>
      prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, role: true, employeeId: true },
      }),
  },
});
