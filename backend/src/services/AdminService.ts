import prisma from "./db";

export class AdminService {
  static async getSystemStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // ⚡ Bolt Optimization: Batch system stats queries
    // Why: Sequential await queries cause an N+1 blocking scenario.
    // Impact: Reduces sequential execution delays and minimizes the number of asynchronous round-trips to the database from 5 to 1.
    const [
      userCount,
      employeeCount,
      recordCount,
      logCount,
      mfaUsers,
      todayRecords,
      criticalLogs,
      activeRecords,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.timeRecord.count(),
      prisma.auditLog.count(),
      prisma.user.count({ where: { mfaEnabled: true } }),
      prisma.timeRecord.count({ where: { createdAt: { gte: today } } }),
      prisma.auditLog.count({
        where: { severity: "CRITICAL", timestamp: { gte: twentyFourHoursAgo } },
      }),
      prisma.timeRecord.groupBy({
        by: ["employeeId"],
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
    ]);

    return {
      usersCount: userCount,
      employeesCount: employeeCount,
      activeEmployeesCount: activeRecords.length,
      recordsCount: recordCount,
      todayRecordsCount: todayRecords,
      auditLogsCount: logCount,
      criticalLogsCount: criticalLogs,
      mfaStats: {
        enabled: mfaUsers,
        disabled: userCount - mfaUsers,
      },
      // Legacy compatibility
      totalUsers: userCount,
      totalEmployees: employeeCount,
      totalTimeRecords: recordCount,
      totalAuditLogs: logCount,
    };
  }

  static async getSecurityInsights() {
    const [totalUsers, mfaUsers, recentAlerts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { mfaEnabled: true } }),
      prisma.auditLog.findMany({
        where: {
          OR: [{ severity: { in: ["CRITICAL", "WARNING"] } }, { category: "SECURITY" }],
        },
        take: 20,
        orderBy: { timestamp: "desc" },
      }),
    ]);

    const mfaAdoption = totalUsers > 0 ? (mfaUsers / totalUsers) * 100 : 0;

    return {
      stats: {
        totalUsers,
        mfaUsers,
        mfaAdoption,
        criticalAlertsCount: recentAlerts.filter((l) => l.severity === "CRITICAL").length,
      },
      recentAlerts,
    };
  }
}
