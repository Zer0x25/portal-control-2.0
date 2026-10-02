import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FOURTEEN_HOURS_MS = 14 * 60 * 60 * 1000;

async function diagnose() {
  console.log("--- DIAGNÓSTICO DE CIERRE AUTOMÁTICO ---");
  const now = new Date();
  const nowMs = now.getTime();

  const allOpenRecords = await prisma.timeRecord.findMany({
    where: {
      salida: null,
      entrada: { not: null },
      status: { notIn: ["Completado", "CierreAutomatico", "Ausente"] },
    },
  });

  console.log(`Encontrados ${allOpenRecords.length} registros sin salida.`);

  for (const record of allOpenRecords) {
    if (!record.entrada) continue;
    const entradaTime = new Date(record.entrada).getTime();
    const elapsed = nowMs - entradaTime;
    const hours = elapsed / 3600000;

    console.log(
      `- ID: ${record.id}, Empleado: ${record.employeeName}, Status: ${record.status}, Horas Transcurridas: ${hours.toFixed(2)}h`,
    );

    if (hours > 14) {
      console.log(`  [!] ESTE REGISTRO DEBERÍA HABER SIDO CERRADO.`);
    }
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
