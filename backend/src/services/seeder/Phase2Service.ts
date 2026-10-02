import { Prisma, ShiftPattern, Holiday } from "@prisma/client";
import prisma from "../db";
import { ulid } from "ulid";
import {
  getRandomItem,
  yieldToEventLoop,
  parseMinutes,
  gaussRandom,
  leaveTypes,
  correctionFields,
  shiftNames,
} from "./SeederData";
import { timeRecordIntegrityService } from "../timeRecordIntegrityService";

const shortId = () => ulid();
const toLocalDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const parseConfigDateValue = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : null;
  } catch {
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  }
};

export type SeedingContext = {
  employees: {
    id: string;
    name: string;
    position: string;
    area: string;
    workdayType: string;
  }[];
  assignments: {
    employeeId: string;
    shiftPatternId: string;
    startDate: string;
    endDate: string | null;
  }[];
  patterns: ShiftPattern[];
  holidays: Holiday[];
};

export class Phase2Service {
  // Optimize: Pre-fetch context once per job instead of per day
  async preloadSeedingContext(): Promise<SeedingContext> {
    const [employees, assignments, patterns, holidays] = await Promise.all([
      prisma.employee.findMany({
        where: { workdayType: { not: "Articulo 22" } },
        select: {
          id: true,
          name: true,
          position: true,
          area: true,
          workdayType: true,
        },
      }),
      prisma.assignedShift.findMany({
        select: { employeeId: true, shiftPatternId: true, startDate: true, endDate: true },
      }),
      prisma.shiftPattern.findMany(),
      prisma.holiday.findMany(),
    ]);

    return { employees, assignments, patterns, holidays };
  }

  async seedHistoryForDate(
    targetDate: Date,
    absenceProb: number,
    progressCb?: (msg: string) => void,
    context?: SeedingContext, // Optional context for optimization
  ): Promise<number> {
    const dateStr = toLocalDateStr(targetDate);
    const dayOfWeek = targetDate.getDay();

    let employees: {
      id: string;
      name: string;
      position: string;
      area: string;
      workdayType: string;
    }[];
    let assignments: {
      employeeId: string;
      shiftPatternId: string;
      startDate: string;
      endDate: string | null;
    }[];
    let patterns: ShiftPattern[];
    let holidays: Holiday[];

    if (context) {
      // Use pre-fetched context
      employees = context.employees;
      assignments = context.assignments;
      patterns = context.patterns;
      // Filter holidays for this specific date from the full list
      holidays = context.holidays.filter((h) => h.date === dateStr);
    } else {
      // Fallback: fetch for this single day
      const result = await Promise.all([
        prisma.employee.findMany({
          where: { workdayType: { not: "Articulo 22" } },
          select: {
            id: true,
            name: true,
            position: true,
            area: true,
            workdayType: true,
          },
        }),
        prisma.assignedShift.findMany({
          select: { employeeId: true, shiftPatternId: true, startDate: true, endDate: true },
        }),
        prisma.shiftPattern.findMany(),
        prisma.holiday.findMany({ where: { date: dateStr } }),
      ]);
      employees = result[0];
      assignments = result[1];
      patterns = result[2];
      holidays = result[3];
    }

    const holidayName = holidays[0]?.name;
    const patternsMap = new Map(
      patterns.map((p) => [
        p.id,
        {
          ...p,
          schedules: JSON.parse(p.dailySchedules) as Array<{
            dayIndex: number;
            isOffDay: boolean;
            startTime: string;
            endTime: string;
            hasColacion?: boolean;
            colacionMinutes?: number;
          }>,
        },
      ]),
    );
    const assignmentsByEmployee = new Map<string, typeof assignments>();
    for (const ass of assignments) {
      const list = assignmentsByEmployee.get(ass.employeeId) || [];
      list.push(ass);
      assignmentsByEmployee.set(ass.employeeId, list);
    }

    const existingRecords = await prisma.timeRecord.findMany({
      where: {
        date: dateStr,
        employeeId: { in: employees.map((e) => e.id) },
      },
      select: { employeeId: true },
    });
    const existingByEmployee = new Set(existingRecords.map((r) => r.employeeId));

    const records: Prisma.TimeRecordCreateManyInput[] = [];
    for (const emp of employees) {
      if (existingByEmployee.has(emp.id)) continue;

      const empAssignments = assignmentsByEmployee.get(emp.id) || [];
      const activeAssignment = empAssignments.find(
        (a) => a.startDate <= dateStr && (!a.endDate || a.endDate >= dateStr),
      );
      const patternId = activeAssignment?.shiftPatternId;
      const pattern = patternId ? patternsMap.get(patternId) : undefined;
      const schedule = pattern?.schedules.find((s) => s.dayIndex === dayOfWeek);
      const isWorkDay = Boolean(schedule && !schedule.isOffDay);

      if (holidayName && Math.random() > 0.2) {
        records.push({
          id: shortId(),
          employeeId: emp.id,
          employeeName: emp.name,
          employeePosition: emp.position,
          employeeArea: emp.area,
          employeeWorkdayType: emp.workdayType,
          date: dateStr,
          status: "Feriado",
          source: "SYSTEM_HOLIDAY",
          justification: JSON.stringify({ type: "Feriado", name: holidayName }),
          scheduledStartTime: isWorkDay ? schedule?.startTime : null,
          scheduledEndTime: isWorkDay ? schedule?.endTime : null,
          shiftPatternId: patternId,
          shiftPatternName: pattern?.name,
        });
        continue;
      }

      if (!isWorkDay || !schedule) continue;
      const hasAbsence = Math.random() < absenceProb;

      if (hasAbsence) {
        records.push({
          id: shortId(),
          employeeId: emp.id,
          employeeName: emp.name,
          employeePosition: emp.position,
          employeeArea: emp.area,
          employeeWorkdayType: emp.workdayType,
          date: dateStr,
          status: "Ausente",
          source: "SYSTEM",
          scheduledStartTime: schedule.startTime ?? null,
          scheduledEndTime: schedule.endTime ?? null,
          shiftPatternId: patternId,
          shiftPatternName: pattern?.name,
        });
        continue;
      }

      // ── Realistic synthetic attendance based on schedule ──
      const start = schedule.startTime || "08:00";
      const end = schedule.endTime || "17:00";
      const startMin = parseMinutes(start);
      const endMin = parseMinutes(end);

      // Entry: most arrive ±5min, ~10% are 5-15min late, ~3% are 15-30min late
      const entryJitter = gaussRandom(0, 4);
      const lateRoll = Math.random();
      const extraLate =
        lateRoll < 0.03
          ? gaussRandom(22, 5) // very late
          : lateRoll < 0.1
            ? gaussRandom(10, 3) // moderately late
            : 0;
      const entradaMin = startMin + entryJitter + extraLate;

      // Exit: most leave ±5min, ~5% do overtime, ~2% leave 1-2hrs early
      const exitJitter = gaussRandom(0, 4);
      const exitRoll = Math.random();
      const exitShift =
        exitRoll < 0.02
          ? -gaussRandom(60, 20) // early departure
          : exitRoll < 0.07
            ? gaussRandom(20, 10) // overtime
            : 0;
      const salidaMin = Math.max(entradaMin + 60, endMin + exitJitter + exitShift);

      // Colación: dynamic based on shift midpoint
      const hasColacion = schedule.hasColacion ?? false;
      const colacionMinutes = schedule.colacionMinutes ?? 60;

      // Build proper ISO datetime strings (same format as real punches)
      const buildISO = (mins: number): string => {
        const d = new Date(targetDate);
        const rounded = Math.round(Math.max(0, Math.min(1435, mins)) / 5) * 5;
        d.setHours(Math.floor(rounded / 60) % 24, rounded % 60, 0, 0);
        return d.toISOString();
      };

      const entrada = buildISO(entradaMin);
      const salida = buildISO(salidaMin);

      let inicioColacion: string | null = null;
      let finColacion: string | null = null;
      if (hasColacion) {
        const midpoint = (entradaMin + salidaMin) / 2;
        const colStartMin = midpoint - colacionMinutes / 2 + gaussRandom(0, 5);
        const colEndMin = colStartMin + colacionMinutes + gaussRandom(0, 3);
        inicioColacion = buildISO(colStartMin);
        finColacion = buildISO(colEndMin);
      }

      // Calculate scheduled hours for progress bar
      const scheduledHours = (endMin - startMin) / 60;

      records.push({
        id: shortId(),
        employeeId: emp.id,
        employeeName: emp.name,
        employeePosition: emp.position,
        employeeArea: emp.area,
        employeeWorkdayType: emp.workdayType,
        date: dateStr,
        entrada,
        inicioColacion,
        finColacion,
        salida,
        status: "Completado",
        source: "SYSTEM",
        scheduledStartTime: start,
        scheduledEndTime: end,
        scheduledHours,

        shiftPatternId: patternId,
        shiftPatternName: pattern?.name,
      });
    }

    if (records.length > 0) {
      await prisma.timeRecord.createMany({ data: records, skipDuplicates: true });
    }
    progressCb?.(`[INFO] Dia ${dateStr} generado: ${records.length} marcaciones.`);
    return records.length;
  }

  async seedLeaveRecords(
    numDays: number,
    leaveProb: number,
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    if (leaveProb <= 0) return;

    progressCb("🚑 Generando licencias y vacaciones...");
    const employees = (await prisma.employee.findMany({ select: { id: true } })) as {
      id: string;
    }[];
    if (employees.length === 0) return;

    // We want the total absenteeism (Leaves + Unjustified) to be leaveProb
    // Let's allocate 60% of that probability to justified leaves (Vacations/Medical)
    const justifedProb = leaveProb * 0.6;
    const avgLeaveDuration = 4;
    const targetLeaves = Math.round((employees.length * numDays * justifedProb) / avgLeaveDuration);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data: Prisma.LeaveRecordCreateManyInput[] = [];

    for (let i = 0; i < targetLeaves; i++) {
      const employee = getRandomItem(employees);
      const backDays = Math.floor(Math.random() * Math.max(1, numDays));
      const start = new Date(today.getTime() - backDays * 86400000);
      const duration = 1 + Math.floor(Math.random() * 6);
      const end = new Date(start.getTime() + duration * 86400000);

      data.push({
        id: shortId(),
        employeeId: employee.id,
        type: getRandomItem(leaveTypes),
        startDate: toLocalDateStr(start),
        endDate: toLocalDateStr(end),
        notes: "Registro generado por Seeder para pruebas de volumen.",
      });

      if (data.length >= 1000) {
        await prisma.leaveRecord.createMany({ data });
        data.length = 0;
        heartbeatCb();
        await yieldToEventLoop();
      }
    }

    if (data.length > 0) {
      await prisma.leaveRecord.createMany({ data });
    }
    progressCb("✔️ Licencias/vacaciones generadas.");
  }

  async seedCorrectionRequests(
    numDays: number,
    correctionProb: number,
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    if (correctionProb <= 0) {
      progressCb("[INFO] Correcciones omitidas (ratio 0%).");
      return;
    }

    progressCb("[INFO] Generando solicitudes de correccion...");
    const windowDays = Math.max(numDays, 30);
    const fromDate = toLocalDateStr(new Date(Date.now() - windowDays * 86400000));
    const lockConfig = await prisma.systemConfig.findUnique({
      where: { key: "accounting_lock_date" },
      select: { value: true },
    });
    const lockDate = parseConfigDateValue(lockConfig?.value);
    if (lockDate) {
      progressCb(
        `[INFO] Cierre contable detectado (${lockDate}). Se excluiran registros <= cierre.`,
      );
    } else {
      progressCb(
        "[WARNING] accounting_lock_date ausente/invalido. Se usara solo la ventana historica.",
      );
    }

    const candidates = await prisma.timeRecord.findMany({
      where: {
        status: { in: ["Completado"] },
        date: lockDate ? { gte: fromDate, gt: lockDate } : { gte: fromDate },
        entrada: { not: null },
      },
      select: {
        id: true,
        employeeId: true,
        entrada: true,
        inicioColacion: true,
        finColacion: true,
        salida: true,
      },
      take: 50000,
    });
    progressCb(
      `[INFO] Candidatos elegibles fuera de cierre: ${candidates.length} (ventana desde ${fromDate}).`,
    );

    if (candidates.length === 0) {
      progressCb("[INFO] Sin candidatos para correcciones en la ventana evaluada.");
      return;
    }

    const targetCount = Math.max(
      0,
      Math.min(candidates.length, Math.round(candidates.length * correctionProb)),
    );
    if (targetCount === 0) {
      progressCb("[INFO] Ratio aplicado: 0 solicitudes objetivo. No se generaran correcciones.");
      return;
    }
    progressCb(
      `[INFO] Ratio exacto aplicado: ${Math.round(correctionProb * 10000) / 100}% sobre ${candidates.length} => objetivo ${targetCount}.`,
    );

    const selectedCandidates = [...candidates];
    for (let i = selectedCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedCandidates[i], selectedCandidates[j]] = [
        selectedCandidates[j],
        selectedCandidates[i],
      ];
    }

    const data: Prisma.CorrectionRequestCreateManyInput[] = [];
    let totalCreated = 0;
    for (let i = 0; i < targetCount; i++) {
      const rec = selectedCandidates[i];

      const field = getRandomItem([...correctionFields]);
      const currentVal = rec[field] ?? rec.entrada;
      if (!currentVal) continue;

      const originalDate = new Date(currentVal);
      const requested = new Date(originalDate.getTime() + (Math.random() > 0.5 ? 10 : -10) * 60000);

      data.push({
        id: shortId(),
        employeeId: rec.employeeId,
        timeRecordId: rec.id,
        recordField: field,
        originalValue: currentVal,
        requestedValue: requested.toISOString(),
        reason: "Ajuste por validacion de reloj en terreno.",
        status: "pending",
      });

      if (data.length >= 1000) {
        await prisma.correctionRequest.createMany({ data });
        totalCreated += data.length;
        data.length = 0;
        heartbeatCb();
        await yieldToEventLoop();
      }
    }

    if (data.length > 0) {
      await prisma.correctionRequest.createMany({ data });
      totalCreated += data.length;
    }
    progressCb(`[OK] Solicitudes de correccion generadas: ${totalCreated}.`);
  }

  async seedQuickNotes(
    quickNotesCount: number,
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    if (quickNotesCount <= 0) return;

    progressCb(`📝 Generando ${quickNotesCount} quick notes...`);
    const users = (await prisma.user.findMany({ select: { username: true } })) as {
      username: string;
    }[];
    if (users.length === 0) return;

    const baseMessages = [
      "Validar cierre de turno nocturno.",
      "Pendiente confirmacion de dotacion para fin de semana.",
      "Revisar bitacora de acceso proveedor.",
      "Corregir reloj biometrico del acceso norte.",
      "Actualizar checklist de apertura area logistico.",
    ];

    const data: Prisma.QuickNoteCreateManyInput[] = [];
    for (let i = 0; i < quickNotesCount; i++) {
      data.push({
        id: shortId(),
        content: `${getRandomItem(baseMessages)} [seed-${i + 1}]`,
        authorUsername: getRandomItem(users).username,
      });

      if (data.length >= 500) {
        await prisma.quickNote.createMany({ data });
        data.length = 0;
        heartbeatCb();
        await yieldToEventLoop();
      }
    }

    if (data.length > 0) {
      await prisma.quickNote.createMany({ data });
    }
    progressCb("✔️ Quick notes generadas.");
  }

  async seedShiftReports(
    numDays: number,
    reportsPerDay: number,
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ) {
    if (reportsPerDay <= 0) return;

    progressCb(`📋 Generando reportes de turno (${reportsPerDay}/dia)...`);
    const users = (await prisma.user.findMany({ select: { username: true } })) as {
      username: string;
    }[];
    if (users.length === 0) return;

    const targetDays = Math.min(numDays, 365);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let buffer: Prisma.ShiftReportCreateManyInput[] = [];
    for (let d = targetDays; d >= 0; d--) {
      const day = new Date(today.getTime() - d * 86400000);

      for (let i = 0; i < reportsPerDay; i++) {
        const start = new Date(day);
        start.setHours(i * 8, Math.floor(Math.random() * 20), 0, 0);
        const end = new Date(start.getTime() + 8 * 3600000);
        const isOpen = d === 0 && i === reportsPerDay - 1;
        const folio = `SR-${toLocalDateStr(day).replace(/-/g, "")}-${i + 1}-${shortId().slice(-5)}`;

        const logEntries = [
          {
            id: shortId(),
            timestamp: start.toISOString(),
            text: "Inicio de turno y checklist de apertura.",
            author: getRandomItem(users).username,
          },
          {
            id: shortId(),
            timestamp: new Date(start.getTime() + 2 * 3600000).toISOString(),
            text: "Ronda de seguridad completada sin novedades.",
            author: getRandomItem(users).username,
          },
        ];

        const supplierEntries =
          Math.random() > 0.7
            ? [
                {
                  id: shortId(),
                  supplier: "Transportes Norte",
                  contact: "Operador Patio",
                  note: "Ingreso programado.",
                },
              ]
            : [];

        buffer.push({
          id: shortId(),
          folio,
          shiftName: getRandomItem(shiftNames),
          responsibleUser: getRandomItem(users).username,
          startTime: start,
          endTime: isOpen ? null : end,
          status: isOpen ? "open" : "closed",
          date: day,
          logEntries: JSON.stringify(logEntries),
          supplierEntries: JSON.stringify(supplierEntries),
        });
      }

      if (buffer.length >= 500) {
        await prisma.shiftReport.createMany({ data: buffer, skipDuplicates: true });
        buffer = [];
        heartbeatCb();
        await yieldToEventLoop();
      }
    }

    if (buffer.length > 0) {
      await prisma.shiftReport.createMany({ data: buffer, skipDuplicates: true });
    }
    progressCb("✔️ Reportes de turno simulados.");
  }

  async backfillTimeRecordIntegrity(
    progressCb: (msg: string) => void,
    heartbeatCb: () => void,
  ): Promise<number> {
    progressCb("[INFO] Sellando integridad de marcajes (post-seeding)...");

    const employees = await prisma.employee.findMany({ select: { id: true } });
    const employeeIds = employees.map((e) => e.id);

    if (employeeIds.length === 0) {
      progressCb("[INFO] No hay empleados para sellar integridad.");
      return 0;
    }

    const processed = await timeRecordIntegrityService.bulkSqlSeal(prisma, employeeIds, {
      skipAudit: true,
      progressCb: (count) => {
        if (count % 500 === 0) {
          progressCb(`[INFO] Integridad sellada: ${count} registros procesados...`);
        }
      },
      heartbeatCb,
    });

    progressCb(`[OK] Sellado de integridad completado (${processed} registros).`);

    progressCb("[INFO] Iniciando verificación final de integridad...");
    const verifyResult = await timeRecordIntegrityService.verifyChain(prisma, {
      limit: 1000000, // Large limit for full verification
    });

    if (verifyResult.brokenCount === 0) {
      progressCb(
        `[OK] Verificación completada: 0 errores detectados en ${verifyResult.checkedCount} registros.`,
      );
    } else {
      progressCb(
        `[WARNING] Verificación finalizada con ${verifyResult.brokenCount} errores de integridad.`,
      );
    }

    return processed;
  }
}

export const phase2Service = new Phase2Service();
