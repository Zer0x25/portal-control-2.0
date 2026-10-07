import prisma from "../../../src/services/db";

const TEST_DB_NAME = "pweb3_test";

const NON_TRUNCATED_TABLES = new Set<string>(["_prisma_migrations", "kpi_source_revision"]);

export async function assertConnectedToTestDb(): Promise<void> {
  const result = await prisma.$queryRawUnsafe<Array<{ db_name: string }>>(
    "SELECT current_database() AS db_name",
  );
  const dbName = result[0]?.db_name;

  if (dbName !== TEST_DB_NAME) {
    throw new Error(
      `[integration-guard] Refusing to run integration tests on database '${dbName}'. Expected '${TEST_DB_NAME}'.`,
    );
  }
}

export async function resetIntegrationDb(): Promise<void> {
  await assertConnectedToTestDb();

  const rows = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );

  const tables = rows
    .map((row) => row.tablename)
    .filter((tableName) => !NON_TRUNCATED_TABLES.has(tableName))
    .map((tableName) => `"public"."${tableName}"`);

  if (tables.length === 0) {
    return;
  }

  const truncateSql = `TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(truncateSql);
}
