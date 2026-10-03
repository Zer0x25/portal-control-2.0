import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: el CLI (migrate/seed/validate) lee la conexion desde aqui en
// lugar del schema. Se usa DIRECT_URL porque las migraciones deben correr
// contra Postgres directo, nunca via PgBouncer en modo transaccion.
// El runtime (pool PgBouncer vs directo) lo decide src/services/db.ts con
// driver adapters, no este archivo.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 ya no lee package.json#prisma.seed: el seed se declara aqui.
    // El entrypoint de Docker (`prisma migrate deploy` + `prisma db seed`)
    // sigue funcionando sin cambios.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
