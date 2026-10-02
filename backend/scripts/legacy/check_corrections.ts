import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkCorrections() {
  try {
    const count = await prisma.correctionRequest.count();
    console.log(`Total Correction Requests: ${count}`);

    const some = await prisma.correctionRequest.findMany({ take: 5 });
    console.log("Sample requests:", JSON.stringify(some, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkCorrections();
