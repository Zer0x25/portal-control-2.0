import prisma, { withDirectTransaction } from "./db";
import { subYears, subMonths } from "date-fns";
import { ulid } from "ulid";
import { AuthService } from "./AuthService";
import { ForbiddenError, ConflictError } from "../utils/AppError";

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
    if (!currentUser?.id) throw new ForbiddenError("Se requiere un administrador existente");
    onProgress("Iniciando reset transaccional; se conservan administradores y credenciales.");
    const result = await withDirectTransaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('statement_timeout', '110s', true)`;
        await tx.$executeRaw`SELECT set_config('lock_timeout', '10s', true)`;
        await tx.$executeRaw`SELECT set_config('audit.skip_trigger', 'true', true)`;
        const locked = await tx.$queryRaw<
          { id: string; username: string; role: string }[]
        >`SELECT id, username, role FROM users WHERE id = ${currentUser.id} FOR UPDATE`;
        const actor = locked[0];
        if (!actor || actor.role !== "Administrador")
          throw new ForbiddenError("Se requiere un administrador existente");
        const running = await tx.seedingJob.count({ where: { status: "running" } });
        if (running) throw new ConflictError("Detén los jobs activos antes del reset");
        const preserved = await tx.user.findMany({
          where: { OR: [{ id: actor.id }, { username: "admin", role: "Administrador" }] },
          select: { id: true },
        });
        const ids = preserved.map((user) => user.id);
        const invalidation = await tx.activeSession.deleteMany({});
        await tx.user.updateMany({ where: { id: { in: ids } }, data: { employeeId: null } });
        await tx.user.deleteMany({ where: { id: { notIn: ids } } });
        // Explicit RESTRICT fails closed if an unforeseen FK is introduced. Never CASCADE users.
        await tx.$executeRaw`TRUNCATE TABLE audit_logs, time_records, shift_reports, correction_requests, assigned_shifts, meter_readings, leave_records, monthly_employee_stats, quick_notes, shift_patterns, holidays, scheduled_reports, seeding_job_logs, seeding_jobs RESTART IDENTITY RESTRICT`;
        await tx.employee.deleteMany({});
        await tx.systemConfig.deleteMany({ where: { key: { not: "db_instance_id" } } });
        return { preservedUser: actor.username, invalidatedSessions: invalidation.count };
      },
      { timeout: 125000, maxWait: 10000 },
    );
    await AuthService.notifySessionInvalidation(
      { actorUsername: result.preservedUser, reason: "DATABASE_RESET", restartRecommended: true },
      result.invalidatedSessions,
    );
    onProgress("Reset confirmado; sesiones invalidadas. Reiniciando...");
    return { success: true, ...result };
  }
}

export const maintenanceService = new MaintenanceService();
