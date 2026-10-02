const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  const deletedUsers = users.filter((u) => u.isDeleted).length;

  const employees = await prisma.employee.findMany();
  const deletedEmployees = employees.filter((e) => e.isDeleted).length;

  const records = await prisma.timeRecord.findMany();
  const deletedRecords = records.filter((r) => r.isDeleted).length;

  console.log(`Users: total=${users.length}, deleted=${deletedUsers}`);
  console.log(`Employees: total=${employees.length}, deleted=${deletedEmployees}`);
  console.log(`TimeRecords: total=${records.length}, deleted=${deletedRecords}`);
  await prisma.$disconnect();
}

check();
