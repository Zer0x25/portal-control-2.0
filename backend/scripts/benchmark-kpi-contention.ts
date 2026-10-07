import { performance } from "node:perf_hooks";
import { prismaDirect, withDirectTransaction, closeDatabase } from "../src/services/db";
import { KpiCache } from "../src/services/kpi/KpiCache";
import { assertConnectedToTestDb } from "../tests/integration/_support/testDb";

async function main() {
  await assertConnectedToTestDb();
  const singletonBaseline = process.argv.includes("--singleton-baseline");
  if (singletonBaseline) {
    await prismaDirect.$executeRaw`CREATE OR REPLACE FUNCTION advance_kpi_source_revision() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      UPDATE kpi_source_revision SET revision = revision + 1 WHERE id = 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'Missing KPI source revision singleton'; END IF;
      RETURN NULL;
    END; $$`;
  }
  const count = 32;
  await prismaDirect.employee.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      id: `contention-${i}`,
      name: `Fixture ${i}`,
      rut: `fixture-${i}`,
      position: "Fixture",
      area: "Fixture",
      workdayType: "Full-Time",
    })),
  });
  await prismaDirect.systemConfig.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      key: `contention-${i}`,
      value: "0",
    })),
  });
  const results = [];
  for (let round = 1; round <= 3; round++) {
    for (const holdMs of [0, 25]) {
      for (const concurrency of [1, 8]) {
        for (const source of [false, true]) {
          const revisionBefore = BigInt(await new KpiCache().getSourceRevision());
          let cursor = 0;
          const latencies: number[] = [];
          const started = performance.now();
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              while (cursor < count) {
                const index = cursor++;
                const before = performance.now();
                await withDirectTransaction(
                  async (tx) => {
                    if (source)
                      await tx.employee.update({
                        where: { id: `contention-${index}` },
                        data: { area: `run-${holdMs}-${concurrency}` },
                      });
                    else
                      await tx.systemConfig.update({
                        where: { key: `contention-${index}` },
                        data: { value: `run-${holdMs}-${concurrency}` },
                      });
                    if (holdMs) await tx.$executeRaw`SELECT pg_sleep(${holdMs / 1000})`;
                  },
                  { timeout: 10000 },
                );
                latencies.push(performance.now() - before);
              }
            }),
          );
          const elapsedMs = performance.now() - started;
          const revisionAfter = BigInt(await new KpiCache().getSourceRevision());
          const delta = Number(revisionAfter - revisionBefore);
          if (delta !== (source ? count : 0)) throw new Error("Unexpected source revision delta");
          latencies.sort((a, b) => a - b);
          results.push({
            round,
            source,
            concurrency,
            holdMs,
            count,
            revisionDelta: delta,
            elapsedMs: Math.round(elapsedMs),
            writesPerSecond: Math.round((count * 1000) / elapsedMs),
            p50Ms: Math.round(latencies[Math.floor(count * 0.5)]),
            p95Ms: Math.round(latencies[Math.floor(count * 0.95)]),
          });
        }
      }
    }
  }
  process.stdout.write(
    JSON.stringify({ postgres: "18.4", singletonBaseline, results }, null, 2) + "\n",
  );
}
main()
  .catch((error) => {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  })
  .finally(closeDatabase);
