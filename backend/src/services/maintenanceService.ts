import prisma from "./db";
import { subYears, subMonths } from "date-fns";
import { ulid } from "ulid";
import bcrypt from "bcryptjs";
import { Watchdog } from "../utils/Watchdog";
import { AgentLogger } from "../utils/agentLogger";
import { AuthService } from "./AuthService";

/** Snapshot returned by {@link MaintenanceService.checkSystemHealth}. */
type SystemHealthSummary = {
  status: string;
  uptime: number;
  timestamp: string;
};

export class MaintenanceService {
  /**
   * Removes audit logs older than a specific amount of years.
   * @param years Number of years to keep logs for.
   */
  async rotateAuditLogs(): Promise<void> {
    console.warn("--- Iniciando Rotación de Logs y Datos Operacionales (Política Escalonada) ---");
    try {
      const now = new Date();

      // 1. Control Horario (CTRL_HOURS) -> 5 años (Cumplimiento Legal)
      const dateCtrlHours = subYears(now, 5);
      const p1 = prisma.auditLog.deleteMany({
        where: {
          category: "CTRL_HOURS",
          timestamp: { lt: dateCtrlHours },
        },
      });

      // 2. Administración (OPERATIONS, CONFIG, USER_MGMT, AUTH) -> 3 meses (Operativo)
      const dateAdmin = subMonths(now, 3);
      const p2 = prisma.auditLog.deleteMany({
        where: {
          category: { in: ["OPERATIONS", "CONFIG", "USER_MGMT", "AUTH", "DATA", "SECURITY"] },
          timestamp: { lt: dateAdmin },
        },
      });

      // 3. Infraestructura (SYSTEM, API) -> 2 meses (Debugging)
      const dateInfra = subMonths(now, 2);
      const p3 = prisma.auditLog.deleteMany({
        where: {
          category: { in: ["SYSTEM", "API"] },
          timestamp: { lt: dateInfra },
        },
      });

      // 4. Reportes de turno cerrados (ShiftReport) -> 24 meses (Control de crecimiento)
      const dateOperational = subMonths(now, 24);
      const p4 = prisma.shiftReport.deleteMany({
        where: {
          date: { lt: dateOperational },
        },
      });

      // 5. Lecturas de medidores (MeterReading) -> 24 meses (Control de crecimiento)
      const p5 = prisma.meterReading.deleteMany({
        where: {
          timestamp: { lt: dateOperational },
        },
      });

      // Execute all cleanup tasks in parallel
      const [r1, r2, r3, r4, r5] = await Promise.all([p1, p2, p3, p4, p5]);

      console.warn(
        `✅ Depuración Finalizada:
         - Control Horario (>5 años): ${r1.count}
         - Administración (>3 meses): ${r2.count}
         - Infraestructura (>2 meses): ${r3.count}
         - ShiftReport (>24 meses): ${r4.count}
         - MeterReading (>24 meses): ${r5.count}`,
      );
    } catch (error) {
      console.error("❌ Error en rotación de logs:", error);
      throw error;
    }
  }

  /**
   * Refreshes the Materialized Views in PostgreSQL to update analytics data.
   */
  async refreshMaterializedViews(): Promise<void> {
    console.warn("--- Iniciando Actualización de Vistas Materializadas ---");
    try {
      await prisma.$executeRawUnsafe(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_employee_kpis",
      );
      console.warn("✅ Vistas Materializadas actualizadas con éxito.");
    } catch (error) {
      console.error("❌ Error al actualizar Vistas Materializadas:", error);
    }
  }

  /**
   * General system health check logic could go here
   */
  async checkSystemHealth(): Promise<SystemHealthSummary> {
    // Placeholder for future health check metrics
    return {
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Ensures the system has a unique database instance ID.
   */
  async ensureInstanceId(): Promise<void> {
    try {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: "db_instance_id" },
      });

      if (!existing) {
        const newId = ulid();
        await prisma.systemConfig.create({
          data: {
            key: "db_instance_id",
            value: JSON.stringify(newId),
          },
        });
        console.warn(`🆕 Nueva instancia de DB detectada. Generado InstanceID: ${newId}`);
      } else {
        console.warn(`🔗 Instancia de DB vinculada: ${JSON.parse(existing.value)}`);
      }
    } catch (error) {
      console.error("❌ Error al asegurar InstanceID de DB:", error);
    }
  }

  /**
   * Performs a full database cleanup (truncate) and resets administrative users.
   */
  async clearDatabase(options: {
    onProgress: (message: string) => void;
    currentUser?: { id: string; username: string };
  }): Promise<{ success: boolean; preservedUser?: string; invalidatedSessions?: number }> {
    const { onProgress, currentUser } = options;

    const watchdog = new Watchdog("DatabaseCleaner", 120000, () => {
      console.error("❌ [CLEANER] Watchdog abortó por inactividad durante limpieza.");
      throw new Error("PROCESS_TIMEOUT");
    });

    try {
      onProgress("🚨 Iniciando limpieza total y robustecida de la base de datos...");
      AgentLogger.log("Iniciando limpieza manual de base de datos", "DB");
      watchdog.start();

      // 1. Limpieza TOTAL con TRUNCATE (Instantánea y con Reclamo de Espacio en Disco)
      onProgress("🔥 Ejecutando TRUNCATE masivo en tablas (Recuperando espacio en disco)...");

      const tables = [
        "audit_logs",
        "time_records",
        "shift_reports",
        "correction_requests",
        "assigned_shifts",
        "meter_readings",
        "leave_records",
        "monthly_employee_stats",
        "quick_notes",
        "employees",
        "shift_patterns",
        "holidays",
        "system_configs",
        "scheduled_reports",
      ];

      const truncateQuery = `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`;
      await prisma.$executeRawUnsafe(truncateQuery);
      watchdog.heartbeat();

      // 2. Limpieza de Usuarios (Preservando al actual o admin)
      onProgress(
        `🔐 Limpiando usuarios secundarios (Preservando: ${currentUser?.username || "admin"})...`,
      );

      await prisma.user.deleteMany({
        where: {
          AND: [currentUser ? { id: { not: currentUser.id } } : {}, { username: { not: "admin" } }],
        },
      });

      // 3. Asegurar cuenta Admin
      onProgress("🛡️ Verificando integridad de cuenta maestra (admin)...");
      const adminUser = await prisma.user.findUnique({
        where: { username: "admin" },
      });

      if (!adminUser) {
        const defaultPassword = process.env.NODE_ENV === "production" ? "" : "999.666";
        const hashedPassword = bcrypt.hashSync(defaultPassword || "999.666", 10);
        await prisma.user.create({
          data: {
            username: "admin",
            passwordHash: hashedPassword,
            role: "Administrador",
          },
        });
        onProgress("✅ Cuenta 'admin' recreada con credenciales por defecto.");
      }

      console.warn(`✅ Base de datos limpiada. Preservado: ${currentUser?.username || "ninguno"}`);
      const invalidation = await AuthService.invalidateAllSessions({
        actorUsername: currentUser?.username || "SYSTEM",
        reason: "DATABASE_RESET",
        restartRecommended: true,
      });
      onProgress("✨ Sistema reseteado con éxito. Reiniciando...");

      watchdog.stop();
      return {
        success: true,
        preservedUser: currentUser?.username,
        invalidatedSessions: invalidation.deletedCount,
      };
    } catch (error: unknown) {
      watchdog.stop();
      console.error("Error al limpiar la base de datos:", error);
      throw error;
    }
  }
}

export const maintenanceService = new MaintenanceService();
