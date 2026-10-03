// Cliente Prisma compartido para scripts standalone (dev/debug/seed utils).
// Prisma 7 exige driver adapter: se construye una sola vez aqui para no
// repetir el boilerplate en cada script. Usa DATABASE_URL igual que el
// datasource por defecto del schema v6 (runtime via PgBouncer).
// CJS a proposito: lo consumen scripts .ts (via tsx) y .js legacy (via node).
const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

const prisma = new PrismaClient({ adapter });

module.exports = { prisma };
