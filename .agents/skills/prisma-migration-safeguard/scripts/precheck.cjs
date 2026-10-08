#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../../../../");
const backendDir = path.join(rootDir, "backend");

console.log("🛡️  Running Prisma Migration & Database Precheck...\n");

// 1. Verify prisma.config.ts datasource
const prismaConfigPath = path.join(backendDir, "prisma.config.ts");
if (!fs.existsSync(prismaConfigPath)) {
  console.error("❌ backend/prisma.config.ts not found. Prisma 7 CLI configuration required.");
  process.exit(1);
}
const configContent = fs.readFileSync(prismaConfigPath, "utf-8");
if (!configContent.includes('env("DIRECT_URL")')) {
  console.error("❌ backend/prisma.config.ts must enforce datasource.url = env(\"DIRECT_URL\").");
  process.exit(1);
}
console.log("✅ backend/prisma.config.ts correctly binds CLI to DIRECT_URL.");

// 2. Validate Prisma Schema syntax
try {
  console.log("⏳ Validating backend/prisma/schema.prisma syntax...");
  execSync("npx prisma validate", { cwd: backendDir, stdio: "inherit" });
  console.log("✅ Prisma schema syntax is valid.");
} catch {
  console.error("❌ Prisma schema validation failed.");
  process.exit(1);
}

// 3. Verify no forbidden imports from @prisma/client in backend/src/
try {
  const grepResult = execSync('git grep -n "@prisma/client" backend/src/ || true', {
    cwd: rootDir,
    encoding: "utf-8",
  }).trim();

  if (grepResult) {
    console.error("❌ Forbidden direct imports from '@prisma/client' detected in backend/src/:");
    console.error(grepResult);
    console.error("👉 Use 'backend/src/generated/prisma/client' (Prisma 7 ADR-0015).");
    process.exit(1);
  }
  console.log("✅ Zero direct imports from '@prisma/client' in production code.");
} catch (err) {
  console.error("❌ Failed to verify Prisma imports:", err.message);
  process.exit(1);
}

console.log("\n✅ Database and Prisma precheck passed! Ready for migration workflow.\n");
