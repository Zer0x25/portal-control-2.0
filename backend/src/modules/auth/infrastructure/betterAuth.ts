// backend/src/modules/auth/infrastructure/betterAuth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, twoFactor } from "better-auth/plugins";
import bcryptjs from "bcryptjs";
import type { PrismaClient } from "../../../generated/prisma/client";
import { getAllowedOrigins } from "../../../utils/corsPolicy";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`CRITICAL: ${name} is not set`);
  return value;
}

export function createAuth(prisma: PrismaClient) {
  const trustedOrigins = getAllowedOrigins().filter((origin) => origin !== "*");

  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    baseURL: requireEnv("BETTER_AUTH_URL"),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      password: {
        hash: (pw: string) => bcryptjs.hash(pw, 10),
        verify: ({ password, hash }: { password: string; hash: string }) =>
          bcryptjs.compare(password, hash),
      },
    },
    session: {
      expiresIn: 60 * 60 * 24,
      updateAge: 60,
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "Usuario" },
        username: { type: "string", input: true },
      },
    },
    plugins: [bearer(), twoFactor({ issuer: "Portal Control" })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
