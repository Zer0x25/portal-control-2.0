import { prisma } from "./prismaClient.cjs";
import fs from "fs";
import path from "path";

async function main() {
  const state = process.env.STATE || process.argv[2];
  if (!state) {
    console.error("❌ Error: Debes especificar un estado (ej: --state=JuanPerez_Base)");
    process.exit(1);
  }

  const snapshotPath = path.join(__dirname, "../prisma/snapshots", `${state}.json`);

  if (!fs.existsSync(snapshotPath)) {
    console.error(`❌ Error: El snapshot '${state}' no existe en ${snapshotPath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(snapshotPath, "utf-8");
    const snapshot = JSON.parse(content);

    console.warn(`🚀 Cargando snapshot: ${state}...`);

    // El orden de las tablas es importante para evitar errores de FK
    // Aquí asumimos que el JSON viene ordenado o manejamos las FKs

    // Limpieza preliminar (opcional, dependiendo de lo que queramos)
    // Para simplificar, procesamos cada entrada del snapshot
    for (const item of snapshot) {
      const { table, data } = item;
      console.warn(`📦 Procesando tabla: ${table} (${data.length} registros)`);

      // Upsert o Create masivo
      for (const record of data) {
        if (table === "Employee") {
          await (prisma.employee as any).upsert({
            where: { id: record.id },
            update: record,
            create: record,
          });
        } else if (table === "User") {
          await (prisma.user as any).upsert({
            where: { username: record.username },
            update: record,
            create: record,
          });
        } else if (table === "TimeRecord") {
          // Nota: TimeRecord no tiene un @unique natural fácil aparte del ID (UUID)
          // Para estados de prueba, a veces es mejor limpiar y re-crear
          await (prisma.timeRecord as any).create({ data: record });
        } else {
          // Intento genérico
          try {
            await (prisma[table as keyof typeof prisma] as any).create({ data: record });
          } catch (e) {
            console.warn(
              `⚠️ No se pudo procesar automáticamente la tabla ${table}. Requiere lógica específica.`,
            );
          }
        }
      }
    }

    console.warn(`✅ Snapshot '${state}' aplicado con éxito.`);
  } catch (error) {
    console.error("❌ Error al aplicar snapshot:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
