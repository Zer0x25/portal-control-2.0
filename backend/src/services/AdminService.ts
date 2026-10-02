import prisma from "./db";

export class AdminService {
  static async getSystemStats() {
    const [userCount, employeeCount, recordCount, logCount] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.timeRecord.count(),
      prisma.auditLog.count(),
    ]);

    // MFA stats
    const mfaUsers = await prisma.user.count({ where: { mfaEnabled: true } });

    // Today's records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = await prisma.timeRecord.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // Critical logs (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const criticalLogs = await prisma.auditLog.count({
      where: {
        severity: "CRITICAL",
        timestamp: { gte: twentyFourHoursAgo },
      },
    });

    // Active employees (last 24h)
    const activeRecords = await prisma.timeRecord.groupBy({
      by: ["employeeId"],
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

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
