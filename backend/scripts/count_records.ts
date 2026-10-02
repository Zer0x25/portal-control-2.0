import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function count() {
  const employees = await prisma.employee.count();
  const records = await prisma.timeRecord.count();
  const logs = await prisma.auditLog.count();
  const users = await prisma.user.count();

  console.log("--- Database Stats ---");
  console.log("Employees:", employees);
  console.log("Time Records:", records);
  console.log("Audit Logs:", logs);
  console.log("Users:", users);
}

count().finally(() => prisma.$disconnect());
