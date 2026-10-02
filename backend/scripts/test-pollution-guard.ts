import fs from "node:fs";
import path from "node:path";
import prisma from "../src/services/db";

const TABLES = [
  "employees",
  "users",
  "time_records",
  "assigned_shifts",
  "shift_patterns",
  "leave_records",
  "audit_logs",
  "monthly_employee_stats",
  "correction_requests",
] as const;

const SNAPSHOT_PATH = path.resolve(process.cwd(), ".test-pollution-snapshot.json");
const TEST_DB_NAME = "pweb3_test";

type Snapshot = Record<string, number>;

const getMode = (): "pre" | "post" => {
  const mode = process.argv[2];
  if (mode !== "pre" && mode !== "post") {
    throw new Error("Usage: npx tsx scripts/test-pollution-guard.ts <pre|post>");
  }
  return mode;
};

async function getSnapshot(): Promise<Snapshot> {
  const dbResult = await prisma.$queryRawUnsafe<Array<{ db_name: string }>>(
    "SELECT current_database() AS db_name",
  );
  const dbName = dbResult[0]?.db_name;
  if (dbName !== TEST_DB_NAME) {
    throw new Error(
      `[test-pollution-guard] Refusing to run on database '${dbName}'. Expected '${TEST_DB_NAME}'.`,
    );
  }

  const entries = await Promise.all(
    TABLES.map(async (tableName) => {
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "public"."${tableName}"`,
      );
      return [tableName, Number(result[0]?.count ?? 0)] as const;
    }),
  );

  return Object.fromEntries(entries);
}

async function preCheck(): Promise<void> {
  const snapshot = await getSnapshot();
  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`[test-pollution-guard] Pre-test snapshot written: ${SNAPSHOT_PATH}`);
}

async function postCheck(): Promise<void> {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.warn(
      `[test-pollution-guard] Snapshot file not found (${SNAPSHOT_PATH}). Skipping post-check.`,
    );
    return;
  }

  const before = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as Snapshot;
  const after = await getSnapshot();

  const deltas = TABLES.map((tableName) => ({
    tableName,
    before: before[tableName] ?? 0,
    after: after[tableName] ?? 0,
  })).filter((entry) => entry.before !== entry.after);

  if (deltas.length > 0) {
    const diff = deltas
      .map((entry) => `${entry.tableName}: before=${entry.before}, after=${entry.after}`)
      .join("\n");
    throw new Error(`[test-pollution-guard] Residual rows detected:\n${diff}`);
  }

  fs.rmSync(SNAPSHOT_PATH, { force: true });
  console.log("[test-pollution-guard] No pollution detected.");
}

async function main(): Promise<void> {
  const mode = getMode();
  if (mode === "pre") {
    await preCheck();
  } else {
    await postCheck();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
