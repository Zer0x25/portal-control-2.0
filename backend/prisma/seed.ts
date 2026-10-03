import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import process from "process";

// Seed explicito (Prisma 7 ya no auto-ejecuta seed en migrate). Misma
// conexion que el datasource v6 (DATABASE_URL, via PgBouncer para
// statements simples; el seed no usa transacciones interactivas).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const isProd = process.env.NODE_ENV === "production";

  // 1. Create Admin (non-destructive: don't reset password if it already exists)
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  let admin = existingAdmin;
  if (!admin) {
    const envPassword = (process.env.SEED_ADMIN_PASSWORD || "").trim();
    const adminPassword = envPassword || (isProd ? "" : "999.666");

    if (!adminPassword) {
      throw new Error(
        "SEED_ADMIN_PASSWORD debe estar configurado en producción para crear el usuario admin",
      );
    }

    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: hashedPassword,
        role: "Administrador",
      },
    });
  }

  // Staging runs NODE_ENV=production but still needs the e2e worker to
  // run the suite against a prod build. Opt-in only via SEED_E2E_USERS=1
  // (compose.staging.yaml); never on real prod. Idempotent + non-destructive.
  const seedE2eUsers = (process.env.SEED_E2E_USERS || "").trim() === "1";
  if (isProd && !seedE2eUsers) {
    console.log("Production mode: seeded admin user only.");
    console.log({ adminUsername: admin.username, adminRole: admin.role });
    return;
  }

  // 2. Create a test employee
  const testEmployeeId = "EMP001";
  const employee = await prisma.employee.upsert({
    where: { id: testEmployeeId },
    update: {},
    create: {
      id: testEmployeeId,
      name: "Juan Perez",
      rut: "12.345.678-9",
      position: "Operador",
      area: "Producción",
      workdayType: "Ordinaria",
      pin: "1234",
    },
  });

  // 3. Create a test user linked to that employee (non-destructive)
  const existingTestUser = await prisma.user.findUnique({
    where: { username: "juan.perez" },
  });

  const workerPassword = (process.env.E2E_WORKER_PASSWORD || "").trim() || "123456";
  const userRolePassword = bcrypt.hashSync(workerPassword, 10);
  const testUser = existingTestUser
    ? await prisma.user.update({
        where: { username: "juan.perez" },
        data: { employeeId: employee.id },
      })
    : await prisma.user.create({
        data: {
          username: "juan.perez",
          passwordHash: userRolePassword,
          role: "Usuario",
          employeeId: employee.id,
        },
      });

  console.log({
    adminUsername: admin.username,
    testUsername: testUser.username,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
