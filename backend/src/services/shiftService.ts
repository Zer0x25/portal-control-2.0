import { Prisma } from "@prisma/client";
import prisma from "./db";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { ShiftPatternWithSchedules } from "./schedulingService";
import { ShiftValidator } from "./shift/ShiftValidator";
import {
  PatternCreateInput,
  AssignmentCreateInput,
  PaginationOptions,
  PaginatedResponse,
  PatternPaginationOptions,
} from "./shift/types";
import { AssignedShift } from "@prisma/client";
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
    const validation = await this.validator.validatePatternSchedules(data.dailySchedules);
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
      const validation = await this.validator.validatePatternSchedules(data.dailySchedules);
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
    const { page, pageSize, since, role, employeeId, startDate, endDate, showArchived } = options;
    const where: Prisma.AssignedShiftWhereInput = {};

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
        where.OR = [{ endDate: null }, { endDate: { gte: today } }];
      }
    }

    // 2. Role Filter
    if (role === "Usuario" && employeeId) {
      where.employeeId = employeeId;
    } else if (employeeId) {
      // Admin filtering by specific employee
      where.employeeId = employeeId;
    }

    // 3. Date Range Filter
    if (startDate || endDate) {
      where.OR = [
        {
          // Shift starts within range
          startDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Shift ends within range
          endDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Shift encompasses range
          startDate: { lte: startDate },
          endDate: { gte: endDate },
        },
      ];
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

  async assignShift(data: AssignmentCreateInput, actorUsername: string) {
    // 0. Boundary Validation (7-day past rule)
    const boundary = this.validator.validateTemporalBoundary(data.startDate);
    if (!boundary.isValid) throw new Error(boundary.error);

    // 1. Validations
    const conflicts = await this.validator.validateConflicts(
      data.employeeId,
      data.startDate,
      data.endDate,
    );
    if (conflicts.length > 0) {
      const ass = conflicts[0];
      throw new Error(
        `Conflicto de asignación: Superposición detectada con el periodo ${ass.startDate} a ${ass.endDate || "siempre"}.`,
      );
    }

    // New 8h Rest Rule
    // We need to fetch the pattern first to know the start time of the first day
    const patternToCheck = await prisma.shiftPattern.findUnique({
      where: { id: data.shiftPatternId },
    });
    if (patternToCheck) {
      const restValidation = await this.validator.validateRestPeriod(
        data.employeeId,
        data.startDate,
        patternToCheck,
      );
      if (!restValidation.isValid) {
        throw new Error(restValidation.error);
      }
      // New 6-Day Rule
      const sixDayValidation = await this.validator.validateConsecutiveWorkdays(
        data.employeeId,
        data.startDate,
        data.endDate,
        data.shiftPatternId,
      );
      if (!sixDayValidation.isValid) {
        throw new Error(sixDayValidation.error);
      }
    }

    const workload = await this.validator.validateWorkload(data.employeeId, data);
    if (!workload.isValid) {
      throw new Error(
        `Carga horaria excesiva: El promedio semanal (${workload.weeklyHours!.toFixed(1)}h) excede el máximo permitido de ${workload.maxHours}h.`,
      );
    }

    // 2. Audit Data
    const [employee, pattern] = await Promise.all([
      prisma.employee.findUnique({ where: { id: data.employeeId }, select: { name: true } }),
      prisma.shiftPattern.findUnique({
        where: { id: data.shiftPatternId },
        select: { name: true },
      }),
    ]);

    // 3. Execution
    const assignment = await prisma.assignedShift.create({
      data: {
        id: data.id,
        employeeId: data.employeeId,
        employeeName: employee?.name,
        shiftPatternId: data.shiftPatternId,
        shiftPatternName: pattern?.name,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });

    // 4. Audit & Socket
    await auditService.logShiftChange(actorUsername, "CREATE", {
      employeeId: data.employeeId,
      employeeName: employee?.name,
      newPatternId: data.shiftPatternId,
      newPatternName: pattern?.name,
      newStartDate: data.startDate,
      newEndDate: data.endDate,
    });

    SocketService.emit("assignedShift:updated", assignment);
    return assignment;
  }

  async updateAssignment(id: string, data: Partial<AssignmentCreateInput>, actorUsername: string) {
    const previousAssignment = await prisma.assignedShift.findUnique({ where: { id } });
    if (!previousAssignment) throw new Error("Asignación no encontrada");

    // 0. Boundary Validation (7-day past rule)
    const boundary = this.validator.validateTemporalBoundary(
      data.startDate ?? previousAssignment.startDate,
    );
    if (!boundary.isValid) throw new Error(boundary.error);

    // 1. Validations
    const mergedData: AssignmentCreateInput = {
      employeeId: data.employeeId ?? previousAssignment.employeeId,
      startDate: data.startDate ?? previousAssignment.startDate,
      endDate: data.endDate !== undefined ? data.endDate : previousAssignment.endDate,
      shiftPatternId: data.shiftPatternId ?? previousAssignment.shiftPatternId,
    };

    const conflicts = await this.validator.validateConflicts(
      mergedData.employeeId,
      mergedData.startDate,
      mergedData.endDate,
      id,
    );
    if (conflicts.length > 0) {
      const ass = conflicts[0];
      throw new Error(
        `Conflicto de actualización: Superposición detectada con el periodo ${ass.startDate} a ${ass.endDate || "siempre"}.`,
      );
    }

    // New 8h Rest Rule (Update)
    if (mergedData.shiftPatternId) {
      const patternToCheck = await prisma.shiftPattern.findUnique({
        where: { id: mergedData.shiftPatternId },
      });
      if (patternToCheck) {
        // Check start boundary
        const restValidation = await this.validator.validateRestPeriod(
          mergedData.employeeId,
          mergedData.startDate,
          patternToCheck,
        );
        if (!restValidation.isValid) {
          throw new Error(restValidation.error);
        }
        // New 6-Day Rule (Update)
        const sixDayValidation = await this.validator.validateConsecutiveWorkdays(
          mergedData.employeeId,
          mergedData.startDate,
          mergedData.endDate,
          mergedData.shiftPatternId,
          id, // exclude current assignment
        );
        if (!sixDayValidation.isValid) {
          throw new Error(sixDayValidation.error);
        }
      }
    }

    const workload = await this.validator.validateWorkload(mergedData.employeeId, mergedData, id);
    if (!workload.isValid) {
      throw new Error(
        `Carga horaria excesiva: El promedio semanal (${workload.weeklyHours!.toFixed(1)}h) excede el máximo permitido de ${workload.maxHours}h.`,
      );
    }

    // 2. Audit Data
    const [employee, previousPattern] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: previousAssignment.employeeId },
        select: { name: true },
      }),
      prisma.shiftPattern.findUnique({
        where: { id: previousAssignment.shiftPatternId },
        select: { name: true },
      }),
    ]);

    let newPatternName = previousPattern?.name || "Desconocido";
    if (data.shiftPatternId && data.shiftPatternId !== previousAssignment.shiftPatternId) {
      const newPattern = await prisma.shiftPattern.findUnique({
        where: { id: data.shiftPatternId },
        select: { name: true },
      });
      newPatternName = newPattern?.name || "Desconocido";
    }

    // 3. Execution
    const assignment = await prisma.assignedShift.update({
      where: { id },
      data: {
        startDate: data.startDate,
        endDate: data.endDate,
        shiftPatternId: data.shiftPatternId,
        shiftPatternName: data.shiftPatternId ? newPatternName : undefined,
        employeeName: data.employeeId ? employee?.name : undefined,
      },
    });

    // 4. Audit & Socket
    await auditService.logShiftChange(actorUsername, "UPDATE", {
      employeeId: previousAssignment.employeeId,
      employeeName: employee?.name,
      previousPatternId: previousAssignment.shiftPatternId,
      previousPatternName: previousPattern?.name,
      newPatternId: data.shiftPatternId || previousAssignment.shiftPatternId,
      newPatternName: newPatternName,
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
    const created = await Promise.all(
      patterns.map((p) =>
        prisma.shiftPattern.create({
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
    );

    SocketService.emit("shiftPattern:updated", { count: created.length });
    return created.length;
  }

  async bulkAssignShifts(assignments: AssignmentCreateInput[]) {
    const CHUNK_SIZE = 50;
    let createdCount = 0;

    const employeeIds = [...new Set(assignments.map((a) => a.employeeId))] as string[];

    const existingShifts = await prisma.assignedShift.findMany({
      where: {
        employeeId: { in: employeeIds },
        isDeleted: false,
      },
      orderBy: { startDate: "asc" },
    });

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

        const workload = await this.validator.validateWorkload(
          empId,
          newAss,
          undefined,
          employeeExistingShifts,
        );
        if (!workload.isValid) {
          throw new Error(
            `Error en carga masiva: El empleado ${empId} excedería la carga horaria semanal (${workload.weeklyHours!.toFixed(1)}h).`,
          );
        }

        // Add valid shift to existing context to validate subsequent shifts correctly
        employeeExistingShifts.push({
          id: newAss.id || "synthetic-bulk-id",
          employeeId: newAss.employeeId,
          employeeName: null,
          shiftPatternId: newAss.shiftPatternId,
          shiftPatternName: null,
          startDate: newAss.startDate,
          endDate: newAss.endDate ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
          deletedAt: null,
        } as AssignedShift);
      }
    }

    const allPatterns = await prisma.shiftPattern.findMany({
      where: { id: { in: [...new Set(assignments.map((a) => a.shiftPatternId))] } },
    });
    const allEmployees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
    });

    for (let i = 0; i < assignments.length; i += CHUNK_SIZE) {
      const chunk = assignments.slice(i, i + CHUNK_SIZE);
      await prisma.assignedShift.createMany({
        data: chunk.map((a) => {
          const emp = allEmployees.find((e) => e.id === a.employeeId);
          const patt = allPatterns.find((p) => p.id === a.shiftPatternId);
          return {
            id: a.id,
            employeeId: a.employeeId,
            employeeName: emp?.name,
            shiftPatternId: a.shiftPatternId,
            shiftPatternName: patt?.name,
            startDate: a.startDate,
            endDate: a.endDate,
          };
        }),
      });
      createdCount += chunk.length;
    }

    SocketService.emit("assignedShift:updated", { count: createdCount });
    return createdCount;
  }
}

export const shiftService = new ShiftService();
