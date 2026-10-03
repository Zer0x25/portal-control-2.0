import { prisma } from "../prismaClient.cjs";

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 10,
  });
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
