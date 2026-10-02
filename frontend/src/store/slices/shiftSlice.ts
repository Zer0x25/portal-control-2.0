import { StateCreator } from "zustand";
import { AppState } from "../types";
import { TheoreticalShiftPattern, AssignedShift, DayInCycleSchedule } from "../../types/index";
import { shiftService } from "../../services/shiftService";

import { idbGetAll, idbPutBulk, idbPut, idbDelete, STORES } from "../../utils/indexedDB";

export interface ShiftSlice {
  shiftPatterns: TheoreticalShiftPattern[];
  assignedShifts: AssignedShift[];
  assignedShiftsByEmployee: Record<string, AssignedShift[]>; // Optimization Index

  loadShiftData: () => Promise<void>;
  getShiftPatternById: (patternId: string) => TheoreticalShiftPattern | undefined;
  getAssignedShiftsByEmployee: (employeeId: string) => AssignedShift[];

  detectAssignmentConflicts: (assignments: AssignedShift[]) => Set<string>;
  calculateAverageWeeklyHoursForEmployee: (
    employeeId: string,
    newAssignment?: Partial<AssignedShift>,
    assignmentToExcludeId?: string,
  ) => number;
  assignShiftToEmployee: (assignment: AssignedShift) => Promise<void>;
  updateAssignedShift: (assignment: AssignedShift) => Promise<void>;
  deleteAssignedShift: (id: string) => Promise<void>;

  addShiftPattern: (pattern: TheoreticalShiftPattern) => Promise<void>;
  updateShiftPattern: (pattern: TheoreticalShiftPattern) => Promise<void>;
  deleteShiftPattern: (id: string) => Promise<void>;
}

export const createShiftSlice: StateCreator<AppState, [], [], ShiftSlice> = (set, get) => ({
  shiftPatterns: [],
  assignedShifts: [],
  assignedShiftsByEmployee: {},

  loadShiftData: async () => {
    const {
      lastSyncTime,
      shiftPatterns: currentPatterns,
      assignedShifts: currentAssignments,
    } = get();
    const since = lastSyncTime;

    // 1. Load from cache if empty
    let basePatterns = currentPatterns;
    let baseAssignments = currentAssignments;

    if (basePatterns.length === 0 && baseAssignments.length === 0) {
      try {
        const [cachedPatterns, cachedAssignments] = await Promise.all([
          idbGetAll<TheoreticalShiftPattern>(STORES.THEORETICAL_SHIFT_PATTERNS),
          idbGetAll<AssignedShift>(STORES.ASSIGNED_SHIFTS),
        ]);

        if (cachedPatterns.length > 0 || cachedAssignments.length > 0) {
          basePatterns = cachedPatterns;
          baseAssignments = cachedAssignments;
          set({ shiftPatterns: basePatterns, assignedShifts: baseAssignments });
        }
      } catch (e) {
        console.warn("Error loading shifts from cache:", e);
      }
    }

    // 2. Fetch changes (Delta or Full)
    try {
      const [pChanges, aResponse] = await Promise.all([
        shiftService.getPatterns({ since: since || undefined }),
        shiftService.getAssignments({ since: since ? since.toString() : undefined }),
      ]);
      const aChanges = aResponse.data;

      const enrich = <
        T extends {
          id: string;
          dailySchedules?: string | DayInCycleSchedule[] | unknown;
          lastModified?: string | number;
          syncStatus?: string;
          isDeleted?: boolean;
        },
      >(
        items: T[],
      ) =>
        items.map((item) => ({
          ...item,
          dailySchedules: (typeof item.dailySchedules === "string"
            ? JSON.parse(item.dailySchedules)
            : (item.dailySchedules as DayInCycleSchedule[] | undefined)
          )?.map((s: DayInCycleSchedule) => ({
            ...s,
            hasColacion: s?.hasColacion ?? false,
            colacionMinutes: s?.colacionMinutes ?? 0,
          })),
          lastModified: item.lastModified || Date.now(),
          syncStatus: item.syncStatus || "synced",
          isDeleted: item.isDeleted || false,
        })) as T[];

      const enrichedP = enrich(pChanges);
      const enrichedA = enrich(aChanges);

      let finalPatterns: TheoreticalShiftPattern[];
      let finalAssignments: AssignedShift[];

      if (!since || (basePatterns.length === 0 && baseAssignments.length === 0)) {
        // Initial load: Only keep non-deleted records
        finalPatterns = enrichedP.filter((p) => !p.isDeleted);
        finalAssignments = enrichedA.filter((a) => !a.isDeleted);
      } else {
        const incomingPIds = new Set(enrichedP.map((p) => p.id));
        const incomingAIds = new Set(enrichedA.map((a) => a.id));

        // Merge: Existing list (minus incoming updates) + incoming updates
        const mergedPatterns = [
          ...basePatterns.filter((p) => !incomingPIds.has(p.id)),
          ...enrichedP,
        ];
        const mergedAssignments = [
          ...baseAssignments.filter((a) => !incomingAIds.has(a.id)),
          ...enrichedA,
        ];

        // Filter out those that are marked as deleted
        finalPatterns = mergedPatterns.filter((p) => !p.isDeleted);
        finalAssignments = mergedAssignments.filter((a) => !a.isDeleted);

        // --- Sync deletions to IDB ---
        const deletedPIds = enrichedP.filter((p) => p.isDeleted).map((p) => p.id);
        const deletedAIds = enrichedA.filter((a) => a.isDeleted).map((a) => a.id);
        for (const pid of deletedPIds) await idbDelete(STORES.THEORETICAL_SHIFT_PATTERNS, pid);
        for (const aid of deletedAIds) await idbDelete(STORES.ASSIGNED_SHIFTS, aid);
      }

      set({
        shiftPatterns: finalPatterns,
        assignedShifts: finalAssignments,
        assignedShiftsByEmployee: finalAssignments.reduce(
          (acc: Record<string, AssignedShift[]>, curr: AssignedShift) => {
            if (!acc[curr.employeeId]) acc[curr.employeeId] = [];
            acc[curr.employeeId].push(curr);
            return acc;
          },
          {} as Record<string, AssignedShift[]>,
        ),
      });

      const updatedP = enrichedP.filter((p) => !p.isDeleted);
      const updatedA = enrichedA.filter((a) => !a.isDeleted);
      if (updatedP.length > 0) await idbPutBulk(STORES.THEORETICAL_SHIFT_PATTERNS, updatedP);
      if (updatedA.length > 0) await idbPutBulk(STORES.ASSIGNED_SHIFTS, updatedA);
    } catch (error) {
      console.error("Error loading shifts from server:", error);
    }
  },

  getShiftPatternById: (id) =>
    get().shiftPatterns.find((p: TheoreticalShiftPattern) => p.id === id),

  getAssignedShiftsByEmployee: (employeeId) =>
    get().assignedShifts.filter((a: AssignedShift) => a.employeeId === employeeId),

  detectAssignmentConflicts: (assignments) => {
    const conflicts = new Set<string>();
    const employeeMap = new Map<string, AssignedShift[]>();

    assignments.forEach((as: AssignedShift) => {
      if (!employeeMap.has(as.employeeId)) employeeMap.set(as.employeeId, []);
      employeeMap.get(as.employeeId)!.push(as);
    });

    employeeMap.forEach((empAssignments) => {
      for (let i = 0; i < empAssignments.length; i++) {
        for (let j = i + 1; j < empAssignments.length; j++) {
          const a = empAssignments[i];
          const b = empAssignments[j];
          const startA = a.startDate;
          const endA = a.endDate || "9999-12-31";
          const startB = b.startDate;
          const endB = b.endDate || "9999-12-31";

          if (startA <= endB && startB <= endA) {
            conflicts.add(a.id);
            conflicts.add(b.id);
          }
        }
      }
    });
    return conflicts;
  },

  calculateAverageWeeklyHoursForEmployee: (employeeId, newAssignment, assignmentToExcludeId) => {
    const { assignedShifts, getShiftPatternById } = get();
    const relevantAssignments = assignedShifts.filter(
      (as: AssignedShift) => as.employeeId === employeeId && as.id !== assignmentToExcludeId,
    );

    if (newAssignment) {
      relevantAssignments.push(newAssignment as AssignedShift);
    }

    if (relevantAssignments.length === 0) return 0;
    relevantAssignments.sort((a: AssignedShift, b: AssignedShift) =>
      a.startDate.localeCompare(b.startDate),
    );

    const latestAssignment = relevantAssignments[relevantAssignments.length - 1];
    const pattern = getShiftPatternById(latestAssignment.shiftPatternId);

    if (!pattern || pattern.cycleLengthDays <= 0) return 0;
    const totalHoursInCycle = pattern.dailySchedules.reduce(
      (sum: number, day: DayInCycleSchedule) => sum + (day.hours || 0),
      0,
    );
    return (totalHoursInCycle / pattern.cycleLengthDays) * 7;
  },

  assignShiftToEmployee: async (assignment) => {
    try {
      const saved = await shiftService.assignShift(assignment);
      await idbPut(STORES.ASSIGNED_SHIFTS, saved);
      set((state) => ({
        assignedShifts: [...state.assignedShifts, saved],
        assignedShiftsByEmployee: {
          ...state.assignedShiftsByEmployee,
          [saved.employeeId]: [...(state.assignedShiftsByEmployee[saved.employeeId] || []), saved],
        },
      }));
      get().addToast("Turno asignado correctamente", "success");
    } catch (error) {
      console.error(error);
      get().addToast("Error al asignar turno", "error");
      throw error;
    }
  },

  updateAssignedShift: async (assignment) => {
    try {
      const updated = await shiftService.updateAssignment(assignment.id, assignment);
      await idbPut(STORES.ASSIGNED_SHIFTS, updated);
      set((state) => ({
        assignedShifts: state.assignedShifts.map((a) => (a.id === updated.id ? updated : a)),
        assignedShiftsByEmployee: {
          ...state.assignedShiftsByEmployee,
          [updated.employeeId]: state.assignedShiftsByEmployee[updated.employeeId].map((a) =>
            a.id === updated.id ? updated : a,
          ),
        },
      }));
      get().addToast("Asignación actualizada", "success");
    } catch (error) {
      console.error(error);
      get().addToast("Error al actualizar asignación", "error");
      throw error;
    }
  },

  deleteAssignedShift: async (id) => {
    try {
      await shiftService.deleteAssignment(id);
      await idbDelete(STORES.ASSIGNED_SHIFTS, id);
      set((state) => {
        const deleted = state.assignedShifts.find((a) => a.id === id);
        if (!deleted) return state; // Should not happen

        const newEmployeeAssignments = state.assignedShiftsByEmployee[deleted.employeeId].filter(
          (a) => a.id !== id,
        );

        return {
          assignedShifts: state.assignedShifts.filter((a) => a.id !== id),
          assignedShiftsByEmployee: {
            ...state.assignedShiftsByEmployee,
            [deleted.employeeId]: newEmployeeAssignments,
          },
        };
      });
      get().addToast("Asignación eliminada", "success");
    } catch (error) {
      console.error(error);
      get().addToast("Error al eliminar asignación", "error");
      throw error;
    }
  },

  addShiftPattern: async (pattern) => {
    try {
      const saved = await shiftService.savePattern(pattern);
      await idbPut(STORES.THEORETICAL_SHIFT_PATTERNS, saved);
      set((state) => ({
        shiftPatterns: [...state.shiftPatterns, saved],
      }));
      get().addToast("Patrón creado correctamente", "success");
    } catch (error) {
      console.error(error);
      get().addToast("Error al crear patrón", "error");
      throw error;
    }
  },

  updateShiftPattern: async (pattern) => {
    try {
      const updated = await shiftService.updatePattern(pattern);
      await idbPut(STORES.THEORETICAL_SHIFT_PATTERNS, updated);
      set((state) => ({
        shiftPatterns: state.shiftPatterns.map((p) => (p.id === updated.id ? updated : p)),
      }));
      get().addToast("Patrón actualizado", "success");
    } catch (error) {
      console.error(error);
      get().addToast("Error al actualizar patrón", "error");
      throw error;
    }
  },

  deleteShiftPattern: async (id) => {
    try {
      await shiftService.deletePattern(id);
      await idbDelete(STORES.THEORETICAL_SHIFT_PATTERNS, id);
      set((state) => ({
        shiftPatterns: state.shiftPatterns.filter((p) => p.id !== id),
      }));
      get().addToast("Patrón eliminado", "success");
    } catch (error) {
      console.error(error);
      get().addToast("Error al eliminar patrón", "error");
      throw error;
    }
  },
});
