import { StateCreator } from "zustand";
import { User, UserRole } from "../../types/index";
import { AppState } from "../types";
import { userService } from "../../services/userService";

import { idbGetAll, idbPutBulk, STORES, idbDelete } from "../../utils/indexedDB";

export interface UserSlice {
  users: User[];
  isLoadingUsers: boolean;
  loadUsers: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  getUserById: (id: string) => User | undefined;
  getUserByUsername: (username: string) => User | undefined;
  createUserForEmployee: (employeeId: string, fullName: string, role: UserRole) => Promise<boolean>;
  changeOwnPassword: (data: { newPassword: string }) => Promise<boolean>;
}

export const createUserSlice: StateCreator<AppState, [], [], UserSlice> = (set, get) => ({
  users: [],
  isLoadingUsers: false,

  loadUsers: async () => {
    const { lastSyncTime, users: currentUsers } = get();
    const since = lastSyncTime;

    // 1. Load from cache if empty
    let baseList = currentUsers;
    if (baseList.length === 0) {
      try {
        const cached = await idbGetAll<User>(STORES.USERS);
        if (cached.length > 0) {
          baseList = cached;
          set({ users: baseList });
        }
      } catch (e) {
        console.warn("[UserSlice] Error loading from cache:", e);
      }
    }

    // 2. Fetch changes (Delta or Full)
    const isBackgroundSync = baseList.length > 0;
    if (!isBackgroundSync) {
      set({ isLoadingUsers: true });
    }

    try {
      const remoteChanges = await userService.getAll(since || undefined);

      let newList: User[];
      if (!since || baseList.length === 0) {
        // Initial load or reset: Filter out deleted
        newList = remoteChanges.filter((u) => !u.isDeleted);
      } else {
        const remoteIds = new Set(remoteChanges.map((u) => u.id));
        const merged = [...baseList.filter((u) => !remoteIds.has(u.id)), ...remoteChanges];

        // Handle deletions
        newList = merged.filter((u) => !u.isDeleted);

        // Cleanup IndexedDB for deleted items
        const deletedIds = remoteChanges.filter((u) => u.isDeleted).map((u) => u.id);
        for (const id of deletedIds) {
          await idbDelete(STORES.USERS, id).catch(() => {});
        }
      }

      const dedupedByUsername = new Map<string, User>();
      for (const user of newList) {
        const key = user.username.trim().toLowerCase();
        const existing = dedupedByUsername.get(key);
        if (!existing) {
          dedupedByUsername.set(key, user);
          continue;
        }
        const existingTs = existing.lastModified ?? 0;
        const currentTs = user.lastModified ?? 0;
        if (currentTs >= existingTs) dedupedByUsername.set(key, user);
      }

      newList = Array.from(dedupedByUsername.values());
      set({ users: newList, isLoadingUsers: false });

      if (remoteChanges.length > 0) {
        try {
          // Persist the changes
          await idbPutBulk(STORES.USERS, newList);
        } catch (idbError) {
          console.error("[UserSlice] Error saving to IDB:", idbError);
        }
      }
    } catch (error) {
      console.error("[UserSlice] Error loading users:", error);
      if (!isBackgroundSync) {
        set({ isLoadingUsers: false });
      }
    }
  },

  refreshUsers: async () => {
    return get().loadUsers();
  },

  getUserById: (id) => {
    return get().users.find((u) => u.id === id);
  },

  getUserByUsername: (username) => {
    const normalized = username.toLowerCase();
    return get().users.find((u) => u.username.toLowerCase() === normalized);
  },

  createUserForEmployee: async (employeeId: string, fullName: string, role: UserRole) => {
    try {
      // 1. Normalize and structure the name (logic from useUsers moved here for centralization)
      const normalize = (value: string) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const cleanName = normalize(fullName);
      const parts = cleanName.split(" ").filter(Boolean);
      const firstName = parts[0] || "";
      const firstSurname = parts[1] || "";

      // 2. Generate Base Alias
      let baseAlias = "";
      if (firstName && firstSurname) {
        baseAlias = `${firstName.charAt(0)}${firstSurname.slice(0, 5)}`;
      } else {
        baseAlias = firstName.slice(0, 6);
      }

      baseAlias = baseAlias.replace(/[^A-Z0-9]/g, "");
      if (!baseAlias) {
        baseAlias = "USER";
      }

      let finalAlias = baseAlias;
      let counter = 2; // Start from 02 to avoid confusion

      // 3. Collision detection
      const currentUsers = get().users;
      while (
        currentUsers.find((u: User) => u.username.toUpperCase() === finalAlias.toUpperCase())
      ) {
        finalAlias = `${baseAlias}${String(counter).padStart(2, "0")}`;
        counter++;
      }

      const newUser: Omit<User, "id"> = {
        username: finalAlias,
        role,
        password: "changeme123", // Default per requirements
        employeeId,
        isDeleted: false,
        lastModified: Date.now(),
        syncStatus: "pending",
      };

      await userService.create(newUser as User);
      await get().loadUsers();
      get().addToast(`Usuario '${finalAlias}' creado correctamente para el empleado.`, "success");
      return true;
    } catch (error) {
      console.error("[UserSlice] Error creating user for employee:", error);
      get().addToast("Error al generar cuenta de usuario automática.", "error");
      return false;
    }
  },

  changeOwnPassword: async ({ newPassword }) => {
    const { currentUser, loadUsers } = get();
    if (!currentUser) return false;
    try {
      await userService.update(currentUser.id, {
        password: newPassword,
      });
      await loadUsers();
      return true;
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      return false;
    }
  },
});
