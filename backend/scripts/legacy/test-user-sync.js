const { prisma } = require("../prismaClient.cjs");
const { z } = require("zod");

const SyncableSchema = z.object({
  lastModified: z.number(),
  syncStatus: z.enum(["synced", "pending", "error"]),
  isDeleted: z.boolean(),
  syncError: z.string().optional(),
});

const UserSchema = SyncableSchema.extend({
  id: z.string(),
  username: z.string(),
  password: z.string().nullable().optional(),
  role: z.enum([
    "Usuario",
    "Reloj_Control",
    "Supervisor",
    "Administrador",
    "Supervisor_Elevado",
    "Fiscalizador",
    "Archivado",
  ]),
  employeeId: z.string().nullable().optional(),
  mustChangePassword: z.boolean().nullable().optional(),
});


async function check() {
  const users = await prisma.user.findMany();
  let errors = 0;

  // Map just like the API would
  const items = users.map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword,
  }));

  // Exactly what idbPutBulk does for < 200 items
  items.forEach((item) => {
    if (item.lastModified === undefined) item.lastModified = Date.now();
    if (item.syncStatus === undefined) item.syncStatus = "synced";
    if (item.isDeleted === undefined) item.isDeleted = false;
  });

  for (let i = 0; i < items.length; i++) {
    try {
      UserSchema.parse(items[i]);
    } catch (e) {
      if (errors <= 5) {
        console.log(`Validation failed for user ${i}:`, items[i]);
        console.log("Error:", JSON.stringify(e.issues, null, 2));
      }
      errors++;
    }
  }

  console.log(`Total users: ${users.length}, Errors: ${errors}`);
  await prisma.$disconnect();
}

check();
