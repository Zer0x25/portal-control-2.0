import { EmployeeStatus, Prisma } from "@prisma/client";
import prisma from "../db";
import bcrypt from "bcryptjs";
import { ulid } from "ulid";
import {
  firstNames,
  paternalSurnames,
  maternalSurnames,
  positions,
  areas,
  getRandomItem,
  yieldToEventLoop,
  calculateDv,
} from "./SeederData";
import { getChileNow, getMonthEndBusinessDateChile } from "../../utils/timeUtils";

const shortId = () => ulid();

export class Phase1Service {
  private getSeederInitialAccountingLockDate(): string {
    const now = getChileNow();
    let targetMonth = now.getMonth() - 2; // getMonth() is 0-based; this yields "current - 3 months" in 1..12 scale below
    let targetYear = now.getFullYear();

    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    return getMonthEndBusinessDateChile(targetYear, targetMonth);
  }

  async seedSystemConfigs(progressCb: (msg: string) => void) {
    progressCb("⚙️ Configurando variables de sistema...");
    const seederLockDate = this.getSeederInitialAccountingLockDate();
    const configs = [
      {
        key: "max_weekly_hours",
        value: "45",
      },
      {
        key: "AUTH_SESSION_DURATIONS",
        value: JSON.stringify({
          Administrador: 10,
          Supervisor_Elevado: 4,
          Supervisor: 1,
          Fiscalizador: 1,
          Reloj_Control: 12,
          Usuario: 0.03,
          default: 1,
        }),
      },
      {
        key: "accounting_lock_date",
        value: JSON.stringify(seederLockDate),
      },
    ];

    for (const cfg of configs) {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: cfg.key },
      });

      if (!existing) {
        await prisma.systemConfig.create({
          data: cfg,
        });
        if (cfg.key === "accounting_lock_date") {
          progressCb(
            `[OK] Configuración creada: ${cfg.key}=${seederLockDate} (Seeder: fin de mes de hace 3 meses).`,
          );
        } else {
          progressCb(`[OK] Configuración creada: ${cfg.key}`);
        }
      } else {
        if (cfg.key === "accounting_lock_date") {
          progressCb(
            `[INFO] Configuración existente: ${cfg.key} (preservada, no sobrescrita por Seeder).`,
          );
        } else {
          progressCb(`[INFO] Configuración existente: ${cfg.key}`);
        }
      }
    }
  }

  async seedEmployees(
    numEmployees: number,
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    progressCb(`👷 Preparando creación de ${numEmployees} empleados...`);
    const existing = await prisma.employee.findMany({
      select: { rut: true, name: true, id: true },
    });
    const existingNames = new Set(existing.map((e) => e.name));
    const existingRuts = new Set(existing.map((e) => e.rut));
    const existingIds = new Set(existing.map((e) => e.id));
    const existingNumericIds = existing
      .map((e) => Number(e.id.replace("EMP-", "")))
      .filter((n) => Number.isFinite(n));
    let nextEmployeeNumber =
      existingNumericIds.length > 0 ? Math.max(...existingNumericIds) + 1 : 1001;
    let nextRutBody = 50000000 + existingRuts.size;

    const data: Prisma.EmployeeCreateManyInput[] = [];
    while (data.length < numEmployees) {
      let name: string;
      do {
        name = `${getRandomItem(firstNames)} ${getRandomItem(paternalSurnames)} ${getRandomItem(maternalSurnames)}`;
      } while (existingNames.has(name));

      let id = `EMP-${nextEmployeeNumber++}`;
      while (existingIds.has(id)) {
        id = `EMP-${nextEmployeeNumber++}`;
      }

      let rutBody = nextRutBody++;
      let uniqueRut = `${rutBody}-${calculateDv(rutBody)}`;
      while (existingRuts.has(uniqueRut)) {
        rutBody = nextRutBody++;
        uniqueRut = `${rutBody}-${calculateDv(rutBody)}`;
      }
      if (existingIds.has(id) || existingRuts.has(uniqueRut)) continue;

      existingNames.add(name);
      existingIds.add(id);
      existingRuts.add(uniqueRut);
      data.push({
        id,
        name,
        rut: uniqueRut,
        position: getRandomItem(positions),
        area: getRandomItem(areas),
        workdayType:
          data.length / numEmployees < 0.8
            ? "Full-Time"
            : data.length / numEmployees < 0.99
              ? "Part-Time"
              : "Articulo 22",
        email: `empleado${id.replace("EMP-", "")}@example.com`,
        status: "Activo" as EmployeeStatus,
      });

      if (data.length % 200 === 0) {
        heartbeatCb();
        progressCb(`⏳ Empleados preparados: ${data.length}/${numEmployees}`);
        await yieldToEventLoop();
      }
    }

    if (data.length > 0) {
      await prisma.employee.createMany({ data });
      progressCb(`✅ ${data.length} empleados creados.`);
    }

    return data.length;
  }

  async seedUsers(progressCb: (msg: string) => void, heartbeatCb: () => void) {
    progressCb("👤 Generando cuentas de usuario...");
    const employees = await prisma.employee.findMany();
    const existingUsers = await prisma.user.findMany({
      select: { username: true, employeeId: true },
    });
    const existingUsernames = new Set(existingUsers.map((u) => u.username));
    const existingEmpIds = new Set(
      existingUsers.map((u) => u.employeeId).filter(Boolean) as string[],
    );

    const passwordHash = await bcrypt.hash("123456", 10);
    const users: Prisma.UserCreateManyInput[] = [];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      if (existingEmpIds.has(emp.id)) continue;

      const firstName = emp.name
        .split(" ")[0]
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const username = `${firstName}.${emp.id.split("-")[1]}`;
      if (existingUsernames.has(username)) continue;

      users.push({
        id: shortId(),
        username,
        passwordHash,
        role:
          i < 2 ? "Administrador" : i < 10 ? "Supervisor" : i < 15 ? "Reloj_Control" : "Usuario",
        employeeId: emp.id,
      });
      existingUsernames.add(username);

      if (i % 500 === 0) {
        heartbeatCb();
        progressCb(`⏳ Usuarios procesados: ${i + 1}/${employees.length}`);
        await yieldToEventLoop();
      }
    }

    if (users.length > 0) {
      for (let i = 0; i < users.length; i += 500) {
        await prisma.user.createMany({ data: users.slice(i, i + 500) });
      }
      progressCb(`✅ ${users.length} usuarios creados.`);
    }
  }

  async seedShiftPatternsAndAssignments(
    basePatternsCount: number,
    historyDays: number,
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    const safeBasePatternsCount = Math.max(1, Math.min(12, Math.floor(basePatternsCount || 3)));
    progressCb(
      `[INFO] Preparando patrones/asignaciones (patrones base: ${safeBasePatternsCount})...`,
    );

    const [employees, existingPatterns, existingAssignments] = (await Promise.all([
      prisma.employee.findMany({
        where: { workdayType: { not: "Articulo 22" } },
        select: { id: true },
      }),
      prisma.shiftPattern.findMany({ select: { id: true } }),
      prisma.assignedShift.findMany({
        select: { employeeId: true, shiftPatternId: true, startDate: true, endDate: true },
      }),
    ])) as [
      { id: string }[],
      { id: string }[],
      { employeeId: string; shiftPatternId: string; startDate: string; endDate: string | null }[],
    ];

    if (employees.length === 0) {
      progressCb("[INFO] Sin empleados para asignar patrones.");
      return;
    }

    const baseTemplates: Omit<Prisma.ShiftPatternCreateManyInput, "id" | "name">[] = [
      {
        cycleLengthDays: 8,
        startDayOfWeek: 1,
        dailySchedules: JSON.stringify(
          Array.from({ length: 8 }).map((_, i) => ({
            dayIndex: i % 7,
            isOffDay: i >= 4,
            startTime: "08:00",
            endTime: "20:00",
            hours: i >= 4 ? 0 : 12,
            hasColacion: i < 4,
            colacionMinutes: i < 4 ? 60 : 0,
          })),
        ),
        color: "#22c55e",
        worksOnHolidays: false,
      },
      {
        cycleLengthDays: 7,
        startDayOfWeek: 1,
        dailySchedules: JSON.stringify(
          Array.from({ length: 7 }).map((_, i) => ({
            dayIndex: i,
            isOffDay: i === 0 || i === 6,
            startTime: "09:00",
            endTime: "18:00",
            hours: i === 0 || i === 6 ? 0 : 8,
            hasColacion: i !== 0 && i !== 6,
            colacionMinutes: i !== 0 && i !== 6 ? 60 : 0,
          })),
        ),
        color: "#3b82f6",
        worksOnHolidays: false,
      },
      {
        cycleLengthDays: 7,
        startDayOfWeek: 1,
        dailySchedules: JSON.stringify(
          Array.from({ length: 7 }).map((_, i) => ({
            dayIndex: i,
            isOffDay: i === 0,
            startTime: "07:00",
            endTime: "15:00",
            hours: i === 0 ? 0 : 8,
            hasColacion: i !== 0,
            colacionMinutes: i !== 0 ? 45 : 0,
          })),
        ),
        color: "#f59e0b",
        worksOnHolidays: false,
      },
    ];

    const patternNames = ["4x4 Dia", "L-V Administrativo", "6x1 Operativo"];
    const patternIds: string[] = [...existingPatterns.map((p) => p.id)];
    if (patternIds.length < safeBasePatternsCount) {
      const toCreate = safeBasePatternsCount - patternIds.length;
      const defaults: Prisma.ShiftPatternCreateManyInput[] = Array.from({ length: toCreate }).map(
        (_, idx) => {
          const templateIndex = (patternIds.length + idx) % baseTemplates.length;
          const template = baseTemplates[templateIndex];
          const sequence = patternIds.length + idx + 1;
          return {
            id: shortId(),
            name: `${patternNames[templateIndex]} ${sequence}`,
            ...template,
          };
        },
      );
      await prisma.shiftPattern.createMany({ data: defaults });
      patternIds.push(...defaults.map((d) => d.id));
      progressCb(`[OK] Patrones base creados: ${defaults.length}. Total: ${patternIds.length}.`);
    } else {
      progressCb(`[OK] Patrones base disponibles: ${patternIds.length}.`);
    }

    const assignmentsByEmployee = new Map(
      employees.map((e) => [e.id, existingAssignments.filter((a) => a.employeeId === e.id)]),
    );
    const uniquePatternIds = Array.from(new Set(patternIds)).slice(0, safeBasePatternsCount);
    const activePatternIds = uniquePatternIds;
    progressCb(`[INFO] Patrones activos para distribucion pareja: ${activePatternIds.length}.`);

    let created = 0;
    let backfilled = 0;
    let roundRobinIndex = 0;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const historyStart = new Date(startDate);
    historyStart.setDate(historyStart.getDate() - Math.max(0, historyDays));
    const historyStartStr = historyStart.toISOString().slice(0, 10);

    const data: Prisma.AssignedShiftCreateManyInput[] = [];
    for (const emp of employees) {
      const empAssignments = assignmentsByEmployee.get(emp.id) || [];

      if (empAssignments.length > 0) {
        const earliest = empAssignments
          .map((a) => a.startDate)
          .sort((a, b) => a.localeCompare(b))[0];

        if (earliest > historyStartStr) {
          const earliestAssignment = empAssignments.find((a) => a.startDate === earliest);
          const backfillEnd = new Date(earliest);
          backfillEnd.setDate(backfillEnd.getDate() - 1);

          if (backfillEnd.toISOString().slice(0, 10) >= historyStartStr) {
            data.push({
              id: shortId(),
              employeeId: emp.id,
              shiftPatternId:
                earliestAssignment?.shiftPatternId ||
                activePatternIds[roundRobinIndex % activePatternIds.length],
              startDate: historyStartStr,
              endDate: backfillEnd.toISOString().slice(0, 10),
            });
            roundRobinIndex += 1;
            backfilled += 1;
          }
        }
        continue;
      }

      data.push({
        id: shortId(),
        employeeId: emp.id,
        shiftPatternId: activePatternIds[roundRobinIndex % activePatternIds.length],
        startDate: historyStartStr,
      });
      roundRobinIndex += 1;
      created += 1;

      if (data.length >= 500) {
        await prisma.assignedShift.createMany({ data });
        data.length = 0;
        heartbeatCb();
        await yieldToEventLoop();
      }
    }

    if (data.length > 0) {
      await prisma.assignedShift.createMany({ data });
    }
    progressCb(
      `[OK] Asignaciones creadas: ${created}. Backfill historico: ${backfilled}. Inicio: ${historyStartStr}.`,
    );
  }
}

export const phase1Service = new Phase1Service();
