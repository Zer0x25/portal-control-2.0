import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function forceUpdate() {
  console.log("Borrando usuarios anteriores...");
  await prisma.user.deleteMany({});

  const adminPassword = "999.666";
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  console.log("Creando nuevo usuario admin...");
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: hashedPassword,
      role: "Administrador",
    },
  });

  console.log("✅ Usuario admin creado exitosamente:", admin.username);

  // Verificación final
  const verification = await prisma.user.findFirst();
  console.log("Usuario actual en DB:", verification?.username);
}

forceUpdate()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
