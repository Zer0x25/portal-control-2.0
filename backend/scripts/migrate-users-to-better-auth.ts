// backend/scripts/migrate-users-to-better-auth.ts
// Script idempotente de migración de usuarios a better-auth (Fase 7).
// Modo dry-run por defecto: no escribe. Con --apply crea filas Account
// (providerId=credential) para usuarios sin Account, sin re-hashear.

import prisma from "../src/services/db";

const isDryRun = !process.argv.includes("--apply");

async function main(): Promise<void> {
  if (isDryRun) {
    console.log("migrate-users-to-better-auth: dry-run (no DB writes, no connection required)");
    return;
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, passwordHash: true },
  });
  const accounts = await prisma.account.findMany({
    select: { userId: true },
  });
  const withAccount = new Set(accounts.map((a) => a.userId));
  const pending = users.filter((u) => !withAccount.has(u.id));

  console.log(
    `migrate-users-to-better-auth: ${users.length} users, ${pending.length} to migrate (${isDryRun ? "dry-run" : "apply"})`,
  );
  if (isDryRun) return;

  for (const user of pending) {
    const email = user.email ?? `${user.username}@portal.local`;
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: email,
        providerId: "credential",
        password: user.passwordHash,
      },
    });
  }
  console.log(`✅ Migrated ${pending.length} users to better-auth accounts`);
}

void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
