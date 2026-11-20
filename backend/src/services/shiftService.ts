import { AssignedShift, Prisma } from "../generated/prisma/client";
import prisma, { withDirectTransaction } from "./db";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { SchedulingContext, ShiftPatternWithSchedules } from "./schedulingService";
import { ShiftValidator } from "./shift/ShiftValidator";
import {
  PatternCreateInput,
  AssignmentCreateInput,
  PaginationOptions,
  PaginatedResponse,
  PatternPaginationOptions,
} from "./shift/types";
import { addBusinessDaysChile, toBusinessDateChile } from "../utils/timeUtils";

export class ShiftService {
  private validator: ShiftValidator;

  constructor() {
    this.validator = new ShiftValidator();
  }

  // Facade for Controller compatibility
  async validateConflicts(
    employeeId: string,
    startDate: string,
    endDate: string | null,
    excludeAssignmentId?: string,
  ) {
    return this.validator.validateConflicts(employeeId, startDate, endDate, excludeAssignmentId);
  }

  /**
   * Patterns Logic
   */
  async getPatterns(
    options: PatternPaginationOptions,
  ): Promise<ShiftPatternWithSchedules[] | PaginatedResponse<ShiftPatternWithSchedules>> {
    const { since, showArchived, page, pageSize, search } = options;
    const where: Prisma.ShiftPatternWhereInput = {};
    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gte: sinceDate };
      }
    } else if (!showArchived) {
      where.isDeleted = false;
    }
    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    const isPaginated = page !== undefined && pageSize !== undefined;
    const queryArgs: Prisma.ShiftPatternFindManyArgs = {
      where,
      orderBy: { updatedAt: "desc" },
    };
    if (isPaginated) {
      queryArgs.skip = (page - 1) * pageSize;
      queryArgs.take = pageSize;
    }

    const [patterns, total] = await Promise.all([
      prisma.shiftPattern.findMany(queryArgs),
      isPaginated ? prisma.shiftPattern.count({ where }) : Promise.resolve(0),
    ]);

    const enriched = patterns.map(
      (p) =>
        ({
          ...p,
          dailySchedules: JSON.parse(p.dailySchedules),
          lastModified: p.updatedAt.getTime(),
          syncStatus: "synced",
          isDeleted: p.isDeleted,
        }) as ShiftPatternWithSchedules,
    );

    if (!isPaginated) return enriched;

    return {
      data: enriched,
      meta: {
        total,
        page: page || 1,
        pageSize: pageSize || enriched.length,
        totalPages: pageSize ? Math.ceil(total / pageSize) : 1,
      },
    };
  }

  async createPattern(data: PatternCreateInput): Promise<ShiftPatternWithSchedules> {
    const validation = await this.validator.validatePatternSchedules(
      data.dailySchedules,
      data.cycleLengthDays,
    );
    if (!validation.isValid) throw new Error(validation.error);

    const pattern = await prisma.shiftPattern.create({
      data: {
        id: data.id,
        name: data.name,
        cycleLengthDays: data.cycleLengthDays,
        startDayOfWeek: data.startDayOfWeek,
        dailySchedules: JSON.stringify(data.dailySchedules),
        color: data.color,
        maxHoursPattern: data.maxHoursPattern,
        worksOnHolidays: data.worksOnHolidays ?? false,
      },
    });

    const enriched = {
      ...pattern,
      dailySchedules: JSON.parse(pattern.dailySchedules),
      lastModified: pattern.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: pattern.isDeleted,
    };

    SocketService.emit("shiftPattern:updated", enriched);
    return enriched;
  }

  async updatePattern(
    id: string,
    data: Partial<PatternCreateInput>,
  ): Promise<ShiftPatternWithSchedules> {
    if (data.dailySchedules) {
      let cycleLengthDays = data.cycleLengthDays;
      if (cycleLengthDays === undefined) {
        const existing = await prisma.shiftPattern.findUnique({
          where: { id },
          select: { cycleLengthDays: true },
        });
        cycleLengthDays = existing?.cycleLengthDays;
      }
      const validation = await this.validator.validatePatternSchedules(
        data.dailySchedules,
        cycleLengthDays,
      );
      if (!validation.isValid) throw new Error(validation.error);
    }

    const pattern = await prisma.shiftPattern.update({
      where: { id },
      data: {
        name: data.name,
        cycleLengthDays: data.cycleLengthDays,
        startDayOfWeek: data.startDayOfWeek,
        dailySchedules: data.dailySchedules ? JSON.stringify(data.dailySchedules) : undefined,
        color: data.color,
        maxHoursPattern: data.maxHoursPattern,
        worksOnHolidays: data.worksOnHolidays,
      },
    });

    const enriched = {
      ...pattern,
      dailySchedules: JSON.parse(pattern.dailySchedules),
      lastModified: pattern.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: pattern.isDeleted,
    };

    SocketService.emit("shiftPattern:updated", enriched);
    return enriched;
  }

  async deletePattern(id: string) {
    const today = toBusinessDateChile();
    const yesterday = addBusinessDaysChile(today, -1);

    const pattern = await prisma.shiftPattern.findUnique({ where: { id } });

    await prisma.$transaction([
      // 1. Terminate Ongoing or Indefinite assignments
      prisma.assignedShift.updateMany({
        where: {
          shiftPatternId: id,
          isDeleted: false,
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        },
        data: {
          endDate: yesterday,
          shiftPatternName: pattern?.name,
        },
      }),
      // 2. Soft-delete ONLY future assignments
      prisma.assignedShift.updateMany({
        where: {
          shiftPatternId: id,
          startDate: { gt: today },
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
      // 3. Soft-delete the Pattern
      prisma.shiftPattern.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      }),
    ]);

    SocketService.emit("shiftPattern:updated", { id });
    SocketService.emit("assignedShift:updated", { patternId: id });
  }

  /**
   * Assignments Logic
   */
  async getAssignments(options: PaginationOptions): Promise<PaginatedResponse<AssignedShift>> {
    const { page, pageSize, since, role, employeeId, startDate, endDate, showArchived, search } =
      options;
    const where: Prisma.AssignedShiftWhereInput = {};
    const andConditions: Prisma.AssignedShiftWhereInput[] = [];

    // 1. Base Filter (Deleted / Since / Archived)
    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gte: sinceDate };
      }
    } else {
      where.isDeleted = false;

      if (!showArchived) {
        const today = toBusinessDateChile();
        // Active = endDate is NULL (indefinite) OR endDate >= today
        andConditions.push({
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        });
      }
    }

    // 2. Role Filter
    if (role === "Usuario" && employeeId) {
      where.employeeId = employeeId;
    } else if (employeeId) {
      // Admin filtering by specific employee
      where.employeeId = employeeId;
    }

    // 3. Date Range Filter (includes indefinite active shifts where endDate is null)
    if (startDate || endDate) {
      if (endDate) {
        andConditions.push({ startDate: { lte: endDate } });
      }
      if (startDate) {
        andConditions.push({
          OR: [{ endDate: null }, { endDate: { gte: startDate } }],
        });
      }
    }

    // 4. Search Filter
    if (search?.trim()) {
      const term = search.trim();
      andConditions.push({
        OR: [
          { employeeName: { contains: term, mode: "insensitive" } },
          { shiftPatternName: { contains: term, mode: "insensitive" } },
          { employeeId: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // 4. Count Total
    const total = await prisma.assignedShift.count({ where });

    // 5. Fetch Page (or All)
    const queryOptions: Prisma.AssignedShiftFindManyArgs = {
      where,
      orderBy: { startDate: "desc" },
    };

    if (page && pageSize) {
      queryOptions.skip = (page - 1) * pageSize;
      queryOptions.take = pageSize;
    }

    const assignments = await prisma.assignedShift.findMany(queryOptions);

    // 6. Map Response
    const data = assignments.map((ass) => ({
      ...ass,
      lastModified: ass.updatedAt.getTime(),
      syncStatus: "synced" as const,
      isDeleted: ass.isDeleted,
    }));

    return {
      data,
      meta: {
        total,
        page: page || 1,
        pageSize: pageSize || total,
        totalPages: pageSize ? Math.ceil(total / pageSize) : 1,
      },
    };
  }

  private async buildValidationContext(
    tx: Prisma.TransactionClient,
    employeeIds: string[],
    startIso: string,
    endIso: string,
    assignedShifts: AssignedShift[],
  ): Promise<SchedulingContext> {
    const [leaves, holidays, patterns] = await Promise.all([
      tx.leaveRecord.findMany({
        where: {
          employeeId: { in: employeeIds },
          isDeleted: false,
          startDate: { lte: endIso },
          endDate: { gte: startIso },
        },
      }),
      tx.holiday.findMany({
        where: { date: { gte: startIso, lte: endIso } },
      }),
      tx.shiftPattern.findMany({ where: { isDeleted: false } }),
    ]);

    const shiftPatterns = patterns.map((p) => ({
      ...p,
      dailySchedules:
        typeof p.dailySchedules === "string" ? JSON.parse(p.dailySchedules) : p.dailySchedules,
    })) as ShiftPatternWithSchedules[];

    return {
      assignedShifts,
      shiftPatterns,
      leaves,
      holidays,
    };
  }

  async assignShift(data: AssignmentCreateInput, actorUsername: string) {
    // 0. Boundary Validation (7-day past rule)
    const boundary = this.validator.validateTemporalBoundary(data.startDate);
    if (!boundary.isValid) throw new Error(boundary.error);

    const { assignment, employeeName, patternName } = await withDirectTransaction(async (tx) => {
      // Serialize concurrent assignments for the same employee
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${data.employeeId} FOR UPDATE`;

      const [existingShifts, employee, patternToCheck] = await Promise.all([
        tx.assignedShift.findMany({
          where: { employeeId: data.employeeId, isDeleted: false },
          orderBy: { startDate: "asc" },
        }),
        tx.employee.findUnique({ where: { id: data.employeeId }, select: { name: true } }),
        tx.shiftPattern.findUnique({ where: { id: data.shiftPatternId } }),
      ]);

      // 1. Validations
      const conflicts = await this.validator.validateConflicts(
        data.employeeId,
        data.startDate,
        data.endDate,
        undefined,
        existingShifts,
      );
      if (conflicts.length > 0) {
        const ass = conflicts[0];
        throw new Error(
          `Conflicto de asignación: Superposición detectada con el periodo ${ass.startDate} a ${ass.endDate || "siempre"}.`,
        );
      }

      if (patternToCheck) {
        const contextStart = addBusinessDaysChile(data.startDate, -7);
        const contextEnd = data.endDate
          ? addBusinessDaysChile(data.endDate, 7)
          : addBusinessDaysChile(data.startDate, 45);
        const context = await this.buildValidationContext(
          tx,
          [data.employeeId],
          contextStart,
          contextEnd,
          existingShifts,
        );

        const restValidation = await this.validator.validateRestPeriod(
          data.employeeId,
          data.startDate,
          patternToCheck,
          context,
        );
        if (!restValidation.isValid) {
          throw new Error(restValidation.error);
        }

        const sixDayValidation = await this.validator.validateConsecutiveWorkdays(
          data.employeeId,
          data.startDate,
          data.endDate,
          data.shiftPatternId,
          undefined,
          context,
          tx,
        );
        if (!sixDayValidation.isValid) {
          throw new Error(sixDayValidation.error);
        }
      }

      const workload = await this.validator.validateWorkload(
        data.employeeId,
        data,
        undefined,
        existingShifts,
        tx,
      );
      if (!workload.isValid) {
        throw new Error(
          `Carga horaria excesiva: El promedio semanal (${workload.weeklyHours!.toFixed(1)}h) excede el máximo permitido de ${workload.maxHours}h.`,
        );
      }

      // 2. Execution
      const created = await tx.assignedShift.create({
        data: {
          id: data.id,
          employeeId: data.employeeId,
          employeeName: employee?.name,
          shiftPatternId: data.shiftPatternId,
          shiftPatternName: patternToCheck?.name,
          startDate: data.startDate,
          endDate: data.endDate,
        },
      });

      return {
        assignment: created,
        employeeName: employee?.name,
        patternName: patternToCheck?.name,
      };
    });

    // 3. Audit & Socket (after commit)
    await auditService.logShiftChange(actorUsername, "CREATE", {
      employeeId: data.employeeId,
      employeeName,
      newPatternId: data.shiftPatternId,
      newPatternName: patternName,
      newStartDate: data.startDate,
      newEndDate: data.endDate,
    });

    SocketService.emit("assignedShift:updated", assignment);
    return assignment;
  }

  async updateAssignment(id: string, data: Partial<AssignmentCreateInput>, actorUsername: string) {
    const { assignment, previousAssignment, employeeName, previousPatternName, newPatternName } =
      await withDirectTransaction(async (tx) => {
        const previous = await tx.assignedShift.findUnique({ where: { id } });
        if (!previous || previous.isDeleted) throw new Error("Asignación no encontrada");

        // 0. Boundary Validation (7-day past rule)
        const boundary = this.validator.validateTemporalBoundary(
          data.startDate ?? previous.startDate,
        );
        if (!boundary.isValid) throw new Error(boundary.error);

        const mergedData: AssignmentCreateInput = {
          employeeId: data.employeeId ?? previous.employeeId,
          startDate: data.startDate ?? previous.startDate,
          endDate: data.endDate !== undefined ? data.endDate : previous.endDate,
          shiftPatternId: data.shiftPatternId ?? previous.shiftPatternId,
        };

        // Lock employee row(s) in deterministic order
        const lockIds = [...new Set([previous.employeeId, mergedData.employeeId])].sort();
        await tx.$queryRaw`SELECT id FROM employees WHERE id IN (${Prisma.join(lockIds)}) ORDER BY id FOR UPDATE`;

        const [existingShifts, employee, previousPattern, targetPattern] = await Promise.all([
          tx.assignedShift.findMany({
            where: {
              employeeId: mergedData.employeeId,
              isDeleted: false,
              NOT: { id },
            },
            orderBy: { startDate: "asc" },
          }),
          tx.employee.findUnique({
            where: { id: previous.employeeId },
            select: { name: true },
          }),
          tx.shiftPattern.findUnique({
            where: { id: previous.shiftPatternId },
            select: { name: true },
          }),
          tx.shiftPattern.findUnique({
            where: { id: mergedData.shiftPatternId },
          }),
        ]);

        // 1. Validations
        const conflicts = await this.validator.validateConflicts(
          mergedData.employeeId,
          mergedData.startDate,
          mergedData.endDate,
          id,
          existingShifts,
        );
        if (conflicts.length > 0) {
          const ass = conflicts[0];
          throw new Error(
            `Conflicto de actualización: Superposición detectada con el periodo ${ass.startDate} a ${ass.endDate || "siempre"}.`,
          );
        }

        if (targetPattern) {
          const contextStart = addBusinessDaysChile(mergedData.startDate, -7);
          const contextEnd = mergedData.endDate
            ? addBusinessDaysChile(mergedData.endDate, 7)
            : addBusinessDaysChile(mergedData.startDate, 45);
          const context = await this.buildValidationContext(
            tx,
            [mergedData.employeeId],
            contextStart,
            contextEnd,
            existingShifts,
          );

          const restValidation = await this.validator.validateRestPeriod(
            mergedData.employeeId,
            mergedData.startDate,
            targetPattern,
            context,
          );
          if (!restValidation.isValid) {
            throw new Error(restValidation.error);
          }

          const sixDayValidation = await this.validator.validateConsecutiveWorkdays(
            mergedData.employeeId,
            mergedData.startDate,
            mergedData.endDate,
            mergedData.shiftPatternId,
            id,
            context,
            tx,
          );
          if (!sixDayValidation.isValid) {
            throw new Error(sixDayValidation.error);
          }
        }

        const workload = await this.validator.validateWorkload(
          mergedData.employeeId,
          mergedData,
          id,
          existingShifts,
          tx,
        );
        if (!workload.isValid) {
          throw new Error(
            `Carga horaria excesiva: El promedio semanal (${workload.weeklyHours!.toFixed(1)}h) excede el máximo permitido de ${workload.maxHours}h.`,
          );
        }

        const resolvedNewPatternName = targetPattern?.name || "Desconocido";

        // 2. Execution
        const updated = await tx.assignedShift.update({
          where: { id },
          data: {
            startDate: data.startDate,
            endDate: data.endDate,
            shiftPatternId: data.shiftPatternId,
            shiftPatternName: data.shiftPatternId ? resolvedNewPatternName : undefined,
            employeeName: data.employeeId ? employee?.name : undefined,
          },
        });

        return {
          assignment: updated,
          previousAssignment: previous,
          employeeName: employee?.name,
          previousPatternName: previousPattern?.name,
          newPatternName: resolvedNewPatternName,
        };
      });

    // 3. Audit & Socket (after commit)
    await auditService.logShiftChange(actorUsername, "UPDATE", {
      employeeId: previousAssignment.employeeId,
      employeeName,
      previousPatternId: previousAssignment.shiftPatternId,
      previousPatternName,
      newPatternId: data.shiftPatternId || previousAssignment.shiftPatternId,
      newPatternName,
      previousStartDate: previousAssignment.startDate,
      previousEndDate: previousAssignment.endDate,
      newStartDate: data.startDate,
      newEndDate: data.endDate,
    });

    SocketService.emit("assignedShift:updated", assignment);
    return assignment;
  }

  async deleteAssignment(id: string, actorUsername: string) {
    const assignmentToDelete = await prisma.assignedShift.findUnique({ where: { id } });
    if (!assignmentToDelete) throw new Error("Asignación no encontrada");

    // 0. Boundary Validation (7-day past rule)
    const boundary = this.validator.validateTemporalBoundary(assignmentToDelete.startDate);
    if (!boundary.isValid) throw new Error(boundary.error);

    const [employee, pattern] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: assignmentToDelete.employeeId },
        select: { name: true },
      }),
      prisma.shiftPattern.findUnique({
        where: { id: assignmentToDelete.shiftPatternId },
        select: { name: true },
      }),
    ]);

    await prisma.assignedShift.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await auditService.logShiftChange(actorUsername, "DELETE", {
      employeeId: assignmentToDelete.employeeId,
      employeeName: employee?.name,
      previousPatternId: assignmentToDelete.shiftPatternId,
      previousPatternName: pattern?.name,
      previousStartDate: assignmentToDelete.startDate,
      previousEndDate: assignmentToDelete.endDate,
    });

    SocketService.emit("assignedShift:updated", { id });
  }

  async bulkCreatePatterns(patterns: PatternCreateInput[]) {
    for (const p of patterns) {
      const validation = await this.validator.validatePatternSchedules(
        p.dailySchedules,
        p.cycleLengthDays,
      );
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    }

    const created = await withDirectTransaction((tx) =>
      Promise.all(
        patterns.map((p) =>
          tx.shiftPattern.create({
            data: {
              id: p.id,
              name: p.name,
              cycleLengthDays: p.cycleLengthDays,
              startDayOfWeek: p.startDayOfWeek,
              dailySchedules: JSON.stringify(p.dailySchedules),
              color: p.color,
              maxHoursPattern: p.maxHoursPattern,
              worksOnHolidays: p.worksOnHolidays ?? false,
            },
          }),
        ),
      ),
    );

    SocketService.emit("shiftPattern:updated", { count: created.length });
    return created.length;
  }

  async bulkAssignShifts(assignments: AssignmentCreateInput[], actorUsername = "System") {
    if (assignments.length === 0) return 0;

    const CHUNK_SIZE = 50;
    const employeeIds = [...new Set(assignments.map((a) => a.employeeId))].sort();
    const patternIds = [...new Set(assignments.map((a) => a.shiftPatternId))];

    const { createdCount, auditPayloads } = await withDirectTransaction(async (tx) => {
      // Lock employee rows in deterministic order to prevent concurrent conflicts & deadlocks
      await tx.$queryRaw`SELECT id FROM employees WHERE id IN (${Prisma.join(employeeIds)}) ORDER BY id FOR UPDATE`;

      const [existingShifts, allPatterns, allEmployees] = await Promise.all([
        tx.assignedShift.findMany({
          where: {
            employeeId: { in: employeeIds },
            isDeleted: false,
          },
          orderBy: { startDate: "asc" },
        }),
        tx.shiftPattern.findMany({
          where: { id: { in: patternIds } },
        }),
        tx.employee.findMany({
          where: { id: { in: employeeIds } },
        }),
      ]);

      const patternMap = new Map(allPatterns.map((p) => [p.id, p]));
      const employeeMap = new Map(allEmployees.map((e) => [e.id, e]));

      // Compute full date span for context prefetch
      const startDates = assignments.map((a) => a.startDate).sort();
      const minStart = addBusinessDaysChile(startDates[0], -7);
      const maxEndCandidate = assignments.reduce(
        (acc, a) => {
          const candidate = a.endDate
            ? addBusinessDaysChile(a.endDate, 7)
            : addBusinessDaysChile(a.startDate, 45);
          return candidate > acc ? candidate : acc;
        },
        addBusinessDaysChile(startDates[startDates.length - 1], 45),
      );

      const baseContext = await this.buildValidationContext(
        tx,
        employeeIds,
        minStart,
        maxEndCandidate,
        [],
      );

      const existingShiftsByEmployee = existingShifts.reduce(
        (acc, shift) => {
          if (!acc[shift.employeeId]) acc[shift.employeeId] = [];
          acc[shift.employeeId].push(shift);
          return acc;
        },
        {} as Record<string, AssignedShift[]>,
      );

      for (const empId of employeeIds) {
        const empAssignments = assignments.filter((a) => a.employeeId === empId);
        const employeeExistingShifts = existingShiftsByEmployee[empId] || [];

        for (const newAss of empAssignments) {
          // 1. 7-day temporal boundary
          const boundary = this.validator.validateTemporalBoundary(newAss.startDate);
          if (!boundary.isValid) {
            throw new Error(boundary.error);
          }

          // 2. Overlap conflicts
          const conflicts = await this.validator.validateConflicts(
            newAss.employeeId,
            newAss.startDate,
            newAss.endDate,
            undefined,
            employeeExistingShifts,
          );
          if (conflicts.length > 0) {
            throw new Error(
              `Error en carga masiva: El empleado ${empId} tiene un conflicto en el periodo ${newAss.startDate}.`,
            );
          }

          // 3. 8h Rest & 6x1 Rules
          const patternToCheck = patternMap.get(newAss.shiftPatternId);
          if (patternToCheck) {
            const empContext: SchedulingContext = {
              ...baseContext,
              assignedShifts: employeeExistingShifts,
              indexedShifts: undefined,
            };

            const restValidation = await this.validator.validateRestPeriod(
              newAss.employeeId,
              newAss.startDate,
              patternToCheck,
              empContext,
            );
            if (!restValidation.isValid) {
              throw new Error(restValidation.error);
            }

            const sixDayValidation = await this.validator.validateConsecutiveWorkdays(
              newAss.employeeId,
              newAss.startDate,
              newAss.endDate,
              newAss.shiftPatternId,
              undefined,
              empContext,
              tx,
            );
            if (!sixDayValidation.isValid) {
              throw new Error(sixDayValidation.error);
            }
          }

          // 4. Workload
          const workload = await this.validator.validateWorkload(
            empId,
            newAss,
            undefined,
            employeeExistingShifts,
            tx,
          );
          if (!workload.isValid) {
            throw new Error(
              `Error en carga masiva: El empleado ${empId} excedería la carga horaria semanal (${workload.weeklyHours!.toFixed(1)}h).`,
            );
          }

          // Add valid shift to existing context to validate subsequent shifts in same batch
          employeeExistingShifts.push({
            id: newAss.id || "synthetic-bulk-id",
            employeeId: newAss.employeeId,
            employeeName: employeeMap.get(newAss.employeeId)?.name ?? null,
            shiftPatternId: newAss.shiftPatternId,
            shiftPatternName: patternMap.get(newAss.shiftPatternId)?.name ?? null,
            startDate: newAss.startDate,
            endDate: newAss.endDate ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
          } as AssignedShift);
        }
      }

      let persisted = 0;
      for (let i = 0; i < assignments.length; i += CHUNK_SIZE) {
        const chunk = assignments.slice(i, i + CHUNK_SIZE);
        await tx.assignedShift.createMany({
          data: chunk.map((a) => ({
            id: a.id,
            employeeId: a.employeeId,
            employeeName: employeeMap.get(a.employeeId)?.name,
            shiftPatternId: a.shiftPatternId,
            shiftPatternName: patternMap.get(a.shiftPatternId)?.name,
            startDate: a.startDate,
            endDate: a.endDate,
          })),
        });
        persisted += chunk.length;
      }

      const audits = assignments.map((a) => ({
        employeeId: a.employeeId,
        employeeName: employeeMap.get(a.employeeId)?.name,
        newPatternId: a.shiftPatternId,
        newPatternName: patternMap.get(a.shiftPatternId)?.name,
        newStartDate: a.startDate,
        newEndDate: a.endDate,
      }));

      return { createdCount: persisted, auditPayloads: audits };
    });

    await Promise.all(
      auditPayloads.map((details) => auditService.logShiftChange(actorUsername, "CREATE", details)),
    );

    SocketService.emit("assignedShift:updated", { count: createdCount });
    return createdCount;
  }
}

export const shiftService = new ShiftService();
