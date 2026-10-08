import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");
const FRONTEND_DIR = path.join(PROJECT_ROOT, "frontend");

const SWAGGER_PATH = path.join(BACKEND_DIR, "docs/swagger.json");
const SDK_PATH = path.join(FRONTEND_DIR, "src/types/api-schema.ts");

function getFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf-8");
  // Normalize line endings to LF before hashing to ensure cross-OS consistency
  const normalizedContent = content.replace(/\r\n/g, "\n");
  return crypto.createHash("md5").update(normalizedContent).digest("hex");
}

function runCommand(command: string, cwd: string) {
  try {
    const backendBin = path.join(BACKEND_DIR, "node_modules/.bin");
    const env = {
      ...process.env,
      PATH: `${backendBin}${path.delimiter}${process.env.PATH || ""}`,
    };
    execSync(command, { cwd, env, stdio: "inherit" });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

async function verifySync() {
  console.log("🔍 Verifying SDK Synchronization...");

  // 1. Snapshot current hashes
  const initialSwaggerHash = getFileHash(SWAGGER_PATH);
  const initialSdkHash = getFileHash(SDK_PATH);

  // 2. Regenerate Swagger
  console.log("📦 Regenerating Swagger Spec...");
  runCommand("npm run docs:generate", BACKEND_DIR);

  const newSwaggerHash = getFileHash(SWAGGER_PATH);
  if (initialSwaggerHash !== newSwaggerHash) {
    console.error("❌ Swagger Spec was out of sync! (Changes detected after regeneration)");
    console.error("👉 Please verify and commit the updated swagger.json");
    process.exit(1);
  }

  // 3. Regenerate SDK
  console.log("⚛️  Regenerating Frontend SDK...");
  runCommand("npm run sdk:generate", FRONTEND_DIR);

  const newSdkHash = getFileHash(SDK_PATH);
  if (initialSdkHash !== newSdkHash) {
    console.error("❌ Frontend SDK was out of sync! (Changes detected after regeneration)");
    console.error("👉 Please verify and commit the updated api-schema.ts");
    process.exit(1);
  }

  console.log("✅ SDK is fully synchronized.");
}

verifySync().catch(console.error);
