import { prisma } from "../prismaClient.cjs";

async function checkSync() {
  console.log("--- ESTADO DE LA BASE DE DATOS CENTRAL ---");

  const employeeCount = await prisma.employee.count();
  const recordCount = await prisma.timeRecord.count();

  console.log(`Empleados Sincronizados: ${employeeCount}`);
  console.log(`Marcajes de Asistencia: ${recordCount}`);

  if (employeeCount > 0) {
    const lastEmployees = await prisma.employee.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    console.log("\nÚltimos 5 empleados subidos:");
    lastEmployees.forEach((e) => console.log(`- ${e.name} (RUT: ${e.rut})`));
  }

  if (recordCount > 0) {
    const lastRecords = await prisma.timeRecord.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    console.log("\nÚltimos 5 marcajes subidos:");
    lastRecords.forEach((r) =>
      console.log(
        `- ${r.employeeName} | Fecha: ${r.date.toISOString().split("T")[0]} | Status: ${r.status}`,
      ),
    );
  }

  console.log("------------------------------------------");
}

checkSync().then(() => prisma.$disconnect());
