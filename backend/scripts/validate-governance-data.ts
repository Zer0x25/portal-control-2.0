/**
 * MANUAL DATA VALIDATION SCRIPT
 *
 * Este script valida que los datos mostrados en el Governance Hub sean correctos.
 * Compara los valores de la base de datos con lo que debería mostrarse en la UI.
 *
 * Uso: npx ts-node scripts/validate-governance-data.ts
 */

import { prisma } from "./prismaClient.cjs";

async function validateIntegrityData() {
  console.log("\n🔍 VALIDANDO INTEGRITY TAB...\n");

  const totalAuditLogs = await prisma.auditLog.count();

  console.log("📊 Métricas de Integridad:");
  console.log(`  • Total Audit Logs en BD: ${totalAuditLogs.toLocaleString()}`);
  console.log(`  • Estos logs deberían aparecer como "Registros Verificados" en la UI`);

  // Check for broken records
  const criticalLogs = await prisma.auditLog.count({
    where: { severity: "CRITICAL" },
  });

  console.log(`  • Logs Críticos: ${criticalLogs}`);

  return { totalAuditLogs, criticalLogs };
}

async function validateSecurityData() {
  console.log("\n🔍 VALIDANDO SECURITY TAB...\n");

  const totalUsers = await prisma.user.count();
  const mfaUsers = await prisma.user.count({
    where: { mfaEnabled: true },
  });

  const mfaPercent = ((mfaUsers / totalUsers) * 100).toFixed(1);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const criticalAlerts = await prisma.auditLog.count({
    where: {
      severity: "CRITICAL",
      timestamp: { gte: twentyFourHoursAgo },
    },
  });

  console.log("📊 Métricas de Seguridad:");
  console.log(`  • Total Usuarios: ${totalUsers}`);
  console.log(`  • Usuarios con MFA: ${mfaUsers}`);
  console.log(`  • Adopción MFA: ${mfaPercent}%`);
  console.log(`  • Alertas Críticas (últimas 24h): ${criticalAlerts}`);

  return { totalUsers, mfaUsers, mfaPercent, criticalAlerts };
}

async function validateSystemData() {
  console.log("\n🔍 VALIDANDO SYSTEM TAB...\n");

  const totalUsers = await prisma.user.count();
  const totalEmployees = await prisma.employee.count();
  const totalTimeRecords = await prisma.timeRecord.count();
  const totalAuditLogs = await prisma.auditLog.count();
  const activeSessions = await prisma.activeSession.count();

  console.log("📊 Estadísticas del Sistema:");
  console.log(`  • Usuarios: ${totalUsers}`);
  console.log(`  • Empleados: ${totalEmployees}`);
  console.log(`  • Registros de Tiempo: ${totalTimeRecords.toLocaleString()}`);
  console.log(`  • Logs de Auditoría: ${totalAuditLogs.toLocaleString()}`);
  console.log(`  • Sesiones Activas: ${activeSessions}`);

  return { totalUsers, totalEmployees, totalTimeRecords, totalAuditLogs, activeSessions };
}

async function validateAuditData() {
  console.log("\n🔍 VALIDANDO AUDIT TAB...\n");

  // Get recent logs
  const recentLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { timestamp: "desc" },
  });

  console.log("📊 Logs de Auditoría Recientes:");
  console.log(`  • Total logs a mostrar: ${recentLogs.length}`);

  if (recentLogs.length > 0) {
    console.log(`\n  Primeros 3 logs (verifica que aparezcan en la UI):`);
    recentLogs.slice(0, 3).forEach((log, idx) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      console.log(`    ${idx + 1}. [${time}] ${log.actorUsername} - ${log.action}`);
    });
  }

  return { totalDisplayed: recentLogs.length };
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   GOVERNANCE HUB - VALIDACIÓN DE DATOS                ║");
  console.log("╚═══════════════════════════════════════════════════════╝");

  try {
    const integrity = await validateIntegrityData();
    const security = await validateSecurityData();
    const system = await validateSystemData();
    const audit = await validateAuditData();

    console.log("\n" + "=".repeat(80));
    console.log("\n📋 RESUMEN DE DATOS ESPERADOS EN LA UI\n");

    console.log("🔐 INTEGRITY TAB:");
    console.log(`   → Registros Verificados: ${integrity.totalAuditLogs.toLocaleString()}`);
    console.log(`   → Logs Críticos: ${integrity.criticalLogs}`);

    console.log("\n🛡️  SECURITY TAB:");
    console.log(`   → Adopción MFA: ${security.mfaPercent}%`);
    console.log(`   → MFA Users: ${security.mfaUsers} de ${security.totalUsers}`);
    console.log(`   → Alertas Críticas: ${security.criticalAlerts}`);

    console.log("\n⚙️  SYSTEM TAB:");
    console.log(`   → Usuarios: ${system.totalUsers}`);
    console.log(`   → Empleados: ${system.totalEmployees}`);
    console.log(`   → Registros Tiempo: ${system.totalTimeRecords.toLocaleString()}`);
    console.log(`   → Logs Auditoría: ${system.totalAuditLogs.toLocaleString()}`);
    console.log(`   → Sesiones Activas: ${system.activeSessions}`);

    console.log("\n📜 AUDIT TAB:");
    console.log(`   → Logs a mostrar: ${audit.totalDisplayed}`);

    console.log("\n" + "=".repeat(80));
    console.log("\n💡 PRÓXIMOS PASOS:");
    console.log("  1. Abre http://localhost:5173/#/admin/governance en tu navegador");
    console.log("  2. Compara cada número mostrado con los valores arriba");
    console.log("  3. Si algún número NO coincide, reporta cuál es y cuánto difiere\n");
  } catch (error) {
    console.error("\n❌ Error durante la validación:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
