import { PrismaClient } from "@prisma/client";
import { KpiService } from "../src/services/kpiService";

const prisma = new PrismaClient();
const kpiService = new KpiService();
const kpiCache = new KpiCache();

async function main() {
  const employeeId = process.argv[2];
  const monthStr = process.argv[3]; // YYYY-MM

  if (!employeeId || !monthStr) {
    console.error("Usage: ts-node scripts/verify_kpi_sync.ts <employeeId> <YYYY-MM>");
    process.exit(1);
  }

  console.log(`🔍 Verifying KPI Sync for ${employeeId} on ${monthStr}...`);

  try {
    const [year, month] = monthStr.split("-").map(Number);

    // 1. Calculate using Engine (Live/Cached calculation)
    // Note: this retrieves the CACHED version if it exists, or null.
    // If we want to verify Live vs View, we should probably force calculation or check if kpiService exposes it.
    // Actually, KpiService.calculatePeriodStats is private.
    // But we can check what KpiCache has returning for this month.
    console.log("1️⃣  Verificando Cache/Engine...");
    const engineStats = await kpiCache.getMonthlyStats(employeeId, year, month);

    if (!engineStats) {
      console.log("   ⚠️ No hay datos cacheados para este mes en la tabla MonthlyEmployeeStats.");
      console.log(
        "      Esto es normal si el mes está Aigerto (Open) o no se ha visitado el dashboard.",
      );
    }

    // 2. Fetch from Materialized View directly
    console.log("2️⃣  Obteniendo datos de la Vista Materializada...");
    const viewStats: any[] = await prisma.$queryRaw`
      SELECT * FROM monthly_employee_kpis 
      WHERE employee_id = ${employeeId} AND month = ${monthStr}
    `;
    const viewStat = viewStats[0];

    // 3. Compare
    console.log("\n📊 Comparativa:");
    console.log("Metric".padEnd(25) + "Engine".padEnd(15) + "View".padEnd(15) + "Diff");
    console.log("-".repeat(60));

    compare("Worked Hours", engineStats?.totalWorkedHours, viewStat?.total_worked_hours);
    compare("Overtime", engineStats?.totalOvertime, viewStat?.total_overtime);
    compare("Scheduled", engineStats?.totalScheduled, viewStat?.total_scheduled);
    compare("Absences", engineStats?.absenceCount, viewStat?.absence_count);

    console.log("\n✅ Verificación completada.");
  } catch (error) {
    console.error("❌ Error verificando KPIs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

function compare(label: string, val1: any, val2: any) {
  const v1 = Number(val1 || 0).toFixed(2);
  const v2 = Number(val2 || 0).toFixed(2);
  const match = v1 === v2;
  const icon = match ? "✅" : "⚠️";
  console.log(`${label.padEnd(25)} ${v1.padEnd(15)} ${v2.padEnd(15)} ${icon}`);
}

main();
