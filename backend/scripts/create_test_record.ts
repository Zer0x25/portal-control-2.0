import { prisma } from "./prismaClient.cjs";

async function createTestRecord() {
  console.log("Creando registro de prueba > 14h...");
  const now = new Date();
  const fifteenHoursAgo = new Date(now.getTime() - 15 * 60 * 60 * 1000);
  const fifteenHoursAgoStr = fifteenHoursAgo.toISOString();
  const dateStr = fifteenHoursAgoStr.split("T")[0];

  const record = await prisma.timeRecord.create({
    data: {
      employeeId: "TEST_EMP_01",
      employeeName: "Empleado de Prueba",
      date: dateStr,
      entrada: fifteenHoursAgoStr,
      status: "Laborando", // This status was failing before the fix!
      source: "TEST",
    },
  });

  console.log(`Registro creado: ${record.id} con entrada en ${record.entrada}`);
}

createTestRecord()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
