import { prisma } from "../prismaClient.cjs";
import bcrypt from "bcryptjs";

async function check() {
  const user = await prisma.user.findUnique({ where: { username: "admin" } });
  if (user) {
    console.log("User found:", user.username);
    const match = bcrypt.compareSync("1", user.passwordHash);
    console.log('Password "1" match:', match);
  } else {
    console.log("User admin not found");
  }
}

check().then(() => prisma.$disconnect());
