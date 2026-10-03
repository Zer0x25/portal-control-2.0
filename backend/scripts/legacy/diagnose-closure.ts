import { prisma } from "../prismaClient.cjs";

async function main() {
  console.log("--- System Config (Accounting Lock Date) ---");
  const lockDate = await prisma.systemConfig.findUnique({
    where: { key: "accounting_lock_date" },
  });
  console.log("Lock Date Config:", lockDate);

  console.log("\n--- Recent Time Records (last 10) ---");
  const recentRecords = await prisma.timeRecord.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  recentRecords.forEach((r) => {
    console.log(
      `ID: ${r.id}, Date: ${r.date}, Status: ${r.status}, Entrada: ${r.entrada}, Salida: ${r.salida}, Updated: ${r.updatedAt}`,
    );
  });

  console.log("\n--- Records with future dates? ---");
  const today = new Date().toISOString().split("T")[0];
  const futureRecords = await prisma.timeRecord.findMany({
    where: {
      date: { gt: today },
    },
  });
  console.log("Future Records found:", futureRecords.length);
  futureRecords.forEach((r) => {
    console.log(`ID: ${r.id}, Date: ${r.date}, Employee: ${r.employeeName}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
