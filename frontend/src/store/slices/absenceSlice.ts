import { StateCreator } from "zustand";
import { AppState } from "../types";
import { Holiday, LeaveRecord } from "../../types/index";
import { holidayService } from "../../services/holidayService";
import { leaveService } from "../../services/leaveService";
import { authService } from "../../services/authService";
import { API_BASE_URL } from "../../services/apiBase";

import { idbDelete, idbGetAll, idbPutBulk, STORES, idbPut } from "../../utils/indexedDB";

export interface AbsenceSlice {
  holidays: Holiday[];
  leaves: LeaveRecord[];

  loadAbsenceData: () => Promise<void>;
  loadHolidaysFromApi: () => Promise<{
    added: number;
    skipped: number;
    total: number;
  }>;
  addHoliday: (holiday: Holiday) => Promise<void>;
}

export const createAbsenceSlice: StateCreator<AppState, [], [], AbsenceSlice> = (set, get) => ({
  holidays: [],
  leaves: [],

  loadAbsenceData: async () => {
    const { lastSyncTime, holidays: currentHolidays, leaves: currentLeaves } = get();
    const since = lastSyncTime;

    // 1. Load from cache if empty
    let baseHolidays = currentHolidays;
    let baseLeaves = currentLeaves;

    if (baseHolidays.length === 0 && baseLeaves.length === 0) {
      try {
        const [cachedHolidays, cachedLeaves] = await Promise.all([
          idbGetAll<Holiday>(STORES.HOLIDAYS),
          idbGetAll<LeaveRecord>(STORES.LEAVES),
        ]);

        if (cachedHolidays.length > 0 || cachedLeaves.length > 0) {
          baseHolidays = cachedHolidays;
          baseLeaves = cachedLeaves;
          set({ holidays: baseHolidays, leaves: baseLeaves });
        }
      } catch (e) {
        console.warn("Error loading absences from cache:", e);
      }
    }

    // 2. Fetch changes (Delta or Full)
    try {
      const [hChanges, lChanges] = await Promise.all([
        holidayService.getAll(since || undefined),
        leaveService.getAll(since || undefined),
      ]);

      // Backfill the sync metadata so records read from the API and from IndexedDB
      // carry the same shape before they are merged and persisted.
      const enrich = <T extends Holiday | LeaveRecord>(items: T[]): T[] =>
        items.map((item) => ({
          ...item,
          lastModified: item.lastModified || Date.now(),
          syncStatus: item.syncStatus || "synced",
          isDeleted: item.isDeleted || false,
        }));

      const enrichedH = enrich(hChanges);
      const enrichedL = enrich(lChanges.data ?? []);

      let finalHolidays: Holiday[];
      let finalLeaves: LeaveRecord[];

      if (!since || (baseHolidays.length === 0 && baseLeaves.length === 0)) {
        // Initial load: Only active leaves
        finalHolidays = enrichedH;
        finalLeaves = enrichedL.filter((l: LeaveRecord) => !l.isDeleted);

        // Persist initial load in full
        if (finalHolidays.length > 0) await idbPutBulk(STORES.HOLIDAYS, finalHolidays);
        if (finalLeaves.length > 0) await idbPutBulk(STORES.LEAVES, finalLeaves);
      } else {
        const hIds = new Set(enrichedH.map((h: Holiday) => h.id));
        const lIds = new Set(enrichedL.map((l: LeaveRecord) => l.id));
        finalHolidays = [...baseHolidays.filter((h: Holiday) => !hIds.has(h.id)), ...enrichedH];

        const mergedLeaves = [
          ...baseLeaves.filter((l: LeaveRecord) => !lIds.has(l.id)),
          ...enrichedL,
        ];
        finalLeaves = mergedLeaves.filter((l: LeaveRecord) => !l.isDeleted);

        // DELTA PERSISTENCE:
        // Only write changes to IDB instead of the whole merged list
        if (enrichedH.length > 0) await idbPutBulk(STORES.HOLIDAYS, enrichedH);

        const activeLChanges = enrichedL.filter((l) => !l.isDeleted);
        if (activeLChanges.length > 0) await idbPutBulk(STORES.LEAVES, activeLChanges);

        // Sync deletions to IDB
        const deletedLIds = enrichedL
          .filter((l: LeaveRecord) => l.isDeleted)
          .map((l: LeaveRecord) => l.id);
        for (const lid of deletedLIds) {
          await idbDelete(STORES.LEAVES, lid);
        }
      }

      set({ holidays: finalHolidays, leaves: finalLeaves });
    } catch (error) {
      console.error("Error loading absences from server:", error);
    }
  },

  loadHolidaysFromApi: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/holidays/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as Record<string, string>),
        },
      });

      if (!response.ok) throw new Error("Error al sincronizar feriados en el servidor");

      const result = await response.json();

      // Recargamos los datos locales para ver los nuevos feriados
      await get().loadAbsenceData();

      return {
        added: result.total || 0,
        skipped: 0,
        total: result.total || 0,
      };
    } catch (error) {
      console.error("Error al sincronizar feriados desde el backend:", error);
      return { added: 0, skipped: 0, total: 0 };
    }
  },

  addHoliday: async (holiday) => {
    try {
      const saved = await holidayService.save(holiday);
      await idbPut(STORES.HOLIDAYS, saved);
      set((state) => ({
        holidays: [...state.holidays, saved],
      }));
      get().addToast("Feriado agregado correctamente", "success");
    } catch (error) {
      console.error(error);
      get().addToast("Error al agregar feriado", "error");
      throw error;
    }
  },
});
