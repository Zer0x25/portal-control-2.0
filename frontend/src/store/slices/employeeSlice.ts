import { StateCreator } from "zustand";
import { Employee } from "../../types/index";
import { AppState } from "../types";
import { employeeService } from "../../services/employeeService";

import { idbGetAll, idbPutBulk, STORES, idbDelete } from "../../utils/indexedDB";

export interface EmployeeSlice {
  employees: Employee[];
  isLoadingEmployees: boolean;
  loadEmployees: () => Promise<void>;
  getEmployeeById: (id: string) => Employee | undefined;
  // Note: Mutations like add/update will be handled via services + reloading or optimistic updates.
  // For now, focusing on the Delta Sync core.
}

export const createEmployeeSlice: StateCreator<AppState, [], [], EmployeeSlice> = (set, get) => ({
  employees: [],
  isLoadingEmployees: false,

  loadEmployees: async () => {
    const { lastSyncTime, employees: currentEmployees } = get();
    const since = lastSyncTime;

    // 1. Load from cache if empty
    let baseList = currentEmployees;
    if (baseList.length === 0) {
      try {
        const cached = await idbGetAll<Employee>(STORES.EMPLOYEES);
        if (cached.length > 0) {
          baseList = cached;
          set({ employees: baseList });
        }
      } catch (e) {
        console.warn("[EmployeeSlice] Error loading from cache:", e);
      }
    }

    // 2. Fetch changes (Delta or Full)
    const isBackgroundSync = baseList.length > 0;
    if (!isBackgroundSync) {
      set({ isLoadingEmployees: true });
    }

    try {
      const remoteChanges = await employeeService.getAll(since || undefined);

      let newList: Employee[];
      if (!since || baseList.length === 0) {
        // Initial load or reset: Filter out deleted if server sends them (usually getAll doesn't)
        newList = remoteChanges.filter((e) => !e.isDeleted);
      } else {
        const remoteIds = new Set(remoteChanges.map((e) => e.id));
        const merged = [...baseList.filter((e) => !remoteIds.has(e.id)), ...remoteChanges];

        // Handle deletions (Syncable isDeleted flag)
        newList = merged.filter((e) => !e.isDeleted);

        // Cleanup IndexedDB for deleted items
        const deletedIds = remoteChanges.filter((e) => e.isDeleted).map((e) => e.id);
        for (const id of deletedIds) {
          await idbDelete(STORES.EMPLOYEES, id).catch(() => {});
        }
      }

      set({ employees: newList, isLoadingEmployees: false });

      if (remoteChanges.length > 0) {
        try {
          // Persist the changes (remoteChanges contains updates and deletions)
          // We persist the whole newList to ensure consistency, but idbPutBulk uses Smart Delta.
          await idbPutBulk(STORES.EMPLOYEES, newList);
        } catch (idbError) {
          console.error("[EmployeeSlice] Error saving to IDB:", idbError);
        }
      }
    } catch (error) {
      console.error("[EmployeeSlice] Error loading employees:", error);
      if (!isBackgroundSync) {
        set({ isLoadingEmployees: false });
      }
    }
  },

  getEmployeeById: (id) => {
    return get().employees.find((e) => e.id === id);
  },
});
