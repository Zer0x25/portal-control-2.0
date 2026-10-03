const { prisma } = require("../prismaClient.cjs");

async function check() {
  const employees = await prisma.employee.count();
  const users = await prisma.user.count();
  const timeRecords = await prisma.timeRecord.count();
  console.log(`Employees: ${employees}, Users: ${users}, TimeRecords: ${timeRecords}`);
  await prisma.$disconnect();
}

check();
